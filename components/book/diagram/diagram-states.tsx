'use client'

import { Shapes, TriangleAlert } from 'lucide-react'
import { Component, type ReactNode } from 'react'
import type { DiagramNode } from '@/types/diagram'

export function DiagramEmpty() {
  return (
    <figure className="flex flex-col items-center gap-3 rounded-3xl border border-dashed bg-muted/40 px-6 py-10 text-center">
      <span className="flex size-11 items-center justify-center rounded-2xl bg-book-marker/30 text-book-deep">
        <Shapes className="size-5" aria-hidden="true" />
      </span>
      <figcaption className="max-w-xs">
        <p className="font-display font-semibold text-balance">No diagram on this page</p>
        <p className="mt-1 text-sm text-pretty text-muted-foreground">
          This page is all words and code. Read the explanation, then try the example to see it run.
        </p>
      </figcaption>
    </figure>
  )
}

interface FallbackProps {
  title: string
  caption: string
  nodes: DiagramNode[]
  problems?: string[]
}

/** Text version of a diagram that could not be drawn, so the lesson content is never lost. */
export function DiagramFallback({ title, caption, nodes, problems = [] }: FallbackProps) {
  return (
    <figure className="rounded-3xl border bg-muted/50 p-4">
      <div className="flex items-start gap-2.5">
        <TriangleAlert className="mt-0.5 size-4 shrink-0 text-book-orange" aria-hidden="true" />
        <div>
          <p className="font-display font-semibold">{title}</p>
          <p className="text-sm text-muted-foreground">{"This diagram couldn't be drawn, so here's what it shows."}</p>
        </div>
      </div>
      {nodes.length > 0 && (
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {nodes.map((node) => (
            <li key={node.id} className="rounded-xl border bg-card px-3 py-2 text-sm">
              <span className="font-mono font-semibold">{node.label}</span>
              {node.value && <span className="ml-2 font-mono text-book-deep">{node.value}</span>}
              {node.caption && <span className="block text-xs text-muted-foreground">{node.caption}</span>}
            </li>
          ))}
        </ul>
      )}
      <figcaption className="mt-3 text-sm text-pretty text-muted-foreground">{caption}</figcaption>
      {process.env.NODE_ENV !== 'production' && problems.length > 0 && (
        <ul className="mt-2 list-disc pl-5 font-mono text-[11px] text-muted-foreground">
          {problems.map((problem) => (
            <li key={problem}>{problem}</li>
          ))}
        </ul>
      )}
    </figure>
  )
}

export class DiagramErrorBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}
