'use client'

import { useRef } from 'react'
import { gsap, MOTION_OK, useGSAP } from '@/lib/gsap'

/** Example GSAP ScrollTrigger scene: staggered rise, no pinning, desktop + motion-OK only. */
export function ScrollScene({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLUListElement>(null)

  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add(MOTION_OK, () => {
        gsap.from('[data-scene-item]', {
          y: 48,
          opacity: 0,
          duration: 0.9,
          ease: 'expo.out',
          stagger: 0.12,
          scrollTrigger: { trigger: ref.current, start: 'top 80%', once: true },
        })
      })
      return () => mm.revert()
    },
    { scope: ref },
  )

  return (
    <ul ref={ref} className="mt-10 grid gap-4 md:grid-cols-3">
      {children}
    </ul>
  )
}
