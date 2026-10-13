'use client'

import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { safeStorage, storageKeys } from '@/lib/storage'
import { NARRATION_RATES, type NarrationRate } from '@/types/book'

export type HighlightColor = 'marker' | 'amber' | 'orange'

interface ReaderPreferences {
  fontScale: number
  highlightColor: HighlightColor
  narrationRate: NarrationRate
  narrationMuted: boolean
  setFontScale: (scale: number) => void
  setHighlightColor: (color: HighlightColor) => void
  setNarrationRate: (rate: NarrationRate) => void
  setNarrationMuted: (muted: boolean) => void
}

/** Shared between the reader toolbar and canvas; persisted locally only. */
export const useReaderPreferences = create<ReaderPreferences>()(
  persist(
    (set) => ({
      fontScale: 1,
      highlightColor: 'marker',
      narrationRate: 1,
      narrationMuted: false,
      setFontScale: (scale) => set({ fontScale: Math.min(1.4, Math.max(0.85, scale)) }),
      setHighlightColor: (highlightColor) => set({ highlightColor }),
      setNarrationRate: (rate) => set({ narrationRate: NARRATION_RATES.includes(rate) ? rate : 1 }),
      setNarrationMuted: (narrationMuted) => set({ narrationMuted }),
    }),
    {
      name: storageKeys.preferences,
      storage: createJSONStorage(() => safeStorage),
      // Rehydrate after mount (see ReaderPreferencesHydrator) to avoid SSR mismatches.
      skipHydration: true,
    },
  ),
)

export function rehydrateReaderPreferences() {
  void useReaderPreferences.persist.rehydrate()
}
