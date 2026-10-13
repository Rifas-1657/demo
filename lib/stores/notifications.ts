'use client'

import { useCallback, useMemo } from 'react'
import { seedInbox, type InboxItem } from '@/lib/mock/inbox'
import { storageKeys, useLocalStorage } from '@/lib/storage'

/** Only overrides are stored; the seed list stays the source of item content. */
interface InboxState {
  read: Record<string, boolean>
  removed: string[]
}

const EMPTY_STATE: InboxState = { read: {}, removed: [] }

function sanitize(value: unknown): InboxState {
  const raw = (value && typeof value === 'object' ? value : {}) as Partial<InboxState>
  const read: Record<string, boolean> = {}
  if (raw.read && typeof raw.read === 'object') {
    for (const [id, flag] of Object.entries(raw.read)) if (typeof flag === 'boolean') read[id] = flag
  }
  const removed = Array.isArray(raw.removed) ? raw.removed.filter((id): id is string => typeof id === 'string') : []
  return { read, removed }
}

export function useNotificationCenter() {
  const [raw, setRaw] = useLocalStorage<unknown>(storageKeys.notifications, EMPTY_STATE)
  const state = useMemo(() => sanitize(raw), [raw])

  const items: InboxItem[] = useMemo(
    () =>
      seedInbox
        .filter((item) => !state.removed.includes(item.id))
        .map((item) => ({ ...item, read: state.read[item.id] ?? item.read })),
    [state],
  )

  const update = useCallback(
    (fn: (previous: InboxState) => InboxState) => setRaw((previous: unknown) => fn(sanitize(previous))),
    [setRaw],
  )

  const setRead = useCallback(
    (id: string, read: boolean) => update((s) => ({ ...s, read: { ...s.read, [id]: read } })),
    [update],
  )

  const markAllRead = useCallback(
    (ids: string[]) =>
      update((s) => ({ ...s, read: { ...s.read, ...Object.fromEntries(ids.map((id) => [id, true])) } })),
    [update],
  )

  const remove = useCallback(
    (id: string) => update((s) => ({ ...s, removed: s.removed.includes(id) ? s.removed : [...s.removed, id] })),
    [update],
  )

  const undoRemove = useCallback((id: string) => update((s) => ({ ...s, removed: s.removed.filter((r) => r !== id) })), [update])

  const restoreDemo = useCallback(() => setRaw(EMPTY_STATE), [setRaw])

  return {
    items,
    unreadCount: items.filter((item) => !item.read).length,
    setRead,
    markAllRead,
    remove,
    undoRemove,
    restoreDemo,
  }
}
