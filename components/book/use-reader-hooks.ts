'use client'

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'

export function useMediaQuery(query: string) {
  return useSyncExternalStore(
    (callback) => {
      const media = window.matchMedia(query)
      media.addEventListener('change', callback)
      return () => media.removeEventListener('change', callback)
    },
    () => window.matchMedia(query).matches,
    () => false,
  )
}

export function useOnlineStatus() {
  return useSyncExternalStore(
    (callback) => {
      window.addEventListener('online', callback)
      window.addEventListener('offline', callback)
      return () => {
        window.removeEventListener('online', callback)
        window.removeEventListener('offline', callback)
      }
    },
    () => navigator.onLine,
    () => true,
  )
}

export function useFullscreen<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [active, setActive] = useState(false)
  const supported = useSyncExternalStore(
    () => () => {},
    () => Boolean(document.fullscreenEnabled),
    () => false,
  )

  useEffect(() => {
    const onChange = () => setActive(document.fullscreenElement !== null)
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  const toggle = useCallback(async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen()
      else await ref.current?.requestFullscreen()
    } catch {
      /* fullscreen can be blocked by the browser or an iframe policy */
    }
  }, [])

  return { ref, active, supported, toggle }
}

const IGNORE_KEYS_SELECTOR =
  'input, textarea, select, [contenteditable=""], [contenteditable="true"], [role="tablist"], [role="radiogroup"], [role="slider"], [role="dialog"], [role="menu"]'

/** Arrow-key page turning that never fires while typing or using a composite widget. */
export function useArrowKeyNavigation(onPrevious: () => void, onNext: () => void, enabled = true) {
  useEffect(() => {
    if (!enabled) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
      const target = event.target as HTMLElement | null
      if (target?.closest(IGNORE_KEYS_SELECTOR) || target?.isContentEditable) return
      event.preventDefault()
      if (event.key === 'ArrowLeft') onPrevious()
      else onNext()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [enabled, onPrevious, onNext])
}

const SWIPE_DISTANCE = 60

/** Horizontal swipe handlers; ignores gestures that start inside scrollable code. */
export function useSwipe(onPrevious: () => void, onNext: () => void) {
  const start = useRef<{ x: number; y: number } | null>(null)

  const onTouchStart = useCallback((event: React.TouchEvent) => {
    const target = event.target as HTMLElement
    if (target.closest('[data-swipe-ignore]') || event.touches.length !== 1) {
      start.current = null
      return
    }
    start.current = { x: event.touches[0].clientX, y: event.touches[0].clientY }
  }, [])

  const onTouchEnd = useCallback(
    (event: React.TouchEvent) => {
      const origin = start.current
      start.current = null
      if (!origin) return
      const dx = event.changedTouches[0].clientX - origin.x
      const dy = event.changedTouches[0].clientY - origin.y
      if (Math.abs(dx) < SWIPE_DISTANCE || Math.abs(dx) < Math.abs(dy) * 1.5) return
      if (dx > 0) onPrevious()
      else onNext()
    },
    [onPrevious, onNext],
  )

  return { onTouchStart, onTouchEnd }
}
