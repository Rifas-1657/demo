'use client'

import { motion } from 'framer-motion'
import { FileVideo, Play, UploadCloud } from 'lucide-react'
import { easeOutExpo } from '@/lib/motion'
import { cn } from '@/lib/utils'
import type { StepKey } from './process-timeline'

function Panel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'relative flex aspect-[16/11] flex-col overflow-hidden rounded-[1.75rem] border border-border bg-card p-6 shadow-[0_40px_80px_-50px_rgb(159_18_57/0.5)] sm:p-8',
        className,
      )}
    >
      {children}
    </div>
  )
}

function Upload() {
  return (
    <Panel className="items-center justify-center bg-[radial-gradient(60%_60%_at_50%_40%,var(--secondary),var(--card))]">
      <div className="flex w-full max-w-sm flex-col items-center rounded-2xl border-2 border-dashed border-primary/35 bg-background/70 px-6 py-8 text-center">
        <UploadCloud className="size-9 text-primary" />
        <p className="mt-3 font-semibold">Drop a video, audio file, or link</p>
        <p className="mt-1 text-sm text-muted-foreground">MP4, MP3, YouTube, transcript</p>
      </div>
      <motion.div
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.7, ease: easeOutExpo, delay: 0.2 }}
        className="mt-5 flex w-full max-w-sm items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-sm"
      >
        <FileVideo className="size-5 shrink-0 text-primary" />
        <span className="min-w-0 flex-1 truncate">python-intro-lecture.mp4</span>
        <span className="font-mono text-xs text-muted-foreground">1h 12m</span>
      </motion.div>
    </Panel>
  )
}

const OUTLINE = [
  { ch: 'Chapter 1', title: 'Why attention is the real budget', pages: 3 },
  { ch: 'Chapter 2', title: 'Building a focus block', pages: 3 },
  { ch: 'Chapter 3', title: 'Protecting the calendar', pages: 4 },
]

function Generate() {
  return (
    <Panel className="bg-book-paper">
      <p className="font-mono text-[11px] tracking-[0.16em] text-book-ink/60 uppercase">Generating outline · simulated</p>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-book-ink/10">
        <motion.span
          className="block h-full rounded-full bg-book-deep"
          initial={{ width: '8%' }}
          animate={{ width: '100%' }}
          transition={{ duration: 2.4, ease: 'easeInOut' }}
        />
      </div>
      <ol className="mt-6 space-y-3">
        {OUTLINE.map((o, i) => (
          <motion.li
            key={o.ch}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 + i * 0.55, ease: easeOutExpo }}
            className="flex items-center gap-4 rounded-xl border border-book-ink/10 bg-white/70 px-4 py-3 text-book-ink"
          >
            <span className="font-mono text-[11px] text-book-deep">{o.ch}</span>
            <span className="min-w-0 flex-1 truncate font-medium">{o.title}</span>
            <span className="flex gap-1">
              {Array.from({ length: o.pages }, (_, p) => (
                <span key={p} className="h-4 w-3 rounded-[3px] border border-book-ink/25 bg-white" />
              ))}
            </span>
          </motion.li>
        ))}
      </ol>
    </Panel>
  )
}

function Read() {
  return (
    <Panel className="bg-book-paper">
      <div className="flex items-center justify-between font-mono text-[11px] tracking-[0.16em] text-book-ink/60 uppercase">
        <span>Ch. 1 · The cost of switching</span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-book-deep px-2.5 py-1 text-[10px] text-white">
          <Play className="size-3" /> Narrating
        </span>
      </div>
      <p className="mt-5 font-display text-2xl leading-snug text-book-ink sm:text-3xl">
        Every context switch leaves <mark className="rounded-sm bg-book-marker/70 px-1 text-book-ink">attention residue</mark>{' '}
        <span className="text-book-ink/35">behind.</span>
      </p>
      <svg viewBox="0 0 300 60" className="mt-auto w-full">
        <motion.path
          d="M10 40 C 60 10, 100 10, 150 32 S 240 54, 290 20"
          fill="none"
          stroke="var(--book-deep)"
          strokeWidth="3"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.6, ease: easeOutExpo }}
        />
        <circle cx="150" cy="32" r="5" fill="var(--book-orange)" />
      </svg>
    </Panel>
  )
}

