import type { CSSProperties } from 'react'
import {
  arrowNoteGeometry,
  CAPTION_SIZE,
  center,
  clipToBox,
  ellipsePath,
  LABEL_SIZE,
  nodeContentLayout,
  pad,
  penPoint,
  roundedRectPath,
  shapePath,
  textWidth,
  VALUE_SIZE,
  type EdgeGeometry,
} from '@/lib/diagram/geometry'
import { cn } from '@/lib/utils'
import type {
  DiagramAnnotation,
  DiagramBox,
  DiagramEdge,
  DiagramGroup,
  DiagramHighlightStyle,
  DiagramNode,
  DiagramSide,
  DiagramTone,
} from '@/types/diagram'

/** Draw-in settings for one element; `draw: false` renders it statically. */
export interface DrawAnim {
  draw: boolean
  delay: number
}

const delayStyle = (anim: DrawAnim, extra = 0) => ({ '--dg-delay': `${anim.delay + extra}ms` }) as CSSProperties

/** Shrinks text that would overflow its box instead of clipping it. */
function fitSize(text: string, size: number, available: number, font: 'mono' | 'sans') {
  const natural = textWidth(text, size, font)
  return natural <= available ? size : Math.max(9, Math.floor((size * available * 10) / natural) / 10)
}

const toneStyles: Record<DiagramTone, { fill: string; stroke: string }> = {
  neutral: { fill: 'fill-book-page', stroke: 'stroke-book-ink/70' },
  highlight: { fill: 'fill-book-marker/25', stroke: 'stroke-book-orange' },
  valid: { fill: 'fill-emerald-50', stroke: 'stroke-emerald-600' },
  invalid: { fill: 'fill-red-50', stroke: 'stroke-red-600' },
}

const tonePrefix: Partial<Record<DiagramTone, string>> = { valid: '✓ ', invalid: '✗ ' }

export function DiagramGroupShape({ group, box, anim }: { group: DiagramGroup; box: DiagramBox; anim: DrawAnim }) {
  return (
    <g aria-hidden="true">
      <path
        d={roundedRectPath(box, 16)}
        pathLength={1}
        className={cn('fill-book-paper/70 stroke-book-amber/70', anim.draw && 'dg-fade')}
        strokeWidth={1.25}
        strokeDasharray="5 5"
        style={delayStyle(anim)}
      />
      <text
        x={box.x + 12}
        y={box.y + 18}
        className={cn('fill-book-deep font-sans text-[10px] font-semibold tracking-[0.14em] uppercase', anim.draw && 'dg-fade')}
        style={delayStyle(anim, 150)}
      >
        {group.label}
      </text>
    </g>
  )
}

export function DiagramNodeShape({ node, box, anim }: { node: DiagramNode; box: DiagramBox; anim: DrawAnim }) {
  const tone = node.tone ?? 'neutral'
  const styles = toneStyles[tone]
  const font = node.font ?? 'mono'
  const path = shapePath(node.shape ?? 'box', box)
  const layout = nodeContentLayout(node, box)
  const cx = box.x + box.w / 2
  const inset = node.shape === 'parallelogram' ? 34 : 16
  const labelSize = fitSize(node.label, LABEL_SIZE, box.w - inset, font)
  const caption = node.caption ? `${tonePrefix[tone] ?? ''}${node.caption}` : undefined

  return (
    <g aria-hidden="true">
      <path d={path} className={cn(styles.fill, anim.draw && 'dg-fade')} style={delayStyle(anim, 250)} />
      <path
        d={path}
        pathLength={1}
        fill="none"
        strokeWidth={tone === 'highlight' ? 2.25 : 1.6}
        strokeLinejoin="round"
        className={cn(styles.stroke, anim.draw && 'dg-draw')}
        style={delayStyle(anim)}
      />
      <g className={cn(anim.draw && 'dg-fade')} style={delayStyle(anim, 380)}>
        <text
          x={cx}
          y={layout.labelY}
          textAnchor="middle"
          className={cn('fill-book-ink font-semibold', font === 'mono' ? 'font-mono' : 'font-sans')}
          fontSize={labelSize}
        >
          {node.label}
        </text>
        {node.value && layout.valueBox && (
          <>
            <path
              d={roundedRectPath(layout.valueBox, 6)}
              className="fill-book-paper stroke-book-amber"
              strokeWidth={1}
              strokeDasharray="3 3"
            />
            <text
              x={cx}
              y={layout.valueY}
              textAnchor="middle"
              className="fill-book-deep font-mono font-semibold"
              fontSize={fitSize(node.value, VALUE_SIZE, layout.valueBox.w - 10, 'mono')}
            >
              {node.value}
            </text>
          </>
        )}
        {caption && (
          <text
            x={cx}
            y={layout.captionY}
            textAnchor="middle"
            className="fill-book-muted font-sans"
            fontSize={fitSize(caption, CAPTION_SIZE, box.w - inset, 'sans')}
          >
            {caption}
          </text>
        )}
      </g>
    </g>
  )
}

