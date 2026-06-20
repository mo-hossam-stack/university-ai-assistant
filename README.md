# UniHelp AI -- Intelligent Conversational Assistant for Higher Education

A bilingual (Arabic/English) AI-powered assistant that delivers instant, hallucination-free answers to university students -- replacing scattered PDFs, physical notices, and repetitive administrative queries with a single conversational interface.

---

## The Problem

University students navigate a fragmented information ecosystem:

- **Course registration deadlines**, fee schedules, exam timetables, and GPA policies live across different PDFs, web portals, and physical bulletin boards
- **Administrative staff** spend significant time answering the same questions repeatedly -- registration steps, portal troubleshooting, calendar lookups
- **Information access is time-bound** -- students cannot get answers at 2 AM the night before a deadline
- **Language barriers** -- students switch between Arabic and English even within a single query, but static documents are monolingual

The result: frustrated students, overloaded staff, and missed deadlines.

---

## The Solution

**UniHelp AI** is a conversational assistant purpose-built for **Nahda University -- Faculty of Computers and Information** that:

- **Understands natural language** in both Arabic and English, including mixed-language queries
- **Answers exclusively from verified institutional data** -- grounded generation prevents hallucination
- **Covers 6 knowledge domains**: Course Registration, Academic Calendar, Fees & Payments, Results & GPA, Exams & Timetables, Portal Help
- **Operates 24/7** with sub-second response latency via Groq Cloud's ultra-fast LLM inference
- **Requires zero setup** -- no login, no installation, just open and ask

---

## System Architecture

### High-Level Overview

```
+------------------------------------------------------------------+
|                        CLIENT LAYER                              |
|                                                                  |
|       React 18 SPA --- Tailwind 4 --- Markdown Rendering         |
|               Netlify CDN -- Mobile-Responsive                   |
+----------------------------------+-------------------------------+
                                   | HTTPS / JSON
                                   v
+------------------------------------------------------------------+
|                       API GATEWAY (Django 6 + DRF)               |
|                                                                  |
|  CORS Whitelist -- Input Validation -- Auth Interceptor (ready)  |
|  CSRF Protection -- Rate Limiting (planned)                      |
+----------------------------------+-------------------------------+
                                   |
                      +------------+------------+
                      |    INTENT CLASSIFIER     |
                      |                         |
                      |   classifies query into  |
                      |   one of 7 domains       |
                      +------------+------------+
                                   |
          +------------------------+------------------------+
          |                        |                        |
          v                        v                        v
   +--------------+       +--------------+       +--------------+
   |  Agent:      |       |  Agent:      |       |  Agent:      |
   | Registration |       |  Calendar    |       |  Fees        |
   |              |       |              |       |              |
   |  loads       |       |  loads       |       |  loads       |
   |  registration|       |  calendar    |       |  fees JSON   |
   |  JSON context|       |  JSON context|       |  context     |
   +------+-------+       +------+-------+       +------+-------+
          |                        |                        |
          +------------------------+------------------------+
                                   |
                                   v
+------------------------------------------------------------------+
|                       LLM ORCHESTRATOR                           |
|                                                                  |
|  Groq Cloud -- Llama 3.3 70B -- Temperature 0.4                 |
|  Max 600 Tokens -- System Prompt + Domain Context + User Message |
+------------------------------------------------------------------+
```


```

### Data Flow (Full Pipeline)

```
User Message ---> Input Sanitization ---> POST /ai/chat_with_unihelp/
       |                                              |
       |                                              v
       |                                   Intent Classifier
       |                                    -> "fees_payments"
       |                                              |
       |                                              v
       |                                   Context Loader
       |                                    -> loads fees.json
       |                                              |
       |                                              v
       |                                   Domain Agent Prompt
       |                                    + injected JSON
       |                                              |
       |                                              v
       |                                   Groq: Llama 3.3 70B
       |                                    (domain prompt + JSON + message)
       |                                              |
       +------------------<---------------------------+
                    Grounded Markdown Response
