'use client'

import { MotionConfig } from 'framer-motion'
import { useEffect, useSyncExternalStore } from 'react'
import { useAppSettings } from '@/lib/stores/app-settings'

const DARK_QUERY = '(prefers-color-scheme: dark)'
const TEXT_SCALE = { sm: '93.75%', md: '', lg: '112.5%' } as const

function subscribeDark(callback: () => void) {
  const media = window.matchMedia(DARK_QUERY)
  media.addEventListener('change', callback)
  return () => media.removeEventListener('change', callback)
}

/**
 * Applies saved appearance settings to the document while a workspace route
 * is mounted, and undoes them on unmount so marketing pages and the reader
 * keep their own look.
 */
export function WorkspacePreferences({ children }: { children: React.ReactNode }) {
  const { settings } = useAppSettings()
  const systemDark = useSyncExternalStore(
    subscribeDark,
    () => window.matchMedia(DARK_QUERY).matches,
    () => false,
  )
  const dark = settings.theme === 'dark' || (settings.theme === 'auto' && systemDark)

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('theme-night', dark)
    root.style.fontSize = TEXT_SCALE[settings.textSize]
    root.dataset.density = settings.density
    if (settings.reduceMotion) root.dataset.reduceMotion = 'true'
    else delete root.dataset.reduceMotion

    return () => {
      root.classList.remove('theme-night')
      root.style.fontSize = ''
      delete root.dataset.density
      delete root.dataset.reduceMotion
    }
  }, [dark, settings.textSize, settings.density, settings.reduceMotion])

  return <MotionConfig reducedMotion={settings.reduceMotion ? 'always' : 'user'}>{children}</MotionConfig>
}
