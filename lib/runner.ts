/**
 * Legacy runner.ts - Re-exports from lib/runner/ for backward compatibility.
 * 
 * All runner logic moved to lib/runner/:
 * - types.ts: Shared types
 * - demo.ts: Simulated seeded examples
 * - pyodide.ts: Real Pyodide execution
 * - index.ts: Runtime selection based on NEXT_PUBLIC_BOOKEY_RUNNER
 */

export * from './runner/types'
export * from './runner/demo'
export type { PyodideRunner } from './runner/pyodide'
export { getRunner, createRunner, getRunnerBackend, resetRunner } from './runner/index'
