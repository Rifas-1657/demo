'use client'

import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { safeStorage } from '@/lib/storage'
import type { ReaderViewMode } from '@/types/book'

interface ReaderSession {
  /** Last page id per course. */
  lastPage: Record<string, string>
  /** Page ids opened per course, used for rail completion markers. */
  visited: Record<string, string[]>
  viewMode: ReaderViewMode
  /** True once the learner has toggled the mode themselves; before that the survey decides the default. */
  viewModeChosen: boolean
  railOpen: boolean
  hydrated: boolean
  setLastPage: (courseId: string, pageId: string) => void
  setViewMode: (mode: ReaderViewMode) => void
  setRailOpen: (open: boolean) => void
}

const MAX_VISITED = 200

/** Device-local reading position and harmless reader UI preferences. */
export const useReaderSession = create<ReaderSession>()(
  persist(
    (set) => ({
      lastPage: {},
      visited: {},
      viewMode: 'full',
      viewModeChosen: false,
      railOpen: true,
      hydrated: false,
      setLastPage: (courseId, pageId) =>
        set((state) => {
          const seen = state.visited[courseId] ?? []
          return {
            lastPage: { ...state.lastPage, [courseId]: pageId },
            visited: seen.includes(pageId)
              ? state.visited
              : { ...state.visited, [courseId]: [...seen, pageId].slice(-MAX_VISITED) },
          }
        }),
      setViewMode: (viewMode) => set({ viewMode, viewModeChosen: true }),
      setRailOpen: (railOpen) => set({ railOpen }),
    }),
    {
      name: 'reader:session',
      storage: createJSONStorage(() => safeStorage),
      skipHydration: true,
      partialize: ({ lastPage, visited, viewMode, viewModeChosen, railOpen }) => ({ lastPage, visited, viewMode, viewModeChosen, railOpen }),
      merge: (persisted, current) => {
        const saved = (persisted ?? {}) as Partial<ReaderSession>
        return {
          ...current,
          lastPage: saved.lastPage && typeof saved.lastPage === 'object' ? saved.lastPage : {},
          visited: saved.visited && typeof saved.visited === 'object' ? saved.visited : {},
          viewMode: saved.viewMode === 'guided' ? 'guided' : 'full',
          viewModeChosen: saved.viewModeChosen === true,
          railOpen: typeof saved.railOpen === 'boolean' ? saved.railOpen : true,
        }
      },
      onRehydrateStorage: () => () => useReaderSession.setState({ hydrated: true }),
    },
  ),
)

export function rehydrateReaderSession() {
  void useReaderSession.persist.rehydrate()
}
