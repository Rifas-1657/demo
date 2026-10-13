'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { BookOpen, FileVideo, GraduationCap, SlidersHorizontal, Sparkles } from 'lucide-react'
import { useId, useState } from 'react'
import { BookeyBadge } from '@/components/ui-kit/bookey-badge'
import { easeOutExpo } from '@/lib/motion'
import { cn } from '@/lib/utils'
import { StepVisual } from './step-visuals'

export const STEPS = [
  {
    key: 'upload',
    icon: FileVideo,
    title: 'Choose or upload a source',
    short: 'Source',
    status: 'Demo only',
    body: 'Start from a long lecture, tutorial, podcast, or conversation. In this prototype you pick the bundled demo source; nothing is sent to a server.',
    detail: ['Video, audio, or transcript', 'Long-form works best', 'Demo source included'],
  },
  {
    key: 'personalize',
    icon: SlidersHorizontal,
    title: 'Personalize how you learn',
    short: 'Personalize',
    status: undefined,
    body: 'Set your depth, daily pace, and how you like ideas explained, so the book is shaped around you rather than the original runtime.',
    detail: ['Depth: foundations to advanced', 'Daily pace', 'Analogies, diagrams, or code first'],
  },
  {
    key: 'generate',
    icon: Sparkles,
    title: 'Generate the book',
    short: 'Generate',
    status: 'Simulated',
    body: 'Bookey would transcribe the source, find the key ideas, and arrange them into chapters and short pages. Here, the progress is a scripted demonstration.',
    detail: ['Chapters and page outline', 'Diagrams drafted per concept', 'Practice where it adds value'],
  },
  {
    key: 'open',
    icon: BookOpen,
    title: 'Open interactive chapters',
    short: 'Open',
    status: undefined,
    body: 'Move through short pages instead of scrubbing a timeline. Highlight passages, bookmark pages, and jump between chapters.',
    detail: ['Chapter navigation', 'Highlights and bookmarks', 'Resume where you left off'],
  },
  {
    key: 'learn',
    icon: GraduationCap,
    title: 'Learn with narration, diagrams, and code',
    short: 'Learn',
    status: undefined,
    body: 'Listen with word-by-word highlighting, watch diagrams draw as the idea unfolds, and run code examples right on the page.',
    detail: ['Synced narration', 'Animated diagrams', 'Runnable code examples'],
  },
] as const

export type StepKey = (typeof STEPS)[number]['key']