```

---

## Design Philosophy

### 1. Grounded Generation Over Open-Ended LLM

Most chatbots let the LLM answer from its training data -- which may be outdated, incorrect, or irrelevant. UniHelp AI constrains the model to **structured institutional JSON data** embedded directly in the prompt. The model is instructed to refuse answering anything outside this data. This eliminates hallucination at the architectural level, not through post-processing.

> Principle: Trust the data, not the model's memory.

### 2. Ephemeral by Design

Conversations live only in browser state -- no database persistence, no conversation history stored server-side. This is a deliberate trade-off:

| Benefit | Trade-off |
|---|---|
| Zero PII/compliance overhead | No cross-session memory |
| Horizontally scalable backend | Each turn is stateless |
| No GDPR/data retention concerns | Cannot resume past conversations |

Future sessions will be opt-in with user consent.

### 3. Progressive Architecture

The system is designed in layers. The current single-agent deployment works fully today. The multi-agent pipeline can be activated by:

1. Wiring the Intent Classifier (prompt already written)
2. Loading the appropriate JSON file per classified intent
3. Passing domain-specific context to the LLM

No API contract changes. No frontend changes. No database migrations.

### 4. Bilingual by Design

The system prompt anchors the assistant in both Arabic and English, with explicit rules for code-switching detection. A student can ask a mixed-language query and receive a coherent bilingual response. The LLM handles the language mixing natively -- no separate language detection pipeline.

### 5. Security in Depth

| Layer | Measure |
|---|---|
| Client | Input sanitization (XSS, `javascript:`, event handlers, iframes stripped before transmission) |
| Transport | HTTPS enforced; HSTS 1 year with preload |
| API | CORS whitelist; CSRF tokens; Content-Type nosniff |
| Server | Django security middleware; SSL redirect; secure cookies; X-Frame-Options DENY |
| LLM | Prompt-level guardrails; temperature 0.4 for deterministic, safe responses |

---


**Key decisions:**
- **Stateful conversations** in React state -- no global store needed for this scope
- **Markdown rendering** via `react-markdown` -- lets the LLM format responses (lists, tables, bold) naturally
- **Welcome cards** as a UX pattern -- reduces friction by letting users discover capabilities with one click
- **Single `api.ts` service** -- centralized Axios instance with interceptors for auth, errors, and timeouts

```

**Key decisions:**
- **Single endpoint** -- the entire API surface is one POST. Simplicity over RESTful purity for a chatbot.
- **Prompt files as markdown** -- non-developers can edit prompts without touching Python code.
- **JSON data files** -- structured, version-controlled, deployable alongside code. No database queries needed for core functionality.
- **Django 6 + DRF** -- production-grade framework with built-in security, ORM (for future), and admin interface.

---

## Deployment Topology

```
                    +------------------+
                    |  GitHub Repo     |
                    |  (source of      |
                    |   truth)         |
                    +--------+---------+
                             |
              +--------------+--------------+
              | auto-deploy  | auto-deploy  |
              v              v              |
    +----------------+ +----------------+   |
    |  Netlify CDN   | |  Railway.app   |   |
    |  (Frontend)    | |  (Backend)     |   |
    |                | |                |   |
    |  React SPA     | |  Django API    +---+
    |  Global edge   | |  Groq client   |
    |  Auto HTTPS    | |  PostgreSQL    |
    +----------------+ +--------+-------+
                                |
                                v
                     +--------------------+
                     |  Groq Cloud API    |
                     |  Llama 3.3 70B     |
                     |  Ultra-low latency |
                     +--------------------+
```





---

## Local Development

### Prerequisites

- Python 3.12+
- Node.js 20+
- Groq API key (free tier available)

### Setup

```bash
# Backend
cd backend
uv venv && source .venv/bin/activate
uv pip install -r requirements.txt
cp .env.example .env 
python manage.py migrate
python manage.py runserver

# Frontend (separate terminal)
cd frontend
npm install
cp .env.example .env  # set VITE_API_URL=http://localhost:8000
npm run dev
```



## Roadmap

| Phase | Feature | Status |
|---|---|---|
| 1 | Single-pass LLM chatbot | Live |
| 2 | 6 knowledge domains in structured JSON | Live |
| 3 | Bilingual Arabic/English support | Live |
| 4 | Dark/light mode, responsive UI | Live |
| 5 | Intent Classifier -- route queries to domain-specific handlers | Prompt written, pending integration |
| 6 | Multi-Agent Pipeline -- inject domain JSON as LLM context per query | Architecture designed |
| 7 | Conversation Memory -- session-based context for follow-up questions | Planned |
| 8 | Admin Dashboard -- web UI for non-technical staff to update university data | Planned |
| 9 | Rate Limiting & Abuse Prevention | Planned |
| 10 | Comprehensive Test Suite (backend unit + frontend component) | Planned |

---
## Contribution 
feel free to contribute to this project by submitting issues, feature requests, or pull requests. Please follow the code of conduct and ensure that your contributions align with the project's goals and standards.