# Bookey frontend ⇄ backend contract

This folder is the **integration boundary** between the reader UI and the future
FastAPI/WebSocket backend. Nothing here opens a socket, calls an API or reads a
secret. Today every frame comes from `MockBookClient`. Later, a WebSocket client
will send and receive the same JSON frames.

| File | Purpose |
| --- | --- |
| `book-events.ts` | Strict, discriminated-union types for every server→client and client→server frame |
| `book-client.ts` | The `BookClient` interface. **UI code may depend only on this** |
| `validate.ts` | Dependency-free runtime guard (`parseServerEvent`) applied to every inbound frame |
| `events.ts` | Separate draft analytics events (`page.viewed`, …). Not part of the realtime protocol |

The implementations live in `lib/book-client/`:

| File | Purpose |
| --- | --- |
| `base-client.ts` | Listener bookkeeping, validation, typed send helpers shared by every transport |
| `mock-book-client.ts` | Deterministic offline server that uses the seeded pages, demo tutor and demo runner |
| `fixtures.ts` | Hand-written seeded frames for `replay()` (tests, docs, debugging) |
| `react.tsx` | `<BookClientProvider>`, `useBookClient()`, `useBookEvent(type, handler)` |
| `index.ts` | `createBookClient()`, the **single swap point** for the transport |

## How the UI consumes it

```
app/(viewer)/book/[courseId]/page.tsx      <BookClientProvider>
app/(viewer)/courses/[courseId]/survey     <BookClientProvider>
  ├─ lib/narration/use-narration-stream    start_page · pause · resume · seek · speed  ⇐ session_started · text_chunk · page_complete · error
  ├─ components/book/use-code-lab          run_code                                    ⇐ run_result
  ├─ components/book/tutor/use-course-tutor ask_question                               ⇐ answer_chunk · sources · scope_refused · error
  └─ components/survey/survey-wizard       submit_survey
```

The reader, narration, diagram, code and question panels all get the same
client instance from context. No component imports `MockBookClient` directly.

```tsx
const client = useBookClient()
useBookEvent('answer_chunk', ({ payload }) => append(payload.questionId, payload.text))
const questionId = client.askQuestion({ sessionId, source: 'text', text, context })
```

Diagram steps, highlights and cue actions are currently computed locally from
the page's seeded data and the active word index (`text_chunk.wordStart`). This
keeps them correct when the learner seeks. The mock still emits `diagram_spec`,
`diagram_draw`, `cue` and `highlight`, so a backend-driven renderer can
subscribe to those events later with `useBookEvent` without contract changes.

## Envelope

Every **server → client** frame:

```json
{ "v": 1, "type": "text_chunk", "seq": 42, "sessionId": "sess_abc", "ts": 1790000000000, "payload": { } }
```

- `v`: protocol version (`BOOK_PROTOCOL_VERSION`). Frames with any other value are rejected.
- `seq`: increases monotonically on each connection. A lower value means the frame is stale. A gap means frames were dropped.
- `sessionId`: the narration session, or `null` for connection-level frames (e.g. `run_result`).
- `ts`: server time in ms since epoch.

Every **client → server** frame:

```json
{ "v": 1, "type": "start_page", "payload": { "courseId": "python", "pageId": "py-01" } }
```

## Server → client events

| type | payload |
| --- | --- |
| `session_started` | `{ sessionId, courseId, pageId }` |
| `text_chunk` | `{ segmentId, text, wordStart, wordEnd, audioStartMs }` |
| `audio_chunk` | `{ segmentId, mime, base64, seq, final }` |
| `cue` | `{ segmentId, atWord, action: 'draw' \| 'highlight' \| 'runCode' \| 'showOutput', targetId }` |
| `diagram_spec` | `{ diagramId, spec, steps }` (`spec` matches `types/diagram.ts`) |
| `diagram_draw` | `{ diagramId, stepId }` |
| `highlight` | `{ targetId, style: 'marker' \| 'ring' \| 'underline' }` |
| `code_stream` | `{ codeId, chunk, final }` |
| `run_result` | `{ codeId, stdout, stderr, status: 'success' \| 'error', durationMs, trace? }` |
| `question_received` | `{ questionId, source: 'voice' \| 'text', text }` |
| `answer_chunk` | `{ questionId, text, final, attachments? }` |
| `scope_refused` | `{ questionId, message }` |
| `sources` | `{ questionId, items: { title, kind: 'page' \| 'note' \| 'doc', ref }[] }` |
| `page_complete` | `{ pageId }` |
| `error` | `{ code, message, recoverable }` |

