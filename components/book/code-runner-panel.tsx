'use client'

import { Check, Copy, Footprints, Play, RotateCcw, Square, SquareTerminal } from 'lucide-react'
import { useState } from 'react'
import { BookeyButton } from '@/components/ui-kit/bookey-button'
import { cn } from '@/lib/utils'
import type { CodeRunnerPanelProps } from '@/types/book'
import { CodeEditor } from './code-editor'
import { RunStatusChip } from './run-status-chip'
import type { CodeLab } from './use-code-lab'

const iconButton =
  'inline-flex size-8 items-center justify-center rounded-full text-[#e9d9b5] transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-book-marker focus-visible:outline-none disabled:pointer-events-none disabled:opacity-40'

function TerminalInput({ lab }: { lab: CodeLab }) {
  const [value, setValue] = useState('')
  const prompt = lab.state.result?.inputRequest?.prompt ?? ''

  return (
    <form
      className="flex items-center gap-2"
      onSubmit={(event) => {
        event.preventDefault()
        lab.submitInput(value)
        setValue('')
      }}
    >
      <label htmlFor="terminal-input" className="shrink-0 text-[#fdf6e3]">
        {prompt}
      </label>
      <input
        id="terminal-input"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && (event.nativeEvent.isComposing || event.keyCode === 229)) event.preventDefault()
        }}
        autoComplete="off"
        spellCheck={false}
        placeholder="Type and press Enter"
        className="min-w-0 flex-1 rounded-md border border-white/15 bg-white/5 px-2 py-1 text-[#fdf6e3] placeholder:text-[#8a7756] focus-visible:border-book-marker focus-visible:outline-none"
      />
      <button
        type="submit"
        className="rounded-full bg-book-marker px-3 py-1 text-xs font-semibold text-[#1d160c] hover:bg-book-amber focus-visible:ring-2 focus-visible:ring-book-marker focus-visible:ring-offset-2 focus-visible:ring-offset-[#1d160c] focus-visible:outline-none"
      >
        Send
      </button>
    </form>
  )
}

function Terminal({ lab }: { lab: CodeLab }) {
  const { state, stdout, stderr, message } = lab
  const empty = !stdout && !stderr && !message && state.status !== 'awaiting-input'

  return (
    <div
      id="code-terminal"
      className="border-t border-white/10 bg-[#140f07] px-4 py-3 font-mono text-[0.8125rem] leading-relaxed"
    >
      <p className="mb-1 text-[0.6875rem] tracking-wider text-[#8a7756] uppercase">Terminal · simulated</p>
      <div aria-live="polite" className="max-h-48 overflow-y-auto">
        {empty ? (
          <p className="text-[#8a7756]">{state.stopped ? 'Run stopped.' : '$ press Run to start'}</p>
        ) : (
          <>
            {stdout && <pre className="whitespace-pre-wrap text-[#fdf6e3]">{stdout}</pre>}
            {stderr && <pre className="whitespace-pre-wrap text-[#fca5a5]">{stderr}</pre>}
            {message && <p className="text-[#fcd34d]">{message}</p>}
          </>
        )}
      </div>
      {state.status === 'awaiting-input' && (
        <div className="mt-2">
          <TerminalInput key={state.inputs.length} lab={lab} />
        </div>
      )}
    </div>
  )
}

export function CodeRunnerPanel({ example, lab, focusLine = null }: CodeRunnerPanelProps) {
  const [copied, setCopied] = useState(false)
  const { state, streaming, runActive } = lab
  const stepping = state.mode === 'step' && state.status === 'running'
  const locked = streaming || runActive
  const activeLine = streaming ? lab.streamLine : (lab.executingLine ?? (runActive ? null : focusLine))

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(state.code)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard can be blocked; the code stays selectable */
    }
  }

  return (
    <section
      aria-label="Code example"
      aria-busy={streaming}
      className="overflow-hidden rounded-3xl border border-[#3b2c17] bg-[#1d160c] text-[#fdf6e3]"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-3 py-2 sm:px-4">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs tracking-wide text-[#e9d9b5] uppercase">{example.language}</span>
          <RunStatusChip status={state.status} streaming={streaming} />
          {stepping && (
            <span className="font-mono text-[0.6875rem] text-[#a8956f]">
              step {lab.stepPosition.current}/{lab.stepPosition.total}
            </span>
          )}
        </div>
        <div className="flex items-center gap-0.5" role="toolbar" aria-label="Code runner controls">
          <button
            type="button"
            onClick={handleCopy}
            disabled={streaming}
            className={iconButton}
            aria-label={copied ? 'Copied' : 'Copy code'}
          >
            {copied ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
          </button>
          <button
            type="button"
            onClick={lab.toggleTerminal}
            className={cn(iconButton, state.terminalOpen && 'bg-white/10 text-book-marker')}
            aria-label="Terminal"
            aria-pressed={state.terminalOpen}
            aria-controls="code-terminal"
          >
            <SquareTerminal className="size-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={lab.reset}
            disabled={streaming || (!lab.edited && state.status === 'ready' && !state.stopped)}
            className={iconButton}
            aria-label="Reset code and output"
          >
            <RotateCcw className="size-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={lab.step}
            disabled={streaming || state.status === 'awaiting-input' || (runActive && state.mode === 'run')}
            className={iconButton}
            aria-label={stepping ? 'Next step' : 'Step through'}
          >
            <Footprints className="size-4" aria-hidden="true" />
          </button>
          {runActive ? (
            <BookeyButton
              size="sm"
              className="ml-1 h-8 bg-[#fca5a5] px-3 text-[#1d160c] shadow-none hover:bg-[#f87171]"
              onClick={lab.stop}
            >
              <Square aria-hidden="true" className="fill-current" />
              Stop
            </BookeyButton>
          ) : (
            <BookeyButton
              size="sm"
              className="ml-1 h-8 bg-book-orange px-3 text-[#1d160c] shadow-none hover:bg-book-marker"
              onClick={() => lab.run()}
              disabled={streaming}
            >
              <Play aria-hidden="true" className="fill-current" />
              Run
            </BookeyButton>
          )}
        </div>
      </div>

      <CodeEditor
        value={state.code}
        onChange={lab.edit}
        readOnly={locked}
        activeLine={activeLine}
        streamChars={state.streamChars}
        onSkipStream={lab.finishStream}
      />

      {state.terminalOpen && <Terminal lab={lab} />}
    </section>
  )
}
