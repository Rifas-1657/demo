'use client'

import { useReducedMotion } from 'framer-motion'
import dynamic from 'next/dynamic'
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { useFinePointer } from '@/lib/motion'
import { cn } from '@/lib/utils'
import { OpenBookFallback } from './open-book-fallback'

const OpenBookScene = dynamic(() => import('./open-book-scene'), { ssr: false, loading: () => null })

function detectWebGL() {
  try {
    const canvas = document.createElement('canvas')
    return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'))
  } catch {
    return false
  }
}

const noopSubscribe = () => () => {}

const CHIPS = [
  { label: 'variables', className: 'top-[14%] left-[8%]', delay: '0s' },
  { label: 'for loop', className: 'top-[6%] right-[18%]', delay: '-1.6s' },
  { label: 'input()', className: 'bottom-[12%] right-[22%]', delay: '-3.1s', mono: true },
  { label: 'diagram', className: 'bottom-[14%] left-[14%]', delay: '-2.2s' },
  { label: 'ask a question', className: 'top-[24%] right-[30%] max-sm:hidden', delay: '-0.8s', accent: true },
]

export function HeroVisual({ className }: { className?: string }) {
  const reduced = useReducedMotion()
  const fine = useFinePointer()
  const hasWebGL = useSyncExternalStore(noopSubscribe, detectWebGL, () => false)
  const ref = useRef<HTMLDivElement>(null)
  const [inView, setInView] = useState(true)

  useEffect(() => {
    const node = ref.current
    if (!node) return
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { rootMargin: '100px' })
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  const use3D = hasWebGL && !reduced

  return (
    <div ref={ref} className={cn('relative', className)}>
      <div aria-hidden="true" className="absolute inset-[12%] rounded-full bg-[radial-gradient(circle,rgb(245_158_11/0.28),rgb(225_29_72/0.12)_45%,transparent_70%)] blur-2xl" />
      {use3D ? (
        <div className="absolute inset-0">
          <OpenBookFallback className="absolute inset-0 animate-out fade-out fill-mode-forwards [animation-delay:900ms] [animation-duration:600ms]" />
          <OpenBookScene active={inView} animate={fine && !reduced} />
          <span className="sr-only">An open Bookey book with glowing pages that gently turn.</span>
        </div>
      ) : (
        <OpenBookFallback className="absolute inset-0" />
      )}
      <ul aria-label="Topics inside this book" className="pointer-events-none absolute inset-0">
        {CHIPS.map((chip) => (
          <li
            key={chip.label}
            className={cn('absolute motion-safe:animate-[landing-float_6s_ease-in-out_infinite]', chip.className)}
            style={{ animationDelay: chip.delay }}
          >
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs backdrop-blur-md sm:text-sm',
                chip.accent
                  ? 'border-brand-pink/40 bg-brand-pink/15 text-[#FFF1F3]'
                  : 'border-white/12 bg-white/6 text-[#FFF1F3]/85',
                chip.mono && 'font-mono',
              )}
            >
              <span aria-hidden="true" className={cn('size-1.5 rounded-full', chip.accent ? 'bg-brand-pink' : 'bg-book-amber')} />
              {chip.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
