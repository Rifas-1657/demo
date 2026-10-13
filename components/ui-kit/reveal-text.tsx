'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { easeOutExpo } from '@/lib/motion'
import { cn } from '@/lib/utils'

type Tag = 'h1' | 'h2' | 'h3' | 'p' | 'span'

interface RevealTextProps {
  text: string
  as?: Tag
  className?: string
  delay?: number
  /** Animate on mount instead of when scrolled into view. */
  immediate?: boolean
}

/**
 * Word-by-word reveal. Screen readers get the full string once; with reduced
 * motion it renders plain text with no animation wrappers.
 */
export function RevealText({ text, as: Component = 'span', className, delay = 0, immediate = false }: RevealTextProps) {
  const reduced = useReducedMotion()

  if (reduced) return <Component className={className}>{text}</Component>

  const words = text.split(' ')
  const trigger = immediate ? { animate: 'visible' } : { whileInView: 'visible', viewport: { once: true, amount: 0.6 } }

  return (
    <Component className={className}>
      <span className="sr-only">{text}</span>
      <motion.span aria-hidden="true" initial="hidden" {...trigger} transition={{ staggerChildren: 0.06, delayChildren: delay }} className="inline">
        {words.map((word, i) => (
          <span key={`${word}-${i}`} className="inline-block overflow-hidden pb-[0.08em] align-bottom">
            <motion.span
              className={cn('inline-block')}
              variants={{ hidden: { y: '110%' }, visible: { y: '0%' } }}
              transition={{ duration: 0.8, ease: easeOutExpo }}
            >
              {word}
            </motion.span>
            {i < words.length - 1 && '\u00A0'}
          </span>
        ))}
      </motion.span>
    </Component>
  )
}
