/**
 * WebSocket-backed BookClient — B1 version.
 *
 * Selected by NEXT_PUBLIC_BOOKEY_CLIENT=ws when NEXT_PUBLIC_BOOKEY_WS_URL is set.
 * Falls back gracefully to the mock client when the URL is absent.
 *
 * Features:
 * - WS ticket auth (B1): fetches a short-lived ticket via POST /api/ws-ticket and
 *   sends it as the FIRST frame { v:2, type:'auth_ticket', payload:{ticket} }.
 *   The server replies with auth_ok or auth_error (connection-level, not in protocol union).
 * - Frame validation via lib/contracts/validate.ts (invalid frames become recoverable error events)
 * - Exponential backoff + jitter on disconnect (max 30 s)
 * - Heartbeat ping/pong (30 s interval, 10 s timeout)
 * - Session resume by sessionId + last received seq
 * - Connection status exposed via `connectionStatus` property
 *
 * Protocol: version 2 (BOOK_PROTOCOL_VERSION)
 * Browsers cannot set Authorization headers on WebSocket. Do NOT put tokens in the URL.
 */

import type { BookClientKind } from '@/lib/contracts/book-client'
import type { BookClientEvent, ClientEventPayloads } from '@/lib/contracts/book-events'
import { BOOK_PROTOCOL_VERSION } from '@/lib/contracts/book-events'
import { BaseBookClient } from './base-client'

export type ConnectionStatus = 'connecting' | 'authenticating' | 'connected' | 'disconnected' | 'reconnecting'

/** Async function that returns a single-use WS ticket string. */
export type TicketFetcher = () => Promise<string>

const AUTH_TIMEOUT_MS = 5_000
const HEARTBEAT_INTERVAL_MS = 30_000
const HEARTBEAT_TIMEOUT_MS = 10_000
const BASE_BACKOFF_MS = 500
const MAX_BACKOFF_MS = 30_000
const MAX_RECONNECT_ATTEMPTS = 10

function jitter(ms: number) {
  return ms * (0.8 + Math.random() * 0.4)
}

function backoffDelay(attempt: number) {
  return Math.min(jitter(BASE_BACKOFF_MS * 2 ** attempt), MAX_BACKOFF_MS)
}

export class WebSocketBookClient extends BaseBookClient {
  readonly kind: BookClientKind = 'websocket'

  private url: string
  /** Optional ticket fetcher — when set, auth_ticket is sent as first frame. */
  private ticketFetcher: TicketFetcher | null
  private ws: WebSocket | null = null
  private authenticated = false
  private authTimeoutTimer: ReturnType<typeof setTimeout> | null = null
  private reconnectAttempts = 0
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null
  private heartbeatTimeoutTimer: ReturnType<typeof setTimeout> | null = null
  private disposed = false

  /** Frames queued before auth completes. */
  private pendingFrames: BookClientEvent[] = []

  private lastSessionId: string | null = null
  private lastSeqReceived = 0

  private _status: ConnectionStatus = 'connecting'
  private statusListeners = new Set<(status: ConnectionStatus) => void>()

  /**
   * @param url       WebSocket URL, e.g. ws://localhost:8000/ws/book
   * @param options.ticketFetcher  When provided, calls this to get a ticket and
   *                               sends auth_ticket as the first frame (B1 auth mode).
   *                               When absent, connects without auth (B0 / mock mode).
   */
  constructor(url: string, options?: { ticketFetcher?: TicketFetcher }) {
    super()
    this.url = url
    this.ticketFetcher = options?.ticketFetcher ?? null
    this.connect()
  }

  get connectionStatus(): ConnectionStatus {
    return this._status
  }

  onStatusChange(listener: (status: ConnectionStatus) => void): () => void {
    this.statusListeners.add(listener)
    return () => this.statusListeners.delete(listener)
  }

  private setStatus(status: ConnectionStatus) {
    this._status = status
    for (const listener of this.statusListeners) {
      try { listener(status) } catch {}
    }
  }

  private connect() {
    if (this.disposed) return
    try {
      this.ws = new WebSocket(this.url)
      this.ws.onopen = this.handleOpen
      this.ws.onmessage = this.handleMessage
      this.ws.onerror = this.handleError
      this.ws.onclose = this.handleClose
    } catch (err) {
      console.error('[ws-book-client] failed to open WebSocket:', err)
      this.scheduleReconnect()
    }
  }

  private handleOpen = async () => {
    this.reconnectAttempts = 0
    this.authenticated = false

    if (this.ticketFetcher) {
      this.setStatus('authenticating')
      // 5-second auth timeout: close the socket if auth_ok is not received
      this.authTimeoutTimer = setTimeout(() => {
        if (!this.authenticated) {
          if (process.env.NODE_ENV === 'development') {
            console.warn('[ws-book-client] auth timeout — closing socket')
          }
          this.ws?.close(4002, 'auth timeout')
        }
      }, AUTH_TIMEOUT_MS)

      // Fetch ticket and send auth_ticket as the very first frame
      try {
        const ticket = await this.ticketFetcher()
        this._rawSend({ v: BOOK_PROTOCOL_VERSION, type: 'auth_ticket', payload: { ticket } } as BookClientEvent)
      } catch (err) {
        console.error('[ws-book-client] failed to fetch WS ticket:', err)
        this.ws?.close(4003, 'ticket fetch failed')
      }
    } else {
      // No auth (B0 / mock mode) — mark authenticated immediately
      this.authenticated = true
      this.setStatus('connected')
      this.startHeartbeat()
      this._flushPending()
      if (this.lastSessionId) {
        this._rawSend({ v: BOOK_PROTOCOL_VERSION, type: 'resume', payload: { sessionId: this.lastSessionId } } as BookClientEvent)
      }
    }
  }

