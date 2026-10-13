'use client'

import {
  ArrowRight,
  CheckCircle2,
  MessageCircleQuestion,
  Mic,
  Pause,
  Play,
  RotateCcw,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { useState } from 'react'
import { Hint } from '@/components/ui-kit/hint'
import { cn } from '@/lib/utils'
import { NARRATION_RATES, type NarrationStatus, type VoiceDockProps } from '@/types/book'
import { AnyQuestionsPanel } from './tutor/any-questions-panel'
import { MicDemoPanel } from './voice-panels'
import { VoiceWaveform } from './voice-waveform'

const statusLabel: Record<NarrationStatus, string> = {
  idle: 'Ready',
  speaking: 'Speaking',
  listening: 'Listening',
  thinking: 'Thinking',
  paused: 'Paused',
  completed: 'Page complete',
}

const iconButton =
  'grid size-8 shrink-0 place-items-center rounded-full text-foreground/80 transition-colors hover:bg-white/10 hover:text-foreground focus-visible:ring-2 focus-visible:ring-book-orange focus-visible:outline-none disabled:pointer-events-none disabled:opacity-30 sm:size-9 aria-pressed:bg-book-orange/15 aria-pressed:text-book-marker aria-expanded:bg-book-orange/15 aria-expanded:text-book-marker'

/**
 * Simulated voice narration dock. Streams words on a timer and fires typed
 * cues; it never plays audio or touches the microphone.
 */
export function VoiceDock({
  page,
  streamingEnabled,
  stream,
  rate,
  onRateChange,
  muted,
  onMutedChange,
  onEnableGuided,
  hasNextPage,
  onNextPage,
  queue,
  onQueueQuestion,
  tutorBusy,
  onAskTutor,
  onAskQueued,
  onOpenChat,
}: VoiceDockProps) {
  const [questionsDismissed, setQuestionsDismissed] = useState(false)
  const { status } = stream
  const speaking = status === 'speaking'
  const completed = status === 'completed'
  const nextRate = NARRATION_RATES[(NARRATION_RATES.indexOf(rate) + 1) % NARRATION_RATES.length]
  const showQuestions = streamingEnabled && completed && !questionsDismissed

  function handlePlay() {
    if (!streamingEnabled) {
      onEnableGuided()
      stream.play()
      return
    }
    if (completed) {
      setQuestionsDismissed(false)
      stream.restart()
    } else stream.toggle()
  }

  function toggleMic() {
    if (speaking) {
      onQueueQuestion('mic')
      return
    }
    if (status === 'listening') stream.stopListening()
    else stream.startListening()
  }

  function handleAsk() {
    if (speaking) {
      onQueueQuestion('ask')
      return
    }
    if (status === 'listening') stream.stopListening()
    onOpenChat()
  }

  function askFromPanel(question: string) {
    const sent = onAskTutor(question)
    if (sent) onOpenChat()
    return sent
  }

  const playLabel = !streamingEnabled
    ? 'Narrate this page in guided mode'
    : completed
      ? 'Replay narration'
      : speaking
        ? 'Pause narration'
        : status === 'paused'
          ? 'Resume narration'
          : 'Play narration'

  const caption = !streamingEnabled
    ? 'Full page view. Press play to switch to guided narration.'
    : status === 'listening'
      ? 'Listening (demo) — nothing is being recorded.'
      : status === 'thinking'
        ? 'Thinking about your question…'
        : completed
          ? null
          : (stream.currentSentence?.text ?? 'Press play to hear this page narrated word by word.')

  const sentenceNumber = stream.currentSentence ? stream.currentSentence.index + 1 : null

  return (
    <div role="region" aria-label="Voice narration" className="flex w-full flex-col items-center gap-2">
      {status === 'listening' && <MicDemoPanel onClose={stream.stopListening} />}
      {showQuestions && (
        <AnyQuestionsPanel
          queue={queue}
          busy={tutorBusy}
          hasNextPage={hasNextPage}
          onAsk={askFromPanel}
          onAskQueued={(item) => {
            onAskQueued(item)
            onOpenChat()
          }}
          onNextPage={onNextPage}
          onClose={() => setQuestionsDismissed(true)}
        />
      )}
      {!completed && queue.length > 0 && (
        <ul aria-label="Queued questions" className="flex max-w-2xl flex-wrap justify-center gap-1.5">
          {queue.map((item, index) => (
            <li
              key={item.id}
              className="inline-flex h-6 max-w-56 items-center gap-1 rounded-full border border-book-amber/30 bg-book-orange/10 px-2 text-[11px] text-foreground/85 animate-in fade-in zoom-in-95"
            >
              {item.kind === 'mic' ? (
                <Mic className="size-3 shrink-0 text-book-marker" aria-hidden="true" />
              ) : (
                <MessageCircleQuestion className="size-3 shrink-0 text-book-marker" aria-hidden="true" />
              )}
              <span className="truncate">
                Q{index + 1} · {item.excerpt}
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="flex w-full max-w-2xl flex-col items-center gap-1 px-1 text-center">
        <p className="flex items-center gap-1.5 font-mono text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
          <span
            aria-hidden="true"
            className={cn('size-1.5 rounded-full bg-book-amber/60', speaking && 'bg-book-orange motion-safe:animate-pulse')}
          />
          <span>Narration simulation</span>
          <span aria-hidden="true">·</span>
          <span>{streamingEnabled ? statusLabel[status] : 'Off in full view'}</span>
          {sentenceNumber && !completed && (
            <span className="hidden sm:inline">
              · Sentence {sentenceNumber}/{stream.sentences.length}
            </span>
          )}
        </p>
        {completed ? (
          <div className="flex flex-wrap items-center justify-center gap-2 text-sm">
            <span className="inline-flex items-center gap-1.5 text-foreground/90">
              <CheckCircle2 className="size-4 text-book-marker" aria-hidden="true" />
              Page narrated
            </span>
            {hasNextPage && (
              <button
                type="button"
                onClick={onNextPage}
                className="inline-flex h-8 items-center gap-1 rounded-full bg-book-orange px-3 text-sm font-semibold text-book-ink shadow-[0_0_24px_-4px_rgb(249_115_22/0.7)] transition-colors hover:bg-book-marker focus-visible:ring-2 focus-visible:ring-book-marker focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
              >
                Next page
                <ArrowRight className="size-4" aria-hidden="true" />
              </button>
            )}
          </div>
        ) : (
          <p lang={stream.currentSentence ? 'ta-Latn' : undefined} className="line-clamp-2 min-h-5 text-sm text-pretty text-foreground/85 sm:line-clamp-1">
            {caption}
          </p>
        )}
      </div>

      <div
        className={cn(
          'flex w-full max-w-2xl items-center gap-0.5 rounded-full border border-book-amber/20 bg-[linear-gradient(135deg,rgb(255_237_213/0.10),rgb(255_255_255/0.03))] py-1 pr-1.5 pl-1 backdrop-blur-xl transition-shadow duration-500 sm:gap-1 sm:pr-2',
          speaking
            ? 'shadow-[0_0_0_1px_rgb(249_115_22/0.35),0_12px_44px_-10px_rgb(249_115_22/0.65),inset_0_1px_0_rgb(255_255_255/0.08)]'
            : 'shadow-[0_10px_36px_-14px_rgb(249_115_22/0.35),inset_0_1px_0_rgb(255_255_255/0.06)]',
        )}
      >
        <Hint label={playLabel}>
          <button
            type="button"
            onClick={handlePlay}
            aria-label={playLabel}
            className="grid size-9 shrink-0 place-items-center rounded-full bg-book-orange text-book-ink shadow-[0_0_20px_-4px_rgb(249_115_22/0.8)] transition-colors hover:bg-book-marker focus-visible:ring-2 focus-visible:ring-book-marker focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none sm:size-10"
          >
            {completed ? (
              <RotateCcw className="size-4" aria-hidden="true" />
            ) : speaking ? (
              <Pause className="size-4 fill-current" aria-hidden="true" />
            ) : (
              <Play className="size-4 translate-x-px fill-current" aria-hidden="true" />
            )}
          </button>
        </Hint>

        <Hint label="Previous sentence">
          <button
            type="button"
            onClick={stream.previousSentence}
            disabled={!streamingEnabled || !stream.canSeek}
            aria-label="Previous sentence"
            className={iconButton}
          >
            <SkipBack className="size-4" aria-hidden="true" />
          </button>
        </Hint>
        <Hint label="Next sentence">
          <button
            type="button"
            onClick={stream.nextSentence}
            disabled={!streamingEnabled || !stream.canSeek || completed}
            aria-label="Next sentence"
            className={iconButton}
          >
            <SkipForward className="size-4" aria-hidden="true" />
          </button>
        </Hint>

        <div className="flex min-w-0 flex-1 justify-center overflow-hidden px-1">
          <VoiceWaveform status={streamingEnabled ? status : 'idle'} seed={stream.wordIndex} />
        </div>

        <Hint label={`Speed ${rate}× — change to ${nextRate}×`}>
          <button
            type="button"
            onClick={() => onRateChange(nextRate)}
            aria-label={`Narration speed ${rate} times. Change to ${nextRate} times`}
            className={cn(iconButton, 'w-auto min-w-8 px-1.5 font-mono text-xs font-semibold tabular-nums sm:min-w-10')}
          >
            {rate}×
          </button>
        </Hint>
        <Hint label={muted ? 'Unmute (this demo plays no audio)' : 'Mute (this demo plays no audio)'}>
          <button
            type="button"
            onClick={() => onMutedChange(!muted)}
            aria-label="Mute narration"
            aria-pressed={muted}
            className={iconButton}
          >
            {muted ? <VolumeX className="size-4" aria-hidden="true" /> : <Volume2 className="size-4" aria-hidden="true" />}
          </button>
        </Hint>
        <Hint label={speaking ? 'Queue a voice question (demo)' : 'Demo voice input'}>
          <button
            type="button"
            onClick={toggleMic}
            aria-label={speaking ? 'Queue a voice question for the end of this section' : 'Demo voice input'}
            aria-expanded={status === 'listening'}
            className={iconButton}
          >
            <Mic className="size-4" aria-hidden="true" />
          </button>
        </Hint>
        <Hint label={speaking ? 'Queue a question for later' : 'Ask a question'}>
          <button
            type="button"
            onClick={handleAsk}
            aria-label={speaking ? 'Queue a question for the end of this section' : 'Ask a question in course chat'}
            className={iconButton}
          >
            <MessageCircleQuestion className="size-4" aria-hidden="true" />
          </button>
        </Hint>
      </div>

      <p className="sr-only" aria-live="polite">
        {streamingEnabled ? `Narration ${statusLabel[status].toLowerCase()}` : ''}
      </p>
    </div>
  )
}
