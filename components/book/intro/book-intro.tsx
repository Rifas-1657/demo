'use client'

import { Component, Suspense, lazy, useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { cn } from '@/lib/utils'
import { BookIntroCss } from './book-intro-css'

const BookIntroScene = lazy(() => import('./book-intro-scene'))

type IntroMode = 'skip' | 'css' | '3d'

interface BookIntroProps {
  courseId: string
  title: string
  subtitle?: string
  onFinish: () => void
}

const HARD_CAP_MS = 7000
const SCENE_LOAD_TIMEOUT_MS = 2500
const FADE_MS = 700
const SKIP_FADE_MS = 280

const storageKey = (courseId: string) => `bookey:intro-seen:${courseId}`

function readSeen(courseId: string) {
  try {
    return window.sessionStorage.getItem(storageKey(courseId)) === '1'
  } catch {
    return false
  }
}

function markSeen(courseId: string) {
  try {
    window.sessionStorage.setItem(storageKey(courseId), '1')
  } catch {
    /* storage can be disabled; the intro then simply plays again */
  }
}

function supportsWebGL() {
  try {
    const canvas = document.createElement('canvas')
    return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'))
  } catch {
    return false
  }
}

function isConstrainedDevice() {
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } }
  if (nav.connection?.saveData) return true
  if (window.matchMedia('(max-width: 767px), (pointer: coarse)').matches) return true
  if (nav.hardwareConcurrency !== undefined && nav.hardwareConcurrency <= 4) return true
  return nav.deviceMemory !== undefined && nav.deviceMemory <= 4
}

function decideMode(courseId: string): IntroMode {
  if (readSeen(courseId)) return 'skip'
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return 'skip'
  if (isConstrainedDevice() || !supportsWebGL()) return 'css'
  return '3d'
}

class SceneBoundary extends Component<{ onError: () => void; children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch() {
    this.props.onError()
  }
  render() {
    return this.state.failed ? null : this.props.children
  }
}

const noopSubscribe = () => () => {}

/**
 * Once-per-session opening sequence for a course book. Renders a matching dark
 * backdrop during SSR so the reader never flashes before the decision is made.
 */
export function BookIntro(props: BookIntroProps) {
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false)
  if (!mounted) return <div aria-hidden="true" className="fixed inset-0 z-[60] bg-night-deep" />
  return <IntroPlayer {...props} />
}

function IntroPlayer({ courseId, title, subtitle, onFinish }: BookIntroProps) {
  const [mode, setMode] = useState<IntroMode>(() => decideMode(courseId))
  const [sceneReady, setSceneReady] = useState(false)
  const [leaving, setLeaving] = useState<number | null>(null)
  const finishedRef = useRef(false)
  const skipRef = useRef<HTMLButtonElement>(null)

  const finish = useCallback(
    (fadeMs = FADE_MS) => {
      if (finishedRef.current) return
      finishedRef.current = true
      setLeaving(fadeMs)
      window.setTimeout(onFinish, fadeMs)
    },
    [onFinish],
  )

  useEffect(() => {
    markSeen(courseId)
    if (mode === 'skip') {
      finishedRef.current = true
      onFinish()
      return
    }
    skipRef.current?.focus({ preventScroll: true })
    const cap = window.setTimeout(() => finish(), HARD_CAP_MS)
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      finish(SKIP_FADE_MS)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.clearTimeout(cap)
      window.removeEventListener('keydown', onKeyDown)
    }
    // Decide once on mount; switching 3d -> css must not restart the hard cap.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (mode !== '3d' || sceneReady) return
    const timer = window.setTimeout(() => setMode('css'), SCENE_LOAD_TIMEOUT_MS)
    return () => window.clearTimeout(timer)
  }, [mode, sceneReady])

  const fallBackToCss = useCallback(() => setMode('css'), [])
  const handleReady = useCallback(() => setSceneReady(true), [])
  const handleComplete = useCallback(() => finish(), [finish])

  if (mode === 'skip') return null

  return (
    <div
      role="region"
      aria-label={`Opening ${title}`}
      className={cn('fixed inset-0 z-[60] overflow-hidden bg-night-deep transition-opacity ease-out', leaving !== null && 'pointer-events-none opacity-0')}
      style={{ transitionDuration: `${leaving ?? FADE_MS}ms` }}
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(55%_60%_at_50%_42%,rgb(120_24_40/0.75),transparent_75%),linear-gradient(180deg,#2a0a12_0%,#12040a_70%,#0b0306_100%)]"
      />
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 mx-auto h-[70%] w-[min(90vw,720px)] bg-[radial-gradient(50%_80%_at_50%_0%,rgb(255_214_150/0.18),transparent_70%)]"
      />

      <div className="absolute inset-0">
        {mode === '3d' ? (
          <>
            {!sceneReady && <BookIntroCss title={title} subtitle={subtitle} playing={false} />}
            <div className={cn('absolute inset-0 transition-opacity duration-500', sceneReady ? 'opacity-100' : 'opacity-0')}>
              <SceneBoundary onError={fallBackToCss}>
                <Suspense fallback={null}>
                  <BookIntroScene
                    title={title}
                    subtitle={subtitle}
                    onReady={handleReady}
                    onComplete={handleComplete}
                    onError={fallBackToCss}
                  />
                </Suspense>
              </SceneBoundary>
            </div>
          </>
        ) : (
          <BookIntroCss title={title} subtitle={subtitle} onComplete={handleComplete} />
        )}
      </div>

      <div
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute inset-0 bg-[radial-gradient(45%_45%_at_50%_50%,rgb(255_200_120/0.55),transparent_70%)] opacity-0 transition-opacity',
          leaving !== null && 'opacity-100',
        )}
        style={{ transitionDuration: `${(leaving ?? FADE_MS) / 2}ms` }}
      />

      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-4 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:px-8 sm:pb-8">
        <p className="min-w-0 truncate text-xs font-medium tracking-[0.2em] text-white/50 uppercase">Opening your book</p>
        <button
          ref={skipRef}
          type="button"
          onClick={() => finish(SKIP_FADE_MS)}
          className="inline-flex h-11 shrink-0 items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 text-sm font-medium text-white backdrop-blur-md transition-colors hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-[#facc15] focus-visible:outline-none"
        >
          Skip intro
          <kbd className="hidden rounded border border-white/20 px-1.5 font-mono text-[0.65rem] text-white/70 sm:inline">
            Esc
          </kbd>
        </button>
      </div>
    </div>
  )
}
