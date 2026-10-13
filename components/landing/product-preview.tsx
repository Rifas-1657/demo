'use client'

import { useInView } from 'framer-motion'
import { Mic, Pause, Play, RotateCcw, Terminal } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { SectionLabel } from '@/components/ui-kit/section-label'
import { useReducedMotion } from '@/lib/motion'
import { cn } from '@/lib/utils'

const NARRATION =
  'A for loop repeats a block of code once for every item in a sequence. Python takes each fruit from the list, stores it in the variable fruit, and prints it. When the list runs out, the loop ends on its own.'
const WORDS = NARRATION.split(' ')
const WORD_MS = 280

const CODE = ['fruits = ["apple", "mango", "kiwi"]', '', 'for fruit in fruits:', '    print(fruit)']
const OUTPUT = ['apple', 'mango', 'kiwi']

function Diagram({ progress }: { progress: number }) {
  const show = (at: number) => (progress >= at ? 'opacity-100' : 'opacity-0')
  const draw = (start: number, end: number) => Math.min(1, Math.max(0, (progress - start) / (end - start)))
  const path = (d: string, start: number, end: number, color = 'var(--book-deep)') => (
    <path
      d={d}
      pathLength={1}
      fill="none"
      stroke={color}
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeDasharray="1"
      strokeDashoffset={1 - draw(start, end)}
      className="transition-[stroke-dashoffset] duration-300 ease-out"
    />
  )
  const node = (x: number, y: number, w: number, label: string, at: number, accent = false) => (
    <g className={cn('transition-opacity duration-500', show(at))}>
      <rect x={x} y={y} width={w} height="34" rx="10" fill={accent ? 'var(--book-marker)' : 'var(--book-paper)'} stroke="var(--book-deep)" strokeWidth="2" />
      <text x={x + w / 2} y={y + 22} textAnchor="middle" className="fill-book-ink font-mono text-[11px]">
        {label}
      </text>
    </g>
  )

  return (
    <svg viewBox="0 0 280 260" className="w-full" role="img" aria-label="Flowchart of a for loop: take the next item, print it, repeat until the list is empty, then end.">
      {node(80, 10, 120, 'fruits list', 0.02)}
      {path('M140 44v26', 0.08, 0.2)}
      {node(70, 70, 140, 'next item?', 0.2, true)}
      {path('M140 104v26', 0.3, 0.42)}
      {node(70, 130, 140, 'print(fruit)', 0.42)}
      {path('M210 147c50 0 50-60 0-60', 0.5, 0.68, 'var(--book-orange)')}
      {path('M70 87c-46 0-46 130 0 130', 0.75, 0.9)}
      {node(80, 200, 120, 'loop ends', 0.9)}
      <text x="242" y="122" className={cn('fill-book-orange font-mono text-[10px] transition-opacity', show(0.6))}>
        repeat
      </text>
      <text x="6" y="160" className={cn('fill-book-deep font-mono text-[10px] transition-opacity', show(0.85))}>
        empty
      </text>
    </svg>
  )
}

