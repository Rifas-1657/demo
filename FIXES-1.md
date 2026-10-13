# BOOKEY PHASE 1 FIXES — Backend and API

**Status**: ✅ **COMPLETE — ALL CHECKS PASSING (0 FAILURES)**  
**Date**: October 13, 2026  
**Branch**: master  
**Phase**: 1 Finalization & Regression Closure Complete  

---

## Final Verification Results

| Suite | Command | Exit Code | Result |
|-------|---------|-----------|--------|
| Full Pytest Suite | `python -m pytest tests/ --timeout=120 -q` | 0 | **275 passed, 0 failed** (8.12s) |
| Targeted Test Suite | `python -m pytest tests/test_auth.py::test_admin_can_create_invite tests/test_seat_limits.py::test_seat_counting_ignores_inactive_users tests/test_seat_limits.py tests/test_rest_payloads.py tests/test_ws_completeness.py tests/test_contracts.py tests/test_b6.py tests/test_voice.py tests/test_tutor.py -v --timeout=120 -q` | 0 | **193 passed, 0 failed** (6.20s) |
| TypeScript Typecheck | `pnpm exec tsc --noEmit` | 0 | ✅ Clean pass (0 errors) |
| Production Build | `pnpm build` | 0 | ✅ Clean pass (Next.js SSG/SSR built) |
| Asyncio Warning Check | `pytest -W error::pytest.PytestWarning` | 0 | ✅ 0 spurious asyncio warnings |

> **Environment Configuration**: `backend/.env` is never read in tests. All test runs execute with explicit test environment overrides:  
> `$env:APP_ENV="testing"; $env:SECRET_KEY="test-secret-key-32chars-for-tests"; $env:DATABASE_URL="sqlite+aiosqlite:///./bookey_dev.db"; $env:CORS_ORIGINS='["http://localhost:3000"]'; $env:MOCK_TOKEN_MS="1"; $env:MOCK_THINKING_MS="10"; $env:MOCK_ANSWER_TOKEN_MS="1"; $env:MOCK_CODE_STREAM_MS="1"`

---

## Regression Closure Tasks (Tasks 1–3)

### Task 1: Test Isolation & Seat Limits
- **Issue**: `test_admin_can_create_invite` and `test_seat_counting_ignores_inactive_users` previously failed depending on test execution order due to shared state in `bookey_dev.db` when capacity tests filled the learner pool.
- **Root Cause & Fix**:
  - `test_seat_limits.py`: Capacity tests (`test_valid_invite_at_capacity_rejected`, `test_concurrent_signups_respect_limit`) now use idempotent `_get_or_create_learner` and clean up by deactivating test-created learners (`_ensure_learner_count_below(2)`) at test teardown.
  - `test_seat_limits.py`: `test_seat_counting_ignores_inactive_users` checks for existing test user before insertion and confirms count invariance.
  - `test_auth.py`: `test_admin_can_create_invite` deactivates excess `@test.com` test learners if the shared database is already at capacity from previous runs.
- **Security & Integrity**: The 4-learner platform seat limit was NOT weakened. Only test-created accounts (`@test.com`) are deactivated; conftest accounts (`learner@bookey.test`, `learner2@bookey.test`) and the admin account are never touched.
- **Result**: All 8 seat-limit and auth invite tests pass consistently in isolation and within the full suite.

### Task 2: ApiProgress Response Mapping
- **Issue**: `lib/api/client.ts` `getCourseProgress(courseId)` previously called `GET /me/progress/{courseId}`, which returns `list[ProgressItem]` (per-page interaction rows), instead of the summary shape expected by `ApiProgress`.
- **FastAPI Schema Alignment**:
  - `GET /me/progress` returns `list[CourseProgressSummary]` with `{ course_id, completed_pages, total_pages }`.
  - `GET /me/progress/{course_id}` returns `list[ProgressItem]` with `{ course_id, page_id, completed, last_word_index, last_segment_id, completed_at, updated_at }`.
- **Client Implementation**:
  - Added typed interfaces `BackendProgressSummary` and `BackendProgressItem`.
  - Added `backendProgressSummaryToApi(s)` mapping `s.completed_pages` to `completedPages`, with `lastOpened: null` and `resumeExcerpt: ""` (fields not tracked in backend DB).
  - Updated `getCourseProgress(courseId)` to query `GET /me/progress`, find the course, and map the summary.
  - Added `getCourseProgressItems(courseId)` for per-page interactions.
  - Preserved mock fallback when `BASE_URL` is unset. UI components left untouched.
- **Tests Added**: 3 new integration tests in `backend/tests/test_rest_payloads.py` verifying `BackendProgressSummary` shape, `BackendProgressItem` shape, and summary-to-API mapping correctness. All 27 tests in `test_rest_payloads.py` pass.

### Task 3: Test Warning Cleanup (Asyncio Marks)
- **Issue**: Module-level `pytestmark = pytest.mark.asyncio` in test files containing synchronous unit tests was causing over 30 `PytestWarning` notices.
- **Fix**: Removed spurious `pytestmark` from `test_b6.py`, `test_voice.py`, and `test_tutor.py`. With `asyncio_mode = auto` in `pytest.ini`, async tests run asynchronously automatically without module-level marks.

---

## Item Summary Table (Phase 1 Complete)

