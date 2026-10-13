'use client'

import type { BeforeMount, OnMount } from '@monaco-editor/react'
import dynamic from 'next/dynamic'
import { useEffect, useRef, useState } from 'react'
import { codePalette, tokenClass, tokenizePythonLine } from '@/lib/python-highlight'
import { cn } from '@/lib/utils'

type MonacoEditorInstance = Parameters<OnMount>[0]
type MonacoNamespace = Parameters<OnMount>[1]
type EditorEngine = 'loading' | 'monaco' | 'plain'

const LINE_HEIGHT = 22
const MONACO_TIMEOUT_MS = 8000
const THEME = 'bookey-warm'

const MonacoEditor = dynamic(() => import('@monaco-editor/react').then((mod) => mod.default), {
  ssr: false,
  loading: () => <EditorSkeleton />,
})

interface CodeEditorProps {
  value: string
  onChange: (value: string) => void
  readOnly: boolean
  /** Line to emphasise (narration cue, step-through, or streaming caret). */
  activeLine: number | null
  /** Characters revealed by narration; `null` once streaming ends. */
  streamChars: number | null
  onSkipStream: () => void
}

function EditorSkeleton() {
  return (
    <div className="flex flex-col gap-2 px-4 py-3" role="status" aria-label="Loading code editor">
      {[70, 45, 85, 30].map((width, index) => (
        <div key={index} className="flex items-center gap-4">
          <span className="h-3 w-4 rounded bg-white/10" />
          <span className="h-3 animate-pulse rounded bg-white/10" style={{ width: `${width}%` }} />
        </div>
      ))}
    </div>
  )
}

function HighlightedLine({ line }: { line: string }) {
  if (!line) return <>{' '}</>
  return (
    <>
      {tokenizePythonLine(line).map((token, index) => (
        <span key={index} className={tokenClass[token.kind]}>
          {token.text}
        </span>
      ))}
    </>
  )
}

function Gutter({ count, activeLine }: { count: number; activeLine: number | null }) {
  return (
    <div aria-hidden="true" className="shrink-0 py-3 pr-3 pl-4 text-right select-none">
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          style={{ height: LINE_HEIGHT }}
          className={cn('tabular-nums', activeLine === index + 1 ? 'text-book-marker' : 'text-[#8a7756]')}
        >
          {index + 1}
        </div>
      ))}
    </div>
  )
}

/** Narrated reveal: read-only, character-by-character, with a caret on the active line. */
function StreamingCode({ source, chars, onSkip }: { source: string; chars: number; onSkip: () => void }) {
  const revealed = source.slice(0, chars)
  const lines = revealed.split('\n')
  const totalLines = source.split('\n').length

  return (
    <div className="relative">
      <p className="sr-only" role="status">
        The narrator is revealing the example code. Editing and copying unlock when it finishes.
      </p>
      <div
        aria-hidden="true"
        className="flex overflow-x-auto font-mono text-[0.8125rem] select-none"
        onCopy={(event) => event.preventDefault()}
        onCut={(event) => event.preventDefault()}
        style={{ minHeight: totalLines * LINE_HEIGHT + 24 }}
      >
        <Gutter count={lines.length} activeLine={lines.length} />
        <pre className="min-w-0 flex-1 py-3 pr-4">
          {lines.map((line, index) => {
            const isLast = index === lines.length - 1
            return (
              <div
                key={index}
                style={{ height: LINE_HEIGHT, lineHeight: `${LINE_HEIGHT}px` }}
                className={cn('-ml-1 rounded-sm pl-1 whitespace-pre', isLast && 'bg-[#3a2b14]')}
              >
                <HighlightedLine line={line} />
                {isLast && (
                  <span className="ml-px inline-block h-[1.05em] w-[2px] translate-y-[2px] animate-pulse bg-book-marker motion-reduce:animate-none" />
                )}
              </div>
            )
          })}
        </pre>
      </div>
      <button
        type="button"
        onClick={onSkip}
        className="absolute right-3 bottom-2 rounded-full border border-white/15 bg-[#271d10] px-3 py-1 text-xs text-[#e9d9b5] transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-book-marker focus-visible:outline-none"
      >
        Skip reveal
      </button>
    </div>
  )
}

