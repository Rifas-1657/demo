'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useBookClient, useBookEvent } from '@/lib/book-client/react'
import type { LearningCourseId } from '@/lib/mock/learning'
import type { PreferredLanguage } from '@/lib/stores/personalization'
import { type ChatMessage, useCourseChat } from '@/lib/stores/course-chat'
import { MAX_QUESTION_LENGTH } from '@/lib/tutor/demo-tutor'
import type { BookLessonPage } from '@/types/book'

const EMPTY: ChatMessage[] = []
const FALLBACK_ERROR = 'Sorry, the tutor could not answer that right now. Please try again.'

interface UseCourseTutorOptions {
  courseId: LearningCourseId
  courseTitle: string
  page: BookLessonPage | undefined
  pageIndex: number
  language: PreferredLanguage
  reducedMotion: boolean
}

export interface CourseTutor {
  messages: ChatMessage[]
  busy: boolean
  /** Tokens revealed so far for the answer currently streaming. */
  reveal: { id: string; count: number } | null
  ask: (question: string) => boolean
  clear: () => void
}

interface PendingAnswer {
  courseId: string
  tutorId: string
  text: string
  tokens: number
}

function makeId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

/**
 * Chat tutor backed by the book client: `ask_question` goes out, and
 * `answer_chunk` / `sources` / `scope_refused` frames fill the thread.
 */
export function useCourseTutor({
  courseId,
  page,
  pageIndex,
  language,
  reducedMotion,
}: UseCourseTutorOptions): CourseTutor {
  const client = useBookClient()
  const messages = useCourseChat((s) => s.threads[courseId]) ?? EMPTY
  const [reveal, setReveal] = useState<CourseTutor['reveal']>(null)
  const pending = useRef(new Map<string, PendingAnswer>())
  const busy = messages.some((m) => m.status !== 'done')

  const finish = useCallback((questionId: string, patch: Partial<ChatMessage>) => {
    const entry = pending.current.get(questionId)
    if (!entry) return
    pending.current.delete(questionId)
    useCourseChat.getState().update(entry.courseId, entry.tutorId, { ...patch, status: 'done' })
    setReveal((current) => (current?.id === entry.tutorId ? null : current))
  }, [])

  useBookEvent('answer_chunk', ({ payload }) => {
    const entry = pending.current.get(payload.questionId)
    if (!entry) return
    entry.text += payload.text
    entry.tokens += 1
    if (payload.final) {
      finish(payload.questionId, {
        text: entry.text,
        code: payload.attachments?.code,
        diagram: payload.attachments?.diagram,
      })
      return
    }
    if (reducedMotion) return
    useCourseChat.getState().update(entry.courseId, entry.tutorId, { text: entry.text, status: 'streaming' })
    setReveal({ id: entry.tutorId, count: entry.tokens })
  })

  useBookEvent('sources', ({ payload }) => {
    const entry = pending.current.get(payload.questionId)
    const target = entry ?? null
    if (!target) return
    useCourseChat.getState().update(target.courseId, target.tutorId, {
      sources: payload.items
        .filter((item) => item.kind === 'page')
        .map((item) => ({ label: item.title, pageIndex: Number(item.ref) || 0 })),
    })
  })

  useBookEvent('scope_refused', ({ payload }) => {
    finish(payload.questionId, { text: payload.message, offTopic: true })
  })

  useBookEvent('error', ({ payload }) => {
    if (payload.code !== 'empty_question' && payload.code !== 'unknown_context') return
    for (const questionId of [...pending.current.keys()]) finish(questionId, { text: FALLBACK_ERROR })
  })

  // Questions in flight when the reader unmounts would otherwise stay "thinking" forever.
  useEffect(() => {
    const entries = pending.current
    return () => {
      for (const questionId of [...entries.keys()]) {
        const entry = entries.get(questionId)
        if (entry) useCourseChat.getState().update(entry.courseId, entry.tutorId, { text: entry.text || FALLBACK_ERROR, status: 'done' })
      }
      entries.clear()
    }
  }, [])

  const ask = useCallback(
    (raw: string) => {
      const question = raw.trim().slice(0, MAX_QUESTION_LENGTH)
      if (!question || !page || busy) return false
      const { append } = useCourseChat.getState()
      const pageLabel = `Page ${pageIndex + 1} · ${page.title}`
      const tutorId = makeId()

      append(courseId, { id: makeId(), role: 'user', text: question, createdAt: Date.now(), pageLabel, status: 'done' })
      append(courseId, { id: tutorId, role: 'tutor', text: '', createdAt: Date.now(), pageLabel, status: 'thinking' })

      const questionId = client.askQuestion({
        sessionId: null,
        source: 'text',
        text: question,
        context: { courseId, pageId: page.id, language },
      })
      pending.current.set(questionId, { courseId, tutorId, text: '', tokens: 0 })
      return true
    },
    [busy, page, courseId, pageIndex, language, client],
  )

  const clear = useCallback(() => {
    pending.current.clear()
    setReveal(null)
    useCourseChat.getState().clear(courseId)
  }, [courseId])

  return { messages, busy, reveal, ask, clear }
}
