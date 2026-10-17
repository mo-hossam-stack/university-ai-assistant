<!-- <!-- # Phases — Infrastructure Fixes Roadmap

> **Rule**: No new features until the foundation is solid. Every phase below fixes
> a broken or missing piece of infrastructure. Complete each phase before moving
> to the next.

---

<!-- ## Phase 0 — Critical Bugs (things that are broken today) (done)

### 0.1 JSON Knowledge Base Not Injected Into LLM Context
**File**: `backend/uniapi/views.py`
**Problem**: The system prompt (`unihelp_template.md`) tells the LLM to "Answer ONLY from the provided JSON data" but the 6 JSON files in `backend/data/` are never loaded or sent to the Groq API. The LLM has zero access to the actual university knowledge.
**Fix**:
- Read and load all JSON files from `backend/data/` at module level or on first request
- Inject the relevant JSON content into the system prompt or as a context message before the user message
- Two approaches:
  - **Option A (simple)**: Load all 6 JSON files and include them in the system prompt. Simple but token-heavy.
  - **Option B (intended)**: Wire the intent classifier first (Phase 0.2), then load only the relevant JSON per classified intent. Token-efficient.
- **Decision**: Start with Option A as an immediate fix, then migrate to Option B in Phase 1.
**Verification**: Send a test query like "How do I calculate GPA?" and confirm the response references actual grade data from `results_gpa.json`. -->

<!-- ### 0.2 Intent Classifier Exists But Is Unused
**Files**: `backend/prompts/classifier_prompt.md`, `backend/uniapi/views.py`
**Problem**: `classifier_prompt.md` defines a prompt that classifies user queries into 7 categories (course_registration, academic_calendar, fees_payments, results_gpa, exams_timetable, portal_help, OUT_OF_SCOPE). It is never imported or called.
**Fix**:
- Create a classification step in `views.py`:
  1. Send user message + classifier prompt to Groq (fast classification call)
  2. Parse the one-word response to determine intent
  3. Load only the matching JSON file from `backend/data/`
  4. Inject that JSON as context into the main chat prompt
- The classifier call should be lightweight (low max_tokens, can reuse the same Groq client)
**Verification**: Send "What are the exam dates?" and confirm only `exams_timetable.json` is loaded, not all 6 files. -->

<!-- ### 0.3 requirements.txt Out of Sync
**Files**: `requirements.txt`, `pyproject.toml`
**Problem**: `requirements.txt` is missing packages that are in `pyproject.toml` and actually used:
- `django-cors-headers` — used in `INSTALLED_APPS` and `MIDDLEWARE`at
- `dj-database-url` — used in `settings.py`
- `groq` — the primary LLM client
- `gunicorn` — production WSGI server
- `psycopg` — PostgreSQL adapter
- `python-dotenv` — loads `.env` in `settings.py`
- `whitenoise` — used in `MIDDLEWARE` and `STATICFILES_STORAGE`
- ~~`openai` — listed in pyproject.toml but should be evaluated (Groq is the primary API)~~ **Removed**: no imports found in codebase
**Fix**:
- ✅ Removed `openai` from `pyproject.toml` (no imports in codebase)
- ✅ Added `whitenoise>=6.7.0` to `pyproject.toml` (used in settings.py but was undeclared)
- ✅ Regenerated `uv.lock` via `uv lock`
- ✅ Regenerated `requirements.txt` via `uv export --format requirements.txt`
**Verification**: ✅ `uv sync --frozen` installs correctly, `python manage.py check` passes, all imports verified in clean venv. -->

---

## Phase 1 — Backend Infrastructure

> Split into 6 PRs. Each PR is a single, reviewable unit that leaves the
> codebase in a working state. No PR introduces behavioral changes unless
> explicitly stated.

### Target Architecture

The restructured backend follows a layered pattern that scales into Phase 2+:

```
views.py          → thin HTTP layer (serializers, status codes, Response)
    ↓
services/chat.py  → orchestration (classifier → knowledge → LLM, later: conversation, tokens)
    ↓
services/         → domain services
    classifier.py  — intent classification
    knowledge.py   — JSON data loading, context building
    llm.py         — Groq client wrapper
```

This makes adding conversation memory, token counting, retries, and streaming
a matter of adding to `ChatService` without touching the view layer.

### Target Structure

```
backend/uniapi/
├── __init__.py
├── apps.py
├── models.py              # Conversation, Message
├── admin.py               # Registered models with inlines
├── serializers.py         # DRF request/response validation
├── views.py               # Thin HTTP layer — delegates to ChatService
├── urls.py
├── tests.py
├── services/
│   ├── __init__.py
│   ├── chat.py            # ChatService — orchestrates the full flow
│   ├── llm.py             # Groq client wrapper (lazy init)
│   ├── classifier.py      # Intent classification
│   └── knowledge.py       # JSON data loading + context building
├── prompts/               # Moved from backend/prompts/
│   ├── unihelp_template.md
│   └── classifier_prompt.md
├── data/                  # Moved from backend/data/
│   └── *.json
└── migrations/
```

---

<!-- <!-- ### PR 1 — Project Restructure (Task 1.3)

**Goal**: Refactor from monolithic `views.py` to layered architecture.
**Zero behavioral changes.** The API contract, response shape, and LLM behavior
all stay identical. This is pure refactoring.

#### 1.3A — Move Folders

- Create `backend/uniapi/services/` with empty `__init__.py`
- Move `backend/prompts/` → `backend/uniapi/prompts/`
- Move `backend/data/` → `backend/uniapi/data/`
- Fix path constants in `views.py`:
  ```python
  # OLD (parent.parent = backend/)
  PROMPTS_DIR = Path(__file__).resolve().parent.parent / "prompts"
  DATA_DIR = Path(__file__).resolve().parent.parent / "data"

  # NEW (parent = uniapi/)
  PROMPTS_DIR = Path(__file__).resolve().parent / "prompts"
  DATA_DIR = Path(__file__).resolve().parent / "data"
  ```

**Checkpoint**: `python manage.py runserver` starts, chat endpoint works. -->

#### 1.3B — Extract LLM Service

Create `services/llm.py`:
```python
from groq import Groq
from django.conf import settings

_client: Groq | None = None

def get_groq_client() -> Groq:
    global _client
    if _client is None:
        _client = Groq(api_key=settings.GROQ_API_KEY)
    return _client
```

Update `views.py`: replace module-level `client = Groq(...)` with
`from .services.llm import get_groq_client` and call it inside the view.

**Checkpoint**: `python manage.py runserver`, chat works.

#### 1.3C — Extract Classifier

Create `services/classifier.py`:
- Move `OUT_OF_SCOPE`, `CLASSIFIER_TIMEOUT`, `INTENT_DATA_MAP` (the intent→filename keys), `load_classifier_prompt()`, `classify_intent()` from `views.py`
- Update `PROMPTS_DIR` to point to `Path(__file__).resolve().parent.parent / "prompts"` (services/ is one level deeper)
- Keep `INTENT_DATA_MAP` in `classifier.py` (classifier owns the intent→file mapping)

**Checkpoint**: `python manage.py runserver`, chat works.

#### 1.3D — Extract Knowledge Service

Create `services/knowledge.py`:
- Move `load_knowledge_for_intent()`, `build_system_prompt()` from `views.py`
- Move `_per_intent_cache` and `_template_cache` here
- Update `DATA_DIR` to `Path(__file__).resolve().parent.parent / "data"`
- `INTENT_DATA_MAP` is imported from `classifier.py`

**Checkpoint**: `python manage.py runserver`, chat works.

#### 1.3E — Refactor Views into Orchestrator

Create `services/chat.py` — the `ChatService`:
```python
class ChatService:
    def chat(self, user_message: str) -> dict:
        intent = classify_intent(user_message)
        system_prompt = build_system_prompt(intent)
        client = get_groq_client()

        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message},
            ],
            temperature=0.4,
            max_tokens=600,
        )
        return {"response": response.choices[0].message.content}
```