/** Textarea fallback layered over highlighted code, used when Monaco can't load or the reader prefers it. */
function PlainEditor({ value, onChange, readOnly, activeLine }: Omit<CodeEditorProps, 'streamChars' | 'onSkipStream'>) {
  const overlayRef = useRef<HTMLPreElement>(null)
  const gutterRef = useRef<HTMLDivElement>(null)
  const [caretLine, setCaretLine] = useState<number | null>(null)
  const lines = value.split('\n')
  const highlighted = activeLine ?? caretLine

  function syncCaret(target: HTMLTextAreaElement) {
    setCaretLine(target.value.slice(0, target.selectionStart).split('\n').length)
  }

  return (
    <div className="flex font-mono text-[0.8125rem]" style={{ height: Math.min(14, Math.max(5, lines.length + 1)) * LINE_HEIGHT + 24 }}>
      <div ref={gutterRef} className="overflow-hidden">
        <Gutter count={lines.length} activeLine={highlighted} />
      </div>
      <div className="relative min-w-0 flex-1">
        <pre
          ref={overlayRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 overflow-hidden py-3 pr-4"
        >
          {lines.map((line, index) => (
            <div
              key={index}
              style={{ height: LINE_HEIGHT, lineHeight: `${LINE_HEIGHT}px` }}
              className={cn('-ml-1 pl-1 whitespace-pre', highlighted === index + 1 && 'bg-[#3a2b14]')}
            >
              <HighlightedLine line={line} />
            </div>
          ))}
        </pre>
        <label htmlFor="code-plain-editor" className="sr-only">
          Python code editor
        </label>
        <textarea
          id="code-plain-editor"
          value={value}
          readOnly={readOnly}
          aria-readonly={readOnly}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          wrap="off"
          onChange={(event) => {
            onChange(event.target.value)
            syncCaret(event.target)
          }}
          onSelect={(event) => syncCaret(event.currentTarget)}
          onBlur={() => setCaretLine(null)}
          onScroll={(event) => {
            const { scrollTop, scrollLeft } = event.currentTarget
            if (overlayRef.current) {
              overlayRef.current.scrollTop = scrollTop
              overlayRef.current.scrollLeft = scrollLeft
            }
            if (gutterRef.current) gutterRef.current.scrollTop = scrollTop
          }}
          style={{ lineHeight: `${LINE_HEIGHT}px` }}
          className="absolute inset-0 resize-none overflow-auto bg-transparent py-3 pr-4 text-transparent caret-book-marker outline-none selection:bg-[#5c4520] selection:text-transparent focus-visible:ring-2 focus-visible:ring-book-marker focus-visible:ring-inset"
        />
      </div>
    </div>
  )
}

const defineTheme: BeforeMount = (monaco) => {
  monaco.editor.defineTheme(THEME, {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'keyword', foreground: codePalette.keyword.slice(1), fontStyle: 'bold' },
      { token: 'string', foreground: codePalette.string.slice(1) },
      { token: 'number', foreground: codePalette.number.slice(1) },
      { token: 'comment', foreground: codePalette.comment.slice(1), fontStyle: 'italic' },
      { token: 'identifier', foreground: codePalette.foreground.slice(1) },
    ],
    colors: {
      'editor.background': codePalette.background,
      'editor.foreground': codePalette.foreground,
      'editorLineNumber.foreground': codePalette.gutter,
      'editorLineNumber.activeForeground': '#facc15',
      'editor.lineHighlightBackground': codePalette.activeLine,
      'editor.lineHighlightBorder': '#00000000',
      'editor.selectionBackground': codePalette.selection,
      'editorCursor.foreground': '#facc15',
      'editorGutter.background': codePalette.background,
      'scrollbarSlider.background': '#ffffff1a',
    },
  })
}

