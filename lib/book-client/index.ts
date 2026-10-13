import type { BookClient } from '@/lib/contracts/book-client'
import { MockBookClient } from './mock-book-client'
import { WebSocketBookClient, getWsUrl, shouldUseWsClient } from './websocket-book-client'

export { MockBookClient } from './mock-book-client'
export { WebSocketBookClient } from './websocket-book-client'
export { SEED_FRAMES } from './fixtures'
export type { BookClient } from '@/lib/contracts/book-client'

/**
 * Single swap point for the transport. Returns a WebSocket-backed client when
 * NEXT_PUBLIC_BOOKEY_CLIENT=ws and NEXT_PUBLIC_BOOKEY_WS_URL is set; otherwise
 * falls back to the offline mock so development always works.
 */
export function createBookClient(): BookClient {
  if (shouldUseWsClient()) {
    const url = getWsUrl()!
    return new WebSocketBookClient(url)
  }
  return new MockBookClient()
}
