'use client'

import { motion } from 'framer-motion'
import { Bookmark, CornerDownRight, Mic, Pause, Play, StickyNote, Terminal } from 'lucide-react'
import { ProgressRing } from '@/components/ui-kit/progress-ring'
import { easeOutExpo } from '@/lib/motion'
import { demoStreakDays, featuredCourseId, getChapterProgress, getCoursePosition, getLearningCourse } from '@/lib/mock/learning'
import { cn } from '@/lib/utils'

const progressCourse = getLearningCourse(featuredCourseId)!
const progressPosition = getCoursePosition(progressCourse)
const progressChapters = (() => {
  const all = getChapterProgress(progressCourse)
  const current = Math.max(0, all.findIndex((entry) => entry.status === 'in-progress'))
  const start = Math.min(Math.max(0, current - 1), Math.max(0, all.length - 3))
  return all.slice(start, start + 3).map((entry) => [
    entry.chapter.title,
    Math.round((entry.pagesRead / entry.chapter.pages) * 100),
  ] as const)
})()

function Frame({ children, className, label }: { children: React.ReactNode; className?: string; label: string }) {
  return (
    <figure
      aria-label={label}
      className={cn(
        'relative overflow-hidden rounded-[1.75rem] border border-border bg-card p-5 shadow-[0_40px_80px_-50px_rgb(159_18_57/0.5)] sm:p-7',
        className,
      )}
    >
      {children}
    </figure>
  )
}

export function ReaderMock() {
  return (
    <Frame label="A Bookey page spread with a highlighted passage" className="bg-book-paper">
      <div className="flex items-center justify-between font-mono text-[11px] tracking-[0.16em] text-book-ink/60 uppercase">
        <span>Chapter 2 · Building a focus block</span>
        <span>p. 14 / 32</span>
      </div>
      <div className="mt-6 grid gap-6 sm:grid-cols-2 sm:gap-8">
        <div className="space-y-3 text-[15px] leading-relaxed text-book-ink">
          <p className="font-display text-2xl leading-tight font-semibold">Rituals beat willpower</p>
          <p>
            A short, identical start ritual tells your brain what comes next,{' '}
            <mark className="rounded-sm bg-book-marker/70 px-0.5 text-book-ink">so you spend less effort getting going.</mark>
          </p>
        </div>
        <div className="space-y-2.5 border-book-ink/10 sm:border-l sm:pl-8" aria-hidden="true">
          {[92, 100, 84, 96, 70, 88].map((w, i) => (
            <span key={i} className="block h-2 rounded-full bg-book-ink/10" style={{ width: `${w}%` }} />
          ))}
        </div>
      </div>
      <div className="mt-7 h-1 overflow-hidden rounded-full bg-book-ink/10">
        <motion.span
          className="block h-full rounded-full bg-book-deep"
          initial={{ width: '0%' }}
          whileInView={{ width: '44%' }}
          viewport={{ once: true }}
          transition={{ duration: 1.4, ease: easeOutExpo }}
        />
      </div>
    </Frame>
  )
}

const TRANSCRIPT = ['Every context switch', 'leaves attention residue:', 'part of your mind stays', 'with the previous task.']

export function NarrationMock() {
  return (
    <Frame label="Voice narration player with live transcript" className="bg-ink text-[#FFF1F3] border-white/10">
      <div className="flex items-center gap-4">
        <span className="grid size-12 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
          <Pause aria-hidden="true" className="size-5" />
        </span>
        <div className="flex h-10 flex-1 items-center gap-[3px]" aria-hidden="true">
          {Array.from({ length: 40 }, (_, i) => (
            <span
              key={i}
              className={cn('w-full rounded-full', i < 17 ? 'bg-brand-pink' : 'bg-white/20')}
              style={{ height: `${25 + Math.abs(Math.sin(i * 1.3)) * 75}%` }}
            />
          ))}
        </div>
        <span className="font-mono text-xs text-[#FFF1F3]/60 tabular-nums">1:42</span>
      </div>
      <p className="mt-6 font-display text-xl leading-snug sm:text-2xl">
        {TRANSCRIPT.map((chunk, i) => (
          <span key={chunk} className={i < 2 ? 'text-[#FFF1F3]' : 'text-[#FFF1F3]/35'}>
            {chunk}{' '}
          </span>
        ))}
      </p>
      <div className="mt-6 flex flex-wrap gap-2 text-xs">
        {['0.8×', '1×', '1.25×', '1.5×'].map((speed) => (
          <span
            key={speed}
            className={cn('rounded-full border px-3 py-1 font-mono', speed === '1×' ? 'border-brand-pink bg-brand-pink/15' : 'border-white/15 text-[#FFF1F3]/60')}
          >
            {speed}
          </span>
        ))}
        <span className="ml-auto inline-flex items-center gap-1.5 text-[#FFF1F3]/60">
          <Mic aria-hidden="true" className="size-3.5" />
          Narrator voice
        </span>
      </div>
    </Frame>
  )
}

