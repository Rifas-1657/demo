'use client'

import { useCallback, useMemo } from 'react'
import {
  seedBookmarks,
  seedNotes,
  seedReadingHistory,
  type LibraryBookmark,
  type LibraryNote,
  type PageRef,
  type ReadingSession,
} from '@/lib/mock/library'
import { readStorage, storageKeys, useLocalStorage, writeStorage } from '@/lib/storage'

const MAX_RECENT_SEARCHES = 8
const MAX_NOTE_LENGTH = 2000

function isPageRef(value: unknown): value is PageRef & { id: string } {
  if (!value || typeof value !== 'object') return false
  const item = value as Record<string, unknown>
  return (
    typeof item.id === 'string' &&
    typeof item.courseId === 'string' &&
    Number.isInteger(item.chapter) &&
    Number.isInteger(item.page)
  )
}

/** Drops anything malformed so a corrupted entry never crashes the page. */
function sanitizeList<T extends { id: string }>(value: unknown, fallback: T[], check: (item: unknown) => boolean): T[] {
  return Array.isArray(value) ? (value.filter(check) as T[]) : fallback
}

const isBookmark = (item: unknown) => isPageRef(item) && typeof (item as LibraryBookmark).excerpt === 'string'
const isNote = (item: unknown) => isPageRef(item) && typeof (item as LibraryNote).text === 'string'
const isSession = (item: unknown) => isPageRef(item) && typeof (item as ReadingSession).label === 'string'

function createId(prefix: string) {
  const random =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2)
  return `${prefix}_${random}`
}

function insertAt<T>(list: T[], index: number, item: T) {
  const next = list.slice()
  next.splice(Math.min(Math.max(index, 0), next.length), 0, item)
  return next
}

export function samePage(a: PageRef, b: PageRef) {
  return a.courseId === b.courseId && a.chapter === b.chapter && a.page === b.page
}

const relativeFormatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

/** Seed items keep their fixed label; items created here show real elapsed time. */
export function formatWhen(label: string | undefined, iso: string | undefined) {
  if (label) return label
  if (!iso) return 'Saved earlier'
  const seconds = Math.round((new Date(iso).getTime() - Date.now()) / 1000)
  if (Number.isNaN(seconds)) return 'Saved earlier'
  const abs = Math.abs(seconds)
  if (abs < 60) return 'Just now'
  if (abs < 3600) return relativeFormatter.format(Math.round(seconds / 60), 'minute')
  if (abs < 86400) return relativeFormatter.format(Math.round(seconds / 3600), 'hour')
  return relativeFormatter.format(Math.round(seconds / 86400), 'day')
}

export function useBookmarks() {
  const [raw, setRaw] = useLocalStorage<unknown>(storageKeys.libraryBookmarks, seedBookmarks)
  const bookmarks = useMemo(() => sanitizeList<LibraryBookmark>(raw, seedBookmarks, isBookmark), [raw])

  const update = useCallback(
    (fn: (list: LibraryBookmark[]) => LibraryBookmark[]) =>
      setRaw((previous: unknown) => fn(sanitizeList<LibraryBookmark>(previous, seedBookmarks, isBookmark))),
    [setRaw],
  )

  const toggle = useCallback(
    (ref: PageRef, excerpt: string) =>
      update((list) =>
        list.some((item) => samePage(item, ref))
          ? list.filter((item) => !samePage(item, ref))
          : [{ ...ref, id: createId('bm'), excerpt, createdAt: new Date().toISOString() }, ...list],
      ),
    [update],
  )

  const remove = useCallback((id: string) => update((list) => list.filter((item) => item.id !== id)), [update])
  const restore = useCallback(
    (bookmark: LibraryBookmark, index: number) =>
      update((list) => (list.some((item) => item.id === bookmark.id) ? list : insertAt(list, index, bookmark))),
    [update],
  )

  return { bookmarks, toggle, remove, restore }
}

export function useNotes() {
  const [raw, setRaw] = useLocalStorage<unknown>(storageKeys.libraryNotes, seedNotes)
  const notes = useMemo(() => sanitizeList<LibraryNote>(raw, seedNotes, isNote), [raw])

  const update = useCallback(
    (fn: (list: LibraryNote[]) => LibraryNote[]) =>
      setRaw((previous: unknown) => fn(sanitizeList<LibraryNote>(previous, seedNotes, isNote))),
    [setRaw],
  )

  const edit = useCallback(
    (id: string, text: string) =>
      update((list) =>
        list.map((note) =>
          note.id === id
            ? { ...note, text: text.trim().slice(0, MAX_NOTE_LENGTH), label: undefined, updatedAt: new Date().toISOString() }
            : note,
        ),
      ),
    [update],
  )

  const add = useCallback(
    (ref: PageRef, text: string, quote?: string) => {
      const trimmed = text.trim().slice(0, MAX_NOTE_LENGTH)
      if (!trimmed) return false
      return update((list) => [
        { ...ref, id: createId('note'), text: trimmed, quote, updatedAt: new Date().toISOString() },
        ...list,
      ])
    },
    [update],
  )

  const remove = useCallback((id: string) => update((list) => list.filter((note) => note.id !== id)), [update])
  const restore = useCallback(
    (note: LibraryNote, index: number) =>
      update((list) => (list.some((item) => item.id === note.id) ? list : insertAt(list, index, note))),
    [update],
  )

  return { notes, add, edit, remove, restore, maxLength: MAX_NOTE_LENGTH }
}

export function useReadingHistory() {
  const [raw, setRaw] = useLocalStorage<unknown>(storageKeys.readingHistory, seedReadingHistory)
  const history = useMemo(() => sanitizeList<ReadingSession>(raw, seedReadingHistory, isSession), [raw])
  const clear = useCallback(() => setRaw([]), [setRaw])
  const restoreDemo = useCallback(() => setRaw(seedReadingHistory), [setRaw])
  return { history, clear, restoreDemo }
}

function sanitizeSearches(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.trim() !== '') : []
}

/** Usable outside React (e.g. the top-bar form) without subscribing. */
export function addRecentSearch(query: string) {
  const trimmed = query.trim().slice(0, 80)
  if (!trimmed) return
  const previous = sanitizeSearches(readStorage<unknown>(storageKeys.recentSearches, []))
  const next = [trimmed, ...previous.filter((item) => item.toLowerCase() !== trimmed.toLowerCase())].slice(0, MAX_RECENT_SEARCHES)
  writeStorage(storageKeys.recentSearches, next)
}

export function useRecentSearches() {
  const [raw, setRaw] = useLocalStorage<unknown>(storageKeys.recentSearches, [])
  const searches = useMemo(() => sanitizeSearches(raw), [raw])
  const remove = useCallback(
    (query: string) => setRaw((previous: unknown) => sanitizeSearches(previous).filter((item) => item !== query)),
    [setRaw],
  )
  const clear = useCallback(() => setRaw([]), [setRaw])
  return { searches, add: addRecentSearch, remove, clear }
}