Refactor `views.py` to a thin orchestrator:
```python
@api_view(["POST"])
def chat_with_unihelp(request):
    user_message = request.data.get("message", "")
    service = ChatService()
    result = service.chat(user_message)
    return Response(result)
```

**Checkpoint**: `python manage.py runserver`, full chat flow works end-to-end.

#### PR 1 Verification

- Server starts without errors
- `POST /api/chat_with_unihelp/` with a real message → valid response
- No behavioral change from before the restructure

--- --> -->

<!-- ### PR 2 — Database Models (Task 1.1)

**Goal**: Define the data schema for conversation memory (Phase 2).
**No Docker changes. No serializers. No behavior changes.**

#### Add `DEFAULT_AUTO_FIELD` to `settings.py`

```python
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
```

#### Create models in `backend/uniapi/models.py`

```python
class Conversation(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self) -> str:
        return f"Conversation {self.id}"


class Message(models.Model):
    class Role(models.TextChoices):
        USER = "user", "User"
        ASSISTANT = "assistant", "Assistant"
        SYSTEM = "system", "System"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    conversation = models.ForeignKey(
        Conversation, on_delete=models.CASCADE, related_name="messages"
    )
    role = models.CharField(max_length=20, choices=Role.choices)
    content = models.TextField()
    tokens_used = models.PositiveIntegerField(default=0)
    intent = models.CharField(max_length=50, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]
```

Design decisions:
- **UUID PKs**: No sequential ID leakage in URLs.
- **`Role` as TextChoices**: Type-safe, works with admin dropdowns.
- **`intent` on Message**: Stores classified intent for analytics (tiny cost, big value later).
- **No `user` FK**: Auth deferred to Phase 2.4. Adding later is a simple FK.
- **`ordering`**: Messages chronological, conversations newest-first.

#### Register in admin

```python
class MessageInline(admin.TabularInline):
    model = Message
    extra = 0
    readonly_fields = ("role", "content", "tokens_used", "intent", "created_at")

@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
    list_display = ("id", "title", "created_at", "updated_at")
    inlines = [MessageInline]
```

#### Generate and run migrations

```bash
python manage.py makemigrations uniapi
python manage.py migrate
```

#### PR 2 Verification

- `python manage.py migrate` completes without errors
- `python manage.py shell` — create Conversation, add Messages, verify FK
- `/admin/` — models visible with inlines

--- -->

<!-- ### PR 3 — PostgreSQL for Dev Parity (Task 1.2)

**Goal**: Dev and prod use the same database engine. Catch schema drift early.
**Infrastructure-only PR. No code changes.**

#### Add PostgreSQL service to `docker-compose.yml`

```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: unihelp
      POSTGRES_USER: unihelp
      POSTGRES_PASSWORD: unihelp_dev
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U unihelp -d unihelp"]
      interval: 5s
      timeout: 5s
      retries: 5

  backend:
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      DEBUG: "True"
      DATABASE_URL: postgresql://unihelp:unihelp_dev@postgres:5432/unihelp
```


#### Update `backend/.env.example`

Add `DATABASE_URL` with both SQLite and PostgreSQL examples.

#### Add `pgdata` volume to `docker-compose.yml`

```yaml
volumes:
  pgdata:
```

No `settings.py` changes needed — `dj-database-url` picks up `DATABASE_URL`
automatically, and falls back to SQLite when it's not set.

#### PR 3 Verification

- `docker compose up postgres` — healthcheck passes
- `python manage.py migrate` — tables created in Postgres
- Remove `DATABASE_URL` from `.env` → falls back to SQLite (regression check)

---
 -->
<!-- ### PR 4 — Error Handling and Logging (Task 1.4)

**Goal**: Structured error responses with codes. Observable logs with context.
**Changes behavior**: error responses now include `code` field.

#### Configure Django logging in `settings.py`

