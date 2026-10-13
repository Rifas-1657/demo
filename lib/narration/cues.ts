import type { BookLessonPage, NarrationCueEvent } from '@/types/book'

const LINE_PREFIX = 'line:'
const TERM_PREFIX = 'term:'

/**
 * Builds the typed cue timeline for a page: the authored `page.cues`
 * plus predictable defaults (draw the figure, run the code, show output).
 */
export function buildNarrationCues(page: BookLessonPage | undefined, wordCount: number): NarrationCueEvent[] {
  if (!page || wordCount === 0) return []
  const last = wordCount - 1
  const at = (ratio: number) => Math.min(last, Math.max(0, Math.round(last * ratio)))
  const clamp = (word: number) => Math.min(last, Math.max(0, word))
  const nodes = page.diagramSpec.nodes
  const cues: NarrationCueEvent[] = []

  if (nodes[0]) cues.push({ id: 'draw-figure', atWord: 0, action: 'draw', targetId: nodes[0].id })

  for (const cue of page.cues ?? []) {
    const targetId =
      cue.kind === 'focus-code-line'
        ? `${LINE_PREFIX}${cue.target}`
        : cue.kind === 'highlight-term'
          ? `${TERM_PREFIX}${cue.target}`
          : cue.target
    cues.push({ id: `page-${cue.id}`, atWord: clamp(cue.atWord), action: 'highlight', targetId })
  }

  const accent = nodes.find((node) => node.tone === 'highlight')
  const authoredNodeFocus = page.cues?.some((cue) => cue.kind === 'focus-node')
  if (accent && !authoredNodeFocus) {
    cues.push({ id: 'highlight-accent', atWord: at(0.35), action: 'highlight', targetId: accent.id })
  }

  if (page.codeExample.runnable) cues.push({ id: 'run-code', atWord: at(0.6), action: 'runCode', targetId: 'code' })
  cues.push({ id: 'show-output', atWord: at(0.85), action: 'showOutput', targetId: 'output' })

  return cues.sort((a, b) => a.atWord - b.atWord)
}

export interface CueVisualState {
  focusNodeId: string | null
  focusLine: number | null
  outputRevealed: boolean
  /** The `runCode` cue has been reached in this pass. */
  codeRunCued: boolean
}

export const idleCueVisuals: CueVisualState = {
  focusNodeId: null,
  focusLine: null,
  outputRevealed: false,
  codeRunCued: false,
}

/** Pure projection of reached cues onto the visual page; resets naturally on restart or seek. */
export function deriveCueVisuals(reached: NarrationCueEvent[], page: BookLessonPage | undefined): CueVisualState {
  if (!page || reached.length === 0) return idleCueVisuals
  let focusNodeId: string | null = null
  let focusLine: number | null = null
  let running = false
  let outputRevealed = false
  let codeRunCued = false

  for (const cue of reached) {
    if (cue.action === 'showOutput') {
      outputRevealed = true
      running = false
    } else if (cue.action === 'runCode') {
      running = true
      codeRunCued = true
    } else if (cue.targetId.startsWith(LINE_PREFIX)) {
      focusLine = Number(cue.targetId.slice(LINE_PREFIX.length)) || null
    } else if (!cue.targetId.startsWith(TERM_PREFIX)) {
      focusNodeId = cue.targetId
    }
  }

  if (running) {
    const lines = page.codeExample.source.split('\n')
    const lastCodeLine = lines.findLastIndex((line) => line.trim() && !line.trimStart().startsWith('#'))
    focusLine = lastCodeLine >= 0 ? lastCodeLine + 1 : focusLine
  }

  return { focusNodeId, focusLine, outputRevealed, codeRunCued }
}
