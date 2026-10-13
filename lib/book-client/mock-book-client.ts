import {
  BOOK_PROTOCOL_VERSION,
  segmentIdFor,
  type BookClientEvent,
  type ClientEventPayloads,
  type ServerEventPayloads,
  type ServerEventType,
} from '@/lib/contracts/book-events'
import { getBookPages } from '@/lib/mock/book-pages'
import { getLearningCourse, type LearningCourseId } from '@/lib/mock/learning'
import { buildNarrationCues } from '@/lib/narration/cues'
import { tokenizeNarration, wordDelayMs, type NarrationScript } from '@/lib/narration/tokenize'
import { runPythonDemo } from '@/lib/runner'
import { answerQuestion, tokenizeAnswer } from '@/lib/tutor/demo-tutor'
import type { BookLessonPage, NarrationCueEvent } from '@/types/book'
import { BaseBookClient } from './base-client'

export interface Scheduler {
  setTimeout(fn: () => void, ms: number): unknown
  clearTimeout(handle: unknown): void
}

export interface MockBookClientOptions {
  /** Injected so tests can drive time deterministically. */
  scheduler?: Scheduler
  now?: () => number
  /** Simulated network delay before the first frame of each reply. */
  latencyMs?: number
  /** Delay before a tutor answer starts streaming. */
  thinkingMs?: number
  /** Delay between streamed answer tokens. */
  tokenMs?: number
}

interface NarrationSession {
  id: string
  courseId: string
  page: BookLessonPage
  script: NarrationScript
  audioOffsets: number[]
  /** Extra frames fired when narration reaches a word (cues, draws, highlights). */
  wordEvents: Map<number, NarrationCueEvent[]>
  drawSteps: Map<number, string[]>
  position: number
  playing: boolean
}

const defaultScheduler: Scheduler = {
  setTimeout: (fn, ms) => globalThis.setTimeout(fn, ms),
  clearTimeout: (handle) => globalThis.clearTimeout(handle as ReturnType<typeof setTimeout>),
}

/**
 * Offline stand-in for the FastAPI/WebSocket backend. It answers every client
 * frame with the same envelopes the real server will send, built from the
 * seeded lesson pages, demo tutor and demo Python runner.
 */
export class MockBookClient extends BaseBookClient {
  readonly kind = 'mock' as const
  /** Recent outbound frames, newest last. Handy for debugging and tests. */
  readonly sent: BookClientEvent[] = []

  private readonly scheduler: Scheduler
  private readonly now: () => number
  private readonly latencyMs: number
  private readonly thinkingMs: number
  private readonly tokenMs: number

  private seq = 0
  private idCounter = 0
  private rate = 1
  private session: NarrationSession | null = null
  private timers = new Map<string, Set<unknown>>()

  constructor(options: MockBookClientOptions = {}) {
    super()
    this.scheduler = options.scheduler ?? defaultScheduler
    this.now = options.now ?? Date.now
    this.latencyMs = options.latencyMs ?? 0
    this.thinkingMs = options.thinkingMs ?? 1100
    this.tokenMs = options.tokenMs ?? 38
  }

  send(event: BookClientEvent) {
    this.sent.push(event)
    if (this.sent.length > 50) this.sent.shift()

    switch (event.type) {
      case 'start_page':
        return this.handleStartPage(event.payload)
      case 'pause':
        return this.handlePause(event.payload)
      case 'resume':
        return this.handleResume(event.payload)
      case 'seek':
        return this.handleSeek(event.payload)
      case 'speed':
        return this.handleSpeed(event.payload)
      case 'ask_question':
        return this.handleAskQuestion(event.payload)
      case 'run_code':
        return this.handleRunCode(event.payload)
      case 'submit_survey':
        // Accepted silently: the survey is persisted locally by the UI.
        return
    }
  }

  /** Replays recorded or hand-written frames through the same validation as live ones. */
  replay(frames: unknown[], { intervalMs = 0 }: { intervalMs?: number } = {}) {
    this.clearGroup('replay')
    frames.forEach((frame, index) => {
      this.later('replay', intervalMs * index, () => this.deliver(frame))
    })
  }

  override dispose() {
    for (const group of [...this.timers.keys()]) this.clearGroup(group)
    this.session = null
    super.dispose()
  }

  protected override createId(prefix: string) {
    this.idCounter += 1
    return `${prefix}_mock_${this.idCounter}`
  }

  /* ----------------------------------------------------------------------- */
  /* Narration                                                                */
  /* ----------------------------------------------------------------------- */

