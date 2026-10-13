import type {
  DiagramAnnotation,
  DiagramBox,
  DiagramEdge,
  DiagramFrame,
  DiagramGroup,
  DiagramLegendItem,
  DiagramNode,
  DiagramSpec,
  DiagramStep,
} from '@/types/diagram'

export interface NormalizedDiagram {
  nodes: DiagramNode[]
  edges: DiagramEdge[]
  groups: DiagramGroup[]
  annotations: DiagramAnnotation[]
  steps: DiagramStep[]
  legend: DiagramLegendItem[]
  /** Step index in which each element is first drawn. */
  revealStep: Map<string, number>
}

const FLOW_KINDS = new Set(['assignment-flow', 'io-flow'])

function autoEdges(spec: DiagramSpec): DiagramEdge[] {
  if (!FLOW_KINDS.has(spec.kind)) return []
  return spec.nodes.slice(1).map((node, index) => ({
    id: `auto-edge-${index}`,
    from: spec.nodes[index].id,
    to: node.id,
  }))
}

function autoSteps(spec: DiagramSpec, edges: DiagramEdge[]): DiagramStep[] {
  return spec.nodes.map((node, index) => {
    const incoming = edges.filter((edge) => edge.to === node.id).map((edge) => edge.id)
    const what = node.value ? `${node.label} holds ${node.value}` : node.label
    return {
      id: `auto-step-${node.id}`,
      label: node.label.length > 12 ? `Part ${index + 1}` : node.label,
      description: node.caption ? `${what} (${node.caption}).` : `${what}.`,
      reveal: [node.id, ...incoming],
      highlight: node.tone === 'highlight' ? { targetId: node.id, style: 'marker' } : undefined,
    }
  })
}

function autoLegend(spec: DiagramSpec, edges: DiagramEdge[]): DiagramLegendItem[] {
  const tones = new Set(spec.nodes.map((node) => node.tone ?? 'neutral'))
  const legend: DiagramLegendItem[] = [{ swatch: 'node', label: 'Value or step' }]
  if (tones.has('highlight')) legend.push({ swatch: 'highlight', label: 'Key idea' })
  if (tones.has('valid')) legend.push({ swatch: 'valid', label: 'Valid / result' })
  if (tones.has('invalid')) legend.push({ swatch: 'invalid', label: 'Not allowed' })
  if (edges.length) legend.push({ swatch: 'edge', label: 'Flows into' })
  return legend
}

/** Fills authored gaps (edges, steps, legend) so every spec plays the same way. */
export function normalizeDiagram(spec: DiagramSpec): NormalizedDiagram {
  const edges = spec.edges ?? autoEdges(spec)
  const steps = spec.steps?.length ? spec.steps : autoSteps(spec, edges)
  const groups = spec.groups ?? []
  const annotations = spec.annotations ?? []
  const revealStep = new Map<string, number>()
  steps.forEach((step, index) => {
    for (const id of step.reveal) if (!revealStep.has(id)) revealStep.set(id, index)
  })
  for (const element of [...spec.nodes, ...edges, ...groups, ...annotations]) {
    if (!revealStep.has(element.id)) revealStep.set(element.id, 0)
  }
  return {
    nodes: spec.nodes,
    edges,
    groups,
    annotations,
    steps,
    legend: spec.legend ?? autoLegend(spec, edges),
    revealStep,
  }
}

const AUTO_PAD = 12

function autoFrame(spec: DiagramSpec, compact: boolean): DiagramFrame {
  const nodes = spec.nodes
  const width = compact ? 300 : 520
  const flow = FLOW_KINDS.has(spec.kind)
  const tall = nodes.some((node) => node.value)
  const nodeH = tall ? (nodes.some((node) => node.caption) ? 92 : 72) : 60
  const positions: Record<string, DiagramBox> = {}

  if (flow && !compact && nodes.length <= 4) {
    const gap = 44
    const w = (width - AUTO_PAD * 2 - gap * (nodes.length - 1)) / nodes.length
    nodes.forEach((node, index) => {
      positions[node.id] = { x: AUTO_PAD + index * (w + gap), y: AUTO_PAD, w, h: nodeH }
    })
    return { width, height: nodeH + AUTO_PAD * 2, positions }
  }

  const cols = flow ? 1 : Math.min(compact ? 2 : 3, nodes.length) || 1
  const gapX = 14
  const gapY = flow ? 40 : 14
  const w = flow ? Math.min(200, width - AUTO_PAD * 2) : (width - AUTO_PAD * 2 - gapX * (cols - 1)) / cols
  const offsetX = flow ? (width - w) / 2 : AUTO_PAD
  nodes.forEach((node, index) => {
    const col = index % cols
    const row = Math.floor(index / cols)
    positions[node.id] = { x: offsetX + col * (w + gapX), y: AUTO_PAD + row * (nodeH + gapY), w, h: nodeH }
  })
  const rows = Math.ceil(nodes.length / cols)
  return { width, height: AUTO_PAD * 2 + rows * nodeH + (rows - 1) * gapY, positions }
}

export function resolveFrame(spec: DiagramSpec, compact: boolean): DiagramFrame {
  if (spec.layout) return compact ? (spec.layout.compact ?? spec.layout.wide) : spec.layout.wide
  return autoFrame(spec, compact)
}

/** Returns human-readable problems; any problem routes the canvas to its fallback view. */
export function validateDiagram(diagram: NormalizedDiagram, frame: DiagramFrame): string[] {
  const problems: string[] = []
  const nodeIds = new Set(diagram.nodes.map((node) => node.id))
  const boxIds = new Set([...nodeIds, ...diagram.groups.map((group) => group.id)])
  for (const node of diagram.nodes) {
    if (!frame.positions[node.id]) problems.push(`Node "${node.id}" has no position.`)
  }
  for (const edge of diagram.edges) {
    if (!nodeIds.has(edge.from) || !nodeIds.has(edge.to)) problems.push(`Edge "${edge.id}" points at a missing node.`)
  }
  for (const group of diagram.groups) {
    if (!frame.positions[group.id]) problems.push(`Group "${group.id}" has no position.`)
  }
  for (const note of diagram.annotations) {
    if (!frame.positions[note.id]) problems.push(`Annotation "${note.id}" has no position.`)
    if (note.targetId && !boxIds.has(note.targetId)) problems.push(`Annotation "${note.id}" targets a missing element.`)
  }
  for (const step of diagram.steps) {
    if (step.highlight && !boxIds.has(step.highlight.targetId)) {
      problems.push(`Step "${step.id}" highlights a missing element.`)
    }
  }
  return problems
}

/** Step index unlocked by narration progress, honouring each step's optional `at`. */
export function stepForProgress(steps: DiagramStep[], progress: number) {
  let reached = 0
  steps.forEach((step, index) => {
    const at = step.at ?? (index / steps.length) * 0.85
    if (progress >= at) reached = index
  })
  return reached
}
