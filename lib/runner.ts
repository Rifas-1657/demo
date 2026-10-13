/**
 * Frontend-only Python *simulator* for the book demo.
 *
 * It never executes code: no eval, no `new Function`, no worker, no server.
 * Source is normalised and matched against a small table of seeded examples,
 * each of which replays a hand-written, deterministic trace. Anything else
 * returns the `unsupported` status.
 */

export const UNSUPPORTED_MESSAGE = 'This frontend demo only simulates the seeded examples.'

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

interface TraceOutcome {
  steps: DemoStep[]
  stderr?: string
  inputRequest?: DemoInputRequest
}

interface SeededExample {
  id: string
  source: string
  sampleInputs?: string[]
  trace: (inputs: string[]) => TraceOutcome
}

function createTrace() {
  const variables = new Map<string, DemoVariable>()
  const steps: DemoStep[] = []
  const snapshot = () => Array.from(variables.values())

  return {
    steps,
    assign(logicalLine: number, name: string, value: string, type: string) {
      variables.set(name, { name, value, type })
      steps.push({ logicalLine, variables: snapshot() })
    },
    print(logicalLine: number, text: string) {
      steps.push({ logicalLine, output: `${text}\n`, variables: snapshot() })
    },
    input(logicalLine: number, prompt: string, answer: string, name: string, value: string, type: string) {
      variables.set(name, { name, value, type })
      steps.push({ logicalLine, output: `${prompt}${answer}\n`, variables: snapshot() })
    },
  }
}

const traceback = (line: number, message: string) =>
  `Traceback (most recent call last):\n  File "main.py", line ${line}, in <module>\n${message}`

const pyRepr = (text: string) => `'${text.replaceAll('\\', '\\\\').replaceAll("'", "\\'")}'`

const SEEDED_EXAMPLES: SeededExample[] = [
  {
    id: 'variables-box',
    source: 'x = 10\nprint(x)\nprint(type(x))',
    trace: () => {
      const t = createTrace()
      t.assign(1, 'x', '10', 'int')
      t.print(2, '10')
      t.print(3, "<class 'int'>")
      return { steps: t.steps }
    },
  },
  {
    id: 'reassign-score',
    source: 'score = 10\nscore = score + 2\nprint(score)',
    trace: () => {
      const t = createTrace()
      t.assign(1, 'score', '10', 'int')
      t.assign(2, 'score', '12', 'int')
      t.print(3, '12')
      return { steps: t.steps }
    },
  },
  {
    id: 'data-types',
    source:
      'age = 21\nprice = 3.5\nname = "Priya"\nready = True\nscores = [90, 85, 77]\nprint(type(age), type(price))\nprint(type(name), type(ready))\nprint(type(scores))',
    trace: () => {
      const t = createTrace()
      t.assign(1, 'age', '21', 'int')
      t.assign(2, 'price', '3.5', 'float')
      t.assign(3, 'name', "'Priya'", 'str')
      t.assign(4, 'ready', 'True', 'bool')
      t.assign(5, 'scores', '[90, 85, 77]', 'list')
      t.print(6, "<class 'int'> <class 'float'>")
      t.print(7, "<class 'str'> <class 'bool'>")
      t.print(8, "<class 'list'>")
      return { steps: t.steps }
    },
  },
  {
    id: 'naming-rules',
    source: 'total_score = 42\n_hidden = "ok"\nplayer2 = "Arun"\nprint(total_score, player2)',
    trace: () => {
      const t = createTrace()
      t.assign(1, 'total_score', '42', 'int')
      t.assign(2, '_hidden', "'ok'", 'str')
      t.assign(3, 'player2', "'Arun'", 'str')
      t.print(4, '42 Arun')
      return { steps: t.steps }
    },
  },
  {
    id: 'input-print',
    source:
      'name = input("Your name? ")\nage = int(input("Your age? "))\nprint("Hi", name)\nprint("Next year you will be", age + 1)',
    sampleInputs: ['Priya', '21'],
    trace: (inputs) => {
      const t = createTrace()
      const name = inputs[0]
      if (name === undefined) return { steps: t.steps, inputRequest: { prompt: 'Your name? ', index: 0 } }
      t.input(1, 'Your name? ', name, 'name', pyRepr(name), 'str')

      const ageText = inputs[1]
      if (ageText === undefined) return { steps: t.steps, inputRequest: { prompt: 'Your age? ', index: 1 } }
      const trimmed = ageText.trim()
      if (!/^[+-]?\d+$/.test(trimmed)) {
        t.steps.push({ logicalLine: 2, output: `Your age? ${ageText}\n`, variables: t.steps.at(-1)?.variables ?? [] })
        return {
          steps: t.steps,
          stderr: traceback(2, `ValueError: invalid literal for int() with base 10: ${pyRepr(ageText)}`),
        }
      }
      const age = Number.parseInt(trimmed, 10)
      t.input(2, 'Your age? ', ageText, 'age', String(age), 'int')
      t.print(3, `Hi ${name}`)
      t.print(4, `Next year you will be ${age + 1}`)
      return { steps: t.steps }
    },
  },
  {
    id: 'bill-calculator',
    source: 'item = "Notebook"\nprice = 45.0\nquantity = 3\ntotal = price * quantity\nprint(item, "x", quantity, "=", total)',
    trace: () => {
      const t = createTrace()
      t.assign(1, 'item', "'Notebook'", 'str')
      t.assign(2, 'price', '45.0', 'float')
      t.assign(3, 'quantity', '3', 'int')
      t.assign(4, 'total', '135.0', 'float')
      t.print(5, 'Notebook x 3 = 135.0')
      return { steps: t.steps }
    },
  },
  {
    id: 'type-error',
    source: 'print("5" + 5)',
    trace: () => ({
      steps: [],
      stderr: traceback(1, 'TypeError: can only concatenate str (not "int") to str'),
    }),
  },
  {
    id: 'syntax-error-digit',
    source: '2player = "no"',
    trace: () => ({
      steps: [],
      stderr: '  File "main.py", line 1\n    2player = "no"\n    ^\nSyntaxError: invalid decimal literal',
    }),
  },
]

