'use client'

import { BookmarkCheck, Braces, History, Laptop, MonitorSmartphone, Smartphone, Tablet, Terminal, X } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { OutputPreviewProps } from '@/types/book'
import type { CodeLab, OutputTab } from './use-code-lab'

const TABS: { id: OutputTab; label: string; icon: typeof Terminal }[] = [
  { id: 'output', label: 'Output', icon: Terminal },
  { id: 'variables', label: 'Variables', icon: Braces },
  { id: 'preview', label: 'Preview', icon: MonitorSmartphone },
]

const DEVICES = [
  { id: 'mobile', label: 'Mobile', icon: Smartphone, width: 360 },
  { id: 'tablet', label: 'Tablet', icon: Tablet, width: 640 },
  { id: 'desktop', label: 'Desktop', icon: Laptop, width: null },
] as const

type DeviceId = (typeof DEVICES)[number]['id']

const escapeHtml = (text: string) =>
  text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')

/** Fixed, author-seeded sample page. Never includes learner code or input. */
function samplePreviewDoc(title: string, expectedOutput: string) {
  const rows = expectedOutput
    .split('\n')
    .map((line) => `<li>${escapeHtml(line)}</li>`)
    .join('')
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
*{box-sizing:border-box}body{margin:0;font-family:Georgia,serif;background:#fffbeb;color:#292013;padding:20px}
.card{max-width:560px;margin:0 auto;background:#fff;border-radius:18px;padding:20px;box-shadow:0 12px 30px -18px rgb(41 32 19/.5);border:1px solid #f3e3bf}
.eyebrow{font:600 11px/1 ui-sans-serif,system-ui;letter-spacing:.14em;text-transform:uppercase;color:#c2410c;margin:0}
h1{font-size:22px;margin:8px 0 14px}ul{list-style:none;margin:0;padding:0}
li{font:13px/1.6 ui-monospace,Menlo,monospace;padding:8px 12px;border-radius:10px;background:#fef3c7;margin-top:6px;word-break:break-word}
p.note{font:12px/1.5 ui-sans-serif,system-ui;color:#6b5a3e;margin:14px 0 0}
</style></head><body><main class="card"><p class="eyebrow">Sample web view</p><h1>${escapeHtml(title)}</h1>
<ul>${rows}</ul><p class="note">How this program&rsquo;s printed lines could appear on a web page.</p></main></body></html>`
}

function EmptyNote({ children }: { children: React.ReactNode }) {
  return <p className="rounded-xl border border-dashed border-border px-3 py-4 text-center text-sm text-muted-foreground">{children}</p>
}

function OutputTabPanel({ lab }: { lab: CodeLab }) {
  const { state, stdout, stderr, message } = lab
  const result = state.result

  if (lab.streaming) return <EmptyNote>The narrator is writing the code. Output appears after it runs.</EmptyNote>
  if (message)
    return (
      <div role="alert" className="rounded-xl border border-book-amber/50 bg-book-marker/15 px-3 py-3 text-sm">
        <p className="font-semibold">Not a seeded example</p>
        <p className="mt-1 text-muted-foreground">{message} Reset to restore this page&apos;s code.</p>
      </div>
    )
  if (!result) return <EmptyNote>{state.stopped ? 'Run stopped. Press Run to start again.' : 'Press Run to see what this code prints.'}</EmptyNote>

  return (
    <div className="flex flex-col gap-2" aria-live="polite">
      <pre className="min-h-12 overflow-x-auto rounded-xl bg-muted px-3 py-2 font-mono text-[0.8125rem] leading-relaxed whitespace-pre">
        {stdout}
        {state.status === 'running' && (
          <span className="inline-block h-[1em] w-1.5 translate-y-0.5 animate-pulse bg-book-ink/60 motion-reduce:animate-none" aria-hidden="true" />
        )}
        {state.status === 'awaiting-input' && result.inputRequest?.prompt}
        {stderr && <span className="block text-red-700">{stderr}</span>}
      </pre>
      {state.status === 'awaiting-input' && (
        <p className="text-sm text-muted-foreground">
          Waiting for input — answer in the terminal under the code.
          {!state.terminalOpen && (
            <button type="button" onClick={lab.toggleTerminal} className="ml-1 font-medium text-book-deep underline underline-offset-2">
              Open terminal
            </button>
          )}
        </p>
      )}
      {state.narrated && state.inputs.length > 0 && (
        <p className="text-xs text-muted-foreground">Narration used sample answers: {state.inputs.join(', ')}.</p>
      )}
      {(state.status === 'done' || state.status === 'error') && (
        <p className="text-xs text-muted-foreground">
          Duration ~{result.illustrativeDurationMs} ms <span className="rounded bg-muted px-1">illustrative demo data</span>
        </p>
      )}
    </div>
  )
}

function VariablesTabPanel({ lab }: { lab: CodeLab }) {
  if (lab.variables.length === 0)
    return <EmptyNote>Run or step through the code to inspect its variables.</EmptyNote>

  return (
    <div className="flex flex-col gap-2">
      {lab.executingLine && (
        <p className="text-xs text-muted-foreground">
          After line {lab.executingLine} · step {lab.stepPosition.current} of {lab.stepPosition.total}
        </p>
      )}
      <table className="w-full overflow-hidden rounded-xl text-sm">
        <caption className="sr-only">Variables in scope</caption>
        <thead>
          <tr className="bg-muted text-left text-xs text-muted-foreground">
            <th scope="col" className="px-3 py-1.5 font-medium">Name</th>
            <th scope="col" className="px-3 py-1.5 font-medium">Type</th>
            <th scope="col" className="px-3 py-1.5 font-medium">Value</th>
          </tr>
        </thead>
        <tbody className="font-mono text-[0.8125rem]">
          {lab.variables.map((variable) => (
            <tr
              key={variable.name}
              className={cn('border-t border-border transition-colors', lab.changedVariable === variable.name && 'bg-book-marker/25')}
            >
              <th scope="row" className="px-3 py-1.5 text-left font-semibold">{variable.name}</th>
              <td className="px-3 py-1.5 text-book-deep">{variable.type}</td>
              <td className="px-3 py-1.5 break-all">{variable.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function PreviewTabPanel({ title, expectedOutput }: { title: string; expectedOutput: string }) {
  const [device, setDevice] = useState<DeviceId>('mobile')
  const width = DEVICES.find((entry) => entry.id === device)?.width ?? null

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">Fixed sample HTML · sandboxed, no scripts</p>
        <div role="radiogroup" aria-label="Preview device" className="flex rounded-full bg-muted p-0.5">
          {DEVICES.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={device === id}
              onClick={() => setDevice(id)}
              className={cn(
                'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                device === id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon className="size-3.5" aria-hidden="true" />
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="overflow-x-auto rounded-xl bg-muted p-2">
        <iframe
          title={`Sample web view for ${title}`}
          sandbox=""
          referrerPolicy="no-referrer"
          loading="lazy"
          srcDoc={samplePreviewDoc(title, expectedOutput)}
          className="mx-auto block h-64 rounded-lg border border-border bg-book-paper transition-[width] duration-300"
          style={{ width: width ?? '100%', maxWidth: width ? undefined : '100%' }}
        />
      </div>
    </div>
  )
}

function SavedCard({ lab }: { lab: CodeLab }) {
  const snapshot = lab.snapshot
  if (!snapshot) return null
  return (
    <div
      role="status"
      className="relative animate-in overflow-hidden rounded-2xl border border-book-amber/60 bg-book-marker/15 p-3 duration-500 fade-in slide-in-from-bottom-3 zoom-in-95 motion-reduce:animate-none"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <BookmarkCheck className="size-4 text-book-deep" aria-hidden="true" />
          Saved to this demo book
        </p>
        <button
          type="button"
          onClick={lab.dismissSaved}
          aria-label="Dismiss saved card"
          className="inline-flex size-6 items-center justify-center rounded-full text-muted-foreground hover:bg-card focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <X className="size-3.5" aria-hidden="true" />
        </button>
      </div>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <pre className="max-h-28 overflow-auto rounded-lg bg-[#1d160c] px-2.5 py-2 font-mono text-[0.75rem] text-[#fdf6e3]">{snapshot.code}</pre>
        <pre className="max-h-28 overflow-auto rounded-lg bg-card px-2.5 py-2 font-mono text-[0.75rem]">{snapshot.stdout || '(no output)'}</pre>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">Stored on this device only, per page.</p>
    </div>
  )
}

function LastSnapshot({ lab }: { lab: CodeLab }) {
  const snapshot = lab.snapshot
  if (!snapshot || lab.runActive || lab.streaming || snapshot.code === lab.state.code) return null
  const time = new Date(snapshot.savedAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
  return (
    <div className="flex items-center justify-between gap-2 rounded-xl bg-muted px-3 py-2 text-xs text-muted-foreground">
      <span className="flex items-center gap-1.5">
        <History className="size-3.5" aria-hidden="true" />
        Saved snapshot · {time}
      </span>
      <button
        type="button"
        onClick={() => lab.restore(snapshot.code)}
        className="font-medium text-book-deep underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        Restore code
      </button>
    </div>
  )
}

export function OutputPreview({ lab, title, expectedOutput }: OutputPreviewProps) {
  const active = lab.state.tab

  function onTabKey(event: React.KeyboardEvent, index: number) {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return
    const next = TABS[(index + (event.key === 'ArrowRight' ? 1 : TABS.length - 1)) % TABS.length]
    lab.setTab(next.id)
    document.getElementById(`output-tab-${next.id}`)?.focus()
  }

  return (
    <section aria-label="Program output" className="flex flex-col gap-3 rounded-3xl border bg-card p-4">
      <div role="tablist" aria-label="Output views" className="flex gap-1 rounded-full bg-muted p-1">
        {TABS.map(({ id, label, icon: Icon }, index) => (
          <button
            key={id}
            id={`output-tab-${id}`}
            type="button"
            role="tab"
            aria-selected={active === id}
            aria-controls="output-tabpanel"
            tabIndex={active === id ? 0 : -1}
            onClick={() => lab.setTab(id)}
            onKeyDown={(event) => onTabKey(event, index)}
            className={cn(
              'inline-flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
              active === id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon className="size-4" aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>

      <div id="output-tabpanel" role="tabpanel" aria-labelledby={`output-tab-${active}`} data-swipe-ignore>
        {active === 'output' && <OutputTabPanel lab={lab} />}
        {active === 'variables' && <VariablesTabPanel lab={lab} />}
        {active === 'preview' && <PreviewTabPanel title={title} expectedOutput={expectedOutput} />}
      </div>

      {lab.savedCardVisible ? <SavedCard lab={lab} /> : <LastSnapshot lab={lab} />}
    </section>
  )
}
