'use client'

import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from 'framer-motion'
import { Check, Mic, Pause, Play, Sparkles, X } from 'lucide-react'
import { useRef } from 'react'
import { SectionLabel } from '@/components/ui-kit/section-label'
import { useMediaQuery } from '@/lib/motion'
import { cn } from '@/lib/utils'

const PASSIVE = ['Two-hour timeline to scrub', 'Questions go unanswered', 'Nothing to try with your hands']
const ACTIVE = ['Short pages with narration', 'Ask the tutor, mid-sentence', 'Diagrams draw, code runs']

function VideoCard({ className }: { className?: string }) {
  return (
    <div className={cn('w-full rounded-3xl border border-border bg-card p-4 shadow-[0_30px_60px_-35px_rgb(31_10_16/0.45)]', className)}>
      <div className="relative grid aspect-video place-items-center overflow-hidden rounded-2xl bg-[linear-gradient(135deg,#2a2226,#4a3c41)]">
        <div aria-hidden="true" className="absolute inset-x-6 top-6 space-y-2 opacity-30">
          <div className="h-2 w-2/3 rounded-full bg-white" />
          <div className="h-2 w-1/2 rounded-full bg-white" />
        </div>
        <span className="grid size-14 place-items-center rounded-full bg-white/90 text-ink">
          <Play aria-hidden="true" className="size-6 translate-x-0.5 fill-current" />
        </span>
        <div className="absolute inset-x-4 bottom-4 flex items-center gap-3 text-[11px] text-white/70">
          <Pause aria-hidden="true" className="size-3.5" />
          <div className="h-1 flex-1 rounded-full bg-white/20">
            <div className="h-full w-[12%] rounded-full bg-white/70" />
          </div>
          <span className="font-mono">14:08 / 1:52:40</span>
        </div>
      </div>
      <p className="mt-4 font-display text-lg font-semibold">Intro to Python — Full Lecture</p>
      <ul className="mt-3 space-y-2">
        {PASSIVE.map((item) => (
          <li key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
            <X aria-hidden="true" className="size-4 text-muted-foreground/70" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}

function BookCard({ className }: { className?: string }) {
  return (
    <div data-theme="book" className={cn('w-full rounded-3xl border border-border !bg-book-paper p-4 shadow-[0_40px_80px_-35px_rgb(194_65_12/0.5)]', className)}>
      <div className="grid aspect-video grid-cols-2 overflow-hidden rounded-2xl border border-border bg-book-page">
        <div className="space-y-2 border-r border-border p-4">
          <p className="font-mono text-[10px] tracking-[0.2em] text-book-deep uppercase">Chapter 2 · Loops</p>
          <p className="font-display text-base leading-tight font-semibold">
            A loop <span className="marker-highlight">repeats</span> work for you.
          </p>
          <div className="space-y-1.5 pt-1" aria-hidden="true">
            <div className="h-1.5 w-full rounded-full bg-book-ink/15" />
            <div className="h-1.5 w-4/5 rounded-full bg-book-ink/15" />
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-book-marker/40 px-2 py-0.5 text-[10px] font-medium">
            <Mic aria-hidden="true" className="size-3" /> Narrating
          </span>
        </div>
        <div className="flex flex-col gap-2 p-4">
          <svg viewBox="0 0 120 50" className="w-full" aria-hidden="true">
            <rect x="4" y="16" width="34" height="18" rx="6" fill="none" stroke="var(--book-deep)" strokeWidth="2" />
            <rect x="82" y="16" width="34" height="18" rx="6" fill="none" stroke="var(--book-deep)" strokeWidth="2" />
            <path d="M38 25h44" stroke="var(--book-orange)" strokeWidth="2" strokeDasharray="4 3" />
            <path d="M99 16c0-14-78-14-78 0" fill="none" stroke="var(--book-amber)" strokeWidth="2" />
          </svg>
          <div className="rounded-lg bg-book-ink px-2.5 py-2 font-mono text-[10px] leading-relaxed text-book-paper">
            <span className="text-brand-pink">for</span> x <span className="text-brand-pink">in</span> range(3):
            <br />
            {'  '}print(x)
          </div>
        </div>
      </div>
      <p className="mt-4 flex items-center gap-2 font-display text-lg font-semibold">
        <Sparkles aria-hidden="true" className="size-4 text-book-orange" /> Intro to Python — Bookey book
      </p>
      <ul className="mt-3 space-y-2">
        {ACTIVE.map((item) => (
          <li key={item} className="flex items-center gap-2 text-sm text-book-ink">
            <Check aria-hidden="true" className="size-4 text-book-deep" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}

function Heading() {
  return (
    <div className="max-w-xl">
      <SectionLabel index="01">Problem vs solution</SectionLabel>
      <h2 className="mt-5 text-4xl leading-[1.02] font-semibold tracking-tight sm:text-6xl">
        Video asks you to sit still. <span className="text-primary">A book invites you in.</span>
      </h2>
      <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
        The same lecture, rebuilt for active learning: paced pages, a tutor that listens, and practice built into every
        chapter.
      </p>
    </div>
  )
}

function ScrollScene() {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] })

  const videoOpacity = useTransform(scrollYProgress, [0.2, 0.55], [1, 0])
  const videoRotate = useTransform(scrollYProgress, [0.2, 0.6], [0, -28])
  const videoScale = useTransform(scrollYProgress, [0.2, 0.6], [1, 0.86])
  const bookOpacity = useTransform(scrollYProgress, [0.35, 0.65], [0, 1])
  const bookRotate = useTransform(scrollYProgress, [0.35, 0.8], [28, 0])
  const bookScale = useTransform(scrollYProgress, [0.35, 0.8], [0.88, 1])
  const passiveLabel = useTransform(scrollYProgress, [0.25, 0.45], [1, 0.3])
  const activeLabel = useTransform(scrollYProgress, [0.45, 0.65], [0.3, 1])

  return (
    <div ref={ref} className="relative h-[220vh]">
      <div className="sticky top-0 flex h-dvh items-center">
        <div className="mx-auto grid w-full max-w-7xl grid-cols-2 items-center gap-16 px-8">
          <div>
            <Heading />
            <div className="mt-10 flex gap-6 font-mono text-xs tracking-[0.18em] uppercase">
              <Label value={passiveLabel}>Passive video</Label>
              <Label value={activeLabel} className="text-primary">
                Interactive book
              </Label>
            </div>
          </div>
          <div className="relative grid [perspective:1400px]">
            <motion.div style={{ opacity: videoOpacity, rotateY: videoRotate, scale: videoScale }} className="col-start-1 row-start-1 origin-left">
              <VideoCard />
            </motion.div>
            <motion.div style={{ opacity: bookOpacity, rotateY: bookRotate, scale: bookScale }} className="col-start-1 row-start-1 origin-right">
              <BookCard />
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Label({ value, children, className }: { value: MotionValue<number>; children: React.ReactNode; className?: string }) {
  return (
    <motion.span style={{ opacity: value }} className={cn('inline-flex items-center gap-2', className)}>
      <span aria-hidden="true" className="h-px w-6 bg-current" />
      {children}
    </motion.span>
  )
}

function StaticLayout() {
  return (
    <div className="mx-auto max-w-7xl px-5 py-24 sm:px-8 sm:py-32">
      <Heading />
      <div className="mt-12 grid items-center gap-6 md:grid-cols-[1fr_auto_1fr]">
        <VideoCard />
        <span className="mx-auto font-display text-2xl text-muted-foreground" aria-hidden="true">
          →
        </span>
        <BookCard />
      </div>
    </div>
  )
}

export function ProblemSolution() {
  const reduced = useReducedMotion()
  const desktop = useMediaQuery('(min-width: 1024px)')

  return (
    <section id="experience-why" aria-label="Passive video versus an interactive Bookey book" className="bg-background">
      {desktop && !reduced ? <ScrollScene /> : <StaticLayout />}
    </section>
  )
}
