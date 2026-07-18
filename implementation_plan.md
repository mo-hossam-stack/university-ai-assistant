# UniHelp AI — Complete Implementation & Redesign Plan

## Phase 1 — Repository & Architecture Analysis

### Backend Structure
- **Framework & Routing:** Django 5+ with Django REST Framework (DRF). Main routing occurs in `home/urls.py` delegating to `uniapi/urls.py`.
- **Database & Data Store:** Currently, the database (`db.sqlite3`) is completely empty. The backend acts as a stateless knowledge retriever and cognitive router. Structured university knowledge is stored in static JSON files under `backend/data/` (e.g., `academic_calendar.json`, `course_registration.json`).
- **Cognitive Routing Pipeline:** 
  1. Incoming queries are sent to `/api/chat_with_unihelp/`.
  2. The query is classified into a semantic intent (e.g., `results_gpa`, `fees_payments`, `OUT_OF_SCOPE`) via a zero-temperature call to Groq's `llama-3.3-70b-versatile` using `classifier_prompt.md`.
  3. Based on the intent, the system loads the corresponding JSON knowledge base.
  4. A secondary chat completion call is executed with `unihelp_template.md` as the system prompt (injected with the loaded knowledge base context) to generate the final response.

### Frontend Structure
- **Build System:** Vite + TypeScript.
- **Core Libraries:** React 18, Axios, Lucide React, and React Markdown for rich-text parsing.
- **Styling System:** Tailwind CSS v4.0. Features inline `@theme` customization inside `index.css` coupled with `@tailwindcss/vite` compiler integration, bypassing the legacy `tailwind.config.js` structure.
- **State Management:** Local component state (`useState`) and reference-based hooks (`useRef`).

### Component Hierarchy
```
App
├── Header (Logo click, Theme toggle button)
└── ChatBot (Main chat coordinator)
    ├── WelcomeScreen (Quick topics grid)
    ├── MessageBubble (React-Markdown rendering)
    ├── TypingIndicator (Staggered bounce dots)
    ├── ChatInput (Textarea, Send button, Length indicator)
    └── Toast (Dismissible alert dialog)
```

---

## Phase 2 — Security Implementation Plan

### 1. Secret Management
- **Why It Exists:** Currently, `GROQ_API_KEY` is loaded directly with `os.getenv` without checking if it is `None`. This leads to silent failures and cryptic tracebacks during API usage. `SECRET_KEY` uses `os.environ` but doesn't validate key strength, meaning weak placeholder keys can pass.
- **Risk Level:** **High** (Operational fragility, credential leakage).
- **Files Affected:** `backend/home/settings.py`, `backend/uniapi/views.py`, Root `.gitignore`.
- **Implementation Strategy:**
  1. Create a dedicated backend `.gitignore` file to ensure local `.env` and `db.sqlite3` are not tracked.
  2. Add startup validation in `settings.py` throwing `ImproperlyConfigured` if `GROQ_API_KEY` is missing or if `SECRET_KEY` is the default placeholder.
  3. Lazy-initialize the Groq client inside a helper method in `views.py` instead of the global scope.
- **Dependencies:** None.
- **Rollback Plan:** Remove startup check statements in `settings.py`.

### 2. API Abuse Protection
- **Why It Exists:** The endpoint `/api/chat_with_unihelp/` has no rate-limiting or throttling. Anyone can issue arbitrary requests, exhausting API quotas.
- **Risk Level:** **Critical** (Financial exhaustion, DoS).
- **Files Affected:** `backend/home/settings.py`, `backend/uniapi/views.py`, `frontend/nginx.conf`.
- **Implementation Strategy:**
  1. Configure DRF throttling using `AnonRateThrottle` and `UserRateThrottle` (20/min anonymous, 60/min authenticated).
  2. Use a local memory cache (`LocMemCache`) for session storage, prepared for Redis in production.
  3. Restrict incoming payload lengths to 1000 characters on both backend (`views.py`) and frontend, rejecting larger payloads with HTTP 400.
  4. Restrict Django Admin endpoint (`/admin/`) in Nginx to authorized IPs only.
  5. Setup Nginx request rate limiting (`limit_req_zone`).
- **Dependencies:** Throttling requires a configured cache.
- **Rollback Plan:** Remove DRF throttling classes and Nginx rate-limiting lines.

### 3. XSS Protection
- **Why It Exists:** Rendered markdown from the LLM has no strict sanitization schema, making it possible to execute malicious hyperlink payloads (e.g. `javascript:alert`). The frontend encodes user input pre-transmission, causing garbled text to be sent to the LLM classifier.
- **Risk Level:** **High** (Session hijack, XSS execution).
- **Files Affected:** `frontend/src/components/chat/MessageBubble.tsx`, `frontend/src/lib/utils.ts`, `frontend/nginx.conf`, `backend/home/settings.py`.
- **Implementation Strategy:**
  1. Install `rehype-sanitize` and `remark-gfm` in the React frontend.
  2. Define a strict sanitization schema allowing only secure protocols (`http`, `https`) on link anchors.
  3. Fix `sanitizeInput` in `utils.ts` to only trim and normalize whitespace. Sanitization is performed on the output side, not pre-transmission.
  4. Configure strict Content Security Policy (CSP) headers in both Nginx and Django settings middleware.
- **Dependencies:** `rehype-sanitize` and `django-csp` packages.
- **Rollback Plan:** Revert custom rehype plugins and clean up CSP headers.

