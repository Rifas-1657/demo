import {
  BOOK_PROTOCOL_VERSION,
  type BookServerEvent,
  type ServerEventOf,
  type ServerEventPayloads,
  type ServerEventType,
} from '@/lib/contracts/book-events'

/**
 * Deterministic, hand-written frames for `MockBookClient.replay()`. Fixed
 * timestamps and seq values make the output reproducible in tests and docs.
 * Includes one malformed frame to exercise the `invalid_frame` error path.
 */

const SEED_TS = 1_790_000_000_000
const SESSION = 'sess_seed_1'

function seedFrame<T extends ServerEventType>(
  seq: number,
  type: T,
  payload: ServerEventPayloads[T],
  sessionId: string | null = SESSION,
): ServerEventOf<T> {
  return { v: BOOK_PROTOCOL_VERSION, type, seq, sessionId, ts: SEED_TS + seq * 100, payload } as ServerEventOf<T>
}

export const SEED_NARRATION_FRAMES: BookServerEvent[] = [
  seedFrame(1, 'session_started', { sessionId: SESSION, courseId: 'python', pageId: 'py-01' }),
  seedFrame(2, 'text_chunk', { segmentId: 'py-01#s0', text: 'Variables', wordStart: 0, wordEnd: 1, audioStartMs: 0 }),
  seedFrame(3, 'audio_chunk', { segmentId: 'py-01#s0', mime: 'audio/mpeg', base64: '', seq: 0, final: false }),
  seedFrame(4, 'text_chunk', { segmentId: 'py-01#s0', text: 'store', wordStart: 1, wordEnd: 2, audioStartMs: 420 }),
  seedFrame(5, 'cue', { segmentId: 'py-01#s0', atWord: 1, action: 'highlight', targetId: 'term-variable' }),
  seedFrame(6, 'highlight', { targetId: 'term-variable', style: 'marker' }),
  seedFrame(7, 'diagram_draw', { diagramId: 'py-01', stepId: 'step-1' }),
  seedFrame(8, 'text_chunk', { segmentId: 'py-01#s0', text: 'values.', wordStart: 2, wordEnd: 3, audioStartMs: 760 }),
  seedFrame(9, 'audio_chunk', { segmentId: 'py-01#s0', mime: 'audio/mpeg', base64: '', seq: 1, final: true }),
  seedFrame(10, 'page_complete', { pageId: 'py-01' }),
]

export const SEED_TUTOR_FRAMES: BookServerEvent[] = [
  seedFrame(11, 'question_received', { questionId: 'q_seed_1', source: 'text', text: 'What is a variable?' }),
  seedFrame(12, 'answer_chunk', { questionId: 'q_seed_1', text: 'A variable is a named ', final: false }),
  seedFrame(13, 'answer_chunk', { questionId: 'q_seed_1', text: 'box for a value.', final: true, attachments: { code: 'age = 21' } }),
  seedFrame(14, 'sources', { questionId: 'q_seed_1', items: [{ title: 'Page 1 · Variables', kind: 'page', ref: '0' }] }),
  seedFrame(15, 'question_received', { questionId: 'q_seed_2', source: 'voice', text: 'Who won the match?' }),
  seedFrame(16, 'scope_refused', { questionId: 'q_seed_2', message: 'I can only help with this course.' }),
]

export const SEED_CODE_FRAMES: BookServerEvent[] = [
  seedFrame(17, 'code_stream', { codeId: 'run_seed_1', chunk: 'age = 21\n', final: false }, null),
  seedFrame(18, 'code_stream', { codeId: 'run_seed_1', chunk: 'print(age)\n', final: true }, null),
  seedFrame(19, 'run_result', { codeId: 'run_seed_1', stdout: '21\n', stderr: '', status: 'success', durationMs: 12 }, null),
]

/** Deliberately invalid: `wordStart` is negative. Delivered as a recoverable `invalid_frame` error. */
export const SEED_INVALID_FRAME: unknown = {
  v: BOOK_PROTOCOL_VERSION,
  type: 'text_chunk',
  seq: 20,
  sessionId: SESSION,
  ts: SEED_TS,
  payload: { segmentId: 'py-01#s0', text: 'oops', wordStart: -1, wordEnd: 0, audioStartMs: 0 },
}

export const SEED_FRAMES: unknown[] = [
  ...SEED_NARRATION_FRAMES,
  ...SEED_TUTOR_FRAMES,
  ...SEED_CODE_FRAMES,
  SEED_INVALID_FRAME,
]
