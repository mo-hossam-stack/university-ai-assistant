# Remaining Fixes — Audit of `phases.md`

Audit date: 2026-10-02. Every item below was verified against the actual code.
This file lists
what is **not** done, why it matters, and in what order to knock it out.

Status legend: `[ ]` todo · `[~]` partially done

---

## Group A — One-line fixes (do these first, ~15 min total)

These are not new work. Each is a root cause with the fix already sitting in
the codebase, waiting to be wired up.

### [x] A1 — Rate-limit test hits the real Groq API
**File**: `backend/uniapi/tests.py:245-255`

```python
with patch.object(SimpleRateThrottle, "THROTTLE_RATES", {"anon": "3/min"}):
    cache.clear()
    for _ in range(3):
        self.client.post(url, {"message": "hi"}, format="json")
```

The test patches the throttle rate but never patches the LLM, so all 3 requests
hit `api.groq.com` — real network round-trips (350–540 ms each), real tokens
billed. Observed in the audit run:
`chat complete request_id=... prompt_tokens=338 completion_tokens=125 latency_ms=537`

**Why it matters**: `phases.md:637` explicitly requires *"Mock the Groq API in
all tests (never hit the real API in tests)"*. As written the suite is
non-hermetic — it fails without network, it costs money on every CI run, and it
masks the throttling it is meant to test behind LLM latency.

**Fix**: the helpers already exist at `tests.py:50` (`_patch_chat`) and
`tests.py:57` (`_patch_classifier`). Nest them in the existing `with` block.

```python
with (
    patch.object(SimpleRateThrottle, "THROTTLE_RATES", {"anon": "3/min"}),
    _patch_chat(_llm_response("hi")),
    _patch_classifier(),
):
    ...
```

**Verify**: `python manage.py test` — no `chat complete ... latency_ms=` lines in
output, and it should get *faster* (~4 s → <1 s).

---

### [x] A2 — `tokens_used` never reaches the client
**Files**: `backend/uniapi/services/chat.py:99-102`, `backend/uniapi/serializers.py:16`, `frontend/src/lib/services/api.ts:11-14`

Backend persists the token counts (`chat.py:73-76` → `conversation.py:107-110`)
and `ChatResponseSerializer` already declares the field — but the returned dict
has only two keys:

```python
return {
    "response": answer,
    "conversation_id": str(conversation.id),
}
```

**Why it matters**: `phases.md:596` defines the API contract as
`{ "response", "conversation_id", "tokens_used" }`. The data is captured and
thrown away — free observability, one dict key. Also "Token tracking per user"
is on the post-phase roadmap and currently has no read path.

**Fix**:
1. `chat.py:99` → add `"tokens_used": prompt_tokens + completion_tokens,`
2. `api.ts:11` → add `tokens_used: number` to `ChatResponse`

Note: `MessageSerializer` (`serializers.py:22`) already exposes
`prompt_tokens`/`completion_tokens` — the field was split in PR2's second
migration, but `ChatResponseSerializer` still says `tokens_used`. Keep the
response as the aggregate `tokens_used` (that is what the contract says) and
leave the message serializer alone.

**Verify**: curl the endpoint, confirm `tokens_used` is a positive int.

---

### [x] A3 — `.env.example` is missing `GROQ_MODEL`, so it produces a broken app
**File**: `backend/.env.example`

| Var | Read at | In example? |
|---|---|---|
| `GROQ_API_KEY` | `settings.py:136` | yes, line 11 |
| `GROQ_MODEL` | `settings.py:137` | **no** |
| `GROQ_CLASSIFIER_MODEL` | `settings.py:138` | **no** |

**Why it matters**: this is the worst bug in the audit. Anyone following
`README.md` (`cp .env.example .env`) gets an app where **every single request
fails**. `settings.py:137` leaves `GROQ_MODEL = None`, `chat.py:58` raises
`ValueError`, `views.py:100` maps it to `503 LLM_CONFIG_ERROR`. Worse, the
classifier silently degrades to `OUT_OF_SCOPE` at `classifier.py:57-59` with only
a log warning — so the symptom is "the bot ignores all university data", not
"the app is misconfigured".

**Fix**: add both vars, annotate required vs optional (feeds into D1):

```
# Required — chat fails with 503 LLM_CONFIG_ERROR without this
GROQ_MODEL=llama-3.3-70b-versatile
# Optional — defaults to GROQ_MODEL
GROQ_CLASSIFIER_MODEL=llama-3.3-70b-versatile
```

**Verify**: build a `.env` from the example only, `POST /api/chat_with_unihelp/`
returns 200 with a grounded answer.

---

### [x] A4 — Missing `handleGoHome` dependency
**File**: `frontend/src/components/chat/ChatBot.tsx:41-45`

