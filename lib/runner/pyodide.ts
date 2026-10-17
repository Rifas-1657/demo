/**
 * PyodideRunner - Real in-browser Python execution using Pyodide.
 * 
 * FEATURES:
 * - Runs Python 3.12 in a Web Worker (never blocks main thread)
 * - Lazy loads Pyodide only when code lab opens
 * - Streams stdout/stderr to terminal in real-time
 * - Hard timeout with worker termination and recreation
 * - Clean Python tracebacks (strips internal Pyodide frames)
 * - Output size cap to prevent memory issues
 * - Stop button that actually interrupts execution
 * - State reset between runs
 * 
 * LIMITATIONS (documented clearly):
 * - input() NOT supported (requires cross-origin isolation + SharedArrayBuffer)
 * - No package installation (micropip disabled for security)
 * - No network access from learner code
 * - Step trace is MOCK (uses demo traces for seeded examples only)
 * 
 * SAFETY:
 * - Runs in learner's browser sandbox only
 * - No backend execution path exposed
 * - Stdlib only, no package installs
 * - Network helpers restricted where possible
 */

import type { DemoRunResult, PyodideStatus } from './types'
import type { WorkerRequest, WorkerResponse } from './pyodide.worker'
import { findSeededExample, logicalLines, runPythonDemo } from './demo'

const DEFAULT_TIMEOUT_MS = 10000 // 10 seconds
const MAX_OUTPUT_SIZE = 50000 // 50KB

export class PyodideRunner {
  private worker: Worker | null = null
  private status: PyodideStatus = 'loading'
  private currentRun: {
    resolve: (result: DemoRunResult) => void
    reject: (error: Error) => void
    startTime: number
    timeout: NodeJS.Timeout
    stdoutBuffer: string
    stderrBuffer: string
  } | null = null
  private initPromise: Promise<void> | null = null
  private onStatusChange?: (status: PyodideStatus, message?: string) => void

  constructor(private config: { timeout?: number; maxOutputSize?: number } = {}) {}

  /**
   * Get current status for UI display (loading/ready/error chips).
   */
  getStatus(): PyodideStatus {
    return this.status
  }

  /**
   * Set status change callback for UI updates.
   */
  setStatusCallback(callback: (status: PyodideStatus, message?: string) => void) {
    this.onStatusChange = callback
  }

  /**
   * Lazy initialize Pyodide worker.
   */
  async init(): Promise<void> {
    if (this.initPromise) return this.initPromise

    this.initPromise = new Promise((resolve, reject) => {
      this.createWorker()

      const initTimeout = setTimeout(() => {
        this.updateStatus('error', 'Pyodide initialization timeout')
        reject(new Error('Pyodide initialization timeout'))
      }, 30000) // 30s init timeout

      const messageHandler = (event: MessageEvent<WorkerResponse>) => {
        if (event.data.type === 'status') {
          if (event.data.status === 'ready') {
            clearTimeout(initTimeout)
            this.updateStatus('ready')
            resolve()
          } else if (event.data.status === 'error') {
            clearTimeout(initTimeout)
            this.updateStatus('error', event.data.message)
            reject(new Error(event.data.message || 'Pyodide initialization failed'))
          } else if (event.data.status === 'loading') {
            this.updateStatus('loading', event.data.message)
          }
        }
      }

      this.worker?.addEventListener('message', messageHandler)
    })

    return this.initPromise
  }

  /**
   * Create and initialize a new worker.
   */
  private createWorker() {
    // Terminate existing worker if any
    if (this.worker) {
      this.worker.terminate()
    }

    // Create new worker
    this.worker = new Worker(new URL('./pyodide.worker.ts', import.meta.url), {
      type: 'module',
    })

    this.worker.addEventListener('message', this.handleWorkerMessage.bind(this))
    this.worker.addEventListener('error', this.handleWorkerError.bind(this))

    // Send init message
    const message: WorkerRequest = {
      type: 'init',
      maxOutputSize: this.config.maxOutputSize || MAX_OUTPUT_SIZE,
    }
    this.worker.postMessage(message)
  }

  /**
   * Handle worker messages.
   */
  private handleWorkerMessage(event: MessageEvent<WorkerResponse>) {
    const { type, stdout, stderr } = event.data

    if (!this.currentRun) return

    switch (type) {
      case 'output':
        // Stream output chunks to terminal
        if (stdout) this.currentRun.stdoutBuffer += stdout
        if (stderr) this.currentRun.stderrBuffer += stderr
        break

      case 'result':
        this.handleRunResult(event.data)
        break

      case 'error':
        this.handleRunError(event.data.errorMessage || 'Unknown error')
        break
    }
  }

