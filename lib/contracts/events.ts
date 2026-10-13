import type { ChapterId, CourseId, PageId, UserId } from '@/types/learning'

/**
 * Frontend-to-backend event contracts (DRAFT).
 * These describe what the UI will eventually send to a real API. Today they
 * are only consumed by local/demo handlers — nothing is transmitted.
 * TODO: finalise payloads, versioning, and transport once a backend exists.
 */

export const CONTRACT_VERSION = '0.1.0-draft' as const

interface BaseEvent<TType extends string, TPayload> {
  type: TType
  version: typeof CONTRACT_VERSION
  occurredAt: string
  userId: UserId
  payload: TPayload
}

export type PageViewedEvent = BaseEvent<'page.viewed', { courseId: CourseId; chapterId: ChapterId; pageId: PageId; dwellMs: number }>
export type PageCompletedEvent = BaseEvent<'page.completed', { courseId: CourseId; pageId: PageId }>
export type BookmarkToggledEvent = BaseEvent<'bookmark.toggled', { pageId: PageId; bookmarked: boolean }>
export type NoteSavedEvent = BaseEvent<'note.saved', { pageId: PageId; noteId: string; length: number }>
export type SurveyAnsweredEvent = BaseEvent<'survey.answered', { surveyId: string; questionId: string; answer: string | number | string[] }>

export type LearningEvent =
  | PageViewedEvent
  | PageCompletedEvent
  | BookmarkToggledEvent
  | NoteSavedEvent
  | SurveyAnsweredEvent

export type LearningEventType = LearningEvent['type']

export function createEvent<E extends LearningEvent>(
  type: E['type'],
  userId: UserId,
  payload: E['payload'],
): E {
  return { type, version: CONTRACT_VERSION, occurredAt: new Date().toISOString(), userId, payload } as E
}
