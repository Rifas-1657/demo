'use client'

import { Eye, Lock, RotateCcw, Scan, ZoomIn, ZoomOut } from 'lucide-react'
import { useRef } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { DiagramStep } from '@/types/diagram'

interface ToolbarProps {
  onReplay: () => void
  onShowAll: () => void
  onZoomIn: () => void
  onZoomOut: () => void
  onReset: () => void
  canZoomIn: boolean
  canZoomOut: boolean
  isDefaultView: boolean
  zoom: number
}

export function DiagramToolbar({
  onReplay,
  onShowAll,
  onZoomIn,
  onZoomOut,
  onReset,
  canZoomIn,
  canZoomOut,
  isDefaultView,
  zoom,
}: ToolbarProps) {
  return (
    <div role="toolbar" aria-label="Diagram controls" className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex items-center gap-1.5">
        <Button type="button" variant="outline" size="sm" onClick={onReplay}>
          <RotateCcw aria-hidden="true" />
          Replay
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onShowAll}>
          <Eye aria-hidden="true" />
          Show all
        </Button>
      </div>
      <div className="flex items-center gap-1">
        <Button type="button" variant="ghost" size="icon-sm" onClick={onZoomOut} disabled={!canZoomOut} aria-label="Zoom out" title="Zoom out">
          <ZoomOut aria-hidden="true" />
        </Button>
        <span className="w-10 text-center font-mono text-xs tabular-nums text-muted-foreground" aria-live="polite">
          {Math.round(zoom * 100)}%
        </span>
        <Button type="button" variant="ghost" size="icon-sm" onClick={onZoomIn} disabled={!canZoomIn} aria-label="Zoom in" title="Zoom in">
          <ZoomIn aria-hidden="true" />
        </Button>
        <Button type="button" variant="ghost" size="icon-sm" onClick={onReset} disabled={isDefaultView} aria-label="Reset view" title="Reset view">
          <Scan aria-hidden="true" />
        </Button>
      </div>
    </div>
  )
}

interface StepTabsProps {
  steps: DiagramStep[]
  active: number
  unlocked: number
  showActive: boolean
  panelId: string
  tabIdPrefix: string
  onSelect: (index: number) => void
}

export function DiagramStepTabs({ steps, active, unlocked, showActive, panelId, tabIdPrefix, onSelect }: StepTabsProps) {
  const listRef = useRef<HTMLDivElement>(null)

  const focusTab = (index: number) => {
    onSelect(index)
    listRef.current?.querySelector<HTMLButtonElement>(`#${CSS.escape(`${tabIdPrefix}-${index}`)}`)?.focus()
  }

  const onKeyDown = (event: React.KeyboardEvent) => {
    const keys: Record<string, number> = {
      ArrowRight: Math.min(active + 1, unlocked - 1),
      ArrowLeft: Math.max(active - 1, 0),
      Home: 0,
      End: unlocked - 1,
    }
    if (!(event.key in keys)) return
    event.preventDefault()
    event.stopPropagation()
    focusTab(keys[event.key])
  }

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label="Diagram steps"
      data-swipe-ignore
      onKeyDown={onKeyDown}
      className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:thin]"
    >
      {steps.map((step, index) => {
        const locked = index >= unlocked
        const selected = showActive && index === active
        return (
          <button
            key={step.id}
            id={`${tabIdPrefix}-${index}`}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={panelId}
            aria-disabled={locked}
            disabled={locked}
            tabIndex={index === active ? 0 : -1}
            onClick={() => onSelect(index)}
            className={cn(
              'flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
              selected
                ? 'border-book-orange bg-book-marker/40 text-book-ink'
                : 'border-border bg-card text-muted-foreground hover:text-foreground',
              locked && 'cursor-not-allowed opacity-50 hover:text-muted-foreground',
            )}
          >
            <span
              className={cn(
                'flex size-4 items-center justify-center rounded-full font-mono text-[10px] tabular-nums',
                selected ? 'bg-book-orange text-white' : 'bg-muted',
              )}
            >
              {locked ? <Lock className="size-2.5" aria-hidden="true" /> : index + 1}
            </span>
            {step.label}
            {locked && <span className="sr-only">(unlocks as the narration continues)</span>}
          </button>
        )
      })}
    </div>
  )
}
