'use client'

import { Loader2, MessagesSquare, Send, Trash2, X } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { MAX_QUESTION_LENGTH, TUTOR_SUGGESTIONS } from '@/lib/tutor/demo-tutor'
import { ChatMessageItem } from './chat-message'
import type { CourseTutor } from './use-course-tutor'

interface CourseChatPanelProps {
  courseTitle: string
  pageTitle?: string
  tutor: CourseTutor
  onOpenSource: (pageIndex: number) => void
  onClose: () => void
  /** The drawer renders its own title for the dialog; the inline aside renders it here. */
  showTitle?: boolean
}

const ghostButton =
  'inline-flex h-8 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground focus-visible:ring-2 focus-visible:ring-book-orange focus-visible:outline-none disabled:pointer-events-none disabled:opacity-40'

export function DemoAnswersBadge() {
  return (
    <p className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-[10px] tracking-wide text-muted-foreground">
      <span aria-hidden="true" className="size-1.5 rounded-full bg-book-amber/70" />
      Demo answers — no AI service connected
    </p>
  )
}

export function CourseChatPanel({ courseTitle, pageTitle, tutor, onOpenSource, onClose, showTitle = true }: CourseChatPanelProps) {
  const inputId = useId()
  const [draft, setDraft] = useState('')
  const [confirmClear, setConfirmClear] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)
  const { messages, busy, reveal } = tutor
  const lastTutor = [...messages].reverse().find((m) => m.role === 'tutor')

  useEffect(() => {
    const list = listRef.current
    if (list) list.scrollTop = list.scrollHeight
  }, [messages.length, reveal?.count, lastTutor?.status])

  useEffect(() => {
    if (confirmClear) cancelRef.current?.focus()
  }, [confirmClear])

  function send(text: string) {
    if (tutor.ask(text)) setDraft('')
  }

  function submit(event: React.FormEvent) {
    event.preventDefault()
    send(draft)
  }

  function handleClear() {
    tutor.clear()
    setConfirmClear(false)
    inputRef.current?.focus()
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          {showTitle ? (
            <h2 className="font-display text-lg font-semibold">Course chat</h2>
          ) : (
            <span className="text-xs text-muted-foreground">{courseTitle}</span>
          )}
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              className={ghostButton}
              onClick={() => setConfirmClear(true)}
              disabled={messages.length === 0 || confirmClear}
            >
              <Trash2 className="size-3.5" aria-hidden="true" />
              Clear
            </button>
            {showTitle && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close course chat"
                className="grid size-8 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground focus-visible:ring-2 focus-visible:ring-book-orange focus-visible:outline-none"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
        <DemoAnswersBadge />
      </div>

      {confirmClear && (
        <div
          role="alertdialog"
          aria-label="Clear conversation"
          aria-describedby={`${inputId}-clear`}
          onKeyDown={(event) => event.key === 'Escape' && setConfirmClear(false)}
          className="rounded-2xl border border-destructive/40 bg-destructive/10 p-3 text-sm"
        >
          <p id={`${inputId}-clear`}>
            Clear this conversation? {messages.length} message{messages.length === 1 ? '' : 's'} will be removed from this
            browser.
          </p>
          <div className="mt-2 flex justify-end gap-2">
            <button ref={cancelRef} type="button" className={ghostButton} onClick={() => setConfirmClear(false)}>
              Cancel
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="inline-flex h-8 items-center rounded-full bg-destructive px-3 text-xs font-semibold text-white transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
            >
              Clear conversation
            </button>
          </div>
        </div>
      )}

      <div ref={listRef} className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 py-8 text-center">
            <span className="grid size-12 place-items-center rounded-2xl border border-book-amber/25 bg-book-orange/10">
              <MessagesSquare className="size-5 text-book-marker" aria-hidden="true" />
            </span>
            <div>
              <p className="font-display font-semibold text-balance">Ask anything about {courseTitle}</p>
              <p className="mx-auto mt-1 max-w-64 text-sm text-pretty text-muted-foreground">
                {pageTitle ? `Questions are answered from the demo notes for “${pageTitle}”.` : 'Questions are answered from demo lesson notes.'}{' '}
                History stays in this browser.
              </p>
            </div>
            <ul className="flex flex-col items-center gap-1.5">
              {TUTOR_SUGGESTIONS.map((suggestion) => (
                <li key={suggestion.intent}>
                  <button
                    type="button"
                    onClick={() => send(suggestion.label)}
                    className="inline-flex h-8 items-center rounded-full border border-book-amber/25 bg-white/5 px-3 text-xs font-medium transition-colors hover:bg-book-orange/15 focus-visible:ring-2 focus-visible:ring-book-orange focus-visible:outline-none"
                  >
                    {suggestion.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <ol aria-label="Conversation" className="flex flex-col gap-4 pb-1">
            {messages.map((message) => (
              <ChatMessageItem
                key={message.id}
                message={message}
                revealCount={reveal?.id === message.id ? reveal.count : null}
                onOpenSource={onOpenSource}
              />
            ))}
          </ol>
        )}
      </div>

      <p className="sr-only" aria-live="polite">
        {lastTutor?.status === 'thinking' ? 'Tutor is thinking' : lastTutor?.status === 'done' ? `Tutor answered: ${lastTutor.text}` : ''}
      </p>

      <form onSubmit={submit} className="flex items-end gap-2">
        <label htmlFor={inputId} className="sr-only">
          Ask a question about this course
        </label>
        <textarea
          id={inputId}
          ref={inputRef}
          rows={1}
          value={draft}
          maxLength={MAX_QUESTION_LENGTH}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== 'Enter' || event.shiftKey) return
            if (event.nativeEvent.isComposing || event.keyCode === 229) return
            event.preventDefault()
            send(draft)
          }}
          placeholder={busy ? 'Tutor is answering…' : 'Ask about this course…'}
          className="field-sizing-content max-h-32 min-h-10 min-w-0 flex-1 resize-none rounded-2xl border border-white/10 bg-black/25 px-4 py-2.5 text-sm placeholder:text-muted-foreground focus-visible:border-book-orange/60 focus-visible:ring-2 focus-visible:ring-book-orange/40 focus-visible:outline-none"
        />
        <button
          type="submit"
          disabled={!draft.trim() || busy}
          aria-label={busy ? 'Waiting for answer' : 'Send question'}
          className="grid size-10 shrink-0 place-items-center rounded-full bg-book-orange text-book-ink transition-colors hover:bg-book-marker focus-visible:ring-2 focus-visible:ring-book-marker focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? (
            <Loader2 className="size-4 motion-safe:animate-spin" aria-hidden="true" />
          ) : (
            <Send className="size-4" aria-hidden="true" />
          )}
        </button>
      </form>
    </div>
  )
}