  private handleStartPage({ courseId, pageId }: ClientEventPayloads['start_page']) {
    this.clearGroup('narration')
    this.session = null

    const page = getBookPages(courseId).find((entry) => entry.id === pageId)
    if (!page) {
      this.later('narration', this.latencyMs, () =>
        this.emit('error', null, {
          code: 'page_not_found',
          message: `No page ${pageId} in course ${courseId}.`,
          recoverable: true,
        }),
      )
      return
    }

    const session = this.createSession(courseId, page)
    this.session = session

    this.later('narration', this.latencyMs, () => {
      this.emit('session_started', session.id, { sessionId: session.id, courseId, pageId })
      this.emit('diagram_spec', session.id, {
        diagramId: page.id,
        spec: page.diagramSpec,
        steps: (page.diagramSpec.steps ?? []).map((step) => step.id),
      })
      session.playing = true
      this.emitWord(session)
    })
  }

  private handlePause({ sessionId }: ClientEventPayloads['pause']) {
    const session = this.activeSession(sessionId)
    if (!session || !session.playing) return
    this.clearGroup('narration')
    session.playing = false
  }

  private handleResume({ sessionId }: ClientEventPayloads['resume']) {
    const session = this.activeSession(sessionId)
    if (!session || session.playing) return
    if (session.position >= session.script.words.length) {
      this.emit('page_complete', session.id, { pageId: session.page.id })
      return
    }
    session.playing = true
    this.scheduleNextWord(session)
  }

  private handleSeek({ sessionId, wordIndex }: ClientEventPayloads['seek']) {
    const session = this.activeSession(sessionId)
    if (!session) return
    session.position = Math.max(0, Math.min(Math.floor(wordIndex), session.script.words.length))
    if (!session.playing) return
    this.clearGroup('narration')
    this.emitWord(session)
  }

  private handleSpeed({ sessionId, value }: ClientEventPayloads['speed']) {
    if (!Number.isFinite(value) || value <= 0) {
      this.emit('error', sessionId, { code: 'invalid_speed', message: 'Speed must be positive.', recoverable: true })
      return
    }
    this.rate = value
    const session = this.activeSession(sessionId)
    if (!session?.playing) return
    this.clearGroup('narration')
    this.scheduleNextWord(session)
  }

  private createSession(courseId: string, page: BookLessonPage): NarrationSession {
    const script = tokenizeNarration(page.narrationText)
    const wordCount = script.words.length

    const audioOffsets: number[] = []
    let elapsed = 0
    for (const word of script.words) {
      audioOffsets.push(elapsed)
      elapsed += wordDelayMs(word.text, 1)
    }

    const wordEvents = new Map<number, NarrationCueEvent[]>()
    for (const cue of buildNarrationCues(page, wordCount)) {
      wordEvents.set(cue.atWord, [...(wordEvents.get(cue.atWord) ?? []), cue])
    }

    const drawSteps = new Map<number, string[]>()
    const steps = page.diagramSpec.steps ?? []
    steps.forEach((step, index) => {
      const ratio = step.at ?? index / Math.max(1, steps.length)
      const atWord = Math.min(Math.max(0, wordCount - 1), Math.round(ratio * Math.max(0, wordCount - 1)))
      drawSteps.set(atWord, [...(drawSteps.get(atWord) ?? []), step.id])
    })

    return {
      id: this.createId('sess'),
      courseId,
      page,
      script,
      audioOffsets,
      wordEvents,
      drawSteps,
      position: 0,
      playing: false,
    }
  }

  /** Emits the frames for `session.position`, then schedules the next word. */
  private emitWord(session: NarrationSession) {
    const { words } = session.script
    if (session.position >= words.length) {
      session.playing = false
      this.emit('page_complete', session.id, { pageId: session.page.id })
      return
    }

    const word = words[session.position]
    const segmentId = segmentIdFor(session.page.id, word.sentence)
    this.emit('text_chunk', session.id, {
      segmentId,
      text: word.text,
      wordStart: word.index,
      wordEnd: word.index + 1,
      audioStartMs: session.audioOffsets[word.index],
    })

    for (const stepId of session.drawSteps.get(word.index) ?? []) {
      this.emit('diagram_draw', session.id, { diagramId: session.page.id, stepId })
    }
    for (const cue of session.wordEvents.get(word.index) ?? []) {
      this.emit('cue', session.id, { segmentId, atWord: cue.atWord, action: cue.action, targetId: cue.targetId })
      if (cue.action === 'highlight') this.emit('highlight', session.id, { targetId: cue.targetId, style: 'marker' })
    }

    this.scheduleNextWord(session)
  }

  private scheduleNextWord(session: NarrationSession) {
    const word = session.script.words[session.position]
    const delay = word ? wordDelayMs(word.text, this.rate) : 0
    this.later('narration', delay, () => {
      if (this.session !== session || !session.playing) return
      session.position += 1
      this.emitWord(session)
    })
  }

