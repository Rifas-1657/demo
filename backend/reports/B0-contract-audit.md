"""
B0-contract-audit.md — written by reading the TypeScript source files directly.
"""
# Bookey Protocol B0 — Contract Audit

Generated: October 2026  
Source audited: `../lib/contracts/book-events.ts`, `validate.ts`, `book-client.ts`, `events.ts`, `README.md`

---

## Envelope

### Server → Client

Every server frame has this outer shape:

```json
{ "v": 1, "type": "<event-type>", "seq": 42, "sessionId": "sess_abc", "ts": 1790000000000, "payload": { } }
```

| Field | Type | Notes |
|-------|------|-------|
| `v` | `1` (literal) | Protocol version. Rejected if ≠ 1 |
| `type` | `string` | Discriminant — see table below |
| `seq` | `int ≥ 0` | Monotonic per connection. Gap = dropped frame |
| `sessionId` | `string \| null` | Narration session, or `null` for connection-level frames |
| `ts` | `number` (ms epoch) | Server timestamp |
| `payload` | `object` | Type-specific payload |

### Client → Server

Every client frame:

```json
{ "v": 1, "type": "<event-type>", "payload": { } }
```

| Field | Type | Notes |
|-------|------|-------|
| `v` | `1` (literal) | Protocol version |
| `type` | `string` | Discriminant |
| `payload` | `object` | Type-specific payload |

Client frames have **no** `seq`, `sessionId` or `ts` in the envelope (they are in the payload where needed).

---

## Server → Client Events (15 types)

| Type | Payload Fields |
|------|---------------|
| `session_started` | `{ sessionId: str, courseId: str, pageId: str }` |
| `text_chunk` | `{ segmentId: str, text: str, wordStart: int≥0, wordEnd: int≥0, audioStartMs: float≥0 }` |
| `audio_chunk` | `{ segmentId: str, mime: str, base64: str, seq: int≥0, final: bool }` |
| `cue` | `{ segmentId: str, atWord: int≥0, action: 'draw'\|'highlight'\|'runCode'\|'showOutput', targetId: str }` |
| `diagram_spec` | `{ diagramId: str, spec: DiagramSpec (has .kind:str and .nodes:list), steps: list[str] }` |
| `diagram_draw` | `{ diagramId: str, stepId: str }` |
| `highlight` | `{ targetId: str, style: 'marker'\|'ring'\|'underline' }` |
| `code_stream` | `{ codeId: str, chunk: str, final: bool }` |
| `run_result` | `{ codeId: str, stdout: str, stderr: str, status: 'success'\|'error', durationMs: float≥0, trace?: RunTrace }` |
| `question_received` | `{ questionId: str, source: 'voice'\|'text', text: str }` |
| `answer_chunk` | `{ questionId: str, text: str, final: bool, attachments?: { code?: str, diagram?: list[str] } }` |
| `scope_refused` | `{ questionId: str, message: str }` |
| `sources` | `{ questionId: str, items: list[{ title: str, kind: 'page'\|'note'\|'doc', ref: str }] }` |
| `page_complete` | `{ pageId: str }` |
| `error` | `{ code: str, message: str, recoverable: bool }` |

### RunTrace sub-schema

```
RunTrace = {
  exampleId: str | null,
  steps: list[RunTraceStep],
  stdin: list[str],
  sampleInputs?: list[str],
  inputRequest?: { prompt: str, index: int },
  unsupported?: str,
}
RunTraceStep = { logicalLine: int≥0, output?: str, variables: list[{ name: str, value: str, type: str }] }
```

---

## Client → Server Events (8 types)

| Type | Payload Fields |
|------|---------------|
| `start_page` | `{ courseId: str, pageId: str }` |
| `pause` | `{ sessionId: str }` |
| `resume` | `{ sessionId: str }` |
| `seek` | `{ sessionId: str, segmentId: str, wordIndex: int≥0 }` |
| `speed` | `{ sessionId: str, value: float > 0 }` |
| `ask_question` | `{ sessionId: str\|null, source: 'voice'\|'text', text: str, questionId: str, context: { courseId: str, pageId: str, language: 'tanglish'\|'tamil'\|'english' } }` |
| `run_code` | `{ courseId: str, pageId: str, code: str, language: 'python', codeId: str, stdin?: list[str], useSampleInput?: bool }` |
| `submit_survey` | `{ courseId: str, answers: dict[str, str] }` |
| `audio_in` | `{ sessionId: str\|null, seq: int≥0, mime: str, base64: str, final: bool }` |

**Confirmed names:** `run_result` (NOT `run_code_result`), `question_received` (carries `source: 'voice'\|'text'`).

The original contract has **NO** auth, ping/pong, resume (reconnect-level), or audio_in frames in the original `book-events.ts`. The updated frontend contract (`book-events.ts` as of this audit) **already includes** `audio_in` as a client event added during the QA pass.

---

## Connection-Level Frames (added for B0 backend — NOT in original TS contract)

The following frames are **connection-level** and needed for the backend but absent from the TS contract. We add them here and bump the Pydantic model to call them out explicitly. The TypeScript protocol version stays at `1` — these are connection-level frames the server sends before any narration session, so they don't flow through the narration seq counter.

| Type | Direction | Purpose | Payload |
|------|-----------|---------|---------|
| `ping` | client → server | Heartbeat | `{}` |
| `pong` | server → client | Heartbeat reply | `{ ts: int }` |

These are not added to the TS union types (they are transport-level, not protocol-level). The backend handles them before frame validation.

---

## Validation Rules (from validate.ts)

- `v` must equal `BOOK_PROTOCOL_VERSION` (1)
- `type` must be in `SERVER_EVENT_TYPES` (15 known types)
- `seq` must be non-negative integer
- `sessionId` must be `null` or a string
- `ts` must be a finite number
- `payload` must be an object (not array or null)
- Each payload is then field-checked per type

Unknown extra fields in payload are **allowed** (the validator ignores them).

---

## events.ts Assessment

`events.ts` is a **separate analytics event draft** (`page.viewed`, `page.completed`, `bookmark.toggled`, `note.saved`, `survey.answered`). It is **not** part of the realtime WebSocket protocol. Backend B0 does not implement these — they are marked `TODO` in the frontend.

---

## Summary

✅ Client events confirmed: `start_page`, `pause`, `resume`, `seek`, `speed`, `ask_question`, `run_code`, `submit_survey` (+ `audio_in` added in QA pass)  
✅ Server event name confirmed: `run_result` (NOT `run_code_result`)  
✅ `question_received` already carries `source: 'voice' | 'text'`  
✅ Protocol version: `1`  
✅ No auth/ping/pong in original contract — added as connection-level handlers in B0  
