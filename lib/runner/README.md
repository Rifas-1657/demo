# Bookey Python Runner

Real in-browser Python execution for the reader's code lab using Pyodide.

## Overview

The runner system supports two backends:

1. **Demo Mode** (default): Simulated execution with seeded examples only
2. **Pyodide Mode**: Real Python 3.12 execution in Web Worker

Switch between modes using the `NEXT_PUBLIC_BOOKEY_RUNNER` environment variable.

## Configuration

Add to `.env.local`:

```bash
# Python runner: demo (default) | pyodide
NEXT_PUBLIC_BOOKEY_RUNNER=demo
```

- **`demo`** (default): Uses pre-recorded traces for seeded examples. Safe, fast, no external dependencies.
- **`pyodide`**: Loads Pyodide 0.26.4 from CDN and executes Python code in the browser.

## Architecture

```
lib/runner/
├── types.ts          # Shared types (DemoRunResult, DemoVariable, etc.)
├── demo.ts           # Demo runner (seeded examples with hand-written traces)
├── pyodide.ts        # PyodideRunner class (manages worker lifecycle)
├── pyodide.worker.ts # Web Worker (loads Pyodide, executes code)
├── index.ts          # Runtime backend selection
└── README.md         # This file
```

Integration: `components/book/use-code-lab.ts` checks the backend flag and routes execution accordingly.

## Features (Pyodide Mode)

### ✅ REAL (Tested)

Features verified by `e2e/pyodide-runner.spec.mjs`:

- **Print output**: `print()` statements appear in the terminal
- **Loops**: `for`, `while` loops execute correctly
- **Errors**: Clean Python tracebacks (internal Pyodide frames stripped)
- **Timeout**: Infinite loops terminated after 10s, worker recreated
- **Output cap**: Large outputs truncated at 50KB
- **Stop button**: Interrupts execution and restarts worker
- **State reset**: Clean state between runs
- **Seeded examples**: Backward compatible with demo mode traces

### 🔒 Safety (Implemented)

- **Web Worker**: Runs in isolated worker thread, never blocks main thread
- **Browser sandbox**: Executes in learner's browser only, no backend execution
- **No package installs**: `micropip` disabled via `MicropipBlocker` in `sys.meta_path`
- **Stdlib only**: Only Python standard library available
- **Timeout**: Hard 10-second limit with worker termination
- **Output limit**: 50KB cap to prevent memory issues

### ⚠️ Limitations (Documented)

1. **input() NOT supported**
   - Requires `SharedArrayBuffer` and `Atomics` for blocking reads
   - Needs cross-origin isolation (`Cross-Origin-Opener-Policy` + `Cross-Origin-Embedder-Policy`)
   - Would break Monaco editor, 3D scenes, and third-party assets
   - Returns clear error message: "input() is not supported in browser execution"

2. **No package installation**
   - `micropip.install()` blocked for security
   - `import requests`, `import numpy`, etc. will fail
   - Only Python standard library available

3. **Network access**
   - `urllib`, `http.client` may work (browser fetch restrictions apply)
   - Cannot restrict fully without breaking Pyodide itself
   - Learner code runs in browser sandbox (cannot access backend or localhost)

4. **Step trace is MOCK**
   - Variables inspector shows step-by-step execution
   - **ONLY works for seeded examples** (uses demo runner traces)
   - Non-seeded code returns empty `steps[]` array
   - Real step tracing would require Python AST instrumentation (out of scope)

### 📦 Pyodide Version

- **Version**: 0.26.4 (latest stable as of November 2024)
- **Python**: 3.12.1
- **Source**: CDN (`https://cdn.jsdelivr.net/pyodide/v0.26.4/full/`)
- **Load strategy**: Lazy (only when code lab opens)
- **Self-host option**: Download from https://github.com/pyodide/pyodide/releases/tag/0.26.4 and serve locally

To self-host:
1. Download release from GitHub
2. Place in `public/pyodide/`
3. Update `PYODIDE_CDN` in `pyodide.worker.ts` to `/pyodide/pyodide.js`
4. Update `indexURL` to `/pyodide/`

## Testing

### E2E Tests

Run the comprehensive test suite:

```bash
# Both modes (demo + pyodide)
node e2e/pyodide-runner.spec.mjs

# Demo mode only
node e2e/pyodide-runner.spec.mjs --mode=demo

# Pyodide mode only
node e2e/pyodide-runner.spec.mjs --mode=pyodide
```

**Prerequisites**:
- Frontend running at `http://localhost:4100`
- For pyodide tests: Set `NEXT_PUBLIC_BOOKEY_RUNNER=pyodide` in `.env.local` and restart dev server

