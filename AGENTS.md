# UniHelp AI — Agent Instructions

Bilingual (Arabic/English) AI chatbot for **Nahda University — Faculty of Computers
and Information**. It answers student questions from structured institutional JSON
injected into the prompt, so the LLM cannot invent university facts.

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Django 6.0 + DRF 3.16, Python 3.12 |
| Frontend | React 18.3, TypeScript 5.5, Vite 5.4, Tailwind CSS 4 |
| LLM | Groq API — model names come from env (`GROQ_MODEL`, `GROQ_CLASSIFIER_MODEL`) |
| Database | SQLite (dev), PostgreSQL via `dj-database-url` (prod) |
| UI | shadcn/ui (new-york, zinc), lucide-react, react-markdown |
| Quality | ruff + mypy (backend), ESLint + `tsc -b` (frontend), 42 Django tests |
| Deploy | Railway (backend, gunicorn 3 workers), Netlify (SPA), Docker Compose |

## Project Structure

```
university-ai-assistant/
├── AGENTS.md                 # this file
├── README.md                 # user-facing docs + env table
├── pyproject.toml / uv.lock  # source of truth for Python deps
├── requirements.txt          # generated via `uv export` — keep in sync
├── Dockerfile.backend / Dockerfile.frontend
├── docker-compose.yml / docker-compose.prod.yml
│
├── backend/
│   ├── home/                 # project config
│   │   ├── settings.py       # env-driven settings, logging, throttle, CORS
│   │   └── urls.py           # /api/, /admin/, /health/
│   ├── uniapi/
│   │   ├── views.py          # thin HTTP layer: validate → ChatService → error map
│   │   ├── serializers.py    # ChatRequestSerializer + read-only model serializers
│   │   ├── models.py         # Conversation, Message
│   │   ├── admin.py          # Conversation admin with Message inline
│   │   ├── checks.py         # startup checks uniapi.E001–E003
│   │   ├── exceptions.py     # DRF exception handler
│   │   ├── tests.py          # the whole backend suite (42 tests)
│   │   ├── services/
│   │   │   ├── chat.py       # ChatService — orchestrates classifier → prompt → LLM → save
│   │   │   ├── classifier.py # intent classification + INTENT_DATA_MAP
│   │   │   ├── knowledge.py  # JSON loading, per-intent cache, prompt building
│   │   │   ├── conversation.py # load/create conversation, history bounding, save
│   │   │   └── llm.py        # lazy Groq client
│   │   ├── data/             # 6 knowledge JSON files (one per intent)
│   │   └── prompts/          # unihelp_template.md, classifier_prompt.md
│   └── .env                  # secrets — never commit
│
└── frontend/
    ├── src/
    │   ├── components/chat/    # ChatBot, ChatInput, MessageBubble, WelcomeScreen
    │   ├── components/layout/  # Header
    │   ├── components/ui/      # shadcn/ui
    │   └── lib/services/api.ts # axios client, ApiError
    ├── nginx.conf / netlify.toml
    └── package.json
```

## Dev Commands

```bash
# Backend (shared .venv at repo root)
uv sync --frozen
source .venv/bin/activate
cd backend
python manage.py migrate
python manage.py runserver        # localhost:8000

# Frontend
cd frontend
npm install
npm run dev                       # localhost:5173

# Full stack
docker compose up
docker compose -f docker-compose.prod.yml up
```

### The green gate — run before claiming any change is done

```bash
cd backend && source ../.venv/bin/activate
python manage.py check && python manage.py test && ruff check . && mypy .

cd ../frontend
npm run lint && npx tsc -b && npm run build
```

Expected today: no issues, **42 tests in ~0.3s**, ruff clean, mypy clean, 0 lint
warnings, `tsc -b` exit 0. If tests take seconds or print `api.groq.com`, a real
Groq call slipped into the suite — fix that first.

## Architecture

```
POST /api/chat_with_unihelp/
  → ChatRequestSerializer (message ≤1000, optional conversation_id UUID)
  → ChatService.chat()
      1. load conversation + bounded history (20 msgs / ~6000 tokens)
      2. classify_intent(user_message) → 1 of 6 domains (or OUT_OF_SCOPE)
      3. build_system_prompt(intent) → persona + that domain's JSON
      4. Groq chat.completions.create (system + history + user)
      5. save_messages() — both messages, token counts, intent, title
  → {response, conversation_id, tokens_used}
```

- **Thin view**: all HTTP mapping lives in `views.py`; logic belongs in `services/`.
- **Stateless-by-ID**: the backend holds no session. The client sends
  `conversation_id`; unknown IDs are a 404, never a silent new conversation.
- **Bounded context**: `MAX_HISTORY_MESSAGES = 20`, `MAX_HISTORY_TOKENS = 6000`;
  a conversation hard-caps at `MAX_CONVERSATION_MESSAGES = 500` (safety net).
- **Intent → file mapping** is owned by `classifier.py` (`INTENT_DATA_MAP`).
- **Caching**: `knowledge.py` caches the template and each domain's JSON in-process.
- **Frontend**: chat state + `conversation_id` persist to `localStorage`
  (`unihelp:chat`); a stored ID that returns `CONVERSATION_NOT_FOUND` is retried
  once as a new conversation.