```tsx
useEffect(() => {
  if (goHomeRef) {
    goHomeRef.current = handleGoHome
  }
}, [goHomeRef])
```

**Why it matters**: safe today only by luck — `handleGoHome` (line 67) is
`useCallback(..., [])` so it is referentially stable forever. The moment someone
adds a dependency to that callback, this effect silently keeps the *old* closure
and the home button breaks. `phases.md:645` says fix all warnings.

**Fix**: add it to the deps array. Zero behaviour change today.

```tsx
}, [goHomeRef, handleGoHome])
```

**Verify**: `npm run lint` → warning gone.

---

### [x] A5 — The typecheck command in `phases.md` is a no-op
**Files**: `phases.md:646,649` → `frontend/tsconfig.json:1-13`

`npx tsc --noEmit` points at a solution-style config (`"files": []` +
`references`). It checks **zero source files** — proven by
`npx tsc --noEmit --listFiles | grep -c "frontend/src"` → `0`. It would pass with
every component broken.

**Why it matters**: the Phase 3.2 acceptance criterion is unfalsifiable. Both
`3.2` and `AGENTS.md` tell future agents to run a command that proves nothing.

**Fix**: use `npx tsc -b` (what `npm run build` already runs) in both files.
Note it writes `*.tsbuildinfo` — already gitignored at `frontend/.gitignore:14`.

**Verify**: `npx tsc -b` exits 0 → currently true (real typecheck is clean,
0 errors, 16 files).

---

## Group B — Phase 3.3: Environment Config Validation

`phases.md:651-659`. **This is the next phase.** Nothing here is started.

### [~] B1 — No system checks for required env vars
`backend/uniapi/checks.py` does not exist. `manage.py check` reports
"no issues" with a completely empty environment.

Current failure behaviour is scattered and inconsistent across three layers:

| Location | Behaviour |
|---|---|
| `settings.py:15` | `os.environ["SECRET_KEY"]` → raw **`KeyError` at import** — the exact cryptic traceback `phases.md:653` targets |
| `settings.py:136` | `os.getenv("GROQ_API_KEY")` → silently `None` |
| `llm.py:20` | `ValueError("GROQ_API_KEY is not configured")` — first request |
| `chat.py:58` | `ValueError("GROQ_MODEL is not configured")` — first request |
| `classifier.py:57` | logs a warning, degrades to `OUT_OF_SCOPE` — silent |

**Fix**: `backend/uniapi/checks.py` with a `@register()` check for `GROQ_API_KEY`
(required always) and `GROQ_MODEL` (required unless you want to allow it in
tests). Verify target: `manage.py check` without `.env` → clear message naming
the missing var, not a traceback.

### [~] B2 — Required vs optional env vars not documented
`phases.md:658`. `README.md` has no env reference table — only `cp .env.example .env`.
`.env.example` also lacks `SECURE_SSL_REDIRECT` (`settings.py:160`).
Fix lands with A3 — annotate every line in `.env.example`.

---

## Group C — Phase 1 leftovers (cosmetic, low value)

### [~] C1 — Two unreachable error handlers in PR4
`phases.md:401-402` specifies `json.JSONDecodeError → 502 LLM_PARSE_ERROR` and
`FileNotFoundError → 503 MISSING_RESOURCE`. Neither string exists in the repo.

**Why they're absent (and why that's arguably fine)**: both exceptions are
already swallowed upstream by `knowledge.py:56` (returns `""`) and
`classifier.py:42,72` (fallback to `OUT_OF_SCOPE`). A handler in `views.py` could
never fire. The layered design won; the spec didn't get updated.

**Decision needed**: either add the handlers (dead code, defensive if the
swallows are ever removed) or update `phases.md:401-402` to say "swallowed in
`knowledge.py`/`classifier.py`, not surfaced". My recommendation: **update the
doc**, don't add unreachable code. Your call.

### [~] C2 — LOGGING is missing the `django` logger block
`phases.md:378-385` wants a `django` logger with `DJANGO_LOG_LEVEL`. Present:
`root` at `WARNING` (`settings.py:188`) and `uniapi` (`settings.py:190-196`).
`uniapi` is what actually matters here. Low value — set `DJANGO_LOG_LEVEL=DEBUG`
locally when debugging instead.

### [~] C3 — `from __future__ import annotations` missing in 13 files
`phases.md:426`. Present in 7 (`views.py`, `serializers.py`, `tests.py`,
`services/*.py`). Absent in `models.py`, `admin.py`, `apps.py`, `urls.py`,
`home/*.py`, `manage.py`, both migrations.

Only worth doing for files that **use** `X | None` syntax — which today is only
`views.py` and `chat.py`, both already have it. Everything else is noise.
**Recommendation: skip.** Update `phases.md:426` to "where forward refs are needed".