```python
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {
            "format": "[{asctime}] {levelname} {name} {message}",
            "style": "{",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "verbose",
        },
    },
    "root": {
        "handlers": ["console"],
        "level": "INFO",
    },
    "loggers": {
        "django": {
            "handlers": ["console"],
            "level": os.getenv("DJANGO_LOG_LEVEL", "INFO"),
            "propagate": False,
        },
        "uniapi": {
            "handlers": ["console"],
            "level": "DEBUG" if DEBUG else "INFO",
            "propagate": False,
        },
    },
}
```

#### Add specific exception handling in `views.py`

Catch in order of specificity:
1. `groq.AuthenticationError` → 503, `LLM_AUTH_ERROR`
2. `groq.RateLimitError` → 429, `LLM_RATE_LIMIT`
3. `groq.APIError` → 503, `LLM_API_ERROR`
4. `json.JSONDecodeError` → 502, `LLM_PARSE_ERROR`
5. `FileNotFoundError` → 503, `MISSING_RESOURCE`
6. `Exception` → 500, `INTERNAL_ERROR` (with `logger.exception()`)

All error responses: `{"error": "user-friendly message", "code": "ERROR_CODE"}`.
No stack traces in API responses — only in logs.

#### Add error handling in services

- `services/classifier.py`: catch `groq.APIError` → log warning, return `OUT_OF_SCOPE`
- `services/knowledge.py`: catch `json.JSONDecodeError` → log error, return `""`

#### PR 4 Verification

- Missing `GROQ_API_KEY` → structured error, not traceback
- Empty message → 400 with `EMPTY_MESSAGE`
- Logs show structured lines with timestamps

--- -->

<!-- ### PR 5 — Type Hints (Task 1.5)

**Goal**: Type safety across all backend Python files.
**Non-functional change.** No behavior difference.

#### Add `from __future__ import annotations` to all `.py` files

#### Type annotate every function signature

- `services/llm.py`: `def get_groq_client() -> Groq`
- `services/classifier.py`: `def classify_intent(user_message: str) -> str`
- `services/knowledge.py`: `def build_system_prompt(intent: str) -> str`
- `services/chat.py`: `def chat(self, user_message: str) -> dict[str, str]`
- `views.py`: `def chat_with_unihelp(request: Request) -> Response`

#### Add `mypy` config to `pyproject.toml`

```toml
[tool.mypy]
python_version = "3.12"
strict = false
warn_return_any = true
warn_unused_configs = true
ignore_missing_imports = true

[[tool.mypy.overrides]]
module = ["groq.*"]
ignore_missing_imports = true
```

#### Add `mypy` to dev dependencies

```bash
uv add --dev mypy
```

#### PR 5 Verification

```bash
uv run mypy uniapi/ --ignore-missing-imports  # 0 errors
```

--- -->

<!-- ### PR 6 — DRF Serializers (Task 1.6)

**Goal**: Input validation via DRF serializers instead of raw `request.data.get()`.
**Changes behavior**: invalid input returns 400 with field errors, not 500.

#### Create `backend/uniapi/serializers.py`

```python
class ChatRequestSerializer(serializers.Serializer):
    message = serializers.CharField(max_length=1000, min_length=1)
    conversation_id = serializers.UUIDField(required=False, allow_null=True)

class ChatResponseSerializer(serializers.Serializer):
    response = serializers.CharField()
    conversation_id = serializers.UUIDField()
    tokens_used = serializers.IntegerField(required=False, default=0)

class MessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Message
        fields = ("id", "role", "content", "tokens_used", "intent", "created_at")

class ConversationSerializer(serializers.ModelSerializer):
    messages = MessageSerializer(many=True, read_only=True)
    class Meta:
        model = Conversation
        fields = ("id", "title", "created_at", "updated_at", "messages")
```

#### Integrate into `views.py`

```python
@api_view(["POST"])
def chat_with_unihelp(request):
    serializer = ChatRequestSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    user_message = serializer.validated_data["message"]
    # ... delegate to ChatService
```

