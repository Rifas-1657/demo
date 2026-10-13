import {
  BOOK_PROTOCOL_VERSION,
  SERVER_EVENT_TYPES,
  type BookServerEvent,
  type ServerEventType,
} from './book-events'

/**
 * Dependency-free runtime guard for inbound frames. It checks the envelope
 * and the fields the UI relies on; unknown extra fields are allowed so the
 * backend can add data without breaking older clients.
 */

export type ParseResult = { ok: true; event: BookServerEvent } | { ok: false; error: string }

type Obj = Record<string, unknown>
type Check = (payload: Obj) => string | null

const isObj = (value: unknown): value is Obj => typeof value === 'object' && value !== null && !Array.isArray(value)
const isStr = (value: unknown): value is string => typeof value === 'string'
const isNum = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)
const isBool = (value: unknown): value is boolean => typeof value === 'boolean'
const isStrArray = (value: unknown): value is string[] => Array.isArray(value) && value.every(isStr)

function fields(spec: Record<string, (value: unknown) => boolean>): Check {
  return (payload) => {
    for (const [key, test] of Object.entries(spec)) {
      if (!test(payload[key])) return `payload.${key} is invalid`
    }
    return null
  }
}

const oneOf =
  <T extends string>(...values: T[]) =>
  (value: unknown): value is T =>
    isStr(value) && (values as string[]).includes(value)
const optional = (test: (value: unknown) => boolean) => (value: unknown) => value === undefined || test(value)
const nonNegativeInt = (value: unknown) => isNum(value) && Number.isInteger(value) && value >= 0

const isSourceItem = (value: unknown) =>
  isObj(value) && isStr(value.title) && oneOf('page', 'note', 'doc')(value.kind) && isStr(value.ref)

const isTraceStep = (value: unknown) =>
  isObj(value) && nonNegativeInt(value.logicalLine) && optional(isStr)(value.output) && Array.isArray(value.variables)

const isTrace = (value: unknown) =>
  isObj(value) &&
  (value.exampleId === null || isStr(value.exampleId)) &&
  Array.isArray(value.steps) &&
  value.steps.every(isTraceStep) &&
  isStrArray(value.stdin) &&
  optional(isStrArray)(value.sampleInputs) &&
  optional(isStr)(value.unsupported)

const isAttachments = (value: unknown) =>
  isObj(value) && optional(isStr)(value.code) && optional(isStrArray)(value.diagram)

const checks: { [K in ServerEventType]: Check } = {
  session_started: fields({ sessionId: isStr, courseId: isStr, pageId: isStr }),
  text_chunk: fields({
    segmentId: isStr,
    text: isStr,
    wordStart: nonNegativeInt,
    wordEnd: nonNegativeInt,
    audioStartMs: (v) => isNum(v) && v >= 0,
  }),
  audio_chunk: fields({ segmentId: isStr, mime: isStr, base64: isStr, seq: nonNegativeInt, final: isBool }),
  cue: fields({
    segmentId: isStr,
    atWord: nonNegativeInt,
    action: oneOf('draw', 'highlight', 'runCode', 'showOutput'),
    targetId: isStr,
  }),
  diagram_spec: fields({
    diagramId: isStr,
    spec: (v) => isObj(v) && isStr(v.kind) && Array.isArray(v.nodes),
    steps: isStrArray,
  }),
  diagram_draw: fields({ diagramId: isStr, stepId: isStr }),
  highlight: fields({ targetId: isStr, style: oneOf('marker', 'ring', 'underline') }),
  code_stream: fields({ codeId: isStr, chunk: isStr, final: isBool }),
  run_result: fields({
    codeId: isStr,
    stdout: isStr,
    stderr: isStr,
    status: oneOf('success', 'error'),
    durationMs: (v) => isNum(v) && v >= 0,
    trace: optional(isTrace),
  }),
  question_received: fields({ questionId: isStr, source: oneOf('voice', 'text'), text: isStr }),
  answer_chunk: fields({ questionId: isStr, text: isStr, final: isBool, attachments: optional(isAttachments) }),
  scope_refused: fields({ questionId: isStr, message: isStr }),
  sources: fields({ questionId: isStr, items: (v) => Array.isArray(v) && v.every(isSourceItem) }),
  page_complete: fields({ pageId: isStr }),
  error: fields({ code: isStr, message: isStr, recoverable: isBool }),
  auth_ok: fields({ userId: isStr, role: oneOf('learner', 'admin') }),
  auth_error: fields({ code: isStr, message: isStr }),
}

const knownTypes = new Set<string>(SERVER_EVENT_TYPES)

export function isServerEventType(value: unknown): value is ServerEventType {
  return isStr(value) && knownTypes.has(value)
}

export function parseServerEvent(raw: unknown): ParseResult {
  let value = raw
  if (isStr(raw)) {
    try {
      value = JSON.parse(raw)
    } catch {
      return { ok: false, error: 'frame is not valid JSON' }
    }
  }
  if (!isObj(value)) return { ok: false, error: 'frame is not an object' }
  if (value.v !== BOOK_PROTOCOL_VERSION) return { ok: false, error: `unsupported protocol version: ${String(value.v)}` }
  if (!isServerEventType(value.type)) return { ok: false, error: `unknown event type: ${String(value.type)}` }
  if (!nonNegativeInt(value.seq)) return { ok: false, error: 'seq is invalid' }
  if (!(value.sessionId === null || isStr(value.sessionId))) return { ok: false, error: 'sessionId is invalid' }
  if (!isNum(value.ts)) return { ok: false, error: 'ts is invalid' }
  if (!isObj(value.payload)) return { ok: false, error: 'payload is not an object' }

  const problem = checks[value.type](value.payload)
  if (problem) return { ok: false, error: `${value.type}: ${problem}` }
  return { ok: true, event: value as unknown as BookServerEvent }
}