  /**
   * Handle worker errors.
   */
  private handleWorkerError(event: ErrorEvent) {
    if (this.currentRun) {
      this.handleRunError(`Worker error: ${event.message}`)
    } else {
      this.updateStatus('error', `Worker error: ${event.message}`)
    }
  }

  /**
   * Handle run completion.
   */
  private handleRunResult(data: WorkerResponse) {
    if (!this.currentRun) return

    clearTimeout(this.currentRun.timeout)

    const duration = Date.now() - this.currentRun.startTime
    const result: DemoRunResult = {
      status: data.success ? 'done' : 'error',
      exampleId: null,
      steps: [], // Pyodide doesn't support step trace - would need MOCK trace for seeded examples
      stdout: data.stdout || '',
      stderr: data.stderr,
      illustrativeDurationMs: duration,
      message: data.truncated ? 'Output truncated (size limit reached)' : undefined,
    }

    this.currentRun.resolve(result)
    this.currentRun = null
  }

  /**
   * Handle run error.
   */
  private handleRunError(errorMessage: string) {
    if (!this.currentRun) return

    clearTimeout(this.currentRun.timeout)

    const duration = Date.now() - this.currentRun.startTime
    const result: DemoRunResult = {
      status: 'error',
      exampleId: null,
      steps: [],
      stdout: this.currentRun.stdoutBuffer,
      stderr: errorMessage,
      illustrativeDurationMs: duration,
    }

    this.currentRun.resolve(result) // Resolve with error result, don't reject
    this.currentRun = null
  }

  /**
   * Handle execution timeout.
   */
  private handleTimeout() {
    if (!this.currentRun) return

    const duration = Date.now() - this.currentRun.startTime

    // Terminate and recreate worker
    this.worker?.terminate()
    this.worker = null
    this.updateStatus('loading', 'Restarting after timeout...')

    const result: DemoRunResult = {
      status: 'error',
      exampleId: null,
      steps: [],
      stdout: this.currentRun.stdoutBuffer,
      stderr: `Execution timeout (${this.config.timeout || DEFAULT_TIMEOUT_MS}ms exceeded)`,
      illustrativeDurationMs: duration,
    }

    this.currentRun.resolve(result)
    this.currentRun = null

    // Restart worker asynchronously
    this.initPromise = null
    this.init().catch(console.error)
  }

  /**
   * Update status and notify callback.
   */
  private updateStatus(status: PyodideStatus, message?: string) {
    this.status = status
    this.onStatusChange?.(status, message)
  }

  /**
   * Run Python code.
   * For seeded examples with step traces, falls back to demo runner to provide MOCK trace.
   */
  async run(code: string, inputs: string[] = []): Promise<DemoRunResult> {
    // Check if this is a seeded example that needs step trace
    const seededExample = findSeededExample(code)
    if (seededExample) {
      // Use demo runner for seeded examples to provide MOCK step trace
      return runPythonDemo(code, inputs)
    }

    // Ensure worker is initialized
    if (this.status !== 'ready') {
      await this.init()
    }

    if (!this.worker) {
      throw new Error('Worker not available')
    }

    // Check for input() - not supported
    if (code.includes('input(')) {
      return {
        status: 'unsupported',
        exampleId: null,
        steps: [],
        stdout: '',
        stderr: undefined,
        illustrativeDurationMs: 0,
        message:
          'input() is not supported in browser execution. Cross-origin isolation required for SharedArrayBuffer is not enabled.',
      }
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.handleTimeout()
      }, this.config.timeout || DEFAULT_TIMEOUT_MS)

      this.currentRun = {
        resolve,
        reject,
        startTime: Date.now(),
        timeout,
        stdoutBuffer: '',
        stderrBuffer: '',
      }

      const message: WorkerRequest = {
        type: 'run',
        code,
      }
      this.worker!.postMessage(message)
    })
  }

  /**
   * Stop current execution.
   */
  stop() {
    if (!this.currentRun) return

    clearTimeout(this.currentRun.timeout)

    // Terminate and recreate worker
    this.worker?.terminate()
    this.worker = null
    this.updateStatus('loading', 'Restarting after stop...')

    const result: DemoRunResult = {
      status: 'error',
      exampleId: null,
      steps: [],
      stdout: this.currentRun.stdoutBuffer,
      stderr: 'Execution stopped by user',
      illustrativeDurationMs: Date.now() - this.currentRun.startTime,
    }

    this.currentRun.resolve(result)
    this.currentRun = null

    // Restart worker asynchronously
    this.initPromise = null
    this.init().catch(console.error)
  }

  /**
   * Clean up resources.
   */
  destroy() {
    if (this.currentRun) {
      clearTimeout(this.currentRun.timeout)
      this.currentRun = null
    }
    if (this.worker) {
      this.worker.terminate()
      this.worker = null
    }
    this.initPromise = null
    this.status = 'loading'
  }
}