| Item | Reproduced? | Fix Applied | Test Evidence | Files Changed | Commit |
|------|-------------|-------------|---------------|---------------|--------|
| 1. Secrets | Yes | `.env.example`, `.gitleaks.toml`, `check-secrets.ps1`, `.gitignore` | Scan passes, 0 secrets in repo | 4 files | `d7a5046` |
| 2. Admin seed | Yes | `seed.py` reads `BOOKEY_ADMIN_DEV_PASSWORD` env var; blocks prod seeding | `test_login_success` PASS | `backend/app/db/seed.py` | `bf1c581` |
| 3. Production config | Yes | `main.py` startup validation: SECRET_KEY, CORS, DB | `test_production_config.py` all 3 pass | `main.py`, `test_production_config.py` | `f83d469` |
| 4. requirements.txt | Yes | Added `sqlalchemy[asyncio]`, `pydantic[email]` extras | `pip check` clean for core deps | `backend/requirements.txt` | `31ccfb3` |
| 5. Signup/seats | Not repro | Seat enforcement was already correct; added verification tests | 7 seat limit tests PASS | `test_seat_limits.py` | `ddd9ebd` |
| 6. REST payload mismatch | **YES — Reproduced** | Added camelCase↔snake_case mapping in `client.ts`; fixed `progress.py` lazy-load bug (MissingGreenlet) | `test_rest_payloads.py` **27/27 PASS**; camelCase POST confirmed 422 | `lib/api/client.ts`, `backend/app/api/progress.py`, `backend/tests/test_rest_payloads.py` | `7be2032`, `8092533` |
| 7. WebSocket completeness | Tested | Added 10 comprehensive WS tests covering seq, narration reconstruction, cues, and single page_complete | `test_ws_completeness.py` **10/10 PASS** | `backend/tests/test_ws_completeness.py` | `c18c5cd` |
| 8a. asyncio mark cleanup | **YES — Reproduced** | Removed `pytestmark` from `test_b6.py`, `test_voice.py`, and `test_tutor.py` | 0 PytestWarning on sync tests | `test_b6.py`, `test_voice.py`, `test_tutor.py` | `c5e3c27`, `2bdcec7`, `4ef6ee3` |
| 8b. RunTraceStep.logicalLine | **YES — Reproduced** | Changed `ge=0` → `ge=1` in `models.py`; added 2 parity tests | `test_run_trace_step_logical_line_ge1` PASS (rejects logicalLine=0) | `contracts/models.py`, `test_contracts.py` | `918d609` |
| Config testing isolation | **YES — Reproduced** | Skip `.env` loading when `APP_ENV=testing` to protect test runner from malformed local `.env` | Pytest imports clean with env overrides | `backend/app/config.py` | `b3b2697` |
| Seat test isolation | **YES — Reproduced** | Made seat limit tests idempotent with teardown deactivation and existence checks | Full suite PASS (275/275) | `backend/tests/test_seat_limits.py`, `backend/tests/test_auth.py` | `97856c9` |

---

## Complete Commit History (Chronological)

| Commit | Message | Files Changed | Insertions / Deletions |
|--------|---------|---------------|------------------------|
| `d7a5046` | feat(secrets): add .env.example, gitleaks config, and secrets check script | 4 | +150 / -0 |
| `bf1c581` | fix(admin-seed): use BOOKEY_ADMIN_DEV_PASSWORD env var, block prod seeding | 1 | +18 / -6 |
| `f83d469` | feat(prod-config): fail fast on insecure production settings | 2 | +85 / -0 |
| `31ccfb3` | fix(deps): add sqlalchemy[asyncio] and pydantic[email] extras | 1 | +2 / -0 |
| `ddd9ebd` | test(seats): add comprehensive seat limit enforcement tests | 1 | +228 / -0 |
| `c1d2e6e` | docs: add FIXES-1.md with Phase 1 progress report | 1 | +69 / -0 |
| `918d609` | fix(item8b): RunTraceStep.logicalLine ge=0 -> ge=1 with parity test | 2 | +61 / -1 |
| `c5e3c27` | fix(item8a): remove pytestmark=pytest.mark.asyncio from test_b6.py sync tests | 1 | +1 / -1 |
| `7be2032` | fix(item6): correct snake_case/camelCase REST payload mapping | 3 | +529 / -16 |
| `c18c5cd` | test(item7): add comprehensive WebSocket completeness tests | 1 | +414 / -0 |
| `2bdcec7` | fix(item8a): also remove asyncio mark from test_voice.py sync tests | 1 | +1 / -1 |
| `bd0e932` | docs: update FIXES-1.md with complete Phase 1 report (all 8 items done) | 1 | +135 / -55 |
| `b3b2697` | fix(config): skip .env file when APP_ENV=testing to prevent parse errors from malformed .env | 1 | +7 / -2 |
| `97856c9` | fix(test-isolation): make seat-limit tests idempotent across test sessions | 2 | +180 / -84 |
| `8092533` | fix(task2): fix getCourseProgress mapping to use correct backend endpoint and add progress mapping tests | 2 | +215 / -3 |
| `4ef6ee3` | fix(item8a): remove asyncio mark from test_tutor.py sync tests | 1 | +1 / -1 |

---

## Unresolved Issues

**None.**  
- Full backend pytest suite: **275 passed, 0 failed, 0 errors**.
- TypeScript compilation: **0 errors**.
- Production build: **0 errors**.
- No credentials or secrets exposed in repository or tracking files.
