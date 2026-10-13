'use client'

import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { safeStorage } from '@/lib/storage'
import type { TutorSource } from '@/lib/tutor/demo-tutor'

export interface ChatMessage {
  id: string
  role: 'user' | 'tutor'
  text: string
  createdAt: number
  pageLabel?: string
  status: 'thinking' | 'streaming' | 'done'
  code?: string
  diagram?: string[]
  sources?: TutorSource[]
  offTopic?: boolean
}

interface CourseChatState {
  threads: Record<string, ChatMessage[]>
  append: (courseId: string, message: ChatMessage) => void
  update: (courseId: string, id: string, patch: Partial<ChatMessage>) => void
  clear: (courseId: string) => void
}

const MAX_MESSAGES = 100

function isMessage(value: unknown): value is ChatMessage {
  const m = value as ChatMessage
  return Boolean(m) && typeof m.id === 'string' && (m.role === 'user' || m.role === 'tutor') && typeof m.text === 'string'
}

/** Device-local demo conversation history, one thread per course. */
export const useCourseChat = create<CourseChatState>()(
  persist(
    (set) => ({
      threads: {},
      append: (courseId, message) =>
        set((state) => ({
          threads: { ...state.threads, [courseId]: [...(state.threads[courseId] ?? []), message].slice(-MAX_MESSAGES) },
        })),
      update: (courseId, id, patch) =>
        set((state) => ({
          threads: {
            ...state.threads,
            [courseId]: (state.threads[courseId] ?? []).map((m) => (m.id === id ? { ...m, ...patch } : m)),
          },
        })),
      clear: (courseId) =>
        set((state) => {
          const { [courseId]: _removed, ...rest } = state.threads
          return { threads: rest }
        }),
    }),
    {
      name: 'reader:course-chat',
      storage: createJSONStorage(() => safeStorage),
      skipHydration: true,
      partialize: ({ threads }) => ({ threads }),
      merge: (persisted, current) => {
        const saved = (persisted ?? {}) as Partial<CourseChatState>
        const threads: Record<string, ChatMessage[]> = {}
        if (saved.threads && typeof saved.threads === 'object') {
          for (const [courseId, list] of Object.entries(saved.threads)) {
            if (!Array.isArray(list)) continue
            // An answer interrupted by a reload is shown in full rather than stuck mid-stream.
            threads[courseId] = list.filter(isMessage).map((m) => ({ ...m, status: 'done' as const }))
          }
        }
        return { ...current, threads }
      },
    },
  ),
)

export function rehydrateCourseChat() {
  void useCourseChat.persist.rehydrate()
}
