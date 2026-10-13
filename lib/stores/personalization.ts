'use client'

import { useCallback, useSyncExternalStore } from 'react'
import { storageKeys, useLocalStorage } from '@/lib/storage'

export type LearnerLevel = 'new' | 'basics' | 'projects'
export type Interest = 'movies' | 'cricket' | 'games' | 'music' | 'cooking' | 'cars' | 'anime' | 'business' | 'science'
export type MovieGenre = 'action' | 'comedy' | 'thriller' | 'romance' | 'sci-fi' | 'animation'
export type ExplanationStyle = 'example' | 'diagram' | 'code'
export type PreferredLanguage = 'tanglish' | 'tamil' | 'english'
export type SessionPace = 'calm' | 'balanced' | 'fast'

export interface AccessibilityPreferences {
  reducedMotion: boolean
  largerText: boolean
  captions: boolean
}

export interface Personalization {
  level: LearnerLevel
  interests: Interest[]
  /** Only meaningful when `interests` includes `movies`. */
  movieGenre: MovieGenre | null
  style: ExplanationStyle
  language: PreferredLanguage
  pace: SessionPace
  accessibility: AccessibilityPreferences
}

export interface PersonalizationRecord extends Personalization {
  completedAt: string
}

type PersonalizationStore = Partial<Record<string, PersonalizationRecord>>

/** Used by the viewer whenever a learner hasn't finished the survey for a course. */
export const defaultPersonalization: Personalization = {
  level: 'new',
  interests: [],
  movieGenre: null,
  style: 'example',
  language: 'tanglish',
  pace: 'balanced',
  accessibility: { reducedMotion: false, largerText: false, captions: false },
}

const EMPTY: PersonalizationStore = {}

function normalize(input: Personalization): Personalization {
  const interests = Array.from(new Set(input.interests))
  return {
    ...input,
    interests,
    movieGenre: interests.includes('movies') ? input.movieGenre : null,
  }
}

/**
 * Per-course personalization answers, stored on this device only through the
 * safe localStorage helper. Always returns a complete object, falling back to
 * `defaultPersonalization` for courses that haven't been personalized yet.
 */
export function usePersonalization(courseId: string) {
  const [store, setStore] = useLocalStorage<PersonalizationStore>(storageKeys.personalization, EMPTY)
  const record = store[courseId]

  const save = useCallback(
    (next: Personalization) =>
      setStore((previous) => ({
        ...previous,
        [courseId]: { ...normalize(next), completedAt: new Date().toISOString() },
      })),
    [courseId, setStore],
  )

  const reset = useCallback(
    () =>
      setStore((previous) => {
        const { [courseId]: _removed, ...rest } = previous
        return rest
      }),
    [courseId, setStore],
  )

  const personalization: Personalization = record
    ? { ...defaultPersonalization, ...record, accessibility: { ...defaultPersonalization.accessibility, ...record.accessibility } }
    : defaultPersonalization

  return {
    personalization,
    completed: Boolean(record),
    completedAt: record?.completedAt ?? null,
    save,
    reset,
  }
}

const noopSubscribe = () => () => {}

/** False during SSR and hydration, true once client-only storage can be read. */
export function useHydrated() {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  )
}
