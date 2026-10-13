'use client'

import { Pause, Play } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'

const PHRASES = ['Read it.', 'Hear it.', 'See it draw.', 'Try it.']

function Row({ hidden }: { hidden?: boolean }) {
  return (
    <ul aria-hidden={hidden || undefined} className="flex shrink-0 items-center">
      {[...PHRASES, ...PHRASES].map((phrase, i) => (
        <li key={`${phrase}-${i}`} className="flex items-center">
          <span
            className={cn(
              'px-6 font-display text-4xl font-semibold tracking-tight whitespace-nowrap sm:px-10 sm:text-6xl',
              i % 2 === 1 ? 'text-transparent [-webkit-text-stroke:1.5px_var(--bk-primary)]' : 'text-ink',
            )}
          >
            {phrase}
          </span>
          <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5 shrink-0 text-book-amber sm:size-7">
            <path fill="currentColor" d="M12 0c.8 6.4 5.6 11.2 12 12-6.4.8-11.2 5.6-12 12-.8-6.4-5.6-11.2-12-12C6.4 11.2 11.2 6.4 12 0z" />
          </svg>
        </li>
      ))}
    </ul>
  )
}

export function Marquee() {
  const [paused, setPaused] = useState(false)

  return (
    <section aria-label="Read it. Hear it. See it draw. Try it." className="relative border-y border-border bg-background py-8 sm:py-10">
      <div className="group relative flex overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_8%,black_92%,transparent)]">
        <div
          className={cn(
            'flex w-max motion-safe:animate-[landing-marquee_38s_linear_infinite] group-hover:[animation-play-state:paused]',
            paused && '[animation-play-state:paused]',
          )}
        >
          <Row />
          <Row hidden />
        </div>
      </div>
      <button
        type="button"
        onClick={() => setPaused((v) => !v)}
        aria-pressed={paused}
        className="absolute right-4 bottom-2 inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground motion-reduce:hidden sm:right-8"
      >
        {paused ? <Play aria-hidden="true" className="size-3" /> : <Pause aria-hidden="true" className="size-3" />}
        {paused ? 'Play motion' : 'Pause motion'}
      </button>
    </section>
  )
}