`ConversationSerializer` and `MessageSerializer` are defined here for Phase 2
but not wired into views yet.

#### PR 6 Verification

- `{"message": ""}` → 400 with validation error
- `{"message": "hi", "conversation_id": "not-a-uuid"}` → 400
- `{"message": "hi"}` → 200, works normally
- No body → 400 with "message" required error

--- -->

<!-- ### Final Integration Verification (After All 6 PRs)

Run once after merging all PRs:

```bash
# Structure
ls backend/uniapi/services/{chat,llm,classifier,knowledge}.py  # all exist
ls backend/uniapi/prompts/  # moved
ls backend/uniapi/data/     # moved

# Server + Chat
python manage.py runserver
curl -X POST http://localhost:8000/api/chat_with_unihelp/ \
  -H "Content-Type: application/json" \
  -d '{"message": "How do I calculate GPA?"}'
# → response references results_gpa.json

# Validation
curl -X POST http://localhost:8000/api/chat_with_unihelp/ \
  -d '{"message": ""}'
# → 400

# Database
python manage.py migrate
python manage.py shell -c "from uniapi.models import Conversation; print(Conversation.objects.count())"

# Admin
visit /admin/ — models visible

# PostgreSQL
docker compose up postgres → healthcheck passes → migrate works

# Type check
uv run mypy uniapi/ --ignore-missing-imports  # 0 errors

# Logs
trigger error → structured logs in console
```

--- --> -->

## Phase 2 — Core Features (foundation for everything else)

> These are the minimum features needed before the app is usable as designed.
> Not "new features" — they complete the architecture that was always intended.

### 2.1 Conversation Memory (Store Messages)
**Files**: `backend/uniapi/services/` (new files), `backend/uniapi/views.py`
**Problem**: Each request is stateless. The bot forgets everything between messages.
**Fix**:
- After each LLM call, save both user message and assistant response to the database
- Create a `Conversation` automatically on first message
- Associate subsequent messages with the same conversation (via conversation_id sent from frontend)
- Create services:
  - `services/conversation.py` — create conversation, add message, get history
- Update the view to:
  1. Accept optional `conversation_id` in request
  2. If provided, load existing conversation's messages
  3. If not provided, create new conversation
  4. Build context: system_prompt + last N messages + current user message
  5. Send to LLM
  6. Save both messages to database
  7. Return response + conversation_id
**Verification**: Send two related messages with the same `conversation_id`. The bot should reference context from the first message.

### 2.2 Frontend Conversation Persistence
**Files**: `frontend/src/components/chat/ChatBot.tsx`, `frontend/src/lib/services/api.ts`
**Problem**: Frontend state is in-memory only. Page refresh loses everything.
**Fix**:
- Update `api.ts` to send and receive `conversation_id`
- Store `conversation_id` in component state after first message
- Include `conversation_id` in subsequent API calls
- Optionally: store conversation list in localStorage for "continue previous chat" UX
- Update the API contract:
  ```
  POST /api/chat_with_unihelp/
  Request:  { "message": "string", "conversation_id": "uuid" (optional) }
  Response: { "response": "string", "conversation_id": "uuid", "tokens_used": int }
  ```
**Verification**: Send messages, refresh page, confirm conversation can be resumed (or new one starts cleanly).

### 2.3 Basic Rate Limiting
**Files**: `backend/home/settings.py`, new middleware or DRF throttling
**Problem**: No rate limiting. Anyone can spam the endpoint and burn Groq API credits.
**Fix**:
- 
- For authenticated users (Phase 2.4), add per-user throttling
- Return `429 Too Many Requests` with `Retry-After` header
**Verification**: Send 31 requests in under a minute. The 31st returns 429.

### 2.4 Basic Authentication (Optional — defer if SSO not ready)
**Files**: New `backend/uniapi/services/auth.py`, `backend/uniapi/views.py`
**Problem**: No user identification. Cannot associate conversations with users.
**Fix (minimal)**:
- Create a simple token-based auth (not full JWT yet):
  - User sends a university email → generates a session token
  - Store token in `UserSession` model
  - Validate token on each request
