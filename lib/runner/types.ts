/**
 * Runner types shared between demo and Pyodide implementations.
 */

export interface DemoVariable {
  name: string
  value: string
  type: string
}

export interface DemoStep {
  /** 1-based index among the program's logical lines (blank and comment-only lines skipped). */
  logicalLine: number
  /** Text this step appends to the terminal. May omit the trailing newline. */
  output?: string
  /** Variables in scope after the step, in definition order. */
  variables: DemoVariable[]
}

export interface DemoInputRequest {
  prompt: string
  /** Position of the answer in the `inputs` array. */
  index: number
}

export type DemoRunStatus = 'done' | 'error' | 'awaiting-input' | 'unsupported'

export interface DemoRunResult {
  status: DemoRunStatus
  exampleId: string | null
  steps: DemoStep[]
  stdout: string
  stderr?: string
  inputRequest?: DemoInputRequest
  /** Answers the narrated run uses so input() examples never block playback. */
  sampleInputs?: string[]
  /** Illustrative only — derived from step count, not measured. */
  illustrativeDurationMs: number
  message?: string
}

export type RunnerBackend = 'demo' | 'pyodide'

export interface RunnerConfig {
  backend: RunnerBackend
  timeout?: number
  maxOutputSize?: number
}

/** Status for Pyodide worker lifecycle */
export type PyodideStatus = 'loading' | 'ready' | 'error'
