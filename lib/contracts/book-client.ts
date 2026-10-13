import type {
  BookClientEvent,
  BookServerEvent,
  ClientEventPayloads,
  ServerEventOf,
  ServerEventType,
} from './book-events'

export type Unsubscribe = () => void
export type BookEventListener = (event: BookServerEvent) => void

export type BookClientKind = 'mock' | 'websocket'

/**
 * The only surface UI code may depend on. `MockBookClient` implements it
 * today; a WebSocket client targeting the FastAPI backend will implement the
 * same interface so components do not change.
 */
export interface BookClient {
  readonly kind: BookClientKind

  /** Every validated inbound frame, in arrival order. */
  subscribe(listener: BookEventListener): Unsubscribe
  /** Frames of a single type, narrowed. */
  on<T extends ServerEventType>(type: T, handler: (event: ServerEventOf<T>) => void): Unsubscribe

  /** Low-level escape hatch; prefer the typed helpers below. */
  send(event: BookClientEvent): void

  startPage(payload: ClientEventPayloads['start_page']): void
  pause(payload: ClientEventPayloads['pause']): void
  resume(payload: ClientEventPayloads['resume']): void
  seek(payload: ClientEventPayloads['seek']): void
  speed(payload: ClientEventPayloads['speed']): void
  askQuestion(payload: Omit<ClientEventPayloads['ask_question'], 'questionId'>): string
  runCode(payload: Omit<ClientEventPayloads['run_code'], 'codeId'>): string
  submitSurvey(payload: ClientEventPayloads['submit_survey']): void
  /** Optional: sends a push-to-talk audio chunk. No-op in mock clients. */
  audioIn(payload: ClientEventPayloads['audio_in']): void

  /**
   * Stops timers/sockets and drops listeners. Not terminal: the client can be
   * subscribed to again (React Strict Mode re-runs effects in development).
   */
  dispose(): void
}

export function createCorrelationId(prefix: string) {
  const random =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
  return `${prefix}_${random}`
}