function MonacoPane({ value, onChange, readOnly, activeLine }: Omit<CodeEditorProps, 'streamChars' | 'onSkipStream'>) {
  const editorRef = useRef<MonacoEditorInstance | null>(null)
  const monacoRef = useRef<MonacoNamespace | null>(null)
  const decorationsRef = useRef<ReturnType<MonacoEditorInstance['createDecorationsCollection']> | null>(null)
  const [mounted, setMounted] = useState(false)
  const lineCount = value.split('\n').length

  useEffect(() => {
    const editor = editorRef.current
    const monaco = monacoRef.current
    if (!mounted || !editor || !monaco) return
    decorationsRef.current?.clear()
    if (activeLine === null) return
    decorationsRef.current = editor.createDecorationsCollection([
      {
        range: new monaco.Range(activeLine, 1, activeLine, 1),
        options: { isWholeLine: true, className: 'bookey-exec-line', linesDecorationsClassName: 'bookey-exec-gutter' },
      },
    ])
    editor.revealLineInCenterIfOutsideViewport(activeLine)
  }, [activeLine, mounted])

  return (
    <MonacoEditor
      height={Math.min(14, Math.max(5, lineCount + 1)) * LINE_HEIGHT + 24}
      language="python"
      theme={THEME}
      value={value}
      beforeMount={defineTheme}
      onMount={(editor, monaco) => {
        editorRef.current = editor
        monacoRef.current = monaco
        setMounted(true)
      }}
      onChange={(next) => onChange(next ?? '')}
      loading={<EditorSkeleton />}
      options={{
        readOnly,
        readOnlyMessage: { value: 'Editing unlocks when the run stops.' },
        ariaLabel: 'Python code editor. Press Control+M to toggle whether Tab moves focus.',
        minimap: { enabled: false },
        fontSize: 13,
        lineHeight: LINE_HEIGHT,
        fontFamily: 'var(--font-mono), ui-monospace, SFMono-Regular, Menlo, monospace',
        scrollBeyondLastLine: false,
        renderLineHighlight: 'all',
        padding: { top: 12, bottom: 12 },
        lineNumbersMinChars: 3,
        glyphMargin: false,
        folding: false,
        automaticLayout: true,
        tabSize: 4,
        overviewRulerLanes: 0,
        hideCursorInOverviewRuler: true,
        scrollbar: { alwaysConsumeMouseWheel: false, verticalScrollbarSize: 8, horizontalScrollbarSize: 8 },
        accessibilitySupport: 'auto',
      }}
    />
  )
}

/**
 * Monaco is fetched lazily on the client; if it can't load in time (offline,
 * blocked CDN) the plain editor takes over. Readers can also opt into it.
 */
export function CodeEditor(props: CodeEditorProps) {
  const [engine, setEngine] = useState<EditorEngine>('loading')
  const [preferPlain, setPreferPlain] = useState(false)

  useEffect(() => {
    let settled = false
    const timeout = window.setTimeout(() => {
      if (!settled) setEngine('plain')
    }, MONACO_TIMEOUT_MS)
    import('@/lib/monaco-setup')
      .then(({ configureLocalMonaco }) => configureLocalMonaco())
      .then(() => import('@monaco-editor/react'))
      .then(({ loader }) => loader.init())
      .then(() => {
        settled = true
        setEngine((current) => (current === 'loading' ? 'monaco' : current))
      })
      .catch(() => {
        settled = true
        setEngine('plain')
      })
    return () => window.clearTimeout(timeout)
  }, [])

  const editorProps = { value: props.value, onChange: props.onChange, readOnly: props.readOnly, activeLine: props.activeLine }

  return (
    <div data-swipe-ignore>
      {props.streamChars !== null ? (
        <StreamingCode source={props.value} chars={props.streamChars} onSkip={props.onSkipStream} />
      ) : engine === 'loading' && !preferPlain ? (
        <EditorSkeleton />
      ) : engine === 'monaco' && !preferPlain ? (
        <MonacoPane {...editorProps} />
      ) : (
        <PlainEditor {...editorProps} />
      )}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 px-4 py-1.5 text-[0.6875rem] text-[#a8956f]">
        <span>
          {engine === 'plain' && !preferPlain
            ? 'Rich editor unavailable — using the simple editor.'
            : props.readOnly && props.streamChars === null
              ? 'Read-only while the demo runs.'
              : 'Python · simulated demo runner'}
        </span>
        {engine === 'monaco' && (
          <button
            type="button"
            aria-pressed={preferPlain}
            onClick={() => setPreferPlain((value) => !value)}
            className="rounded-full px-2 py-0.5 underline-offset-2 hover:text-[#fdf6e3] hover:underline focus-visible:ring-2 focus-visible:ring-book-marker focus-visible:outline-none"
          >
            {preferPlain ? 'Use rich editor' : 'Use simple editor'}
          </button>
        )}
      </div>
    </div>
  )
}
