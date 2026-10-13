'use client'

import { Loader2, MicOff, Send, Sparkles, X } from 'lucide-react'
import { useId, useState } from 'react'
import type { TutorExchange } from '@/lib/narration/use-narration-stream'
import { cn } from '@/lib/utils'
import { VoiceWaveform } from './voice-waveform'

const panelClass =
  'w-full max-w-md rounded-3xl border border-book-amber/20 bg-[linear-gradient(160deg,rgb(255_237_213/0.10),rgb(255_255_255/0.03))] p-4 shadow-[0_18px_50px_-20px_rgb(249_115_22/0.45)] backdrop-blur-xl animate-in fade-in slide-in-from-bottom-2 duration-200'

function PanelHeader({ id, title, onClose }: { id: string; title: string; onClose: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 id={id} className="font-display text-sm font-semibold">
        {title}
      </h2>
      <button
        type="button"
        onClick={onClose}
        aria-label={`Close ${title.toLowerCase()}`}
        className="grid size-8 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground focus-visible:ring-2 focus-visible:ring-book-orange focus-visible:outline-none"
      >
        <X className="size-4" aria-hidden="true" />
      </button>
    </div>
  )
}

export function MicDemoPanel({ onClose }: { onClose: () => void }) {
  const titleId = useId()
  return (
    <section
      role="dialog"
      aria-modal="false"
      aria-labelledby={titleId}
      className={panelClass}
      onKeyDown={(event) => event.key === 'Escape' && onClose()}
    >
      <PanelHeader id={titleId} title="Demo voice input" onClose={onClose} />
      <div className="mt-3 flex items-center justify-center rounded-2xl bg-black/20 px-4 py-3">
        <VoiceWaveform status="listening" seed={0} className="h-9" />
      </div>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        This is a simulated listening state. Your microphone is not accessed, and nothing is recorded or transcribed.
      </p>
      <button
        type="button"
        onClick={onClose}
        className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-4 text-sm font-medium transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-book-orange focus-visible:outline-none"
      >
        <MicOff className="size-4" aria-hidden="true" />
        Stop demo
      </button>
    </section>
  )
}

interface AskPanelProps {
  pageTitle: string
  tutor: TutorExchange | null
  onAsk: (question: string) => void
  onClose: () => void
}

const MAX_QUESTION = 240

export function AskPanel({ pageTitle, tutor, onAsk, onClose }: AskPanelProps) {
  const titleId = useId()
  const inputId = useId()
  const [question, setQuestion] = useState('')
  const thinking = tutor?.phase === 'thinking'

  function submit(event: React.FormEvent) {
    event.preventDefault()
    const trimmed = question.trim()
    if (!trimmed || thinking) return
    onAsk(trimmed)
    setQuestion('')
  }

  return (
    <section
      role="dialog"
      aria-modal="false"
      aria-labelledby={titleId}
      className={panelClass}
      onKeyDown={(event) => event.key === 'Escape' && onClose()}
    >
      <PanelHeader id={titleId} title="Ask a question" onClose={onClose} />

      {tutor && (
        <div className="mt-3 flex flex-col gap-2 text-sm" aria-live="polite">
          <p className="self-end rounded-2xl rounded-br-md bg-white/10 px-3 py-2">{tutor.question}</p>
          {thinking ? (
            <p className="inline-flex items-center gap-2 text-muted-foreground">
              <Loader2 className="size-4 motion-safe:animate-spin" aria-hidden="true" />
              Thinking…
            </p>
          ) : (
            <div className="rounded-2xl rounded-bl-md border border-book-amber/20 bg-book-orange/10 px-3 py-2">
              <p className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-book-marker uppercase">
                <Sparkles className="size-3.5" aria-hidden="true" />
                Demo reply
              </p>
              <p className="mt-1 leading-relaxed">
                In the full product, the tutor answers from &ldquo;{pageTitle}&rdquo; and cites the source. This demo
                doesn&apos;t send your question anywhere. Press play to keep listening.
              </p>
            </div>
          )}
        </div>
      )}

      <form onSubmit={submit} className="mt-3 flex items-center gap-2">
        <label htmlFor={inputId} className="sr-only">
          Your question about this page
        </label>
        <input
          id={inputId}
          autoFocus
          value={question}
          maxLength={MAX_QUESTION}
          onChange={(event) => setQuestion(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && (event.nativeEvent.isComposing || event.keyCode === 229)) event.preventDefault()
          }}
          placeholder="Ask about this page…"
          className="h-10 min-w-0 flex-1 rounded-full border border-white/10 bg-black/25 px-4 text-sm placeholder:text-muted-foreground focus-visible:border-book-orange/60 focus-visible:ring-2 focus-visible:ring-book-orange/40 focus-visible:outline-none"
        />
        <button
          type="submit"
          disabled={!question.trim() || thinking}
          aria-label="Send question"
          className={cn(
            'grid size-10 shrink-0 place-items-center rounded-full bg-book-orange text-book-ink transition-colors hover:bg-book-marker focus-visible:ring-2 focus-visible:ring-book-marker focus-visible:ring-offset-2 focus-visible:ring-offset-transparent focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40',
          )}
        >
          <Send className="size-4" aria-hidden="true" />
        </button>
      </form>
    </section>
  )
}