- This is a placeholder until SSO integration is designed
- **Alternative**: Skip auth entirely for now and focus on conversation memory. Auth can come after the core chat pipeline works correctly.
**Decision**: Defer to after Phase 2.1-2.3 are stable. Conversation memory works without auth.

---

## Phase 3 — Quality and Readiness

### 3.1 Backend Test Suite
**Files**: `backend/uniapi/tests.py`, new test files
**Problem**: Zero tests. No safety net for refactoring.
**Fix**:
- Write tests for:
  - `views.py`: chat endpoint (valid message, empty message, too-long message, missing fields)
  - `services/llm.py`: mock Groq API calls, test error handling
  - `services/classifier.py`: test intent classification with known inputs
  - `services/knowledge.py`: test JSON loading, context building
  - `serializers.py`: test validation rules
  - Models: test Conversation and Message creation, foreign key relationships
- Use Django's `TestCase` and DRF's `APITestCase`
- Mock the Groq API in all tests (never hit the real API in tests)
- Aim for: all critical paths covered, edge cases for input validation
**Verification**: `python manage.py test` passes with 0 failures.

### 3.2 Frontend Lint & Type Check Cleanup
**Files**: Various `.tsx` and `.ts` files
**Problem**: No verification that frontend code is clean.
**Fix**:
- Run `npm run lint` and fix all warnings/errors
- Run `npx tsc -b` and fix all type errors
- Fix any `noUnusedLocals` or `noUnusedParameters` issues
- Ensure all components have proper prop types
**Verification**: Both `npm run lint` and `npx tsc -b` pass with 0 errors.

### 3.3 Environment Config Validation
**Files**: `backend/home/settings.py`, new `backend/uniapi/checks.py`
**Problem**: Missing env vars cause cryptic runtime errors (e.g., `KeyError: 'SECRET_KEY'`).
**Fix**:
- Add Django system checks that validate required environment variables at startup
- Create a `.env.example` that is complete and documented (current one is incomplete)
- Add a startup check: if `GROQ_API_KEY` is missing, fail loudly with a clear message
- Document all required vs optional env vars in one place
**Verification**: Start backend without `.env` → get a clear error message about missing `GROQ_API_KEY`, not a cryptic traceback.

---

## Execution Order

```
Phase 0 (done)
    ├── 0.3 fix requirements.txt
    ├── 0.1 inject JSON data into LLM context
    └── 0.2 wire intent classifier
    ↓
Phase 1 (backend infrastructure)
    ├── PR 1  restructure backend     (1.3A→B→C→D→E, refactoring only)
    ├── PR 2  database models         (1.1, no Docker)
    ├── PR 3  PostgreSQL for dev      (1.2, infrastructure only)
    ├── PR 4  error handling/logging  (1.4, behavior change: error codes)
    ├── PR 5  type hints              (1.5, non-functional)
    └── PR 6  DRF serializers         (1.6, behavior change: validation)
    ↓
Phase 2 (core features)
    ├── 2.1  conversation memory — backend
    ├── 2.2  conversation persistence — frontend
    └── 2.3  rate limiting
    ↓
Phase 3 (quality & readiness)
    ├── 3.1  backend test suite
    ├── 3.2  frontend lint/typecheck
    └── 3.3  env config validation
```

**Estimated effort**: ~2-3 focused coding sessions.

---

## What Comes AFTER These Phases

Only after all infrastructure is solid:
- Full JWT authentication with university SSO
- Conversation summarization (Celery + Redis)
- Knowledge service with full-text search
- Analytics service with event tracking
- Admin dashboard for content management
- Multi-college support
- Mobile app (React Native)
- Caching layer (semantic + exact match)
- Token tracking per user
- WebSocket streaming for responses

None of these are started until the foundation phases above are complete.
