'use client'

import { motion } from 'framer-motion'
import { ArrowRight, Check, FlaskConical, RotateCcw } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { BookeyButton } from '@/components/ui-kit/bookey-button'
import { easeOutExpo } from '@/lib/motion'
import { cn } from '@/lib/utils'

const STAGES = [
  'Preparing your learning path',
  'Selecting examples for your interests',
  'Setting up diagrams',
  'Opening your book',
] as const

const STAGE_MS = 900

interface PreparationScreenProps {
  courseId: string
  courseTitle: string
  summary: { label: string; value: string }[]
  onEdit: () => void
}

export function PreparationScreen({ courseId, courseTitle, summary, onEdit }: PreparationScreenProps) {
  const [stage, setStage] = useState(0)
  const done = stage >= STAGES.length
  const headingRef = useRef<HTMLHeadingElement>(null)
  const ctaRef = useRef<HTMLAnchorElement>(null)

  useEffect(() => {
    headingRef.current?.focus()
    const timers = STAGES.map((_, index) => window.setTimeout(() => setStage(index + 1), STAGE_MS * (index + 1)))
    return () => timers.forEach(window.clearTimeout)
  }, [])

  useEffect(() => {
    if (done) ctaRef.current?.focus({ preventScroll: true })
  }, [done])

  const percent = Math.round((Math.min(stage, STAGES.length) / STAGES.length) * 100)

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 py-8">
      <div className="inline-flex items-center gap-2 self-start rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground">
        <FlaskConical aria-hidden="true" className="size-3.5 text-primary" />
        Front-end demo — nothing is generated, uploaded, or sent to an AI model.
      </div>

      <div className="flex flex-col gap-3">
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="font-display text-4xl leading-[1.05] font-bold tracking-tight outline-none sm:text-5xl"
        >
          {done ? 'Your book is ready.' : 'Setting up your book…'}
        </h1>
        <p className="text-lg text-muted-foreground">
          {done
            ? `${courseTitle} will open with the preferences you chose. You can change them anytime.`
            : `A short simulated sequence for ${courseTitle} using the answers saved on this device.`}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <div
          role="progressbar"
          aria-label="Preparation progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          className="h-2 overflow-hidden rounded-full bg-muted"
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary to-brand-pink transition-[width] duration-700 ease-out motion-reduce:transition-none"
            style={{ width: `${Math.max(percent, 4)}%` }}
          />
        </div>
        <p className="text-right font-mono text-xs text-muted-foreground">{percent}%</p>
      </div>

      <ol className="flex flex-col gap-3" aria-live="polite">
        {STAGES.map((label, index) => {
          const status = index < stage ? 'done' : index === stage ? 'active' : 'pending'
          return (
            <motion.li
              key={label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: status === 'pending' ? 0.45 : 1, y: 0 }}
              transition={{ duration: 0.5, ease: easeOutExpo, delay: index * 0.05 }}
              className={cn(
                'flex items-center gap-4 rounded-2xl border bg-card px-4 py-3',
                status === 'active' ? 'border-primary/50 shadow-[0_10px_30px_-20px_var(--primary)]' : 'border-border',
              )}
            >
              <span
                className={cn(
                  'flex size-8 shrink-0 items-center justify-center rounded-full',
                  status === 'done' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground',
                )}
              >
                {status === 'done' ? (
                  <Check aria-hidden="true" className="size-4" strokeWidth={3} />
                ) : status === 'active' ? (
                  <span aria-hidden="true" className="size-3 animate-pulse rounded-full bg-primary motion-reduce:animate-none" />
                ) : (
                  <span aria-hidden="true" className="font-mono text-xs">{index + 1}</span>
                )}
              </span>
              <span className="font-medium">
                {label}
                <span className="sr-only">{status === 'done' ? ' — done' : status === 'active' ? ' — in progress' : ' — waiting'}</span>
              </span>
            </motion.li>
          )
        })}
      </ol>

      <dl className="grid grid-cols-2 gap-x-6 gap-y-3 rounded-3xl bg-secondary/50 p-5 sm:grid-cols-3">
        {summary.map((item) => (
          <div key={item.label} className="flex flex-col gap-0.5">
            <dt className="font-mono text-[10px] tracking-[0.16em] text-muted-foreground uppercase">{item.label}</dt>
            <dd className="font-medium">{item.value}</dd>
          </div>
        ))}
      </dl>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <BookeyButton variant="ghost" onClick={onEdit}>
          <RotateCcw aria-hidden="true" />
          Edit answers
        </BookeyButton>
        <BookeyButton
          size="lg"
          nativeButton={false}
          aria-disabled={!done || undefined}
          render={<Link ref={ctaRef} href={`/book/${courseId}`} tabIndex={done ? undefined : -1} />}
          className={cn(!done && 'pointer-events-none opacity-50')}
        >
          Open your book
          <ArrowRight aria-hidden="true" />
        </BookeyButton>
      </div>
    </div>
  )
}