export function ProductPreview() {
  const reduced = useReducedMotion()
  const sectionRef = useRef<HTMLElement>(null)
  const inView = useInView(sectionRef, { amount: 0.4, once: true })
  const [word, setWord] = useState(reduced ? WORDS.length : 0)
  const [playing, setPlaying] = useState(false)
  const [autoStarted, setAutoStarted] = useState(false)
  const [runLine, setRunLine] = useState(-1)
  const [output, setOutput] = useState<string[]>([])
  const runTimers = useRef<number[]>([])

  if (inView && !autoStarted && !reduced) {
    setAutoStarted(true)
    setPlaying(true)
  }

  useEffect(() => {
    if (!playing) return
    const id = window.setInterval(() => {
      setWord((w) => {
        if (w >= WORDS.length) {
          setPlaying(false)
          return w
        }
        return w + 1
      })
    }, WORD_MS)
    return () => window.clearInterval(id)
  }, [playing])

  useEffect(() => () => runTimers.current.forEach(clearTimeout), [])

  const progress = word / WORDS.length
  const done = word >= WORDS.length

  function togglePlay() {
    if (done) setWord(0)
    setPlaying((p) => !p || done)
  }

  function restart() {
    setWord(0)
    setPlaying(true)
  }

  function runCode() {
    runTimers.current.forEach(clearTimeout)
    setOutput([])
    const steps: Array<() => void> = []
    OUTPUT.forEach((item) => {
      steps.push(() => setRunLine(2))
      steps.push(() => {
        setRunLine(3)
        setOutput((o) => [...o, item])
      })
    })
    steps.push(() => setRunLine(-1))
    const gap = reduced ? 0 : 320
    runTimers.current = steps.map((step, i) => window.setTimeout(step, i * gap))
  }

  return (
    <section ref={sectionRef} id="experience" aria-labelledby="preview-title" className="theme-night relative scroll-mt-20 overflow-hidden bg-night-gradient py-24 sm:py-32">
      <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(50%_40%_at_50%_0%,rgb(225_29_72/0.25),transparent_70%)]" />
      <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
        <div className="max-w-2xl">
          <SectionLabel index="03" className="text-brand-pink">
            The reading experience
          </SectionLabel>
          <h2 id="preview-title" className="mt-5 text-4xl leading-[1.02] font-semibold tracking-tight text-[#FFF1F3] sm:text-6xl">
            Hear it, watch it draw, then run it.
          </h2>
          <p className="mt-5 text-lg text-[#FFF1F3]/70">A live sample page. Press play, then run the code — everything here happens in your browser.</p>
        </div>

        <div data-theme="book" className="mt-12 overflow-hidden rounded-[2rem] border border-white/10 !bg-book-page shadow-[0_60px_120px_-40px_rgb(0_0_0/0.8)]">
          <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-3 sm:px-7">
            <p className="font-mono text-xs tracking-[0.18em] text-book-deep uppercase">Python from Zero · Chapter 4 · Page 2</p>
            <span className="rounded-full border border-border px-2.5 py-0.5 text-[11px] text-book-muted">Demo</span>
          </div>

          <div className="grid lg:grid-cols-[1.1fr_1fr]">
            <div className="border-border p-6 sm:p-9 lg:border-r">
              <h3 className="font-display text-3xl font-semibold text-book-ink sm:text-4xl">Loops that repeat for you</h3>
              <p className="mt-6 text-lg leading-[1.75] text-book-ink sm:text-xl" aria-live="off">
                {WORDS.map((w, i) => (
                  <span
                    key={i}
                    className={cn(
                      'rounded-[0.2em] transition-colors duration-200',
                      i === word - 1 && playing && 'bg-book-marker/80',
                      i >= word && 'text-book-ink/40',
                    )}
                  >
                    {w}{' '}
                  </span>
                ))}
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={togglePlay}
                  className="inline-flex h-11 items-center gap-2 rounded-full bg-book-ink px-5 text-sm font-medium text-book-paper transition-transform hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-book-orange focus-visible:outline-none"
                >
                  {playing ? <Pause aria-hidden="true" className="size-4" /> : <Play aria-hidden="true" className="size-4" />}
                  {playing ? 'Pause narration' : done ? 'Replay narration' : 'Play narration'}
                </button>
                <button
                  type="button"
                  onClick={restart}
                  className="inline-grid size-11 place-items-center rounded-full border border-border text-book-ink hover:bg-book-paper focus-visible:ring-2 focus-visible:ring-book-orange focus-visible:outline-none"
                >
                  <RotateCcw aria-hidden="true" className="size-4" />
                  <span className="sr-only">Restart narration</span>
                </button>
                <span className="flex items-center gap-2 text-sm text-book-muted">
                  <Mic aria-hidden="true" className="size-4 text-book-orange" />
                  <span className="flex h-4 items-center gap-[3px]" aria-hidden="true">
                    {[0, 1, 2, 3, 4].map((b) => (
                      <span
                        key={b}
                        className={cn('h-full w-[3px] origin-center rounded-full bg-book-orange', playing ? 'motion-safe:animate-[landing-wave_0.9s_ease-in-out_infinite]' : 'scale-y-[0.35]')}
                        style={{ animationDelay: `${b * -0.15}s` }}
                      />
                    ))}
                  </span>
                  Voice tutor
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-6 bg-book-paper/60 p-6 sm:p-9">
              <div className="rounded-2xl border border-border bg-book-page p-4">
                <p className="mb-2 font-mono text-[11px] tracking-[0.18em] text-book-muted uppercase">Diagram · draws with narration</p>
                <Diagram progress={progress} />
              </div>

              <div className="overflow-hidden rounded-2xl bg-book-ink text-book-paper">
                <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5">
                  <span className="flex items-center gap-2 font-mono text-xs text-book-paper/70">
                    <Terminal aria-hidden="true" className="size-3.5" /> loops.py
                  </span>
                  <button
                    type="button"
                    onClick={runCode}
                    className="inline-flex items-center gap-1.5 rounded-full bg-brand-pink px-3.5 py-1.5 text-xs font-semibold text-book-ink transition-transform hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-book-marker focus-visible:outline-none"
                  >
                    <Play aria-hidden="true" className="size-3 fill-current" /> Run
                  </button>
                </div>
                <pre className="overflow-x-auto px-4 py-4 font-mono text-[13px] leading-6">
                  {CODE.map((line, i) => (
                    <div key={i} className={cn('-mx-4 px-4 transition-colors', runLine === i && 'bg-white/10')}>
                      <span aria-hidden="true" className="mr-4 inline-block w-4 text-right text-book-paper/30 select-none">
                        {i + 1}
                      </span>
                      {line || ' '}
                    </div>
                  ))}
                </pre>
                <div className="border-t border-white/10 px-4 py-3 font-mono text-[13px]" aria-live="polite">
                  <p className="text-[11px] tracking-[0.18em] text-book-paper/40 uppercase">Output · simulated</p>
                  <div className="mt-1 min-h-[4.5rem]">
                    {output.length === 0 ? (
                      <p className="text-book-paper/40">Press Run to execute.</p>
                    ) : (
                      output.map((o, i) => (
                        <p key={i} className="text-book-marker">
                          {o}
                        </p>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
