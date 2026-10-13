'use client'

import { useEffect, useState } from 'react'
import { stepForProgress } from '@/lib/diagram/layout'
import type { DiagramNarrationContext, DiagramStep } from '@/types/diagram'

/**
 * - `auto`: follows narration when it runs, otherwise shows the completed figure.
 * - `replay`: self-timed drawing pass, one step at a time.
 * - `manual`: reader picked a step tab.
 * - `all`: everything drawn at once, no step highlight.
 */
type PlaybackMode = 'auto' | 'replay' | 'manual' | 'all'

const REPLAY_STEP_MS = 1500

export interface DiagramPlayback {
  /** Index of the step currently shown (everything up to it is drawn). */
  step: number
  /** Number of step tabs the reader can open. */
  unlocked: number
  /** Whether the current step's highlight and pen marker are shown. */
  stepFocus: boolean
  /** Whether newly revealed elements animate their drawing. */
  animate: boolean
  /** Changes on replay so drawn elements remount and redraw. */
  generation: number
  /** True while narration or replay is progressing through the steps. */
  simulating: boolean
  replay: () => void
  showAll: () => void
  selectStep: (index: number) => void
}

export function useDiagramPlayback(
  steps: DiagramStep[],
  narration: DiagramNarrationContext | null | undefined,
  reducedMotion: boolean,
): DiagramPlayback {
  const total = Math.max(steps.length, 1)
  const last = total - 1
  const narrating = Boolean(narration?.active)
  const [mode, setMode] = useState<PlaybackMode>('auto')
  const [manualStep, setManualStep] = useState(last)
  const [replayStep, setReplayStep] = useState(0)
  const [generation, setGeneration] = useState(0)
  const [wasNarrating, setWasNarrating] = useState(narrating)

  // A new narration pass takes back control from replay / manual browsing.
  if (wasNarrating !== narrating) {
    setWasNarrating(narrating)
    if (narrating) setMode('auto')
  }

  useEffect(() => {
    if (mode !== 'replay') return
    if (replayStep >= last) {
      const done = window.setTimeout(() => {
        setManualStep(last)
        setMode('manual')
      }, REPLAY_STEP_MS)
      return () => window.clearTimeout(done)
    }
    const timer = window.setTimeout(() => setReplayStep((s) => s + 1), REPLAY_STEP_MS)
    return () => window.clearTimeout(timer)
  }, [mode, replayStep, last])

  const narrationStep =
    narrating && narration ? Math.max(stepForProgress(steps, narration.progress), 0) : last
  const narrationUnlocked = narrating ? narrationStep + 1 : total

  let step: number
  let unlocked: number
  let stepFocus = true
  let animate = !reducedMotion
  switch (mode) {
    case 'replay':
      step = Math.min(replayStep, last)
      unlocked = step + 1
      break
    case 'manual':
      step = Math.min(manualStep, narrationUnlocked - 1)
      unlocked = narrationUnlocked
      break
    case 'all':
      step = last
      unlocked = narrationUnlocked
      stepFocus = false
      animate = false
      break
    default:
      step = narrationStep
      unlocked = narrationUnlocked
      stepFocus = narrating
      animate = narrating && !reducedMotion
  }

  return {
    step,
    unlocked,
    stepFocus,
    animate,
    generation,
    simulating: mode === 'replay' || (mode === 'auto' && narrating && narrationStep < last),
    replay: () => {
      setGeneration((g) => g + 1)
      setReplayStep(0)
      setMode('replay')
    },
    showAll: () => setMode('all'),
    selectStep: (index) => {
      setManualStep(Math.min(Math.max(index, 0), last))
      setMode('manual')
    },
  }
}