const NODES = [
  { x: 20, y: 30, label: 'Trigger' },
  { x: 200, y: 30, label: 'Switch' },
  { x: 110, y: 130, label: 'Residue' },
  { x: 290, y: 130, label: 'Recovery' },
]
const EDGES = ['M90 47 H200', 'M235 64 L180 130', 'M250 147 H290', 'M325 130 C 340 70, 300 60, 270 50']

export function DiagramMock() {
  return (
    <Frame label="Diagram drawing itself to explain attention residue" className="bg-book-paper">
      <svg viewBox="0 0 380 200" className="w-full" aria-hidden="true">
        {EDGES.map((d, i) => (
          <motion.path
            key={d}
            d={d}
            fill="none"
            stroke={i === 3 ? 'var(--book-orange)' : 'var(--book-deep)'}
            strokeWidth="2.5"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            whileInView={{ pathLength: 1 }}
            viewport={{ once: true, amount: 0.6 }}
            transition={{ duration: 0.8, ease: easeOutExpo, delay: 0.3 + i * 0.35 }}
          />
        ))}
        {NODES.map((n, i) => (
          <motion.g
            key={n.label}
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, amount: 0.6 }}
            transition={{ duration: 0.5, delay: i * 0.35 }}
          >
            <rect x={n.x} y={n.y} width="70" height="34" rx="10" fill={i === 2 ? 'var(--book-marker)' : '#fff'} stroke="var(--book-deep)" strokeWidth="2" />
            <text x={n.x + 35} y={n.y + 22} textAnchor="middle" className="fill-book-ink font-mono text-[11px]">
              {n.label}
            </text>
          </motion.g>
        ))}
      </svg>
      <figcaption className="mt-3 font-mono text-[11px] tracking-[0.14em] text-book-ink/60 uppercase">
        Fig. 2.1 — drawn in sync with narration
      </figcaption>
    </Frame>
  )
}

export function PracticeMock() {
  return (
    <Frame label="Editable code example with output" className="bg-ink p-0 text-[#FFF1F3] sm:p-0 border-white/10">
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
        <span className="font-mono text-xs text-[#FFF1F3]/60">loop.py</span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
          <Play aria-hidden="true" className="size-3" />
          Run
        </span>
      </div>
      <pre className="overflow-x-auto px-5 py-5 font-mono text-[13px] leading-6">
        <code>
          <span className="text-[#FDBA74]">tasks</span> = [<span className="text-[#86EFAC]">{'"write"'}</span>, <span className="text-[#86EFAC]">{'"review"'}</span>]{'\n'}
          {'\n'}
          <span className="text-brand-pink">for</span> task <span className="text-brand-pink">in</span> tasks:{'\n'}
          {'    '}
          <span className="text-[#93C5FD]">print</span>(task.upper())
        </code>
      </pre>
      <div className="border-t border-white/10 bg-black/25 px-5 py-4 font-mono text-[13px]">
        <span className="inline-flex items-center gap-2 text-[#FFF1F3]/50">
          <Terminal aria-hidden="true" className="size-3.5" />
          Output
        </span>
        <p className="mt-2 text-[#86EFAC]">WRITE</p>
        <p className="text-[#86EFAC]">REVIEW</p>
      </div>
    </Frame>
  )
}

export function QuestionsMock() {
  return (
    <Frame label="Asking the tutor a question and getting a sourced answer">
      <div className="ml-auto max-w-[80%] rounded-2xl rounded-br-md bg-secondary px-4 py-3 text-sm text-secondary-foreground">
        Why does switching hurt even if the task is small?
      </div>
      <div className="mt-4 max-w-[90%] rounded-2xl rounded-bl-md border border-border bg-background px-4 py-3 text-sm leading-relaxed">
        Because attention residue lingers after the switch, no matter how small the task. Your mind keeps processing the
        previous one for a few minutes.
        <span className="mt-3 flex items-center gap-2 border-t border-border pt-3 font-mono text-[11px] text-primary">
          <CornerDownRight aria-hidden="true" className="size-3.5" />
          From source · 14:32
        </span>
      </div>
      <div className="mt-5 flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2.5 text-sm text-muted-foreground">
        <Mic aria-hidden="true" className="size-4 text-primary" />
        Ask by voice or type…
      </div>
    </Frame>
  )
}