### 4. Error Handling
- **Why It Exists:** Catch-all blocks in `views.py` expose stack traces and raw Groq SDK error text (e.g. key details, rate-limits) to the client.
- **Risk Level:** **High** (Information disclosure).
- **Files Affected:** `backend/uniapi/views.py`, `backend/home/settings.py`, `backend/uniapi/exceptions.py` (new).
- **Implementation Strategy:**
  1. Catch specific exceptions (e.g., `groq.RateLimitError`, `groq.APIConnectionError`) and return user-safe, localized error messages.
  2. Create a custom DRF exception handler to normalize validation outputs.
  3. Configure Django's logging module to log detailed raw stack traces internally.
  4. Add Sentry SDK integration for real-time error tracking.
- **Dependencies:** `sentry-sdk` and Groq SDK exception types.
- **Rollback Plan:** Revert exceptions and logging dictionary configuration to defaults.

---

## Phase 3 — Frontend Redesign Plan

### Target Aesthetics: Bento + Future Minimalism
Discard flat, template-like UI elements and transition to a modern glass, bento-centric product space.

### Key Visual Concepts:
- **Bento Grid Layout:** Asymmetric column and row spans for options grid instead of uniform blocks.
- **Glassmorphism:** Use of backdrop-filters, semi-transparent card panels, and sub-pixel highlight borders.
- **Ambient Gradients:** Drifting mesh gradients in the background instead of plain gray/white screens.
- **Typography Hierarchy:** Satoshi font for geometric headers, Inter for long body passages, Cairo for RTL Arabic.
- **Micro-Interactions:** Hover-states with active spring physics (`cubic-bezier(0.34, 1.56, 0.64, 1)`), and responsive, nested send CTAs.

---

## Phase 4 — Design System Specification

### 1. Colors
- **Light:** Canvas `#F8F9FA`, Mesh-1 `rgba(22, 163, 74, 0.04)`, Surface-glass `rgba(255, 255, 255, 0.75)`, Text `#0F172A`/`#334155`, Brand `#16A34A`.
- **Dark:** Canvas `#090D16`, Mesh-1 `rgba(34, 197, 94, 0.06)`, Surface-glass `rgba(15, 23, 42, 0.65)`, Text `#F8FAF8`/`#CBD5E1`, Brand `#22C55E`.

### 2. Layout & Spacing
- **Base Grid:** 4px grid steps (4, 8, 12, 16, 24, 32, 48, 64px).
- **Corner Radii:** Badges: `4px`, Inputs: `8px`, Cards: `16px`, Panels: `24px`, Buttons: `9999px`.
- **Breakpoints:** Mobile (sm) `<640px`, Tablet (md) `640px-1024px`, Desktop (lg) `1024px-1280px`.

### 3. Motion Curves
- **Standard Easing:** `cubic-bezier(0.25, 1, 0.5, 1)` (duration: 150ms).
- **Spring Easing:** `cubic-bezier(0.34, 1.56, 0.64, 1)` (duration: 250ms).

---

## Phase 5 — Component Audit & Refactoring Plan

- **`App.tsx`:** Fix dual welcome/chat state, replace imperative refs with context variables, and add ErrorBoundary.
- **`Header.tsx`:** Fix invalid `<button>` wrapping HTML, add `aria-hidden` attributes to decorative SVGs, and improve focus indicator styling.
- **`Toast.tsx`:** Capture closure handlers correctly using a reference, implement specialized success/info icons, andPortal mount container to document body.
- **`ui/card.tsx` / `ui/button.tsx`:** Add size and variant options to dynamic component files (`glass`, `featured`, `standard`).
- **`chat/TypingIndicator.tsx`:** Add aria-live role announcements for screen readers.
- **`chat/ChatBot.tsx` / `chat/ChatInput.tsx`:** Memoize bubbles, optimize viewport heights on mobile, and nested button layout.

---

## Phase 6 — Page-by-Page Plan

- **App Navigation:** Glass header, responsive text details, custom theme toggler.
- **Welcome Page:** Dynamic header, Satoshi typography, asymmetric Bento Grid layout.
- **Chat Interface:** Center stream (max 720px), custom bubble styles, code block copies, floating pill-shaped input dock.
- **State Layouts:** Skeleton loading states for Bento grid cards, redesigned error blocks.

---

## Phase 7 — Implementation Roadmap

- **Milestone A — Security Foundation:** rate limits, payload sizes, sanitization, and security headers.
- **Milestone B — Core Design System:** font stacks, light/dark themes, and CSS variables.
- **Milestone C — UI Components:** rebuilt buttons, card systems, and textareas.
- **Milestone D — App Shell & Navigation:** responsive header, fixed viewport heights, and mesh background.
- **Milestone E — Welcome Screen & Bento Grid:** asymmetric Bento cards and staggered mounting animations.
- **Milestone F — Chat Experience:** redesigned message bubbles, input pill, and typing indicators.
- **Milestone G — Responsive & Viewports:** mobile and tablet viewport optimization, touch target sizes.
- **Milestone H — Motion & Animations:** spring curves, mesh drifting movement.
- **Milestone I — Accessibility (A11y) Remediation:** loop keyboards, focus states, screen-reader announcements.
- **Milestone J — Code-Splitting & Optimization:** lazy-loading, bundle audits.

---

## Phase 8 — Multi-Agent Execution Strategy

Tasks are executed in parallel across temporary Git branches in local worktrees:
- **Security Engineer:** Implements Milestone A. (Branch: `security/rate-limits`)
- **React & Tailwind Dev:** Implements Milestones B, C, D & E. (Branch: `design/bento-system`)
- **UX & Motion Specialist:** Implements Milestones F, G & H. (Branch: `refactor/chat-experience`)

---

## Phase 9 — Implementation Rules

1. **Approved Execution:** Code execution begins immediately upon plan storage.
2. **Commit Pipeline:** One commit per milestone change, following Conventional Commit standard.
3. **Continuous Checks:** Compile, build, typecheck, and verify accessibility/responsiveness after every change.
