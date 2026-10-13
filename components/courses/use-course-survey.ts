'use client'

import type { LearningCourse } from '@/lib/mock/learning'
import { storageKeys, useLocalStorage } from '@/lib/storage'

export interface SurveyRecord {
  completedAt: string
  answers: Record<string, string>
}

export type SurveyStore = Record<string, SurveyRecord>

const EMPTY: SurveyStore = {}

/**
 * Survey answers live on this device only. A course with demo progress counts
 * as already onboarded so "Resume" goes straight back to the book.
 */
export function useCourseSurvey(course: LearningCourse) {
  const [surveys, setSurveys] = useLocalStorage<SurveyStore>(storageKeys.surveys, EMPTY)
  const completed = Boolean(surveys[course.id]) || course.completedPages > 0

  function saveSurvey(answers: Record<string, string>) {
    return setSurveys((previous) => ({
      ...previous,
      [course.id]: { completedAt: new Date().toISOString(), answers },
    }))
  }

  return { completed, saveSurvey }
}

export function getBookHref(courseId: string, chapter?: number) {
  return chapter ? `/book/${courseId}?chapter=${chapter}` : `/book/${courseId}`
}