export function DiagramEdgeShape({ edge, geometry, anim }: { edge: DiagramEdge; geometry: EdgeGeometry; anim: DrawAnim }) {
  const labelW = edge.label ? textWidth(edge.label, 11, 'sans') : 0
  const labelX =
    geometry.labelAnchor === 'middle' ? geometry.labelAt.x - labelW / 2 : geometry.labelAt.x
  return (
    <g aria-hidden="true" className="stroke-book-deep">
      <path
        d={geometry.path}
        pathLength={edge.dashed ? undefined : 1}
        fill="none"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={edge.dashed ? '4 4' : undefined}
        className={cn(anim.draw && (edge.dashed ? 'dg-fade' : 'dg-draw'))}
        style={delayStyle(anim)}
      />
      <path
        d={geometry.arrow}
        fill="none"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={cn(anim.draw && 'dg-fade')}
        style={delayStyle(anim, 520)}
      />
      {edge.label && (
        <g className={cn(anim.draw && 'dg-fade')} style={delayStyle(anim, 420)}>
          <rect
            x={labelX - 3}
            y={geometry.labelAt.y - 10}
            width={labelW + 6}
            height={14}
            rx={4}
            className="fill-book-page stroke-none"
          />
          <text
            x={geometry.labelAt.x}
            y={geometry.labelAt.y}
            textAnchor={geometry.labelAnchor}
            className="fill-book-deep stroke-none font-sans text-[11px] font-medium"
          >
            {edge.label}
          </text>
        </g>
      )}
    </g>
  )
}

export function DiagramAnnotationShape({
  note,
  box,
  targetBox,
  anim,
}: {
  note: DiagramAnnotation
  box: DiagramBox
  targetBox?: DiagramBox
  anim: DrawAnim
}) {
  const lines = note.text.split('\n')
  if (note.illustrative) {
    return (
      <g aria-hidden="true" className={cn(anim.draw && 'dg-fade')} style={delayStyle(anim)}>
        <path
          d={roundedRectPath(box, 8)}
          className="fill-book-paper stroke-book-amber"
          strokeWidth={1.1}
          strokeDasharray="3 3"
        />
        <text x={box.x + 8} y={box.y + 14} className="fill-book-deep font-sans text-[8.5px] font-bold tracking-[0.16em] uppercase">
          Illustrative
        </text>
        {lines.map((line, index) => (
          <text
            key={index}
            x={box.x + 8}
            y={box.y + 30 + index * 14}
            className={cn('font-mono', index === 0 ? 'fill-book-ink' : 'fill-book-muted')}
            fontSize={fitSize(line, 10.5, box.w - 16, 'mono')}
          >
            {line}
          </text>
        ))}
      </g>
    )
  }

  const leader = targetBox
    ? { from: clipToBox(box, center(targetBox), 2), to: clipToBox(targetBox, center(box), 4) }
    : null
  return (
    <g aria-hidden="true" className={cn(anim.draw && 'dg-fade')} style={delayStyle(anim)}>
      {leader && (
        <line
          x1={leader.from.x}
          y1={leader.from.y}
          x2={leader.to.x}
          y2={leader.to.y}
          className="stroke-book-muted/70"
          strokeWidth={1}
          strokeDasharray="2 3"
        />
      )}
      {lines.map((line, index) => (
        <text
          key={index}
          x={box.x + box.w / 2}
          y={box.y + 14 + index * 15}
          textAnchor="middle"
          className="fill-book-ink/85 font-display italic"
          fontSize={fitSize(line, 11.5, box.w, 'sans')}
        >
          {line}
        </text>
      ))}
    </g>
  )
}

interface HighlightProps {
  style: DiagramHighlightStyle
  box: DiagramBox
  node?: DiagramNode
  note?: string
  side: DiagramSide
  frameWidth: number
  animate: boolean
  delay: number
}

