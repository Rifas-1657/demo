import type { DiagramSpec } from '@/types/diagram'

/**
 * Realtime book-session protocol between the reader UI and the (future)
 * FastAPI/WebSocket backend. Transport-agnostic: the same JSON frames are
 * produced by `MockBookClient` today and by a socket client later.
 *
 * See `lib/contracts/README.md` for examples, ordering and error handling.
 *
 * Protocol version history:
 *   v1 — B0: initial protocol (mock-only, no auth)
 *   v2 — B1: WS ticket auth (auth_ticket / auth_ok / auth_error connection frames)
 */

export const BOOK_PROTOCOL_VERSION = 2 as const

/* -------------------------------------------------------------------------- */
/* Shared value types                                                          */
/* -------------------------------------------------------------------------- */

export type CueAction = 'draw' | 'highlight' | 'runCode' | 'showOutput'
export type HighlightStyle = 'marker' | 'ring' | 'underline'
export type QuestionSource = 'voice' | 'text'
export type RunStatus = 'success' | 'error'
export type CodeLanguage = 'python'
export type SourceKind = 'page' | 'note' | 'doc'
export type TutorLanguage = 'tanglish' | 'tamil' | 'english'

export interface SourceItem {
  title: string
  kind: SourceKind
  /** Opaque reference. For `kind: 'page'` this is the 0-based reader page index as a string. */
  ref: string
}

/** Same JSON schema the diagram canvas renders (`types/diagram.ts`). */
export type DiagramSpecPayload = DiagramSpec

export interface RunTraceVariable {
  name: string
  value: string
  type: string
}

export interface RunTraceStep {
  /** 1-based index among the program's logical lines (blank/comment lines skipped). */
  logicalLine: number
  output?: string
  variables: RunTraceVariable[]
}

/**
 * Optional step trace attached to `run_result`. A backend that cannot trace
 * may omit it; the UI then shows stdout/stderr only.
 */
export interface RunTrace {
  exampleId: string | null
  steps: RunTraceStep[]
  /** stdin values the run consumed, in order. */
  stdin: string[]
  /** Present when the program stopped at `input()` and needs another value. */
  inputRequest?: { prompt: string; index: number }
  /** Suggested answers for narrated runs of `input()` examples. */
  sampleInputs?: string[]
  /** Set when the runner refuses the program (e.g. the demo only knows seeded examples). */
  unsupported?: string
}

export interface TutorAttachments {
  code?: string
  /** Plain-text diagram lines rendered under the answer. */
  diagram?: string[]
}

/* -------------------------------------------------------------------------- */
/* Server → client                                                             */
/* -------------------------------------------------------------------------- */

export interface ServerEventPayloads {
  session_started: { sessionId: string; courseId: string; pageId: string }
  text_chunk: { segmentId: string; text: string; wordStart: number; wordEnd: number; audioStartMs: number }
  audio_chunk: { segmentId: string; mime: string; base64: string; seq: number; final: boolean }
  cue: { segmentId: string; atWord: number; action: CueAction; targetId: string }
  diagram_spec: { diagramId: string; spec: DiagramSpecPayload; steps: string[] }
  diagram_draw: { diagramId: string; stepId: string }
  highlight: { targetId: string; style: HighlightStyle }
  code_stream: { codeId: string; chunk: string; final: boolean }
  run_result: {
    codeId: string
    stdout: string
    stderr: string
    status: RunStatus
    durationMs: number
    trace?: RunTrace
  }
  question_received: { questionId: string; source: QuestionSource; text: string }
  answer_chunk: { questionId: string; text: string; final: boolean; attachments?: TutorAttachments }
  scope_refused: { questionId: string; message: string }
  sources: { questionId: string; items: SourceItem[] }
  page_complete: { pageId: string }
  error: { code: string; message: string; recoverable: boolean }
  /** Connection-level: ticket auth accepted (B1+). */
  auth_ok: { userId: string; role: 'learner' | 'admin' }
  /** Connection-level: ticket auth rejected (B1+). */
  auth_error: { code: string; message: string }
}

export type ServerEventType = keyof ServerEventPayloads