export function PersonalizeMock() {
  return (
    <Frame label="Personalization controls for level, pace and focus">
      <div className="space-y-6 text-sm">
        <div>
          <div className="flex justify-between font-medium">
            <span>Depth</span>
            <span className="text-primary">Intermediate</span>
          </div>
          <div className="relative mt-3 h-2 rounded-full bg-muted" aria-hidden="true">
            <span className="absolute inset-y-0 left-0 w-[55%] rounded-full bg-primary" />
            <span className="absolute top-1/2 left-[55%] size-5 -translate-1/2 rounded-full border-4 border-card bg-primary shadow" />
          </div>
        </div>
        <div>
          <p className="font-medium">Daily pace</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {['10 min', '20 min', '45 min'].map((p) => (
              <span key={p} className={cn('rounded-full border px-3 py-1.5', p === '20 min' ? 'border-primary bg-secondary text-secondary-foreground' : 'border-border text-muted-foreground')}>
                {p}
              </span>
            ))}
          </div>
        </div>
        <div>
          <p className="font-medium">Explain with</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {[
              ['Analogies', true],
              ['Diagrams', true],
              ['Code first', false],
              ['Short quizzes', true],
            ].map(([label, on]) => (
              <span key={label as string} className="flex items-center justify-between rounded-xl border border-border px-3 py-2">
                {label}
                <span aria-hidden="true" className={cn('relative h-4 w-7 rounded-full', on ? 'bg-primary' : 'bg-muted')}>
                  <span className={cn('absolute top-0.5 size-3 rounded-full bg-white', on ? 'right-0.5' : 'left-0.5')} />
                </span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </Frame>
  )
}

export function NotesMock() {
  return (
    <Frame label="Page with a bookmark and margin notes" className="bg-book-paper">
      <Bookmark aria-hidden="true" className="absolute top-0 right-8 size-8 fill-primary text-primary" />
      <p className="font-mono text-[11px] tracking-[0.16em] text-book-ink/60 uppercase">Your notes · 3</p>
      <ul className="mt-5 space-y-3">
        {[
          ['p. 6', 'Residue lasts minutes, not seconds. Batch messages.'],
          ['p. 14', 'My ritual: water, close tabs, write first sentence.'],
          ['Fig. 2.1', 'Recovery loop is the expensive part.'],
        ].map(([where, note], i) => (
          <motion.li
            key={where}
            initial={{ opacity: 0, x: 16 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: easeOutExpo, delay: i * 0.12 }}
            className="flex gap-3 rounded-xl border border-book-ink/10 bg-white/70 p-3.5 text-sm text-book-ink"
          >
            <StickyNote aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-book-orange" />
            <span>
              <span className="mr-2 font-mono text-[11px] text-book-deep">{where}</span>
              {note}
            </span>
          </motion.li>
        ))}
      </ul>
    </Frame>
  )
}

export function ProgressMock() {
  return (
    <Frame label="Progress overview with completion ring and chapter bars">
      <div className="flex items-center gap-6">
        <ProgressRing
          value={progressPosition.percent}
          size={104}
          label="Course progress"
          caption={`${progressPosition.completedPages} of ${progressPosition.totalPages} pages`}
        />
        <div>
          <p className="text-sm text-muted-foreground">{progressCourse.title}</p>
          <p className="mt-1 font-display text-2xl font-semibold">{demoStreakDays}-day streak</p>
          <div className="mt-2 flex gap-1.5" aria-hidden="true">
            {Array.from({ length: 7 }, (_, i) => (i < demoStreakDays ? 1 : 0)).map((on, i) => (
              <span key={i} className={cn('size-3 rounded-full', on ? 'bg-primary' : 'bg-muted')} />
            ))}
          </div>
        </div>
      </div>
      <ul className="mt-7 space-y-3 text-sm">
        {progressChapters.map(([title, value]) => (
          <li key={title}>
            <div className="flex justify-between">
              <span>{title}</span>
              <span className="font-mono text-xs text-muted-foreground tabular-nums">{value}%</span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
              <motion.span
                className="block h-full rounded-full bg-primary"
                initial={{ width: 0 }}
                whileInView={{ width: `${value}%` }}
                viewport={{ once: true }}
                transition={{ duration: 1.2, ease: easeOutExpo }}
              />
            </div>
          </li>
        ))}
      </ul>
    </Frame>
  )
}