**Tests**:
1. Print output appears in terminal
2. Variables panel (MOCK trace for seeded examples)
3. Loop execution completes
4. Error with clean traceback (no internal frames)
5. Infinite loop timeout + worker recovery
6. Huge output capped at 50KB
7. Stop button interrupts execution
8. Run twice (state reset between runs)
9. Seeded examples produce expected outputs
10. Flag off keeps demo behavior

### Build Verification

```bash
pnpm tsc --noEmit  # TypeScript check
pnpm run build     # Production build
```

## Usage Examples

### Simple Print

```python
print("Hello from Bookey!")
# Output: Hello from Bookey!
```

### Loop

```python
for i in range(5):
    print(i)
# Output: 0 1 2 3 4 (each on new line)
```

### Error Handling

```python
x = 5 / 0
# Output:
# Traceback (most recent call last):
#   File "main.py", line 1, in <module>
# ZeroDivisionError: division by zero
```

### Variables (MOCK - seeded examples only)

```python
x = 10
print(x)
# Variables panel shows: x = 10 (int)
# Works ONLY because this matches a seeded example
```

### Unsupported: input()

```python
name = input("Your name? ")
# Error: input() is not supported in browser execution.
# Cross-origin isolation required for SharedArrayBuffer is not enabled.
```

## API Reference

### PyodideRunner

```typescript
class PyodideRunner {
  constructor(config?: { timeout?: number; maxOutputSize?: number })
  
  // Lifecycle
  async init(): Promise<void>
  destroy(): void
  
  // Status (for UI chips)
  getStatus(): 'loading' | 'ready' | 'error'
  setStatusCallback(callback: (status: PyodideStatus, message?: string) => void): void
  
  // Execution
  async run(code: string, inputs?: string[]): Promise<DemoRunResult>
  stop(): void  // Interrupt and restart worker
}
```

### DemoRunResult

```typescript
interface DemoRunResult {
  status: 'done' | 'error' | 'awaiting-input' | 'unsupported'
  exampleId: string | null  // Seeded example ID if matched
  steps: DemoStep[]  // MOCK: only populated for seeded examples
  stdout: string
  stderr?: string
  illustrativeDurationMs: number
  message?: string  // Error or unsupported message
}
```

## Troubleshooting

### "Pyodide not initialized"

Worker failed to load. Check:
- Network connection (CDN access)
- Browser console for errors
- Try reloading the page

### "Execution timeout"

Code ran longer than 10 seconds. The worker will automatically restart.
- Infinite loops trigger timeout
- Large computations may need optimization

### "Output truncated"

Output exceeded 50KB limit. This is by design to prevent memory issues.

### input() not working

`input()` requires cross-origin isolation which would break other features.
This is a known limitation documented above.

### Variables panel empty for my code

Step trace is **MOCK** and only works for the pre-seeded examples.
For arbitrary code, the variables panel will show empty.
Real step tracing requires AST instrumentation (out of scope).

## Development

### Adding a New Seeded Example

Edit `lib/runner/demo.ts`:

```typescript
{
  id: 'my-example',
  source: 'x = 42\nprint(x)',
  trace: () => {
    const t = createTrace()
    t.assign(1, 'x', '42', 'int')
    t.print(2, '42')
    return { steps: t.steps }
  },
}
```

The normalizer strips whitespace and comments, so formatting doesn't matter.

### Modifying Timeout

Change `DEFAULT_TIMEOUT_MS` in `lib/runner/pyodide.ts` (default: 10000ms).

### Modifying Output Cap

Change `MAX_OUTPUT_SIZE` in `lib/runner/pyodide.ts` (default: 50000 bytes).

## Security Considerations

1. **Runs in learner's browser**: Cannot access backend, database, or other users' data
2. **Sandbox isolation**: Web Worker + browser sandbox provide isolation
3. **No package installs**: Malicious packages cannot be installed
4. **Network restrictions**: Browser fetch policies apply (CORS, mixed content)
5. **Output limits**: Prevents memory exhaustion attacks
6. **Timeout**: Prevents CPU exhaustion attacks

However, note:
- Learner can still run any Python code that doesn't require external packages
- Code could theoretically attempt requests to external URLs (browser CORS applies)
- This is for educational use - not suitable for untrusted code execution in production

## Future Enhancements (Not Implemented)

- [ ] Real step trace using AST instrumentation
- [ ] input() support with cross-origin isolation (needs architecture changes)
- [ ] Allow-listed packages (numpy, pandas) via CDN
- [ ] File system API for multi-file programs
- [ ] Graphics output (matplotlib, turtle)
- [ ] Debugger breakpoints

## References

- Pyodide: https://pyodide.org/
- Pyodide 0.26.4 Release: https://github.com/pyodide/pyodide/releases/tag/0.26.4
- Web Workers: https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API
- SharedArrayBuffer: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/SharedArrayBuffer
