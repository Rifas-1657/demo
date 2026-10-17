/**
 * Runner entry point - selects demo or Pyodide backend based on environment flag.
 * 
 * NEXT_PUBLIC_BOOKEY_RUNNER:
 * - "demo" (default): Uses simulated seeded examples only
 * - "pyodide": Uses real Pyodide execution in Web Worker
 */

export * from './types'
export * from './demo'
export { PyodideRunner } from './pyodide'

import type { DemoRunResult, RunnerBackend } from './types'
import { runPythonDemo, physicalLineFor, logicalLines, findSeededExample } from './demo'
import { PyodideRunner } from './pyodide'

/**
 * Get the configured runner backend from environment.
 */
export function getRunnerBackend(): RunnerBackend {
  const envValue = process.env.NEXT_PUBLIC_BOOKEY_RUNNER?.toLowerCase()
  if (envValue === 'pyodide') return 'pyodide'
  return 'demo'
}

/**
 * Create a runner instance based on configuration.
 */
export function createRunner(backend: RunnerBackend = getRunnerBackend()) {
  if (backend === 'pyodide') {
    return new PyodideRunner({
      timeout: 10000, // 10s
      maxOutputSize: 50000, // 50KB
    })
  }
  
  // Demo runner (stateless)
  return {
    getStatus: () => 'ready' as const,
    setStatusCallback: () => {},
    init: async () => {},
    run: (code: string, inputs: string[] = []) => Promise.resolve(runPythonDemo(code, inputs)),
    stop: () => {},
    destroy: () => {},
  }
}

/**
 * Singleton runner instance for the application.
 * Created lazily when first needed.
 */
let runnerInstance: ReturnType<typeof createRunner> | null = null

export function getRunner(): ReturnType<typeof createRunner> {
  if (!runnerInstance) {
    runnerInstance = createRunner()
  }
  return runnerInstance
}

/**
 * Reset the runner instance (useful for tests).
 */
export function resetRunner() {
  if (runnerInstance) {
    runnerInstance.destroy()
    runnerInstance = null
  }
}
