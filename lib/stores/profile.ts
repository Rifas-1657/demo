'use client'

import { useCallback, useMemo } from 'react'
import { storageKeys, useLocalStorage } from '@/lib/storage'
import {
  defaultPersonalization,
  type AccessibilityPreferences,
  type ExplanationStyle,
  type Interest,
  type PreferredLanguage,
  type SessionPace,
} from '@/lib/stores/personalization'

export interface LearnerProfile {
  displayName: string
  email: string
  /** Small, locally resized data URL. Never uploaded anywhere. */
  avatar: string | null
  language: PreferredLanguage
  interests: Interest[]
  style: ExplanationStyle
  pace: SessionPace
  accessibility: AccessibilityPreferences
}

export const NAME_MAX = 60
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const defaultProfile: LearnerProfile = {
  displayName: 'Demo learner',
  email: 'learner@bookey.example',
  avatar: null,
  language: defaultPersonalization.language,
  interests: ['movies', 'cricket'],
  style: defaultPersonalization.style,
  pace: defaultPersonalization.pace,
  accessibility: { ...defaultPersonalization.accessibility },
}

const LANGUAGES: PreferredLanguage[] = ['tanglish', 'tamil', 'english']
const STYLES: ExplanationStyle[] = ['example', 'diagram', 'code']
const PACES: SessionPace[] = ['calm', 'balanced', 'fast']
const INTERESTS: Interest[] = ['movies', 'cricket', 'games', 'music', 'cooking', 'cars', 'anime', 'business', 'science']

function sanitizeProfile(value: unknown): LearnerProfile {
  const raw = (value && typeof value === 'object' ? value : {}) as Partial<LearnerProfile>
  const d = defaultProfile
  const access = (raw.accessibility ?? {}) as Partial<AccessibilityPreferences>
  return {
    displayName:
      typeof raw.displayName === 'string' && raw.displayName.trim() ? raw.displayName.trim().slice(0, NAME_MAX) : d.displayName,
    email: typeof raw.email === 'string' && EMAIL_PATTERN.test(raw.email) ? raw.email : d.email,
    avatar: typeof raw.avatar === 'string' && raw.avatar.startsWith('data:image/') ? raw.avatar : null,
    language: LANGUAGES.includes(raw.language as PreferredLanguage) ? (raw.language as PreferredLanguage) : d.language,
    interests: Array.isArray(raw.interests)
      ? Array.from(new Set(raw.interests.filter((item): item is Interest => INTERESTS.includes(item as Interest))))
      : d.interests,
    style: STYLES.includes(raw.style as ExplanationStyle) ? (raw.style as ExplanationStyle) : d.style,
    pace: PACES.includes(raw.pace as SessionPace) ? (raw.pace as SessionPace) : d.pace,
    accessibility: {
      reducedMotion: typeof access.reducedMotion === 'boolean' ? access.reducedMotion : d.accessibility.reducedMotion,
      largerText: typeof access.largerText === 'boolean' ? access.largerText : d.accessibility.largerText,
      captions: typeof access.captions === 'boolean' ? access.captions : d.accessibility.captions,
    },
  }
}

export function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'L'
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase()
}

export function useProfile() {
  const [raw, setRaw] = useLocalStorage<unknown>(storageKeys.profile, defaultProfile)
  const profile = useMemo(() => sanitizeProfile(raw), [raw])
  const save = useCallback((next: LearnerProfile) => setRaw(sanitizeProfile(next)), [setRaw])
  return { profile, save }
}
