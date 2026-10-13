'use client'

import { ArrowRight, Mic, Send, X } from 'lucide-react'
import { useId, useState } from 'react'
import { DEMO_MIC_TRANSCRIPT, MAX_QUESTION_LENGTH, TUTOR_SUGGESTIONS } from '@/lib/tutor/demo-tutor'
import { cn } from '@/lib/utils'

export interface QueuedQuestion {
  id: string
  kind: 'ask' | 'mic'
  excerpt: string
  prompt: string
}

interface AnyQuestionsPanelProps {
  queue: QueuedQuestion[]
  busy: boolean
  hasNextPage: boolean
  onAsk: (question: string) => boolean
  onAskQueued: (item: QueuedQuestion) => void
  onNextPage: () => void
  onClose: () => void
}

const chip =
  'inline-flex min-h-8 items-center gap-1.5 rounded-full border px-3 py-1 text-left text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-book-orange focus-visible:outline-none disabled:pointer-events-none disabled:opacity-40'

export function AnyQuestionsPanel({ queue, busy, hasNextPage, onAsk, onAskQueued, onNextPage, onClose }: AnyQuestionsPanelProps) {
  const titleId = useId()
  const inputId = useId()
  const [draft, setDraft] = useState('')
  const [fromDemoMic, setFromDemoMic] = useState(false)

  function submit(event: React.FormEvent) {
    event.preventDefault()
    if (onAsk(draft)) {
      setDraft('')
      setFromDemoMic(false)
    }
  }

  return (
    <section
      aria-labelledby={titleId}
      onKeyDown={(event) => event.key === 'Escape' && onClose()}
      className="w-full max-w-xl rounded-3xl border border-book-amber/20 bg-[linear-gradient(160deg,rgb(255_237_213/0.10),rgb(255_255_255/0.03))] p-4 text-left shadow-[0_18px_50px_-20px_rgb(249_115_22/0.45)] backdrop-blur-xl animate-in fade-in slide-in-from-bottom-2 duration-200"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id={titleId} className="font-display text-base font-semibold">
            Any questions?
          </h2>
          <p className="text-xs text-muted-foreground">Demo answers — no AI service connected</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Dismiss questions panel"
          className="grid size-8 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground focus-visible:ring-2 focus-visible:ring-book-orange focus-visible:outline-none"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>

      {queue.length > 0 && (
        <div className="mt-3">
          <p className="text-[11px] font-semibold tracking-wide text-book-marker uppercase">
            Queued during narration ({queue.length})
          </p>
          <ul className="mt-1.5 flex flex-wrap gap-1.5">
            {queue.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onAskQueued(item)}
                  className={cn(chip, 'border-book-amber/35 bg-book-orange/15 hover:bg-book-orange/25')}
                >
                  {item.kind === 'mic' ? <Mic className="size-3.5 shrink-0" aria-hidden="true" /> : null}
                  <span className="line-clamp-1">{item.prompt}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Suggested follow-ups">
        {TUTOR_SUGGESTIONS.map((suggestion) => (
          <li key={suggestion.intent}>
            <button
              type="button"
              disabled={busy}
              onClick={() => onAsk(suggestion.label)}
              className={cn(chip, 'border-white/10 bg-white/5 hover:bg-white/10')}
            >
              {suggestion.label}
            </button>
          </li>
        ))}
        {hasNextPage && (
          <li>
            <button type="button" onClick={onNextPage} className={cn(chip, 'border-book-orange/50 text-book-marker hover:bg-book-orange/15')}>
              Next page
              <ArrowRight className="size-3.5" aria-hidden="true" />
            </button>
          </li>
        )}
      </ul>

      <form onSubmit={submit} className="mt-3 flex items-center gap-2">
        <label htmlFor={inputId} className="sr-only">
          Your question about this page
        </label>
        <input
          id={inputId}
          value={draft}
          maxLength={MAX_QUESTION_LENGTH}
          onChange={(event) => {
            setDraft(event.target.value)
            setFromDemoMic(false)
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && (event.nativeEvent.isComposing || event.keyCode === 229)) event.preventDefault()
          }}
          placeholder="Type your question…"
          className="h-10 min-w-0 flex-1 rounded-full border border-white/10 bg-black/25 px-4 text-sm placeholder:text-muted-foreground focus-visible:border-book-orange/60 focus-visible:ring-2 focus-visible:ring-book-orange/40 focus-visible:outline-none"
        />
        <button
          type="button"
          onClick={() => {
            setDraft(DEMO_MIC_TRANSCRIPT)
            setFromDemoMic(true)
          }}
          aria-label="Demo mic: fill in a sample transcript (microphone is not used)"
          className="grid size-10 shrink-0 place-items-center rounded-full border border-white/10 bg-white/5 text-foreground/80 transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-book-orange focus-visible:outline-none"
        >
          <Mic className="size-4" aria-hidden="true" />
        </button>
        <button
          type="submit"
          disabled={!draft.trim() || busy}
          aria-label="Send question"
          className="grid size-10 shrink-0 place-items-center rounded-full bg-book-orange text-book-ink transition-colors hover:bg-book-marker focus-visible:ring-2 focus-visible:ring-book-marker focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Send className="size-4" aria-hidden="true" />
        </button>
      </form>
      <p className="mt-1.5 min-h-4 px-1 text-[11px] text-muted-foreground" aria-live="polite">
        {fromDemoMic ? 'Sample transcript — simulated. Your microphone was not used.' : ''}
      </p>
    </section>
  )
}