function Personalize() {
  return (
    <Panel>
      <p className="font-mono text-[11px] tracking-[0.16em] text-muted-foreground uppercase">Your learning profile</p>
      <div className="mt-5 space-y-5 text-sm">
        <div>
          <div className="flex justify-between font-medium">
            <span>Depth</span>
            <span className="text-primary">Intermediate</span>
          </div>
          <div className="relative mt-3 h-2 rounded-full bg-muted">
            <motion.span
              className="absolute inset-y-0 left-0 rounded-full bg-primary"
              initial={{ width: '15%' }}
              animate={{ width: '55%' }}
              transition={{ duration: 0.9, ease: easeOutExpo }}
            />
          </div>
        </div>
        <div>
          <p className="font-medium">Daily pace</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {['10 min', '20 min', '45 min'].map((p) => (
              <span
                key={p}
                className={cn('rounded-full border px-3 py-1.5', p === '20 min' ? 'border-primary bg-secondary text-secondary-foreground' : 'border-border text-muted-foreground')}
              >
                {p}
              </span>
            ))}
          </div>
        </div>
        <div>
          <p className="font-medium">Explain with</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {['Analogies', 'Diagrams', 'Code first', 'Quizzes'].map((label, i) => (
              <motion.span
                key={label}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: 0.2 + i * 0.08 }}
                className={cn('rounded-xl border px-3 py-1.5', i !== 2 ? 'border-primary/40 bg-secondary/60' : 'border-border text-muted-foreground')}
              >
                {label}
              </motion.span>
            ))}
          </div>
        </div>
      </div>
    </Panel>
  )
}

function LearnCode() {
  return (
    <Panel className="bg-ink p-0 text-[#FFF1F3] sm:p-0 border-white/10">
      <div className="flex items-center gap-3 border-b border-white/10 px-6 py-4">
        <span className="grid size-8 place-items-center rounded-full bg-primary"><Play className="size-3.5" /></span>
        <div className="flex h-6 flex-1 items-center gap-[3px]">
          {Array.from({ length: 32 }, (_, i) => (
            <span key={i} className={cn('w-full rounded-full', i < 13 ? 'bg-brand-pink' : 'bg-white/20')} style={{ height: `${25 + Math.abs(Math.sin(i * 1.3)) * 75}%` }} />
          ))}
        </div>
      </div>
      <div className="grid flex-1 grid-cols-2">
        <svg viewBox="0 0 160 120" className="h-full w-full border-r border-white/10 p-4">
          <motion.path d="M20 90 L60 40 L100 70 L140 25" fill="none" stroke="var(--brand-pink)" strokeWidth="3" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.4, ease: easeOutExpo }} />
          {[[20, 90], [60, 40], [100, 70], [140, 25]].map(([x, y]) => (
            <circle key={x} cx={x} cy={y} r="5" fill="#FFF1F3" />
          ))}
        </svg>
        <pre className="overflow-hidden p-4 font-mono text-[12px] leading-6">
          <span className="text-brand-pink">for</span> t <span className="text-brand-pink">in</span> tasks:{'\n'}
          {'  '}<span className="text-[#93C5FD]">focus</span>(t){'\n\n'}
          <span className="text-[#86EFAC]">{'> 3 blocks done'}</span>
        </pre>
      </div>
    </Panel>
  )
}

const VISUALS: Record<StepKey, () => React.JSX.Element> = {
  upload: Upload,
  personalize: Personalize,
  generate: Generate,
  open: Read,
  learn: LearnCode,
}

export function StepVisual({ step }: { step: StepKey }) {
  const Visual = VISUALS[step]
  return <Visual />
}
