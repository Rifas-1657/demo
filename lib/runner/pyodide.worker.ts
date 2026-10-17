/**
 * Pyodide Web Worker
 * 
 * Loads Pyodide 0.26.4 (Python 3.12) from CDN and executes Python code in isolation.
 * Streams stdout/stderr, handles timeouts with worker termination, cleans tracebacks.
 * 
 * CDN: https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js
 * Version: 0.26.4 (latest stable as of Nov 2024)
 * Self-host option: Download from https://github.com/pyodide/pyodide/releases/tag/0.26.4
 */

/// <reference lib="webworker" />

declare const self: DedicatedWorkerGlobalScope

export interface WorkerRequest {
  type: 'init' | 'run' | 'stop'
  code?: string
  timeout?: number
  maxOutputSize?: number
}

export interface WorkerResponse {
  type: 'status' | 'output' | 'result' | 'error'
  status?: 'loading' | 'ready' | 'error'
  message?: string
  stdout?: string
  stderr?: string
  success?: boolean
  truncated?: boolean
  errorMessage?: string
}

const PYODIDE_VERSION = '0.26.4'
const PYODIDE_CDN = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/pyodide.js`

let pyodide: any = null
let outputBuffer: string[] = []
let errorBuffer: string[] = []
let outputSize = 0
let maxOutputSize = 50000 // 50KB default

/**
 * Clean Python traceback by removing internal Pyodide frames.
 * Keeps only frames from user code (main.py).
 */
function cleanTraceback(stderr: string): string {
  const lines = stderr.split('\n')
  const cleaned: string[] = []
  let inTraceback = false
  let keepNextLine = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    if (line.startsWith('Traceback (most recent call last):')) {
      inTraceback = true
      cleaned.push(line)
      continue
    }

    if (inTraceback) {
      // Keep lines that reference user code (main.py)
      if (line.includes('File "<exec>"') || line.includes('File "main.py"')) {
        // Replace <exec> with main.py for consistency
        cleaned.push(line.replace('<exec>', 'main.py'))
        keepNextLine = true
      } else if (keepNextLine && (line.startsWith('    ') || line.startsWith('  '))) {
        // Keep the actual error line (indented code)
        cleaned.push(line)
        keepNextLine = false
      } else if (!line.startsWith('  File ')) {
        // Keep error message lines (not internal File references)
        cleaned.push(line)
      }
    } else {
      // Not in traceback, keep as-is
      cleaned.push(line)
    }
  }

  return cleaned.join('\n')
}

/**
 * Redirect stdout/stderr to buffers with size limit.
 */
function setupIO() {
  outputBuffer = []
  errorBuffer = []
  outputSize = 0

  if (!pyodide) return

  pyodide.setStdout({
    batched: (text: string) => {
      if (outputSize < maxOutputSize) {
        const chunk = text.slice(0, maxOutputSize - outputSize)
        outputBuffer.push(chunk)
        outputSize += chunk.length

        self.postMessage({
          type: 'output',
          stdout: chunk,
        } as WorkerResponse)
      }
    },
  })

  pyodide.setStderr({
    batched: (text: string) => {
      if (outputSize < maxOutputSize) {
        const chunk = text.slice(0, maxOutputSize - outputSize)
        errorBuffer.push(chunk)
        outputSize += chunk.length

        self.postMessage({
          type: 'output',
          stderr: chunk,
        } as WorkerResponse)
      }
    },
  })
}

/**
 * Initialize Pyodide from CDN.
 */
async function initPyodide() {
  try {
    self.postMessage({
      type: 'status',
      status: 'loading',
      message: 'Loading Pyodide...',
    } as WorkerResponse)

    // Load Pyodide from CDN
    importScripts(PYODIDE_CDN)

    // @ts-ignore - loadPyodide is loaded via importScripts
    pyodide = await loadPyodide({
      indexURL: `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`,
    })

    // Disable micropip and package installation for safety
    await pyodide.runPythonAsync(`
import sys

# Block micropip imports
class MicropipBlocker:
    def find_module(self, name, path=None):
        if name == 'micropip':
            raise ImportError('Package installation is disabled for security')
        return None

sys.meta_path.insert(0, MicropipBlocker())
`)

    setupIO()

    self.postMessage({
      type: 'status',
      status: 'ready',
      message: 'Pyodide ready',
    } as WorkerResponse)
  } catch (error: any) {
    self.postMessage({
      type: 'status',
      status: 'error',
      message: `Failed to load Pyodide: ${error.message}`,
    } as WorkerResponse)
  }
}

/**
 * Execute Python code with timeout handled externally.
 */
async function runCode(code: string) {
  if (!pyodide) {
    self.postMessage({
      type: 'error',
      errorMessage: 'Pyodide not initialized',
    } as WorkerResponse)
    return
  }

  try {
    // Reset IO buffers
    setupIO()

    // Run the code
    await pyodide.runPythonAsync(code)

    // Successful execution
    const stdout = outputBuffer.join('')
    const stderr = errorBuffer.join('')

    self.postMessage({
      type: 'result',
      success: true,
      stdout,
      stderr: stderr || undefined,
      truncated: outputSize >= maxOutputSize,
    } as WorkerResponse)
  } catch (error: any) {
    // Python execution error
    const stdout = outputBuffer.join('')
    let stderr = errorBuffer.join('')

    // If no stderr captured but we have an error, format it
    if (!stderr && error.message) {
      stderr = error.message
    }

    // Clean the traceback
    stderr = cleanTraceback(stderr)

    self.postMessage({
      type: 'result',
      success: false,
      stdout,
      stderr,
      truncated: outputSize >= maxOutputSize,
    } as WorkerResponse)
  }
}

// Message handler
self.addEventListener('message', async (event: MessageEvent<WorkerRequest>) => {
  const { type, code, timeout, maxOutputSize: maxSize } = event.data

  switch (type) {
    case 'init':
      if (maxSize) maxOutputSize = maxSize
      await initPyodide()
      break

    case 'run':
      if (code !== undefined) {
        await runCode(code)
      }
      break

    case 'stop':
      // Worker will be terminated externally
      break
  }
})
