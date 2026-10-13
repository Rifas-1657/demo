'use client'

import { ArrowRight, BookOpenText, Loader2, Sparkles } from 'lucide-react'
import type { ChatMessage } from '@/lib/stores/course-chat'
import { tokenizeAnswer } from '@/lib/tutor/demo-tutor'
import { cn } from '@/lib/utils'

function RichText({ text }: { text: string }) {
  return (
    <>
      {text.split('\n\n').map((paragraph, pIndex) => (
        <p key={pIndex} className="leading-relaxed text-pretty [&+&]:mt-2">
          {paragraph.split(/(`[^`]+`)/).map((part, index) =>
            part.startsWith('`') && part.endsWith('`') && part.length > 1 ? (
              <code key={index} className="rounded bg-black/30 px-1 py-0.5 font-mono text-[0.85em] text-book-marker">
                {part.slice(1, -1)}
              </code>
            ) : (
              <span key={index}>{part}</span>
            ),
          )}
        </p>
      ))}
    </>
  )
}

interface ChatMessageItemProps {
  message: ChatMessage
  revealCount: number | null
  onOpenSource: (pageIndex: number) => void
}

export function ChatMessageItem({ message, revealCount, onOpenSource }: ChatMessageItemProps) {
  if (message.role === 'user') {
    return (
      <li className="flex flex-col items-end gap-1">
        <p className="max-w-[85%] rounded-2xl rounded-br-md bg-white/10 px-3.5 py-2 text-sm leading-relaxed break-words">
          <span className="sr-only">You asked: </span>
          {message.text}
        </p>
        {message.pageLabel && <span className="text-[11px] text-muted-foreground">{message.pageLabel}</span>}
      </li>
    )
  }

  const thinking = message.status === 'thinking'
  const streaming = message.status === 'streaming'
  const visibleText =
    streaming && revealCount !== null ? tokenizeAnswer(message.text).slice(0, revealCount + 1).join('') : message.text
  const done = message.status === 'done'

  return (
    <li className="flex flex-col items-start gap-1.5">
      <div
        className={cn(
          'max-w-[92%] rounded-2xl rounded-bl-md border px-3.5 py-2.5 text-sm',
          message.offTopic ? 'border-white/10 bg-white/5' : 'border-book-amber/20 bg-book-orange/10',
        )}
      >
        <p className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-book-marker uppercase">
          <Sparkles className="size-3.5" aria-hidden="true" />
          Demo tutor
        </p>
        {thinking ? (
          <p className="inline-flex items-center gap-2 text-muted-foreground">
            <Loader2 className="size-4 motion-safe:animate-spin" aria-hidden="true" />
            Thinking…
          </p>
        ) : (
          <div lang={message.offTopic ? undefined : 'ta-Latn'}>
            <RichText text={visibleText} />
            {streaming && (
              <span
                aria-hidden="true"
                className="ml-0.5 inline-block h-3.5 w-1.5 translate-y-0.5 rounded-sm bg-book-orange motion-safe:animate-pulse"
              />
            )}
          </div>
        )}

        {done && message.diagram && message.diagram.length > 0 && (
          <ol aria-label="Diagram snippet" className="mt-3 flex flex-wrap items-center gap-1.5">
            {message.diagram.map((step, index) => (
              <li key={step} className="flex items-center gap-1.5">
                {index > 0 && <ArrowRight className="size-3 text-book-amber/70" aria-hidden="true" />}
                <span className="rounded-lg border border-book-amber/25 bg-black/25 px-2 py-1 font-mono text-[11px]">
                  {step}
                </span>
              </li>
            ))}
          </ol>
        )}

        {done && message.code && (
          <pre className="mt-3 overflow-x-auto rounded-xl border border-white/10 bg-black/40 p-3 font-mono text-xs leading-relaxed">
            <code>{message.code}</code>
          </pre>
        )}
      </div>

      {done && message.sources && message.sources.length > 0 && (
        <ul aria-label="Demo sources" className="flex flex-wrap gap-1.5">
          {message.sources.map((source) => (
            <li key={source.label}>
              <button
                type="button"
                onClick={() => onOpenSource(source.pageIndex)}
                aria-label={`${source.label} — open this mock lesson page`}
                className="inline-flex h-7 items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 text-[11px] text-foreground/80 transition-colors hover:bg-white/10 hover:text-foreground focus-visible:ring-2 focus-visible:ring-book-orange focus-visible:outline-none"
              >
                <BookOpenText className="size-3.5 text-book-amber" aria-hidden="true" />
                {source.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </li>
  )
}