### [~] C4 — Test coverage gaps (`phases.md:629-635`)
14 tests pass, but no direct unit tests for `llm.py`, `classifier.py`, or
`knowledge.py` — notably the missing-`GROQ_API_KEY` `ValueError` path at
`llm.py:20`. If B1 lands, B1's check gets a test alongside it.

### [~] C5 — Ruff config missing, 16 cosmetic findings
`pyproject.toml` has no `[tool.ruff]`. Findings are 8× `I001` import sorting and
8× `RUF012` mutable-class-attr false positives on Django `Meta`/`Admin` classes.
Not a phases.md requirement. One `[tool.ruff.lint] ignore = ["RUF012"]` if you
ever wire it up.

---

## Group D — Phase 2.4: Auth (deferred)

`phases.md:609-619` explicitly defers this. Nothing exists: no `auth.py`, no
`UserSession` model, no `permission_classes`, no `DEFAULT_PERMISSION_CLASSES`.

### [ ] D1 — Orphaned frontend auth code (fix regardless of D2/D3)
`frontend/src/lib/services/api.ts:29-52`

```ts
const token = localStorage.getItem("auth_token")   // always null
...
if (status === 401) {
  localStorage.removeItem("auth_token")
  window.location.href = "/login"                   // no such route — App.tsx has no router
}
```

**Why it matters**: dead code today. The moment a 401 is ever returned, the user
gets navigated to a blank 404 with no recovery. Either implement auth or delete
these 10 lines. **Deleting is the lazy correct move if auth stays deferred** —
and then D2/D3 stay deferred too.

### [ ] D2 — Token auth (`phases.md:613-616`) — only if you want it
University email → session token → `UserSession` model, validated per request.

### [ ] D3 — Per-user throttling (`phases.md:605`) — blocked on D2
Current `AnonRateThrottle` @ 30/min (`settings.py:140-147`) is IP-based, so a
whole campus behind one NAT shares a bucket.

### [ ] D4 — 429 body breaks the `{"error","code"}` contract
`phases.md:405` says *all* error responses have that shape. DRF's throttler emits
`{"detail": "..."}` instead. Frontend papers over it at `api.ts:54-56`.
Fix with a custom `EXCEPTION_HANDLER` in settings — or accept it and amend
`phases.md:405` to exempt 429.

---

## Group E — Undocumented bugs found during the audit

Not in `phases.md` at all. Real, but not blocking.

### [ ] E1 — `ValueError` overload returns the wrong error code
`backend/uniapi/services/conversation.py:92-93` raises
`ValueError("conversation has reached its maximum message count")` at 500
messages. `views.py:100-102` catches **all** `ValueError` as a *config* error →
`503 LLM_CONFIG_ERROR`. A user hitting the limit is told the server is
misconfigured.

**Fix**: raise a dedicated exception (`ConversationFull`) mapped to
`400`/`CONVERSATION_FULL`, or add the check before entering the try block.
No test covers `MAX_CONVERSATION_MESSAGES`.

### [ ] E2 — `Conversation.title` is never populated
`models.py:11-15` defines `title` with `default=""`; nothing ever writes it.
Every conversation shows as blank in `/admin/`. Either set it from the first user
message (truncated) or delete the field.

### [ ] E3 — `ChatResponseSerializer` is entirely unused
`serializers.py:13`. Grep finds zero imports. Its `tokens_used` field is also
already stale (A2). Delete it, or wire it into the view's success path.
`phases.md:507` said "defined here for Phase 2 but not wired into views yet" —
Phase 2 has arrived and it still wasn't.

### [ ] E4 — venv is out of sync with the lockfile
Installed `groq 1.7.0`, but `uv.lock`/`requirements.txt` pin `1.1.2`.
`classifier.py:70` uses `timeout=` and `views.py:69` catches
`NotFoundError`/`BadRequestError` — API surface that moved between those
versions. Run `uv sync --frozen` before trusting local test results.

### [ ] E5 — Frontend localStorage conversation resume (optional)
`phases.md:591`, explicitly optional. `phases.md:598` lets you off with "or new
one starts cleanly", which is the current behaviour. Add only if the resume UX
actually matters.

---

## Suggested order

1. **A1** — real API calls in tests (correctness + money)
2. **A3** — `.env.example` missing `GROQ_MODEL` (blocks every new setup)
3. **A2** — `tokens_used` (one dict key)
4. **A4**, **A5** — lint warning + fix the no-op typecheck command
5. **B1**, **B2** — Phase 3.3 proper, the actual next phase
6. **E1**, **E2** — cheap correctness fixes
7. **D1** — decide: implement auth or delete the dead frontend code
8. **C1–C5, E3–E5** — as needed; amend `phases.md` where the spec has drifted