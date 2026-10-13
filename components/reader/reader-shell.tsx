'use client'

import { ArrowLeft, Loader2, Minus, Pause, Plus, Square, Volume2 } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { BookeyBadge } from '@/components/ui-kit/bookey-badge'
import { BookeyButton } from '@/components/ui-kit/bookey-button'
import { Hint } from '@/components/ui-kit/hint'
import { rehydrateReaderPreferences, useReaderPreferences } from '@/lib/stores/reader-preferences'
import { synthesizeSpeech } from '@/lib/api/client'
import type { BookPage } from '@/types/learning'

interface ReaderShellProps {
  courseTitle: string
  author: string
  page: BookPage
}

const PLAYBACK_RATES = [0.75, 1, 1.25, 1.5] as const
type PlaybackRate = (typeof PLAYBACK_RATES)[number]

export function ReaderShell({ courseTitle, author, page }: ReaderShellProps) {
  const fontScale = useReaderPreferences((s) => s.fontScale)
  const setFontScale = useReaderPreferences((s) => s.setFontScale)

  const [audioStatus, setAudioStatus] = useState<'idle' | 'loading' | 'playing' | 'paused' | 'error'>('idle')
  const [playbackRate, setPlaybackRate] = useState<PlaybackRate>(1)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const blobUrlRef = useRef<string | null>(null)
  const isLoadingRef = useRef(false)

  useEffect(() => {
    rehydrateReaderPreferences()
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
      if (blobUrlRef.current) {
        try {
          URL.revokeObjectURL(blobUrlRef.current)
        } catch {}
        blobUrlRef.current = null
      }
    }
  }, [])

  async function handleTogglePlay() {
    if (audioStatus === 'playing') {
      audioRef.current?.pause()
      setAudioStatus('paused')
      return
    }

    if (audioStatus === 'paused' && audioRef.current) {
      audioRef.current.play().catch(() => setAudioStatus('error'))
      setAudioStatus('playing')
      return
    }

    if (isLoadingRef.current) return
    isLoadingRef.current = true
    setAudioStatus('loading')

    try {
      if (!blobUrlRef.current) {
        const textToSpeak = `${page.title}. ${page.body}`
        const blob = await synthesizeSpeech(textToSpeak, undefined, playbackRate)
        blobUrlRef.current = URL.createObjectURL(blob)
      }

      if (audioRef.current) {
        audioRef.current.pause()
      }

      const audio = new Audio(blobUrlRef.current)
      audioRef.current = audio
      audio.playbackRate = playbackRate
      audio.onended = () => setAudioStatus('idle')
      audio.onerror = () => setAudioStatus('error')
      await audio.play()
      setAudioStatus('playing')
    } catch {
      setAudioStatus('error')
      setTimeout(() => setAudioStatus('idle'), 3000)
    } finally {
      isLoadingRef.current = false
    }
  }

  function handleStop() {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
    setAudioStatus('idle')
  }

  function cycleRate() {
    const nextIdx = (PLAYBACK_RATES.indexOf(playbackRate) + 1) % PLAYBACK_RATES.length
    const nextRate = PLAYBACK_RATES[nextIdx]
    setPlaybackRate(nextRate)
    if (audioRef.current) {
      audioRef.current.playbackRate = nextRate
    }
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-20 border-b bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4">
          <Hint label="Back to dashboard">
            <BookeyButton
              size="icon"
              variant="ghost"
              aria-label="Back to dashboard"
              nativeButton={false}
              render={<Link href="/dashboard" />}
            >
              <ArrowLeft aria-hidden="true" />
            </BookeyButton>
          </Hint>
          <p className="min-w-0 truncate text-sm font-medium">{courseTitle}</p>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1" role="group" aria-label="Audio narration">
              {audioStatus !== 'idle' && (
                <>
                  <Hint label="Stop narration">
                    <BookeyButton
                      size="icon"
                      variant="ghost"
                      aria-label="Stop narration"
                      onClick={handleStop}
                    >
                      <Square className="size-4" aria-hidden="true" />
                    </BookeyButton>
                  </Hint>
                  <Hint label={`Speed ${playbackRate}×`}>
                    <button
                      type="button"
                      onClick={cycleRate}
                      aria-label={`Narration speed ${playbackRate} times`}
                      className="rounded-full px-2 py-0.5 font-mono text-xs font-semibold tabular-nums hover:bg-white/10"
                    >
                      {playbackRate}×
                    </button>
                  </Hint>
                </>
              )}
              <Hint
                label={
                  audioStatus === 'loading'
                    ? 'Synthesizing lesson speech…'
                    : audioStatus === 'playing'
                      ? 'Pause narration'
                      : audioStatus === 'paused'
                        ? 'Resume narration'
                        : audioStatus === 'error'
                          ? 'Audio service unavailable'
                          : 'Listen to this lesson'
                }
              >
                <BookeyButton
                  size="sm"
                  variant="outline"
                  onClick={handleTogglePlay}
                  disabled={audioStatus === 'loading'}
                  aria-label={audioStatus === 'playing' ? 'Pause narration' : 'Listen to this lesson'}
                  className="flex items-center gap-1.5"
                >
                  {audioStatus === 'loading' ? (
                    <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                  ) : audioStatus === 'playing' ? (
                    <Pause className="size-3.5" aria-hidden="true" />
                  ) : (
                    <Volume2 className="size-3.5" aria-hidden="true" />
                  )}
                  <span className="text-xs font-medium">
                    {audioStatus === 'loading'
                      ? 'Loading…'
                      : audioStatus === 'playing'
                        ? 'Pause'
                        : audioStatus === 'paused'
                          ? 'Resume'
                          : audioStatus === 'error'
                            ? 'Unavailable'
                            : 'Listen'}
                  </span>
                </BookeyButton>
              </Hint>
            </div>
            <div className="flex items-center gap-1 border-l pl-2" role="group" aria-label="Text size">
              <BookeyButton
                size="icon"
                variant="ghost"
                aria-label="Decrease text size"
                disabled={fontScale <= 0.85}
                onClick={() => setFontScale(fontScale - 0.1)}
              >
                <Minus aria-hidden="true" />
              </BookeyButton>
              <BookeyButton
                size="icon"
                variant="ghost"
                aria-label="Increase text size"
                disabled={fontScale >= 1.4}
                onClick={() => setFontScale(fontScale + 0.1)}
              >
                <Plus aria-hidden="true" />
              </BookeyButton>
            </div>
          </div>
        </div>
      </header>

      <main id="main" className="flex-1 px-4 py-10 sm:py-16">
        <article
          data-theme="book"
          className="mx-auto max-w-2xl rounded-3xl border p-6 shadow-[0_30px_80px_-40px_rgb(194_65_12/0.35)] sm:p-12"
          style={{ fontSize: `${fontScale}rem` }}
        >
          <div className="mb-6 flex flex-wrap items-center gap-2">
            <BookeyBadge tone="book" className="capitalize">
              {page.kind}
            </BookeyBadge>
            <span className="font-mono text-xs text-muted-foreground">{page.estimatedMinutes} min</span>
          </div>
          <h1 className="font-display text-[2em] leading-tight font-bold text-balance">{page.title}</h1>
          <p className="mt-2 text-[0.875em] text-muted-foreground">{author}</p>
          <p className="mt-8 font-serif text-[1.125em] leading-relaxed">{page.body}</p>
          <p className="mt-10 border-t pt-6 text-[0.8em] text-muted-foreground">
            Reader shell placeholder — page navigation, highlights, and exercises arrive in the reader build.
          </p>
        </article>
      </main>
    </div>
  )
}
