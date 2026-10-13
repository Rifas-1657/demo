import type { LearningCourseId } from '@/lib/mock/learning'

/**
 * Typed contracts for the immersive book reader (`/book/[courseId]`).
 * Kept separate from `types/learning.ts` so the existing catalog model stays
 * untouched. Fields marked optional can be expanded by later features
 * (voice narration, animated diagrams, code execution) without breaking pages.
 */

export type LessonPageId = `lesson_${string}`

/** `full` shows the whole page at once; `guided` is reserved for word streaming. */
export type ReaderViewMode = 'full' | 'guided'

import type { DiagramNarrationContext, DiagramSpec } from './diagram'

export type { DiagramKind, DiagramNode, DiagramSpec, DiagramTone } from './diagram'

export interface CodeExample {
  language: 'python'
  source: string
  /** Static, author-written output. Shown until a real runner exists. */
  expectedOutput: string
  /** Whether a future runner should allow editing + executing this snippet. */
  runnable: boolean
}

export type CueKind = 'highlight-term' | 'focus-node' | 'focus-code-line'

/** Narration cue: when `atWord` is spoken, focus `target` on the visual page. */
export interface NarrationCue {
  id: string
  atWord: number
  kind: CueKind
  target: string
}

export interface BookLessonPage {
  id: LessonPageId
  courseId: LearningCourseId
  chapterId: string
  /** 1-based chapter number, matching `LearningChapter.number`. */
  chapterNumber: number
  /** 1-based position across all seeded pages of this course. */
  pageNumber: number
  title: string
  /** Tanglish narration script; technical terms stay in English. */
  narrationText: string
  paragraphs: string[]
  /** Terms to mark with the yellow annotation highlight in the text. */
  keyTerms?: string[]
  codeExample: CodeExample
  diagramSpec: DiagramSpec
  cues?: NarrationCue[]
  estimatedMinutes?: number
  /** Two short "try it" prompts shown under the text. */
  practicePrompts: string[]
  /** Interest-matched real-world comparison; `neutral` is the fallback. */
  analogies: Record<'cricket' | 'movies' | 'neutral', string>
}

/* ---- Stable component interfaces for upcoming features ---- */

export type NarrationCueAction = 'draw' | 'highlight' | 'runCode' | 'showOutput'

/** Typed playback cue fired once per pass when narration reaches `atWord`. */
export interface NarrationCueEvent {
  id: string
  atWord: number
  action: NarrationCueAction
  targetId: string
}

export type NarrationStatus = 'idle' | 'speaking' | 'listening' | 'thinking' | 'paused' | 'completed'

export const NARRATION_RATES = [0.75, 1, 1.25, 1.5] as const
export type NarrationRate = (typeof NARRATION_RATES)[number]

export interface VoiceDockProps {
  page: BookLessonPage
  /** False in full-book mode: the dock must never stream words then. */
  streamingEnabled: boolean
  stream: import('@/lib/narration/use-narration-stream').NarrationStream
  rate: NarrationRate
  onRateChange: (rate: NarrationRate) => void
  muted: boolean
  onMutedChange: (muted: boolean) => void
  /** Switches the reader to guided mode so narration can stream. */
  onEnableGuided: () => void
  hasNextPage: boolean
  onNextPage: () => void
  /** Questions queued while narration was speaking, answered at page end. */
  queue: import('@/components/book/tutor/any-questions-panel').QueuedQuestion[]
  onQueueQuestion: (kind: 'ask' | 'mic') => void
  tutorBusy: boolean
  onAskTutor: (question: string) => boolean
  onAskQueued: (item: import('@/components/book/tutor/any-questions-panel').QueuedQuestion) => void
  onOpenChat: () => void
}

export interface DiagramCanvasProps {
  /** `null`/missing renders the empty state. */
  spec?: DiagramSpec | null
  /** Node id to emphasise, driven by narration cues. */
  focusNodeId?: string | null
  /** Present only while guided narration runs; without it the completed view is shown. */
  narration?: DiagramNarrationContext | null
}

export interface CodeRunResult {
  stdout: string
  stderr?: string
  durationMs?: number
}

/** Shared controller from `useCodeLab`; runs go through the simulated `runPythonDemo` only. */
export type CodeLabController = import('@/components/book/use-code-lab').CodeLab

export interface CodeRunnerPanelProps {
  example: CodeExample
  lab: CodeLabController
  /** Line focused by a narration cue while no run is active. */
  focusLine?: number | null
}

export interface OutputPreviewProps {
  lab: CodeLabController
  /** Page title and seeded output feed the fixed, sandboxed sample web view. */
  title: string
  expectedOutput: string
}