/** Lines that do something, so formatting and comments don't break matching. */
export function logicalLines(code: string): { text: string; physicalLine: number }[] {
  return code
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((text, index) => ({ text: text.trim(), physicalLine: index + 1 }))
    .filter((line) => line.text !== '' && !line.text.startsWith('#'))
}

function normaliseLine(line: string) {
  return line
    .replace(/\s+#[^"']*$/, '')
    .replace(/'/g, '"')
    .replace(/\s*([=+\-*/(),[\]])\s*/g, '$1')
    .replace(/\s+/g, ' ')
}

function normalise(code: string) {
  return logicalLines(code)
    .map((line) => normaliseLine(line.text))
    .join('\n')
}

const examplesByShape = new Map(SEEDED_EXAMPLES.map((example) => [normalise(example.source), example]))

export function findSeededExample(code: string) {
  return examplesByShape.get(normalise(code)) ?? null
}

/** Maps a trace's logical line back to the 1-based line number in `code`. */
export function physicalLineFor(code: string, logicalLine: number): number | null {
  return logicalLines(code)[logicalLine - 1]?.physicalLine ?? null
}

/**
 * Simulates running `code`. Deterministic: the same code and inputs always
 * give the same result. For input() examples, call again with one more answer
 * whenever the result is `awaiting-input`.
 */
export function runPythonDemo(code: string, inputs: string[] = []): DemoRunResult {
  const example = findSeededExample(code)
  if (!example) {
    return {
      status: 'unsupported',
      exampleId: null,
      steps: [],
      stdout: '',
      illustrativeDurationMs: 0,
      message: UNSUPPORTED_MESSAGE,
    }
  }

  const outcome = example.trace(inputs)
  const stdout = outcome.steps.map((step) => step.output ?? '').join('')
  const status: DemoRunStatus = outcome.stderr ? 'error' : outcome.inputRequest ? 'awaiting-input' : 'done'

  return {
    status,
    exampleId: example.id,
    steps: outcome.steps,
    stdout,
    stderr: outcome.stderr,
    inputRequest: outcome.inputRequest,
    sampleInputs: example.sampleInputs,
    illustrativeDurationMs: 8 + outcome.steps.length * 3 + stdout.length % 7,
  }
}