Optional extensions such as `run_result.trace` and `answer_chunk.attachments`
are documented inline in `book-events.ts`. A backend may leave them out.

### Examples

```json
{ "v": 1, "type": "session_started", "seq": 1, "sessionId": "sess_1", "ts": 1790000000100,
  "payload": { "sessionId": "sess_1", "courseId": "python", "pageId": "py-01" } }

{ "v": 1, "type": "text_chunk", "seq": 2, "sessionId": "sess_1", "ts": 1790000000200,
  "payload": { "segmentId": "py-01#s0", "text": "Variables", "wordStart": 0, "wordEnd": 1, "audioStartMs": 0 } }

{ "v": 1, "type": "audio_chunk", "seq": 3, "sessionId": "sess_1", "ts": 1790000000300,
  "payload": { "segmentId": "py-01#s0", "mime": "audio/mpeg", "base64": "SUQzBAAAAAAA…", "seq": 0, "final": false } }

{ "v": 1, "type": "cue", "seq": 5, "sessionId": "sess_1", "ts": 1790000000500,
  "payload": { "segmentId": "py-01#s0", "atWord": 1, "action": "highlight", "targetId": "term-variable" } }

{ "v": 1, "type": "diagram_draw", "seq": 7, "sessionId": "sess_1", "ts": 1790000000700,
  "payload": { "diagramId": "py-01", "stepId": "step-1" } }

{ "v": 1, "type": "run_result", "seq": 19, "sessionId": null, "ts": 1790000001900,
  "payload": { "codeId": "run_1", "stdout": "21\n", "stderr": "", "status": "success", "durationMs": 12 } }

{ "v": 1, "type": "answer_chunk", "seq": 13, "sessionId": "sess_1", "ts": 1790000001300,
  "payload": { "questionId": "q_1", "text": "box for a value.", "final": true } }

{ "v": 1, "type": "scope_refused", "seq": 16, "sessionId": "sess_1", "ts": 1790000001600,
  "payload": { "questionId": "q_2", "message": "I can only help with this course." } }

{ "v": 1, "type": "error", "seq": 21, "sessionId": null, "ts": 1790000002100,
  "payload": { "code": "page_not_found", "message": "No page py-99 in course python.", "recoverable": true } }
```

`lib/book-client/fixtures.ts` contains the complete seeded sequence.

## Client → server events

| type | payload |
| --- | --- |
| `start_page` | `{ courseId, pageId }` |
| `pause` | `{ sessionId }` |
| `resume` | `{ sessionId }` |
| `seek` | `{ sessionId, segmentId, wordIndex }` |
| `speed` | `{ sessionId, value }` (playback rate, `> 0`) |
| `ask_question` | `{ sessionId, source, text, questionId, context: { courseId, pageId, language } }` |
| `run_code` | `{ courseId, pageId, code, language: 'python', codeId, stdin?, useSampleInput? }` |
| `submit_survey` | `{ courseId, answers }` |

The client generates `questionId` and `codeId` (`askQuestion()` / `runCode()`
return them). The server echoes them on every related frame, so the UI can
match a reply to its request without any server round-trip.

```json
{ "v": 1, "type": "ask_question",
  "payload": { "sessionId": "sess_1", "source": "text", "text": "What is a variable?", "questionId": "q_1",
               "context": { "courseId": "python", "pageId": "py-01", "language": "english" } } }
```

## Expected ordering

**Narration** (per `start_page`):

1. `session_started`, then `diagram_spec` for the page.
2. For each word, in order: `text_chunk`, followed by zero or more `diagram_draw`, `cue` and `highlight` frames anchored to that word. `audio_chunk` frames for a segment may interleave, and their `seq` (inside the payload) orders them within the segment. `final: true` closes the segment.
3. `page_complete` after the last word.

A new `start_page` replaces the current session. Frames carrying an old
`sessionId` must be ignored. `pause` stops emission. `resume` continues from the
current position. `seek` moves the position, and if playback is active, emits
the `text_chunk` for the new word immediately. `speed` affects pacing only.

