'use client'

import { useId, useMemo } from 'react'
import { edgeGeometry } from '@/lib/diagram/geometry'
import { normalizeDiagram, resolveFrame, validateDiagram } from '@/lib/diagram/layout'
import { useReducedMotion } from '@/lib/motion'
import { cn } from '@/lib/utils'
import type { DiagramCanvasProps } from '@/types/book'
import type { DiagramBox, DiagramHighlight, DiagramSpec } from '@/types/diagram'
import { DiagramStepTabs, DiagramToolbar } from './diagram/diagram-controls'
import { DiagramLegend } from './diagram/diagram-legend'
import { DiagramEmpty, DiagramErrorBoundary, DiagramFallback } from './diagram/diagram-states'
import {
  DiagramAnnotationShape,
  DiagramEdgeShape,
  DiagramGroupShape,
  DiagramHighlightMark,
  DiagramNodeShape,
  DiagramPen,
  type DrawAnim,
} from './diagram/diagram-svg'
import { useDiagramPlayback } from './diagram/use-diagram-playback'
import { useDiagramViewport, useElementWidth } from './diagram/use-diagram-viewport'

const COMPACT_BELOW = 420
const VIEW_PADDING = 12
const STAGGER_MS = 220

export function DiagramCanvas({ spec, focusNodeId = null, narration = null }: DiagramCanvasProps) {
  if (!spec || spec.nodes.length === 0) return <DiagramEmpty />
  const fallback = <DiagramFallback title={spec.title} caption={spec.caption} nodes={spec.nodes} />
  return (
    <DiagramErrorBoundary fallback={fallback}>
      <DiagramFigure spec={spec} focusNodeId={narration?.focusNodeId ?? focusNodeId} narration={narration} />
    </DiagramErrorBoundary>
  )
}

