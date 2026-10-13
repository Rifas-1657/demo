'use client'

import { useReducedMotion } from 'framer-motion'
import dynamic from 'next/dynamic'
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { cn } from '@/lib/utils'
import { BookStatic } from './book-static'
import type { Book3DProps } from './types'

const BookScene = dynamic(() => import('./book-scene'), { ssr: false })

function detectWebGL() {
  try {
    const canvas = document.createElement('canvas')
    return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'))
  } catch {
    return false
  }
}

const noopSubscribe = () => () => {}

/**
 * Lazy-loaded 3D book. Renders the static CSS book on the server, under
 * reduced motion, without WebGL, and until it first scrolls into view.
 * The render loop pauses while the canvas is off-screen.
 */
export function Book3D({ className, interactive = true, ...props }: Book3DProps) {
  const reduced = useReducedMotion()
  const hasWebGL = useSyncExternalStore(noopSubscribe, detectWebGL, () => false)
  const ref = useRef<HTMLDivElement>(null)
  const [hasEntered, setHasEntered] = useState(false)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const node = ref.current
    if (!node) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        setInView(entry.isIntersecting)
        if (entry.isIntersecting) setHasEntered(true)
      },
      { rootMargin: '200px' },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  const use3D = hasWebGL && !reduced && hasEntered

  return (
    <div ref={ref} className={cn('relative aspect-square w-full', className)}>
      {use3D ? (
        <>
          <span className="sr-only">{`Book cover: ${props.title} by ${props.author}`}</span>
          <BookScene {...props} interactive={interactive} active={inView} />
        </>
      ) : (
        <BookStatic {...props} className="absolute inset-0" />
      )}
    </div>
  )
}