export const SERVER_EVENT_TYPES = [
  'session_started',
  'text_chunk',
  'audio_chunk',
  'cue',
  'diagram_spec',
  'diagram_draw',
  'highlight',
  'code_stream',
  'run_result',
  'question_received',
  'answer_chunk',
  'scope_refused',
  'sources',
  'page_complete',
  'error',
  'auth_ok',
  'auth_error',
] as const satisfies readonly ServerEventType[]

/** Every frame shares this envelope; `type` discriminates `payload`. */
interface ServerEnvelope<T extends ServerEventType> {
  v: typeof BOOK_PROTOCOL_VERSION
  type: T
  /** Monotonic per connection. Gaps mean dropped frames; lower values are stale. */
  seq: number
  /** Narration session the frame belongs to, or `null` for connection-level frames. */
  sessionId: string | null
  /** Server timestamp (ms since epoch). */
  ts: number
  payload: ServerEventPayloads[T]
}

export type BookServerEvent = { [K in ServerEventType]: ServerEnvelope<K> }[ServerEventType]
export type ServerEventOf<T extends ServerEventType> = Extract<BookServerEvent, { type: T }>

/* -------------------------------------------------------------------------- */
/* Client → server                                                             */
/* -------------------------------------------------------------------------- */

export interface ClientEventPayloads {
  start_page: { courseId: string; pageId: string }
  pause: { sessionId: string }
  resume: { sessionId: string }
  seek: { sessionId: string; segmentId: string; wordIndex: number }
  speed: { sessionId: string; value: number }
  ask_question: {
    /** `null` when the learner asks before any narration session has started. */
    sessionId: string | null
    source: QuestionSource
    text: string
    /** Client-generated correlation id echoed by every answer frame. */
    questionId: string
    /** Scope for retrieval and refusal checks. */
    context: { courseId: string; pageId: string; language: TutorLanguage }
  }
  run_code: {
    courseId: string
    pageId: string
    code: string
    language: CodeLanguage
    /** Client-generated correlation id echoed by `run_result`. */
    codeId: string
    stdin?: string[]
    /** Ask the runner to answer `input()` with its sample values (narrated runs). */
    useSampleInput?: boolean
  }
  submit_survey: { courseId: string; answers: Record<string, string> }
  /**
   * Optional push-to-talk audio chunk. Only sent when NEXT_PUBLIC_BOOKEY_MIC=on.
   * The backend should feed this into its speech-to-text pipeline and turn the
   * transcript into an `ask_question` frame on behalf of the client.
   */
  audio_in: {
    sessionId: string | null
    /** Monotonic per push-to-talk session; gaps mean dropped chunks. */
    seq: number
    /** MIME type of the audio chunk, e.g. "audio/webm;codecs=opus". */
    mime: string
    /** Base64-encoded audio bytes. */
    base64: string
    /** True for the last chunk in a push-to-talk recording. */
    final: boolean
  }
  /**
   * Connection-level: authenticate the WebSocket using a short-lived, single-use
   * ticket issued by POST /api/ws-ticket. Must be the FIRST frame sent after
   * the socket opens. The server replies with auth_ok or auth_error, then
   * closes the socket on failure. (B1+)
   */
  auth_ticket: { ticket: string }
}


export type ClientEventType = keyof ClientEventPayloads

interface ClientEnvelope<T extends ClientEventType> {
  v: typeof BOOK_PROTOCOL_VERSION
  type: T
  payload: ClientEventPayloads[T]
}

export type BookClientEvent = { [K in ClientEventType]: ClientEnvelope<K> }[ClientEventType]
export type ClientEventOf<T extends ClientEventType> = Extract<BookClientEvent, { type: T }>

export function clientEvent<T extends ClientEventType>(type: T, payload: ClientEventPayloads[T]): ClientEventOf<T> {
  return { v: BOOK_PROTOCOL_VERSION, type, payload } as ClientEventOf<T>
}

/** Segment ids are `<pageId>#s<sentenceIndex>`; the UI only treats them as opaque strings. */
export function segmentIdFor(pageId: string, sentenceIndex: number) {
  return `${pageId}#s${sentenceIndex}`
}