  private activeSession(sessionId: string) {
    return this.session && this.session.id === sessionId ? this.session : null
  }

  /* ----------------------------------------------------------------------- */
  /* Tutor                                                                    */
  /* ----------------------------------------------------------------------- */

  private handleAskQuestion(payload: ClientEventPayloads['ask_question']) {
    const { questionId, sessionId, source, text, context } = payload
    const group = `question:${questionId}`
    const pages = getBookPages(context.courseId)
    const pageIndex = pages.findIndex((entry) => entry.id === context.pageId)
    const course = getLearningCourse(context.courseId)
    const question = text.trim()

    this.later(group, this.latencyMs, () => {
      if (!question || pageIndex < 0 || !course) {
        this.emit('error', sessionId, {
          code: !question ? 'empty_question' : 'unknown_context',
          message: !question ? 'Question text is empty.' : 'The question refers to an unknown course or page.',
          recoverable: true,
        })
        return
      }
      this.emit('question_received', sessionId, { questionId, source, text: question })
    })
    if (!question || pageIndex < 0 || !course) return

    const answer = answerQuestion({
      question,
      courseId: context.courseId as LearningCourseId,
      courseTitle: course.title,
      page: pages[pageIndex],
      pageIndex,
      language: context.language,
    })

    if (answer.intent === 'off-topic') {
      this.later(group, this.latencyMs + this.thinkingMs, () =>
        this.emit('scope_refused', sessionId, { questionId, message: answer.text }),
      )
      return
    }

    const tokens = tokenizeAnswer(answer.text)
    const attachments =
      answer.code || answer.diagram ? { code: answer.code, diagram: answer.diagram } : undefined
    const startAt = this.latencyMs + this.thinkingMs

    if (tokens.length === 0) {
      this.later(group, startAt, () =>
        this.emit('answer_chunk', sessionId, { questionId, text: '', final: true, attachments }),
      )
    }
    tokens.forEach((token, index) => {
      const final = index === tokens.length - 1
      this.later(group, startAt + index * this.tokenMs, () =>
        this.emit('answer_chunk', sessionId, { questionId, text: token, final, attachments: final ? attachments : undefined }),
      )
    })
    this.later(group, startAt + Math.max(0, tokens.length - 1) * this.tokenMs, () =>
      this.emit('sources', sessionId, {
        questionId,
        items: answer.sources.map((item) => ({ title: item.label, kind: 'page' as const, ref: String(item.pageIndex) })),
      }),
    )
  }

  /* ----------------------------------------------------------------------- */
  /* Code runner                                                              */
  /* ----------------------------------------------------------------------- */

  private handleRunCode({ codeId, code, stdin, useSampleInput }: ClientEventPayloads['run_code']) {
    const inputs = useSampleInput ? (runPythonDemo(code).sampleInputs ?? []) : (stdin ?? [])
    const result = runPythonDemo(code, inputs)

    this.later(`run:${codeId}`, this.latencyMs, () =>
      this.emit('run_result', null, {
        codeId,
        stdout: result.stdout,
        stderr: result.stderr ?? (result.status === 'unsupported' ? (result.message ?? '') : ''),
        status: result.status === 'error' || result.status === 'unsupported' ? 'error' : 'success',
        durationMs: result.illustrativeDurationMs,
        trace: {
          exampleId: result.exampleId,
          steps: result.steps,
          stdin: inputs,
          inputRequest: result.inputRequest,
          sampleInputs: result.sampleInputs,
          unsupported: result.status === 'unsupported' ? (result.message ?? 'unsupported') : undefined,
        },
      }),
    )
  }

  /* ----------------------------------------------------------------------- */
  /* Plumbing                                                                 */
  /* ----------------------------------------------------------------------- */

  private emit<T extends ServerEventType>(type: T, sessionId: string | null, payload: ServerEventPayloads[T]) {
    this.seq += 1
    this.deliver({ v: BOOK_PROTOCOL_VERSION, type, seq: this.seq, sessionId, ts: this.now(), payload })
  }

  private later(group: string, ms: number, fn: () => void) {
    const handles = this.timers.get(group) ?? new Set<unknown>()
    this.timers.set(group, handles)
    const handle = this.scheduler.setTimeout(() => {
      handles.delete(handle)
      fn()
    }, ms)
    handles.add(handle)
  }

  private clearGroup(group: string) {
    const handles = this.timers.get(group)
    if (!handles) return
    for (const handle of handles) this.scheduler.clearTimeout(handle)
    this.timers.delete(group)
  }
}