export function ProcessTimeline() {
  const [active, setActive] = useState(0)
  const baseId = useId()
  const step = STEPS[active]
  const progress = active / (STEPS.length - 1)

  function handleKey(event: React.KeyboardEvent<HTMLButtonElement>) {
    const keys: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }
    let next: number
    if (event.key in keys) next = (active + keys[event.key] + STEPS.length) % STEPS.length
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = STEPS.length - 1
    else return
    event.preventDefault()
    setActive(next)
    document.getElementById(`${baseId}-tab-${next}`)?.focus()
  }

  return (
    <div>
      <div className="relative">
        {/* Track: vertical on mobile, horizontal through the dots on desktop. */}
        <span aria-hidden="true" className="absolute top-6 bottom-6 left-[1.375rem] w-px bg-border lg:top-[1.375rem] lg:right-[10%] lg:bottom-auto lg:left-[10%] lg:h-px lg:w-auto" />
        <motion.span
          aria-hidden="true"
          className="absolute top-6 left-[1.375rem] hidden h-px origin-left bg-primary lg:top-[1.375rem] lg:left-[10%] lg:block lg:w-[80%]"
          initial={false}
          animate={{ scaleX: progress }}
          transition={{ duration: 0.6, ease: easeOutExpo }}
        />
        <motion.span
          aria-hidden="true"
          className="absolute top-6 bottom-6 left-[1.375rem] w-px origin-top bg-primary lg:hidden"
          initial={false}
          animate={{ scaleY: progress }}
          transition={{ duration: 0.6, ease: easeOutExpo }}
        />

        <div
          role="tablist"
          aria-label="Steps from source to book"
          className="relative flex flex-col gap-2 lg:grid lg:grid-cols-5 lg:gap-4"
        >
          {STEPS.map((s, i) => {
            const Icon = s.icon
            const isActive = i === active
            const isDone = i < active
            return (
              <button
                key={s.key}
                id={`${baseId}-tab-${i}`}
                role="tab"
                type="button"
                aria-selected={isActive}
                aria-controls={`${baseId}-panel`}
                tabIndex={isActive ? 0 : -1}
                onClick={() => setActive(i)}
                onKeyDown={handleKey}
                className="group flex items-start gap-4 rounded-2xl py-1 text-left focus-visible:outline-none lg:flex-col lg:items-center lg:text-center"
              >
                <span
                  className={cn(
                    'relative grid size-11 shrink-0 place-items-center rounded-full border transition-[background-color,border-color,color,box-shadow] duration-300 group-focus-visible:ring-4 group-focus-visible:ring-ring/30',
                    isActive
                      ? 'border-primary bg-primary text-primary-foreground shadow-[0_0_0_6px_var(--secondary)]'
                      : isDone
                        ? 'border-primary bg-secondary text-primary'
                        : 'border-border bg-background text-muted-foreground group-hover:border-primary/50',
                  )}
                >
                  <Icon aria-hidden="true" className="size-5" />
                </span>
                <span className="pt-1 lg:pt-2">
                  <span className="block font-mono text-[11px] tracking-[0.16em] text-muted-foreground uppercase">
                    Step {String(i + 1).padStart(2, '0')}
                  </span>
                  <span
                    className={cn(
                      'mt-1 block font-semibold transition-colors lg:text-[15px]',
                      isActive ? 'text-foreground' : 'text-foreground/65 group-hover:text-foreground',
                    )}
                  >
                    {s.title}
                  </span>
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div
        id={`${baseId}-panel`}
        role="tabpanel"
        aria-labelledby={`${baseId}-tab-${active}`}
        className="mt-12 lg:mt-16"
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={step.key}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.45, ease: easeOutExpo }}
            className="grid gap-10 lg:grid-cols-[1fr_1.15fr] lg:items-center lg:gap-16"
          >
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-mono text-sm text-primary">{String(active + 1).padStart(2, '0')} / 05</span>
                {step.status && <BookeyBadge tone="book">{step.status}</BookeyBadge>}
              </div>
              <h3 className="mt-4 text-3xl leading-tight font-semibold tracking-tight sm:text-4xl">{step.title}</h3>
              <p className="mt-4 max-w-xl text-lg leading-relaxed text-muted-foreground">{step.body}</p>
              <ul className="mt-6 flex flex-wrap gap-2">
                {step.detail.map((d) => (
                  <li key={d} className="rounded-full border border-border bg-card px-3.5 py-1.5 text-sm">
                    {d}
                  </li>
                ))}
              </ul>
            </div>
            <StepVisual step={step.key} />
          </motion.div>
        </AnimatePresence>

        <div className="mt-10 flex items-center gap-3">
          <button
            type="button"
            onClick={() => setActive((a) => Math.max(0, a - 1))}
            disabled={active === 0}
            className="rounded-full border border-border bg-card px-4 py-2 text-sm font-medium transition-colors hover:bg-muted focus-visible:ring-4 focus-visible:ring-ring/30 focus-visible:outline-none disabled:opacity-40"
          >
            Previous
          </button>
          <button
            type="button"
            onClick={() => setActive((a) => Math.min(STEPS.length - 1, a + 1))}
            disabled={active === STEPS.length - 1}
            className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:ring-4 focus-visible:ring-ring/30 focus-visible:outline-none disabled:opacity-40"
          >
            Next step
          </button>
          <span className="sr-only" aria-live="polite">
            {`Step ${active + 1} of ${STEPS.length}: ${step.title}`}
          </span>
        </div>
      </div>
    </div>
  )
}