function DiagramFigure({
  spec,
  focusNodeId,
  narration,
}: {
  spec: DiagramSpec
  focusNodeId: string | null
  narration: DiagramCanvasProps['narration']
}) {
  const uid = useId()
  const reduced = Boolean(useReducedMotion())
  const { ref, width } = useElementWidth<HTMLDivElement>()
  const compact = width !== null && width < COMPACT_BELOW

  const diagram = useMemo(() => normalizeDiagram(spec), [spec])
  const frame = useMemo(() => resolveFrame(spec, compact), [spec, compact])
  const problems = useMemo(() => validateDiagram(diagram, frame), [diagram, frame])

  const playback = useDiagramPlayback(diagram.steps, narration, reduced)
  const viewport = useDiagramViewport(frame, VIEW_PADDING)

  if (problems.length) {
    return <DiagramFallback title={spec.title} caption={spec.caption} nodes={spec.nodes} problems={problems} />
  }

  const { step, generation } = playback
  const current = diagram.steps[step]
  const box = (id: string): DiagramBox | undefined => frame.positions[id]
  const isVisible = (id: string) => (diagram.revealStep.get(id) ?? 0) <= step

  const currentReveal = current?.reveal ?? []
  const anim = (id: string): DrawAnim => {
    const revealedNow = playback.animate && (diagram.revealStep.get(id) ?? 0) === step
    return { draw: revealedNow, delay: Math.max(currentReveal.indexOf(id), 0) * STAGGER_MS }
  }
  const highlightDelay = playback.animate ? currentReveal.length * STAGGER_MS + 150 : 0

  const highlights: Array<DiagramHighlight & { key: string; delay: number }> = []
  if (playback.stepFocus && current?.highlight) {
    highlights.push({ ...current.highlight, key: `${current.id}-${generation}`, delay: highlightDelay })
  }
  if (
    narration?.active &&
    focusNodeId &&
    isVisible(focusNodeId) &&
    !highlights.some((h) => h.targetId === focusNodeId)
  ) {
    highlights.push({ targetId: focusNodeId, style: 'ring', key: `focus-${focusNodeId}`, delay: 0 })
  }

  const penTargetId = current?.highlight?.targetId ?? currentReveal.find((id) => frame.positions[id])
  const penBox = penTargetId ? (box(penTargetId) ?? null) : null
  const showPen = playback.stepFocus && !reduced

  const titleId = `${uid}-title`
  const descId = `${uid}-desc`
  const panelId = `${uid}-panel`
  const tabPrefix = `${uid}-tab`.replace(/:/g, '')
  const total = diagram.steps.length
  const stepText = playback.stepFocus && current ? current.description : spec.caption
  const zoomed = viewport.zoom > 1

  return (
    <figure aria-labelledby={titleId} className="flex flex-col gap-3 rounded-3xl border bg-muted/60 p-3 sm:p-4">
      <header className="flex items-baseline justify-between gap-3">
        <h3 id={titleId} className="font-display text-base leading-tight font-semibold text-balance">
          {spec.title}
        </h3>
        <p className="shrink-0 font-mono text-[11px] tabular-nums text-muted-foreground">
          {playback.stepFocus ? `Step ${step + 1} of ${total}` : `${total} steps · complete`}
        </p>
      </header>

      <DiagramToolbar
        onReplay={() => {
          viewport.reset()
          playback.replay()
        }}
        onShowAll={playback.showAll}
        onZoomIn={viewport.zoomIn}
        onZoomOut={viewport.zoomOut}
        onReset={viewport.reset}
        canZoomIn={viewport.canZoomIn}
        canZoomOut={viewport.canZoomOut}
        isDefaultView={viewport.isDefault}
        zoom={viewport.zoom}
      />

      {total > 1 && (
        <DiagramStepTabs
          steps={diagram.steps}
          active={step}
          unlocked={playback.unlocked}
          showActive={playback.stepFocus}
          panelId={panelId}
          tabIdPrefix={tabPrefix}
          onSelect={playback.selectStep}
        />
      )}

      <div
        ref={ref}
        id={panelId}
        role="tabpanel"
        aria-labelledby={playback.stepFocus ? `${tabPrefix}-${step}` : titleId}
        data-swipe-ignore
        tabIndex={zoomed ? 0 : -1}
        onKeyDown={viewport.onKeyDown}
        aria-roledescription={zoomed ? 'zoomed diagram, use arrow keys to pan' : undefined}
        className="overflow-hidden rounded-2xl border bg-book-page outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <svg
          viewBox={viewport.viewBox}
          role="img"
          aria-labelledby={`${titleId} ${descId}`}
          className={cn('block h-auto w-full touch-none select-none', zoomed && 'cursor-grab active:cursor-grabbing')}
          style={{ aspectRatio: `${frame.width + VIEW_PADDING * 2} / ${frame.height + VIEW_PADDING * 2}`, touchAction: zoomed ? 'none' : 'pan-y' }}
          {...viewport.pointerHandlers}
        >
          <desc id={descId}>{diagram.steps.map((s, i) => `${i + 1}. ${s.description}`).join(' ')}</desc>
          <g key={`${generation}-${compact ? 'c' : 'w'}`}>
            {diagram.groups.map((group) => {
              const b = box(group.id)
              return b && isVisible(group.id) ? (
                <DiagramGroupShape key={group.id} group={group} box={b} anim={anim(group.id)} />
              ) : null
            })}
            {diagram.edges.map((edge) => {
              const from = box(edge.from)
              const to = box(edge.to)
              if (!from || !to || !isVisible(edge.id)) return null
              return (
                <DiagramEdgeShape
                  key={edge.id}
                  edge={edge}
                  geometry={edgeGeometry(from, to, frame.routes?.[edge.id])}
                  anim={anim(edge.id)}
                />
              )
            })}
            {diagram.nodes.map((node) => {
              const b = box(node.id)
              return b && isVisible(node.id) ? (
                <DiagramNodeShape key={node.id} node={node} box={b} anim={anim(node.id)} />
              ) : null
            })}
            {diagram.annotations.map((note) => {
              const b = box(note.id)
              if (!b || !isVisible(note.id)) return null
              return (
                <DiagramAnnotationShape
                  key={note.id}
                  note={note}
                  box={b}
                  targetBox={note.targetId ? box(note.targetId) : undefined}
                  anim={anim(note.id)}
                />
              )
            })}
            {highlights.map((highlight) => {
              const b = box(highlight.targetId)
              if (!b) return null
              return (
                <DiagramHighlightMark
                  key={highlight.key}
                  style={highlight.style}
                  box={b}
                  node={diagram.nodes.find((n) => n.id === highlight.targetId)}
                  note={highlight.note}
                  side={(current && frame.noteSides?.[current.id]) ?? 'top'}
                  frameWidth={frame.width}
                  animate={!reduced}
                  delay={highlight.delay}
                />
              )
            })}
          </g>
          <DiagramPen box={penBox} visible={showPen} />
        </svg>
      </div>

      <p aria-live="polite" className="min-h-10 text-sm leading-relaxed text-pretty">
        {stepText}
      </p>

      <DiagramLegend items={diagram.legend} />

      {playback.stepFocus && <figcaption className="text-xs text-pretty text-muted-foreground">{spec.caption}</figcaption>}
    </figure>
  )
}
