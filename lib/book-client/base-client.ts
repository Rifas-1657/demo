import type { BookClient, BookClientKind, BookEventListener, Unsubscribe } from '@/lib/contracts/book-client'
import { createCorrelationId } from '@/lib/contracts/book-client'
import {
  BOOK_PROTOCOL_VERSION,
  clientEvent,
  type BookClientEvent,
  type BookServerEvent,
  type ClientEventPayloads,
  type ServerEventOf,
  type ServerEventType,
} from '@/lib/contracts/book-events'
import { parseServerEvent } from '@/lib/contracts/validate'

/**
 * Listener bookkeeping, inbound validation and typed send helpers shared by
 * every transport. Subclasses implement `send` and call `deliver` with raw
 * inbound frames (objects or JSON strings).
 */
export abstract class BaseBookClient implements BookClient {
  abstract readonly kind: BookClientKind
  private listeners = new Set<BookEventListener>()
  private lastSeq = 0

  abstract send(event: BookClientEvent): void

  subscribe(listener: BookEventListener): Unsubscribe {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  on<T extends ServerEventType>(type: T, handler: (event: ServerEventOf<T>) => void): Unsubscribe {
    return this.subscribe((event) => {
      if (event.type === type) handler(event as ServerEventOf<T>)
    })
  }

  startPage(payload: ClientEventPayloads['start_page']) {
    this.send(clientEvent('start_page', payload))
  }

  pause(payload: ClientEventPayloads['pause']) {
    this.send(clientEvent('pause', payload))
  }

  resume(payload: ClientEventPayloads['resume']) {
    this.send(clientEvent('resume', payload))
  }

  seek(payload: ClientEventPayloads['seek']) {
    this.send(clientEvent('seek', payload))
  }

  speed(payload: ClientEventPayloads['speed']) {
    this.send(clientEvent('speed', payload))
  }

  askQuestion(payload: Omit<ClientEventPayloads['ask_question'], 'questionId'>) {
    const questionId = this.createId('q')
    this.send(clientEvent('ask_question', { ...payload, questionId }))
    return questionId
  }

  runCode(payload: Omit<ClientEventPayloads['run_code'], 'codeId'>) {
    const codeId = this.createId('run')
    this.send(clientEvent('run_code', { ...payload, codeId }))
    return codeId
  }

  submitSurvey(payload: ClientEventPayloads['submit_survey']) {
    this.send(clientEvent('submit_survey', payload))
  }

  /** No-op in the mock client; overridden by WebSocketBookClient to send the frame. */
  audioIn(_payload: ClientEventPayloads['audio_in']) {
    // Mock: audio_in is only meaningful with a real speech-to-text backend.
  }

  dispose() {
    this.listeners.clear()
  }

  protected createId(prefix: string) {
    return createCorrelationId(prefix)
  }

  /** Validates a raw frame and fans it out. Invalid frames become a recoverable `error` event. */
  protected deliver(raw: unknown) {
    const parsed = parseServerEvent(raw)
    const event: BookServerEvent = parsed.ok
      ? parsed.event
      : {
          v: BOOK_PROTOCOL_VERSION,
          type: 'error',
          seq: this.lastSeq,
          sessionId: null,
          ts: Date.now(),
          payload: { code: 'invalid_frame', message: parsed.error, recoverable: true },
        }
    if (parsed.ok) this.lastSeq = Math.max(this.lastSeq, event.seq)
    if (!parsed.ok && process.env.NODE_ENV === 'development') console.warn('[book-client] dropped frame:', parsed.error)

    for (const listener of [...this.listeners]) {
      try {
        listener(event)
      } catch (error) {
        console.error('[book-client] listener failed', error)
      }
    }
  }
}