  private handleMessage = (event: MessageEvent) => {
    this.resetHeartbeatTimeout()

    const raw = event.data as string

    // Pong: connection-level, skip
    if (raw === '{"type":"pong"}' || raw.includes('"type":"pong"')) return

    // Auth frames: connection-level, handle before deliver()
    try {
      const parsed = JSON.parse(raw)
      if (parsed.type === 'auth_ok') {
        if (this.authTimeoutTimer !== null) { clearTimeout(this.authTimeoutTimer); this.authTimeoutTimer = null }
        this.authenticated = true
        this.setStatus('connected')
        this.startHeartbeat()
        this._flushPending()
        if (this.lastSessionId) {
          this._rawSend({ v: BOOK_PROTOCOL_VERSION, type: 'resume', payload: { sessionId: this.lastSessionId } } as BookClientEvent)
        }
        return
      }
      if (parsed.type === 'auth_error') {
        if (process.env.NODE_ENV === 'development') {
          console.error('[ws-book-client] auth rejected:', parsed.payload?.message)
        }
        this.ws?.close(4001, 'auth rejected')
        return
      }
    } catch {}

    // Normal frames
    try {
      this.deliver(raw)
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[ws-book-client] failed to deliver frame:', err)
      }
    }
  }

  private handleError = (event: Event) => {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[ws-book-client] WebSocket error:', event)
    }
  }

  private handleClose = (_event: CloseEvent) => {
    if (this.authTimeoutTimer !== null) { clearTimeout(this.authTimeoutTimer); this.authTimeoutTimer = null }
    this.stopHeartbeat()
    if (this.disposed) return
    this.authenticated = false
    this.setStatus('reconnecting')
    this.scheduleReconnect()
  }

  private scheduleReconnect() {
    if (this.disposed || this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      this.setStatus('disconnected')
      return
    }
    const delay = backoffDelay(this.reconnectAttempts)
    this.reconnectAttempts += 1
    this.reconnectTimer = setTimeout(() => {
      if (!this.disposed) {
        this.setStatus('reconnecting')
        this.connect()
      }
    }, delay)
  }

  private startHeartbeat() {
    this.stopHeartbeat()
    this.heartbeatTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }))
        this.heartbeatTimeoutTimer = setTimeout(() => {
          this.ws?.close(4000, 'heartbeat timeout')
        }, HEARTBEAT_TIMEOUT_MS)
      }
    }, HEARTBEAT_INTERVAL_MS)
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer !== null) clearInterval(this.heartbeatTimer)
    if (this.heartbeatTimeoutTimer !== null) clearTimeout(this.heartbeatTimeoutTimer)
    this.heartbeatTimer = null
    this.heartbeatTimeoutTimer = null
  }

  private resetHeartbeatTimeout() {
    if (this.heartbeatTimeoutTimer !== null) {
      clearTimeout(this.heartbeatTimeoutTimer)
      this.heartbeatTimeoutTimer = null
    }
  }

  private _rawSend(event: BookClientEvent | object) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(event))
      } catch (err) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('[ws-book-client] send failed:', err)
        }
      }
    }
  }

  private _flushPending() {
    for (const frame of this.pendingFrames) {
      this._rawSend(frame)
    }
    this.pendingFrames = []
  }

  send(event: BookClientEvent): void {
    if (event.type === 'start_page') {
      this.lastSessionId = null
    }
    if (!this.authenticated) {
      // Queue until auth completes
      this.pendingFrames.push(event)
      return
    }
    this._rawSend(event)
  }

  /** Override to send the audio_in frame over the WebSocket. */
  override audioIn(payload: ClientEventPayloads['audio_in']): void {
    if (process.env.NEXT_PUBLIC_BOOKEY_MIC !== 'on') return
    this.send({ v: BOOK_PROTOCOL_VERSION, type: 'audio_in', payload } as BookClientEvent)
  }

  override dispose() {
    this.disposed = true
    if (this.authTimeoutTimer !== null) clearTimeout(this.authTimeoutTimer)
    this.stopHeartbeat()
    if (this.reconnectTimer !== null) clearTimeout(this.reconnectTimer)
    this.ws?.close(1000, 'disposed')
    this.ws = null
    this.pendingFrames = []
    this.setStatus('disconnected')
    super.dispose()
  }
}

/** Reads NEXT_PUBLIC_BOOKEY_WS_URL from env. Returns null when not set. */
export function getWsUrl(): string | null {
  return process.env.NEXT_PUBLIC_BOOKEY_WS_URL ?? null
}

/** True when the WebSocket client should be used. */
export function shouldUseWsClient(): boolean {
  return (
    process.env.NEXT_PUBLIC_BOOKEY_CLIENT === 'ws' && getWsUrl() !== null
  )
}