## API Contract

```
POST /api/chat_with_unihelp/
Request:  {"message": "string", "conversation_id": "uuid" | null}
Response: {"response": "string", "conversation_id": "uuid", "tokens_used": 0}
Error:    {"error": "human message", "code": "ERROR_CODE"}
```

| Code | Status | Meaning |
|---|---|---|
| `LLM_AUTH_ERROR` | 503 | Groq key rejected |
| `LLM_RATE_LIMIT` | 429 | Groq quota |
| `LLM_MODEL_DECOMMISSIONED` / `LLM_MODEL_ERROR` | 503 | Bad model name |
| `LLM_API_ERROR` | 503 | Groq transient failure |
| `LLM_CONFIG_ERROR` | 503 | Missing `GROQ_MODEL` or empty LLM response |
| `CONVERSATION_NOT_FOUND` | 404 | Unknown `conversation_id` |
| `CONVERSATION_FULL` | 400 | Message cap reached |
| `INTERNAL_ERROR` | 500 | Unexpected — logged with a request ID |

Also: `GET /health/` → `{"status": "healthy"}`. Anonymous throttle: 30/min per IP
(`ANON_THROTTLE_RATE`), 429 with `Retry-After`.

## Testing

- One file: `backend/uniapi/tests.py`. `TestCase`/`APITestCase`, **Groq always
  mocked** (`unittest.mock.patch` on `get_groq_client` or the client method).
- Every new branch, guard, or error mapping gets a test — the suite is the only
  safety net; frontend has no runner yet (see `ROADMAP.md` Phase 6).
- Never let a test depend on `.env` values: assert against `settings` or override.
- `manage.py check` requires `SECRET_KEY`, `GROQ_API_KEY`, `GROQ_MODEL`; in a
  fresh checkout without `.env` it fails by design with `uniapi.E001–E003`.

## Code Conventions

### Backend
- Function-based views with `@api_view`; keep them free of business logic.
- Services are plain functions/classes, no Django views imported into them.
- `from __future__ import annotations` in modules using `X | None` or forward refs.
- Full type hints; `mypy .` must stay clean. `assert isinstance(...)` where the
  ORM returns `Any`.
- Prompts are `.md` files under `uniapi/prompts/`, data is JSON under
  `uniapi/data/` — never inline a long prompt in Python.
- Log with `logger.<level>("request_id=%s ...", ...)`; never log secrets or full
  user messages at INFO in production paths.
- Error responses always go through `_error_response(message, code, status)`.

### Frontend
- Functional components, `memo()` where it pays, `useCallback`/`useMemo` for hot paths.
- `cn()` from `@/lib/utils`; `@/` maps to `src/`.
- Dark mode = `.dark` class on `<html>`, persisted in `localStorage`.
- All HTTP goes through `lib/services/api.ts`; throw `ApiError` (carries `code`)
  so callers can branch on the backend code.
- Sanitize user input with `sanitizeInput()` before sending.
- Tailwind v4 via `@tailwindcss/vite` — no `tailwind.config.js`.

## Environment Variables

```bash
# backend/.env
SECRET_KEY=            # required (uniapi.E001)
DEBUG=False
ALLOWED_HOSTS=localhost,127.0.0.1,backend
CSRF_TRUSTED_ORIGINS=http://localhost:5173
CORS_ALLOWED_ORIGINS=http://localhost:5173
GROQ_API_KEY=gsk_...   # required (uniapi.E002)
GROQ_MODEL=...         # required (uniapi.E003)
GROQ_CLASSIFIER_MODEL= # optional, defaults to GROQ_MODEL
ANON_THROTTLE_RATE=30/min
DATABASE_URL=          # optional, SQLite otherwise
DJANGO_LOG_LEVEL=INFO
SECURE_SSL_REDIRECT=   # forced on when DEBUG=False

# frontend/.env
VITE_API_URL=http://localhost:8000
```

`README.md` holds the authoritative table; `backend/.env.example` is the template.

## Security Notes

- `.env` holds real keys — it is gitignored, never print or commit it.
- The chat endpoint is **public** (no auth). Only the anonymous throttle limits abuse.
- Frontend sanitization strips XSS patterns, but treat it as UX, not a security
  boundary — the backend validates with DRF serializers.
- Errors never leak stack traces or provider internals; details go to logs with
  an `X-Request-ID`-derived `request_id`.
- CORS is an explicit allowlist; CSRF trusted origins are explicit; HSTS and SSL
  redirect turn on in production.

## Working Rules

1. Read `ROADMAP.md` before starting anything; work on one PR-scoped item at a time.
2. Do not rebuild closed work listed at the bottom of `ROADMAP.md`.
3. Never commit `backend/.env`, local planning notes, or generated `staticfiles/`.
4. Keep `requirements.txt` in sync with `pyproject.toml` (`uv export --format
   requirements.txt` after any dependency change) — the Docker build uses the lock.
5. A change is done only when the green gate passes and new logic has a test.