/** Narration-driven emphasis. With `animate` off every style renders as its static end state. */
export function DiagramHighlightMark({ style, box, node, note, side, frameWidth, animate, delay }: HighlightProps) {
  const anim = { draw: animate, delay }
  if (style === 'marker') {
    const font = node?.font ?? 'mono'
    const layout = node ? nodeContentLayout(node, box) : { labelY: box.y + 18 }
    const labelW = node ? Math.min(box.w - 8, textWidth(node.label, LABEL_SIZE, font) + 14) : box.w - 16
    return (
      <rect
        aria-hidden="true"
        x={box.x + (box.w - labelW) / 2}
        y={layout.labelY - LABEL_SIZE + 1}
        width={labelW}
        height={LABEL_SIZE + 4}
        rx={3}
        className={cn('pointer-events-none fill-book-marker/60 mix-blend-multiply', animate && 'dg-swipe')}
        style={delayStyle(anim)}
      />
    )
  }
  if (style === 'ring') {
    return (
      <path
        aria-hidden="true"
        d={roundedRectPath(pad(box, 6), 14)}
        fill="none"
        strokeWidth={2.5}
        className={cn('pointer-events-none stroke-book-orange', animate && 'dg-pulse')}
        style={delayStyle(anim)}
      />
    )
  }
  if (style === 'underline') {
    const y = box.y + box.h + 7
    const x1 = box.x + 10
    const x2 = box.x + box.w - 10
    return (
      <path
        aria-hidden="true"
        d={`M${x1} ${y} Q${(x1 + x2) / 2} ${y + 5} ${x2} ${y - 1}`}
        pathLength={1}
        fill="none"
        strokeWidth={3}
        strokeLinecap="round"
        className={cn('pointer-events-none stroke-book-orange', animate && 'dg-draw')}
        style={delayStyle(anim)}
      />
    )
  }
  if (style === 'circle') {
    const c = center(box)
    return (
      <path
        aria-hidden="true"
        d={ellipsePath(pad(box, 12))}
        pathLength={1}
        fill="none"
        strokeWidth={2.25}
        strokeLinecap="round"
        transform={`rotate(-4 ${c.x} ${c.y})`}
        className={cn('pointer-events-none stroke-book-deep', animate && 'dg-draw')}
        style={delayStyle(anim)}
      />
    )
  }

  const text = note ?? 'look here'
  const width = textWidth(text, 12, 'sans')
  const geometry = arrowNoteGeometry(box, side)
  const overflowsRight = geometry.anchor === 'start' && geometry.text.x + width > frameWidth
  const mirrored = overflowsRight && (side === 'top' || side === 'bottom')
  const placed = mirrored ? mirrorNote(geometry, box) : geometry
  return (
    <g aria-hidden="true" className="pointer-events-none stroke-book-deep">
      <path
        d={placed.path}
        pathLength={1}
        fill="none"
        strokeWidth={1.75}
        strokeLinecap="round"
        className={cn(animate && 'dg-draw')}
        style={delayStyle(anim)}
      />
      <path
        d={placed.arrow}
        fill="none"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={cn(animate && 'dg-fade')}
        style={delayStyle(anim, 450)}
      />
      <text
        x={placed.text.x}
        y={placed.text.y}
        textAnchor={placed.anchor}
        className={cn('fill-book-deep stroke-none font-display text-[12px] font-semibold italic', animate && 'dg-fade')}
        style={delayStyle(anim, 200)}
      >
        {text}
      </text>
    </g>
  )
}

/** Flips a top/bottom note to the left of the target when it would leave the frame. */
function mirrorNote(geometry: ReturnType<typeof arrowNoteGeometry>, box: DiagramBox) {
  const cx = box.x + box.w / 2
  const flip = (d: string) =>
    d.replace(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g, (_, x: string, y: string) => `${Math.round((2 * cx - Number(x)) * 10) / 10} ${y}`)
  return {
    text: { x: 2 * cx - geometry.text.x, y: geometry.text.y },
    anchor: 'end' as const,
    path: flip(geometry.path),
    arrow: flip(geometry.arrow),
  }
}

/** Small pencil that glides to the item being drawn. */
export function DiagramPen({ box, visible }: { box: DiagramBox | null; visible: boolean }) {
  const point = box ? penPoint(box) : { x: 0, y: 0 }
  return (
    <g
      aria-hidden="true"
      className="dg-pen pointer-events-none"
      style={{ transform: `translate(${point.x}px, ${point.y - 18}px)`, opacity: visible && box ? 1 : 0 }}
    >
      <g transform="scale(0.78)">
        <path
          d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"
          className="fill-book-marker stroke-book-ink"
          strokeWidth={1.5}
          strokeLinejoin="round"
        />
        <path d="m15 5 4 4" className="stroke-book-ink" strokeWidth={1.5} fill="none" />
      </g>
    </g>
  )
}
