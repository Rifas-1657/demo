'use client'

import { createContext, useContext, useEffect, useEffectEvent, useState } from 'react'
import type { BookClient } from '@/lib/contracts/book-client'
import type { ServerEventOf, ServerEventType } from '@/lib/contracts/book-events'
import { createBookClient } from './index'

const BookClientContext = createContext<BookClient | null>(null)

export function BookClientProvider({ client: provided, children }: { client?: BookClient; children: React.ReactNode }) {
  const [client] = useState(() => provided ?? createBookClient())

  useEffect(() => {
    if (provided) return
    return () => client.dispose()
  }, [client, provided])

  return <BookClientContext.Provider value={client}>{children}</BookClientContext.Provider>
}

export function useBookClient(): BookClient {
  const client = useContext(BookClientContext)
  if (!client) throw new Error('useBookClient must be used inside <BookClientProvider>.')
  return client
}

/** Subscribes to one server event type; the handler always sees the latest render's values. */
export function useBookEvent<T extends ServerEventType>(type: T, handler: (event: ServerEventOf<T>) => void) {
  const client = useBookClient()
  const onEvent = useEffectEvent(handler)
  useEffect(() => client.on(type, (event) => onEvent(event)), [client, type])
}
