'use client'

import { useCallback, useMemo } from 'react'
import { storageKeys, useLocalStorage } from '@/lib/storage'
import { useReaderPreferences } from '@/lib/stores/reader-preferences'
import { NARRATION_RATES, type NarrationRate } from '@/types/book'

export type ThemePreference = 'light' | 'dark' | 'auto'
export type TextSize = 'sm' | 'md' | 'lg'
export type Density = 'comfortable' | 'compact'
export type PageTurn = 'animated' | 'instant'

export interface AppSettings {
  theme: ThemePreference
  reduceMotion: boolean
  textSize: TextSize
  density: Density
  narrationRate: NarrationRate
  captions: boolean
  autoAdvance: boolean
  pageTurn: PageTurn
}

export const defaultAppSettings: AppSettings = {
  theme: 'light',
  reduceMotion: false,
  textSize: 'md',
  density: 'comfortable',
  narrationRate: 1,
  captions: false,
  autoAdvance: false,
  pageTurn: 'animated',
}

const pick = <T extends string>(value: unknown, allowed: readonly T[], fallback: T): T =>
  allowed.includes(value as T) ? (value as T) : fallback

const bool = (value: unknown, fallback: boolean) => (typeof value === 'boolean' ? value : fallback)

/** Coerces anything read from storage into a complete, valid settings object. */
export function sanitizeSettings(value: unknown): AppSettings {
  const raw = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>
  const d = defaultAppSettings
  return {
    theme: pick(raw.theme, ['light', 'dark', 'auto'] as const, d.theme),
    reduceMotion: bool(raw.reduceMotion, d.reduceMotion),
    textSize: pick(raw.textSize, ['sm', 'md', 'lg'] as const, d.textSize),
    density: pick(raw.density, ['comfortable', 'compact'] as const, d.density),
    narrationRate: NARRATION_RATES.includes(raw.narrationRate as NarrationRate)
      ? (raw.narrationRate as NarrationRate)
      : d.narrationRate,
    captions: bool(raw.captions, d.captions),
    autoAdvance: bool(raw.autoAdvance, d.autoAdvance),
    pageTurn: pick(raw.pageTurn, ['animated', 'instant'] as const, d.pageTurn),
  }
}

/** The reader keeps its own persisted speed; keep it in step with the saved default. */
async function syncReaderRate(rate: NarrationRate) {
  await useReaderPreferences.persist.rehydrate()
  useReaderPreferences.getState().setNarrationRate(rate)
}

export function useAppSettings() {
  const [raw, setRaw] = useLocalStorage<unknown>(storageKeys.appSettings, defaultAppSettings)
  const settings = useMemo(() => sanitizeSettings(raw), [raw])

  const save = useCallback(
    (next: AppSettings) => {
      const clean = sanitizeSettings(next)
      const ok = setRaw(clean)
      if (ok) void syncReaderRate(clean.narrationRate)
      return ok
    },
    [setRaw],
  )

  const reset = useCallback(() => save(defaultAppSettings), [save])

  return { settings, save, reset }
}
