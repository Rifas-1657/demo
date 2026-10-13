'use client'

import { useReducedMotion } from 'framer-motion'
import { useSyncExternalStore } from 'react'

export const easeOutExpo = [0.16, 1, 0.3, 1] as const

function subscribeMedia(query: string) {
  return (callback: () => void) => {
    const mql = window.matchMedia(query)
    mql.addEventListener('change', callback)
    return () => mql.removeEventListener('change', callback)
  }
}

export function useMediaQuery(query: string, serverValue = false) {
  return useSyncExternalStore(
    subscribeMedia(query),
    () => window.matchMedia(query).matches,
    () => serverValue,
  )
}

/** True only for precise, hover-capable pointers (desktop mouse/trackpad). */
export function useFinePointer() {
  return useMediaQuery('(hover: hover) and (pointer: fine)')
}

/** Rich effects (magnetic, cursor, heavy scroll) only when appropriate. */
export function useRichMotion() {
  const reduced = useReducedMotion()
  const fine = useFinePointer()
  return !reduced && fine
}

export { useReducedMotion }
