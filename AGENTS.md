# UniHelp AI — Agent Instructions

## Project Overview

UniHelp AI is a bilingual (Arabic/English) AI chatbot for **Nahda University — Faculty of Computers and Information**. It provides instant, grounded academic information to students using structured institutional JSON data injected into LLM prompts.

**Core principle**: The LLM answers only from verified JSON data — no hallucination by design.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Django 6.0 + DRF 3.16, Python 3.12 |
| Frontend | React 18.3, TypeScript 5.5, Vite 5.4, Tailwind CSS 4 |
| LLM | Groq API (Llama 3.3-70B-versatile, temp=0.4, max 600 tokens) |
| Database | SQLite (dev), PostgreSQL via dj-database-url (prod) |
| UI Library | shadcn/ui (new-york style, zinc base) |
| HTTP Client | Axios with interceptors |
| Markdown | react-markdown for bot responses |
| Icons | lucide-react |
| Containers | Docker + Docker Compose (dev + prod) |
| Frontend Deploy | Netlify (SPA) |
| Backend Deploy | Railway |

## Project Structure

```
university-ai-assistant/
├── AGENTS.md               # This file — agent instructions
├── workflow.md             # Full architecture design document
├── phases.md               # Infrastructure fixes roadmap
├── pyproject.toml          # Python deps (uv/pip)
├── requirements.txt        # Pinned Python deps (MUST stay in sync)
├── Dockerfile.backend      # Multi-stage Python build
├── Dockerfile.frontend     # Multi-stage Node+Nginx build
├── docker-compose.yml      # Dev environment
├── docker-compose.prod.yml # Production environment
│
├── backend/
│   ├── home/               # Django project config
│   │   ├── settings.py     # Main settings (reads .env)
│   │   ├── urls.py         # Root URL router → /api/ + /admin/ + /health/
│   │   ├── wsgi.py
│   │   └── asgi.py
│   ├── uniapi/             # Main API app
│   │   ├── views.py        # Single endpoint: POST /api/chat_with_unihelp/
│   │   ├── urls.py         # Router for uniapi
│   │   ├── models.py       # EMPTY — no database models yet
│   │   └── tests.py        # EMPTY — no tests yet
│   ├── prompts/
│   │   ├── unihelp_template.md  # System prompt for UniHelp persona
│   │   └── classifier_prompt.md # Intent classifier (EXISTS but UNUSED)
│   ├── data/               # Knowledge base — structured JSON per domain
│   │   ├── academic_calendar.json
│   │   ├── course_registration.json
│   │   ├── exams_timetable.json
│   │   ├── fees_payments.json
│   │   ├── portal_help.json
│   │   └── results_gpa.json
│   ├── .env                # Secrets (GROQ_API_KEY, SECRET_KEY, etc.)
│   ├── manage.py
│   └── db.sqlite3
│
└── frontend/
    ├── src/
    │   ├── App.tsx                # Root: Header + ChatBot, theme toggle
    │   ├── main.tsx               # Entry point
    │   ├── index.css              # Tailwind + CSS variables (light/dark)
    │   ├── lib/
    │   │   ├── utils.ts           # cn(), sanitizeInput(), escapeHtml()
    │   │   └── services/
    │   │       └── api.ts         # Axios client → POST /api/chat_with_unihelp/
    │   └── components/
    │       ├── chat/
    │       │   ├── ChatBot.tsx     # Main chat logic, message state, welcome screen
    │       │   ├── ChatInput.tsx   # Auto-resize textarea, Enter to send
    │       │   ├── MessageBubble.tsx # Markdown-rendered message with role icon
    │       │   ├── TypingIndicator.tsx
    │       │   └── WelcomeScreen.tsx # 6 quick-topic cards
    │       ├── layout/
    │       │   └── Header.tsx      # Logo + dark mode toggle
    │       ├── common/
    │       │   └── Toast.tsx
    │       └── ui/                 # shadcn/ui components
    │           ├── button.tsx
    │           ├── card.tsx
    │           ├── badge.tsx
    │           └── textarea.tsx
    ├── package.json
    ├── vite.config.ts
    ├── nginx.conf            # Reverse proxy → backend:8000
    └── netlify.toml
```

## Dev Commands

### Backend
```bash
# Setup (from repo root — shared .venv for the whole project)
uv sync --frozen
source .venv/bin/activate

# Run
cd backend
python manage.py migrate
python manage.py runserver          # localhost:8000

# With Docker
docker compose up backend           # localhost:8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev                         # localhost:5173

# With Docker
docker compose up frontend          # localhost:5173
```