**Questions:** `question_received` → one or more `answer_chunk` (the last one
has `final: true`) → `sources`. Out-of-scope questions get `question_received`
→ `scope_refused` and no answer chunks.

**Code:** zero or more `code_stream` (when the server streams generated code)
→ exactly one `run_result` per `codeId`.

## Error handling

- Inbound frames go through `parseServerEvent`. An invalid frame (bad JSON, unknown type, wrong version or malformed payload) is **not** passed on in its raw form. Listeners receive a synthetic `error` with `code: 'invalid_frame'` and `recoverable: true` instead, and a warning is logged in development.
- `recoverable: true`: the UI keeps going. Narration stays in its state, and the tutor shows the message as a reply.
- `recoverable: false`: the narration hook pauses the session it belongs to. A WebSocket client should also end the connection and reconnect with backoff, then re-send `start_page` for the current page and `seek` to the last word it confirmed.
- A listener that throws is isolated with a `try/catch`, so it can't break other subscribers.
- Codes the mock emits: `page_not_found`, `invalid_speed`, `empty_question`, `unknown_context`, `invalid_frame`.

## Mock client

```ts
import { MockBookClient, SEED_FRAMES } from '@/lib/book-client'

const client = new MockBookClient({ latencyMs: 0, thinkingMs: 0, tokenMs: 0, scheduler })
const off = client.subscribe((event) => log.push(event))
client.replay(SEED_FRAMES, { intervalMs: 50 }) // same validation as live frames
client.startPage({ courseId: 'python', pageId: 'py-01' })
off()
client.dispose() // clears every timer and listener; can be subscribed to again (Strict Mode)
```

- **Deterministic:** ids are `prefix_mock_N`, and `scheduler`/`now` can be injected so tests can step time manually.
- Timers are grouped by narration, question and run, and cleared on `start_page`, `pause` or `dispose`.
- `client.sent` holds the last 50 outbound frames for debugging.

## Replacing the mock with the FastAPI backend

1. Add `lib/book-client/websocket-book-client.ts`:

   ```ts
   export class WebSocketBookClient extends BaseBookClient {
     readonly kind = 'websocket' as const
     constructor(private url: string) { super() /* open socket lazily on first send/subscribe */ }
     send(event: BookClientEvent) { /* queue until open, then socket.send(JSON.stringify(event)) */ }
     // socket.onmessage = (m) => this.deliver(m.data)  ← reuses validation + fan-out
     override dispose() { /* close socket, clear reconnect timer */ super.dispose() }
   }
   ```

2. Switch transports in `createBookClient()` (in `lib/book-client/index.ts`):

   ```ts
   const url = process.env.NEXT_PUBLIC_BOOKEY_WS_URL
   return url ? new WebSocketBookClient(url) : new MockBookClient()
   ```

3. You don't need to change any component or hook.

### Environment contract

| Variable | Scope | Meaning |
| --- | --- | --- |
| `NEXT_PUBLIC_BOOKEY_WS_URL` | public | e.g. `wss://api.bookey.app/ws/book`. **Documented only. The app doesn't read it yet.** |

The URL is public by design. Never put an API key or provider secret
(Gemini, Groq, …) in a `NEXT_PUBLIC_*` variable. Authenticate the socket with
a short-lived token that the Next.js server issues (for example, a Route
Handler that sets a cookie or returns a signed ticket). The client then sends
it in the first frame or as a query param.

### Backend notes (FastAPI)

- One WebSocket per reader tab. Keep the `seq` counter per connection.
- Serialize frames exactly as above. Pydantic discriminated unions on `type` map 1:1 to the TypeScript unions.
- The existing prototype at `iqrabook/backend/app/api/routes/streaming.py` uses an older ad-hoc shape (`{"type":"text","content":…}`). Its handlers should be adapted to emit these envelopes: `text` → `text_chunk`, `audio` → `audio_chunk`, `diagram` → `diagram_spec`/`diagram_draw`, `code` → `code_stream`.
- Bump `BOOK_PROTOCOL_VERSION` for breaking changes. Adding new optional payload fields doesn't count as breaking, because the validator ignores unknown keys.
