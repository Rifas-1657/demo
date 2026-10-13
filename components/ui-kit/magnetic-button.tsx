'use client'

import { motion, useMotionValue, useSpring } from 'framer-motion'
import { useRef } from 'react'
import { useRichMotion } from '@/lib/motion'
import { BookeyButton, type BookeyButtonProps } from './bookey-button'

interface MagneticButtonProps extends BookeyButtonProps {
  strength?: number
}

/** Magnetic pull on desktop fine pointers only; a regular button everywhere else. */
export function MagneticButton({ strength = 0.3, ...props }: MagneticButtonProps) {
  const rich = useRichMotion()
  const ref = useRef<HTMLSpanElement>(null)
  const x = useSpring(useMotionValue(0), { stiffness: 220, damping: 18, mass: 0.4 })
  const y = useSpring(useMotionValue(0), { stiffness: 220, damping: 18, mass: 0.4 })

  if (!rich) return <BookeyButton {...props} />

  function handleMove(event: React.PointerEvent<HTMLSpanElement>) {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    x.set((event.clientX - (rect.left + rect.width / 2)) * strength)
    y.set((event.clientY - (rect.top + rect.height / 2)) * strength)
  }

  function reset() {
    x.set(0)
    y.set(0)
  }

  return (
    <motion.span ref={ref} onPointerMove={handleMove} onPointerLeave={reset} style={{ x, y }} className="inline-flex">
      <BookeyButton {...props} />
    </motion.span>
  )
}
