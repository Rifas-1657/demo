# BOOKEY PHASE 1 & 2 FIXES — Backend, API, TTS & STT

**Status**: ✅ **COMPLETE — ALL CHECKS PASSING (0 FAILURES)**  
**Date**: October 14, 2026  
**Branch**: master  
**Phase**: Phase 1 Finalization & Phase 2 Voice Integration Complete  

---

## Final Verification Results

| Suite / Check | Command | Exit Code | Result |
|---|---|:---:|---|
| **Safety Gate: Unconditional Test DB Isolation** | Sentinel override subprocess | 0 | ✅ Sentinel ignored, temporary DB created |
| **Developer DB Safety Check** | `Get-Item backend/bookey_dev.db` | 0 | ✅ Untouched (`13-10-2026 23:22:48`, size `593,920`) |
| **Voice Unit & Integration Suite** | `python -m pytest tests/test_voice_api.py tests/test_voice.py -v` | 0 | **29 passed, 0 failed** (0.32s) |
| **Full Pytest Suite (Run 1)** | `python -m pytest tests/ --timeout=120 -q` | 0 | **290 passed, 0 failed** (72.10s) |
| **Full Pytest Suite (Run 2 - Repeat)** | `python -m pytest tests/ --timeout=120 -q` | 0 | **290 passed, 0 failed** (72.09s) |
| **TypeScript Typecheck** | `pnpm exec tsc --noEmit` | 0 | ✅ Clean pass (0 errors) |
| **Production Build** | `pnpm build` | 0 | ✅ Clean pass (40 static/SSG pages built) |

> **Environment & Secret Isolation**: `backend/.env` is completely ignored by Git and never read during tests or client code. Tests run against a session-scoped temporary SQLite database managed by `conftest.py`. The real developer database (`bookey_dev.db`) is protected and never touched.

---

## Phase 0: Test Database Isolation Safety Gate

- **Unconditional Redirection**: `backend/tests/conftest.py` forcibly overrides `DATABASE_URL` before importing any application or database modules. Every test run allocates a fresh temporary SQLite database directory (`tempfile.mkdtemp(prefix="bookey_test_")`), registers `atexit` cleanup, and clears settings cache.
- **Verification with Sentinel**: A sentinel database URL `sqlite+aiosqlite:///./sentinel_never_used.db` was passed in a separate test subprocess. The sentinel was completely ignored and never created on disk.
- **Zero Developer DB Access**: `bookey_dev.db` timestamp and file size remained identical across all pytest runs.

---

## Phase 1 & 2: Backend & Voice Integration Details

### 1. Text-to-Speech (TTS)
- **Model**: `gemini-3.8-flash-tts` via Google Generative AI REST service.
- **Provider Layer**: `GeminiTTSProvider(TextToSpeech)` in `backend/app/voice/tts/gemini_tts.py`.
- **Pipeline Integration**: Added to TTS fallback chain (`GeminiTTSProvider` → `EdgeTTSProvider` → `SilentTTS`).
- **Endpoint**: `POST /api/voice/tts` in `backend/app/api/voice.py`.
  - Accepts `{ text, voice?, speed? }`.
  - Normalizes lesson text with `normalize_for_tts()`.
  - Returns raw binary audio (`audio/wav`) or base64 JSON payload.
  - Safe error handling: 400 for empty/oversized text, 429 for rate limits, 503 for missing keys, 504 for timeouts, 502 for upstream failures without leaking credentials.

### 2. Speech-to-Text (STT)
- **Model**: `whisper-large-v3-turbo` via Groq Audio Transcriptions API.
- **Provider Layer**: `GroqWhisperSTT(SpeechToText)` in `backend/app/voice/stt/groq_whisper.py`.
- **Technical Vocabulary**: Injects centralized Tanglish/technical vocabulary prompt hints (`DEFAULT_TANG_VOCAB_HINT`: React, useState, Python, FastAPI, LangGraph, RAG, embeddings, vector database, API, StateGraph).
- **Endpoint**: `POST /api/voice/stt` in `backend/app/api/voice.py`.
  - Accepts multipart/form-data audio file (`webm`, `wav`, `mp3`, `ogg`, `m4a`, `flac`, `mp4`) up to 10MB.
  - Supports automatic language detection or optional BCP-47 hint (e.g. `ta` or `en`).
  - Returns `{ transcript, language, duration_s }`. Never auto-submits.

---

## Phase 3: Frontend Integration

1. **Client API (`lib/api/client.ts`)**:
   - `synthesizeSpeech(text, voice?, speed?)`: Typed REST call returning playable audio `Blob`.
   - `transcribeAudio(file, language?)`: Typed multipart upload returning `{ transcript, language, duration_s }`.
2. **Audio Player (`lib/narration/audio-player.ts`)**:
   - Added `createTtsAudioPlayer()` implementing `AudioPlayer`.
   - Integrates directly with `useNarrationStream` when `isApiConfigured()` is true.
   - In-memory audio Blob/URL cache prevents repeated fetches on sentence navigation.
3. **Lesson Reader (`components/reader/reader-shell.tsx`)**:
   - Accessible **Listen** button in reader header with loading, playing, paused, and stopped states.
   - Playback speed toggle (0.75x, 1x, 1.25x, 1.5x).
   - Audio cleanup on stop or unmount.
4. **Voice Dock (`components/book/voice-dock.tsx`)**:
   - Reflects real audio narration states and unmute options when `stream.player.producesSound` is active.
5. **Speech Input (`components/book/tutor/any-questions-panel.tsx` & `components/book/tutor/course-chat-panel.tsx`)**:
   - Created `useVoiceRecorder` hook in `lib/voice/use-voice-recorder.ts`.
   - Explicit user click triggers `getUserMedia` + `MediaRecorder`.
   - Displays live recording duration, pulsing recording indicator, "Done" and "Cancel" buttons.
   - On completion, sends audio to `transcribeAudio()` and populates the editable textarea/input field.
   - Learner can review and correct Tanglish transcript before manual submission. Never auto-submits.
   - Full track cleanup on stop/cancel/unmount.

---

## Verification & Limitations

### Automated Tests
- Provider calls in automated tests are strictly mocked (`test_voice_api.py`); zero external API quota was consumed.
- Pytest suite: 290 tests pass across all backend domains (Auth, Seat Limits, Contracts, Knowledge Base, Page Gen, Tutor, Voice, WebSocket).

### Manual Smoke-Testing Status
- Because tests and development environments operate with mocked credentials, **live external API calls were not made during automated runs**.
- **Tanglish Quality Observation**: Provider accuracy for mixed Tamil-English code-switching is subject to Groq Whisper v3 Turbo acoustic models. The prompt vocabulary hint ensures framework and language keywords (`useState`, `StateGraph`, `FastAPI`) are prioritized, but accented Tanglish phonetic variations may require user text editing before submission, as designed.

---

## Commit History

| Commit | Message |
|---|---|
| `ae0d23e` | `feat(voice): integrate Gemini 3.8 Flash TTS and Groq Whisper STT with reader and tutor UI` |
| `99635dd` | `fix(test-safety): unconditionally enforce temporary SQLite test database for all pytest runs` |
| `bb4a4b9` | `docs: document test database isolation safety gate and zero-failure verification` |
| `e4ea8a2` | `fix(test-isolation): enforce dedicated temporary test database and clean test fixture lifecycle` |
| `929168b` | `docs: finalize FIXES-1.md with regression closure results (275 tests pass, 0 fail)` |
| `8092533` | `fix(task2): fix getCourseProgress mapping to use correct backend endpoint and add progress mapping tests` |