### Full Stack
```bash
docker compose up                   # Both services
docker compose -f docker-compose.prod.yml up  # Production-like
```

### Lint & Typecheck
```bash
# Frontend
cd frontend && npm run lint         # ESLint
cd frontend && npx tsc -b            # TypeScript check (solution-style config)

# Backend
ruff check backend/                 # Python lint
ruff format backend/                # Python format
mypy backend/                       # Type checking (if configured)
```

## Architecture — Current State

**Single endpoint**: `POST /api/chat_with_unihelp/` → `{"message": "..."}` → `{"response": "..."}`

Flow:
1. Frontend sends user message to backend
2. Backend loads system prompt from `prompts/unihelp_template.md`
3. Backend sends `[system_prompt, user_message]` to Groq API
4. Backend returns LLM response to frontend
5. Frontend renders with markdown

**Critical**: Currently stateless — each request is independent. No conversation history, no user identity, no data injection.

## Architecture — Target State

See `workflow.md` for the full target architecture:
- 5 microservices (Auth, Chatbot, Conversation, Analytics, Knowledge)
- PostgreSQL + Redis + Celery
- JWT authentication with university SSO
- Conversation memory with summarization
- Token tracking and analytics
- Multi-college extensibility

## Critical Known Issues

### 1. JSON Data Never Injected Into LLM Context
The system prompt (`unihelp_template.md`) says "Answer ONLY from the provided JSON data" but the 6 JSON files in `backend/data/` are **never loaded or included** in the prompt sent to Groq. The LLM has no access to the actual knowledge. This is the #1 bug.

### 2. Intent Classifier Unused
`backend/prompts/classifier_prompt.md` defines an intent classifier that routes queries to domain-specific handlers, but it is never imported or called in any Python file.

### 3. ~~requirements.txt Out of Sync~~ ✅ Fixed
`pyproject.toml` lists: django, django-cors-headers, djangorestframework, dj-database-url, groq, gunicorn, psycopg, python-dotenv, whitenoise.
`requirements.txt` is now generated from `uv export` and includes all dependencies with hashes.

### 4. No Database Models
`backend/uniapi/models.py` is empty. No Conversation, Message, or User models exist.

### 5. No Authentication
The API endpoint is fully public — no JWT validation, no user identification.

### 6. No Tests
Both `backend/uniapi/tests.py` and frontend have no test files.

## Code Conventions

### Backend (Python/Django)
- Django 6.0 patterns with DRF
- Views use `@api_view` decorators (function-based)
- Settings read from environment via `python-dotenv`
- Use `dj-database-url` for database config from `DATABASE_URL` env var
- System prompts stored as `.md` files in `backend/prompts/`
- Knowledge base as JSON in `backend/data/`
- `whitenoise` for static file serving

### Frontend (TypeScript/React)
- Functional components with `memo()` for performance
- `useCallback` / `useMemo` for expensive operations
- Tailwind CSS via `@tailwindcss/vite` plugin (v4)
- shadcn/ui components in `src/components/ui/`
- Custom components in `src/components/chat/`, `src/components/layout/`
- `cn()` utility from `@/lib/utils` for class merging
- `@/` path alias maps to `src/`
- Dark mode via CSS class (`.dark` on `<html>`)
- Theme persisted to `localStorage`
- Input sanitization on frontend (`sanitizeInput()`) before API calls
- Error handling via Axios interceptors in `api.ts`

## Environment Variables

```bash
# Backend (.env)
SECRET_KEY=...
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
CSRF_TRUSTED_ORIGINS=http://localhost:8000
CORS_ALLOWED_ORIGINS=http://localhost:5173
GROQ_API_KEY=gsk_...              # Groq API key
DATABASE_URL=postgresql://...      # Optional, defaults to SQLite

# Frontend (.env)
VITE_API_URL=http://localhost:8000 # Backend URL
```

## API Contract

```
POST /api/chat_with_unihelp/
Request:  { "message": "string" }
Response: { "response": "string" }
Error:    { "error": "string" }  (status 500)

GET /health/
Response: { "status": "healthy" }
```

## Security Notes

- `.env` contains real API keys — must stay in `.gitignore`
- Frontend input sanitization strips XSS patterns before transmission
- Backend has CORS whitelist, CSRF protection, HSTS in production
- `whitenoise` serves static files with compression
- No rate limiting implemented yet
- No authentication — anyone can use the chatbot

## Workflow Reference

- `workflow.md` — Complete architecture design, target state, data flows, API contracts, database schemas
- `phases.md` — Ordered infrastructure fixes (no new features until foundation is solid)
