'use client'

import { motion } from 'framer-motion'
import { easeOutExpo } from '@/lib/motion'

interface RevealProps {
  children: React.ReactNode
  className?: string
  delay?: number
  as?: 'div' | 'li' | 'section'
}

/** Fade-and-rise on first scroll into view. Transforms are dropped under reduced motion by MotionConfig. */
export function Reveal({ children, className, delay = 0, as = 'div' }: RevealProps) {
  const Component = motion[as]
  return (
    <Component
      className={className}
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.9, ease: easeOutExpo, delay }}
    >
      {children}
    </Component>
  )
}
