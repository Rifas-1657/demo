/**
 * JSON-serialisable diagram schema for the book reader's visual page.
 *
 * Semantics (nodes, edges, groups, annotations, steps) are kept apart from
 * geometry (`layout`), so the same diagram can ship a wide and a compact
 * frame. Specs without a `layout` are auto-laid out from their nodes.
 */

export type DiagramKind =
  | 'labeled-boxes'
  | 'assignment-flow'
  | 'type-table'
  | 'type-tree'
  | 'naming-rules'
  | 'io-flow'
  | 'practice'

export type DiagramTone = 'neutral' | 'highlight' | 'valid' | 'invalid'

export type DiagramShape = 'box' | 'rounded' | 'pill' | 'ellipse' | 'diamond' | 'parallelogram' | 'cylinder'

export type DiagramHighlightStyle = 'marker' | 'ring' | 'underline' | 'circle' | 'arrow-note'

export type DiagramSide = 'top' | 'right' | 'bottom' | 'left'

/** How an edge is routed between two boxes. */
export type DiagramRoute = 'straight' | 'elbow-v' | 'elbow-h' | 'trunk'

export interface DiagramNode {
  id: string
  label: string
  value?: string
  /** Short hint rendered under the node (e.g. a type name). */
  caption?: string
  tone?: DiagramTone
  shape?: DiagramShape
  /** Monospace for code/identifiers (default), sans for plain-language labels. */
  font?: 'mono' | 'sans'
}

export interface DiagramEdge {
  id: string
  from: string
  to: string
  label?: string
  dashed?: boolean
}

export interface DiagramGroup {
  id: string
  label: string
  nodeIds: string[]
}

export interface DiagramAnnotation {
  id: string
  /** Use `\n` for manual line breaks; SVG text does not wrap. */
  text: string
  /** Draws a dashed leader line to this node/group. */
  targetId?: string
  /** Marks example-only data (e.g. memory addresses) so it never reads as real. */
  illustrative?: boolean
}

export interface DiagramHighlight {
  targetId: string
  style: DiagramHighlightStyle
  /** Text for the `arrow-note` style. */
  note?: string
}

export interface DiagramStep {
  id: string
  /** Short tab label. */
  label: string
  /** Full sentence used for the caption and screen-reader text. */
  description: string
  /** Element ids (nodes, edges, groups, annotations) first drawn in this step. */
  reveal: string[]
  highlight?: DiagramHighlight
  /** Narration progress (0..1) that unlocks this step. Defaults to an even spread. */
  at?: number
}

export type DiagramLegendSwatch = 'node' | 'highlight' | 'valid' | 'invalid' | 'edge' | 'group' | 'illustrative' | 'marker'

export interface DiagramLegendItem {
  swatch: DiagramLegendSwatch
  label: string
}

export interface DiagramBox {
  x: number
  y: number
  w: number
  h: number
}

export interface DiagramFrame {
  width: number
  height: number
  /** Boxes for nodes, groups and annotations, keyed by element id. */
  positions: Record<string, DiagramBox>
  /** Per-edge routing; defaults to `straight`. */
  routes?: Record<string, DiagramRoute>
  /** Per-step side for `arrow-note` highlights; defaults to `top`. */
  noteSides?: Record<string, DiagramSide>
}

export interface DiagramLayout {
  wide: DiagramFrame
  /** Used when the canvas is narrower than ~420px. Falls back to `wide`. */
  compact?: DiagramFrame
}

export interface DiagramSpec {
  kind: DiagramKind
  title: string
  caption: string
  nodes: DiagramNode[]
  edges?: DiagramEdge[]
  groups?: DiagramGroup[]
  annotations?: DiagramAnnotation[]
  steps?: DiagramStep[]
  legend?: DiagramLegendItem[]
  layout?: DiagramLayout
}

/** Narration context the canvas consumes; it never drives narration itself. */
export interface DiagramNarrationContext {
  /** True while a narration pass is underway (speaking, paused or completed). */
  active: boolean
  /** 0..1 progress through the page narration. */
  progress: number
  focusNodeId: string | null
}
