'use client'

import { useCallback, useSyncExternalStore } from 'react'

/**
 * Safe localStorage helpers. Storage can be unavailable (SSR, private mode,
 * quota exceeded, disabled cookies), so every call degrades to a no-op/fallback.
 * Only harmless, device-local data belongs here: preferences, bookmarks,
 * notes, survey answers. Nothing here is ever sent to a server.
 */

const PREFIX = 'bookey:v1:'
const CHANGE_EVENT = 'bookey-storage'

export const storageKeys = {
  preferences: 'preferences',
  bookmarks: 'bookmarks',
  notes: 'notes',
  surveys: 'surveys',
  personalization: 'personalization',
  libraryBookmarks: 'library:bookmarks',
  libraryNotes: 'library:notes',
  readingHistory: 'library:history',
  recentSearches: 'search:recent',
  runnerSnapshots: 'runner:snapshots',
  profile: 'workspace:profile',
  appSettings: 'workspace:settings',
  notifications: 'workspace:notifications',
  revisedTopics: 'progress:revised',
} as const

/**
 * Removes every key this app owns (the `bookey:v1:` namespace) and nothing
 * else, so other sites' or extensions' browser data is never touched.
 * Returns how many entries were removed.
 */
export function clearAppStorage(): number {
  const store = getStore()
  if (!store) return 0
  try {
    const owned: string[] = []
    for (let index = 0; index < store.length; index++) {
      const key = store.key(index)
      if (key?.startsWith(PREFIX)) owned.push(key)
    }
    owned.forEach((key) => store.removeItem(key))
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: '*' }))
    return owned.length
  } catch {
    return 0
  }
}

function getStore(): Storage | null {
  if (typeof window === 'undefined') return null
  try {
    const store = window.localStorage
    const probe = `${PREFIX}__probe__`
    store.setItem(probe, '1')
    store.removeItem(probe)
    return store
  } catch {
    return null
  }
}

export function isStorageAvailable(): boolean {
  return getStore() !== null
}

export function readStorage<T>(key: string, fallback: T): T {
  const store = getStore()
  if (!store) return fallback
  try {
    const raw = store.getItem(PREFIX + key)
    return raw === null ? fallback : (JSON.parse(raw) as T)
  } catch {
    return fallback
  }
}

export function writeStorage<T>(key: string, value: T): boolean {
  const store = getStore()
  if (!store) return false
  try {
    store.setItem(PREFIX + key, JSON.stringify(value))
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: key }))
    return true
  } catch {
    return false
  }
}

export function removeStorage(key: string): void {
  const store = getStore()
  if (!store) return
  try {
    store.removeItem(PREFIX + key)
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: key }))
  } catch {
    /* storage unavailable */
  }
}

/** Raw Storage-like adapter for libraries such as zustand/persist. */
export const safeStorage = {
  getItem: (name: string) => {
    const store = getStore()
    try {
      return store?.getItem(PREFIX + name) ?? null
    } catch {
      return null
    }
  },
  setItem: (name: string, value: string) => {
    try {
      getStore()?.setItem(PREFIX + name, value)
    } catch {
      /* ignore quota / privacy errors */
    }
  },
  removeItem: (name: string) => {
    try {
      getStore()?.removeItem(PREFIX + name)
    } catch {
      /* ignore */
    }
  },
}

function subscribe(callback: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key.startsWith(PREFIX)) callback()
  }
  window.addEventListener('storage', onStorage)
  window.addEventListener(CHANGE_EVENT, callback)
  return () => {
    window.removeEventListener('storage', onStorage)
    window.removeEventListener(CHANGE_EVENT, callback)
  }
}

/** React hook backed by localStorage; stays in sync across components and tabs. */
export function useLocalStorage<T>(key: string, fallback: T) {
  const raw = useSyncExternalStore(
    subscribe,
    () => safeStorage.getItem(key),
    () => null,
  )

  let value = fallback
  if (raw !== null) {
    try {
      value = JSON.parse(raw) as T
    } catch {
      value = fallback
    }
  }

  const setValue = useCallback(
    (next: T | ((previous: T) => T)) => {
      const previous = readStorage<T>(key, fallback)
      const resolved = typeof next === 'function' ? (next as (p: T) => T)(previous) : next
      return writeStorage(key, resolved)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key],
  )

  return [value, setValue] as const
}
