import type { DiagramBox, DiagramNode, DiagramRoute, DiagramShape, DiagramSide } from '@/types/diagram'

export interface Point {
  x: number
  y: number
}

export const LABEL_SIZE = 13
export const VALUE_SIZE = 12
export const CAPTION_SIZE = 10.5

/** Rough advance width; SVG text cannot be measured before paint and specs are authored to fit. */
export function textWidth(text: string, size: number, font: 'mono' | 'sans' = 'mono') {
  return text.length * size * (font === 'mono' ? 0.6 : 0.56)
}

export const center = (box: DiagramBox): Point => ({ x: box.x + box.w / 2, y: box.y + box.h / 2 })

export const pad = (box: DiagramBox, by: number): DiagramBox => ({
  x: box.x - by,
  y: box.y - by,
  w: box.w + by * 2,
  h: box.h + by * 2,
})

const round = (n: number) => Math.round(n * 10) / 10

export function roundedRectPath({ x, y, w, h }: DiagramBox, radius: number) {
  const r = Math.min(radius, w / 2, h / 2)
  return [
    `M${round(x + r)} ${round(y)}`,
    `H${round(x + w - r)}`,
    `A${r} ${r} 0 0 1 ${round(x + w)} ${round(y + r)}`,
    `V${round(y + h - r)}`,
    `A${r} ${r} 0 0 1 ${round(x + w - r)} ${round(y + h)}`,
    `H${round(x + r)}`,
    `A${r} ${r} 0 0 1 ${round(x)} ${round(y + h - r)}`,
    `V${round(y + r)}`,
    `A${r} ${r} 0 0 1 ${round(x + r)} ${round(y)}`,
    'Z',
  ].join(' ')
}

export function ellipsePath({ x, y, w, h }: DiagramBox) {
  const rx = w / 2
  const ry = h / 2
  return `M${round(x)} ${round(y + ry)} A${rx} ${ry} 0 1 0 ${round(x + w)} ${round(y + ry)} A${rx} ${ry} 0 1 0 ${round(x)} ${round(y + ry)} Z`
}

/** Single path per shape so `pathLength="1"` dash-drawing works uniformly. */
export function shapePath(shape: DiagramShape, box: DiagramBox) {
  const { x, y, w, h } = box
  switch (shape) {
    case 'pill':
      return roundedRectPath(box, h / 2)
    case 'rounded':
      return roundedRectPath(box, 14)
    case 'ellipse':
      return ellipsePath(box)
    case 'diamond':
      return `M${x + w / 2} ${y} L${x + w} ${y + h / 2} L${x + w / 2} ${y + h} L${x} ${y + h / 2} Z`
    case 'parallelogram': {
      const skew = Math.min(14, w * 0.12)
      return `M${x + skew} ${y} H${x + w} L${x + w - skew} ${y + h} H${x} Z`
    }
    case 'cylinder': {
      const ry = Math.min(9, h * 0.14)
      const rx = w / 2
      return [
        `M${x} ${y + ry}`,
        `A${rx} ${ry} 0 0 1 ${x + w} ${y + ry}`,
        `V${y + h - ry}`,
        `A${rx} ${ry} 0 0 1 ${x} ${y + h - ry}`,
        'Z',
        `M${x} ${y + ry}`,
        `A${rx} ${ry} 0 0 0 ${x + w} ${y + ry}`,
      ].join(' ')
    }
    default:
      return roundedRectPath(box, 8)
  }
}

/** Where the segment from the box centre towards `toward` exits the box. */
export function clipToBox(box: DiagramBox, toward: Point, gap = 4): Point {
  const c = center(box)
  const dx = toward.x - c.x
  const dy = toward.y - c.y
  if (dx === 0 && dy === 0) return c
  const hw = box.w / 2 + gap
  const hh = box.h / 2 + gap
  const scale = Math.min(dx === 0 ? Infinity : hw / Math.abs(dx), dy === 0 ? Infinity : hh / Math.abs(dy))
  return { x: c.x + dx * scale, y: c.y + dy * scale }
}

export interface EdgeGeometry {
  path: string
  arrow: string
  labelAt: Point
  labelAnchor: 'middle' | 'start'
}

function arrowHead(tip: Point, from: Point, size = 7) {
  const angle = Math.atan2(tip.y - from.y, tip.x - from.x)
  const spread = Math.PI / 7
  const a = { x: tip.x - size * Math.cos(angle - spread), y: tip.y - size * Math.sin(angle - spread) }
  const b = { x: tip.x - size * Math.cos(angle + spread), y: tip.y - size * Math.sin(angle + spread) }
  return `M${round(a.x)} ${round(a.y)} L${round(tip.x)} ${round(tip.y)} L${round(b.x)} ${round(b.y)}`
}

function labelFor(a: Point, b: Point): Pick<EdgeGeometry, 'labelAt' | 'labelAnchor'> {
  const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
  const vertical = Math.abs(b.y - a.y) > Math.abs(b.x - a.x)
  return vertical
    ? { labelAt: { x: mid.x + 8, y: mid.y + 4 }, labelAnchor: 'start' }
    : { labelAt: { x: mid.x, y: mid.y - 8 }, labelAnchor: 'middle' }
}

export function edgeGeometry(from: DiagramBox, to: DiagramBox, route: DiagramRoute = 'straight'): EdgeGeometry {
  const gap = 4
  if (route === 'elbow-v') {
    const start = { x: from.x + from.w / 2, y: from.y + from.h + gap }
    const end = { x: to.x + to.w / 2, y: to.y - gap }
    const midY = round((start.y + end.y) / 2)
    const before = { x: end.x, y: midY }
    return {
      path: `M${round(start.x)} ${round(start.y)} V${midY} H${round(end.x)} V${round(end.y)}`,
      arrow: arrowHead(end, before),
      ...labelFor(before, end),
    }
  }
  if (route === 'elbow-h') {
    const start = { x: from.x + from.w + gap, y: from.y + from.h / 2 }
    const end = { x: to.x - gap, y: to.y + to.h / 2 }
    const midX = round((start.x + end.x) / 2)
    const before = { x: midX, y: end.y }
    return {
      path: `M${round(start.x)} ${round(start.y)} H${midX} V${round(end.y)} H${round(end.x)}`,
      arrow: arrowHead(end, before),
      ...labelFor({ x: midX, y: start.y }, { x: midX, y: end.y }),
    }
  }
  if (route === 'trunk') {
    const start = { x: from.x + 20, y: from.y + from.h + gap }
    const end = { x: to.x - gap, y: to.y + to.h / 2 }
    const corner = { x: start.x, y: end.y }
    return {
      path: `M${round(start.x)} ${round(start.y)} V${round(end.y)} H${round(end.x)}`,
      arrow: arrowHead(end, corner),
      ...labelFor(corner, end),
    }
  }
  const start = clipToBox(from, center(to), gap)
  const end = clipToBox(to, center(from), gap)
  return {
    path: `M${round(start.x)} ${round(start.y)} L${round(end.x)} ${round(end.y)}`,
    arrow: arrowHead(end, start),
    ...labelFor(start, end),
  }
}

export interface NodeContentLayout {
  labelY: number
  valueY?: number
  valueBox?: DiagramBox
  captionY?: number
}

/** Vertically stacks label, value chip and caption inside a node box. */
export function nodeContentLayout(node: DiagramNode, box: DiagramBox): NodeContentLayout {
  const parts: Array<{ key: 'label' | 'value' | 'caption'; h: number }> = [{ key: 'label', h: LABEL_SIZE }]
  if (node.value) parts.push({ key: 'value', h: VALUE_SIZE + 10 })
  if (node.caption) parts.push({ key: 'caption', h: CAPTION_SIZE })
  const gap = 6
  const total = parts.reduce((sum, part) => sum + part.h, 0) + gap * (parts.length - 1)
  let cursor = box.y + (box.h - total) / 2
  const layout: NodeContentLayout = { labelY: 0 }

  for (const part of parts) {
    if (part.key === 'label') layout.labelY = cursor + LABEL_SIZE * 0.82
    if (part.key === 'value' && node.value) {
      const w = Math.min(box.w - 16, textWidth(node.value, VALUE_SIZE) + 18)
      layout.valueBox = { x: box.x + (box.w - w) / 2, y: cursor, w, h: part.h }
      layout.valueY = cursor + part.h / 2 + VALUE_SIZE * 0.35
    }
    if (part.key === 'caption') layout.captionY = cursor + CAPTION_SIZE * 0.82
    cursor += part.h + gap
  }
  return layout
}

/** Point the pen marker rests on: just above the target's top-right corner. */
export function penPoint(box: DiagramBox): Point {
  return { x: box.x + box.w - 6, y: box.y + 4 }
}

export interface ArrowNoteGeometry {
  text: Point
  anchor: 'start' | 'middle' | 'end'
  path: string
  arrow: string
}

export function arrowNoteGeometry(box: DiagramBox, side: DiagramSide): ArrowNoteGeometry {
  const c = center(box)
  let text: Point
  let anchor: ArrowNoteGeometry['anchor']
  let from: Point
  let control: Point
  let tip: Point
  switch (side) {
    case 'left':
      text = { x: box.x - 16, y: c.y - 24 }
      anchor = 'end'
      from = { x: box.x - 28, y: c.y - 18 }
      control = { x: box.x - 26, y: c.y }
      tip = { x: box.x - 5, y: c.y + 2 }
      break
    case 'right':
      text = { x: box.x + box.w + 16, y: c.y - 24 }
      anchor = 'start'
      from = { x: box.x + box.w + 28, y: c.y - 18 }
      control = { x: box.x + box.w + 26, y: c.y }
      tip = { x: box.x + box.w + 5, y: c.y + 2 }
      break
    case 'bottom':
      text = { x: c.x + 22, y: box.y + box.h + 38 }
      anchor = 'start'
      from = { x: c.x + 18, y: box.y + box.h + 32 }
      control = { x: c.x + 2, y: box.y + box.h + 28 }
      tip = { x: c.x, y: box.y + box.h + 5 }
      break
    default:
      text = { x: c.x + 22, y: box.y - 26 }
      anchor = 'start'
      from = { x: c.x + 18, y: box.y - 22 }
      control = { x: c.x + 2, y: box.y - 20 }
      tip = { x: c.x, y: box.y - 5 }
  }
  return {
    text,
    anchor,
    path: `M${round(from.x)} ${round(from.y)} Q${round(control.x)} ${round(control.y)} ${round(tip.x)} ${round(tip.y)}`,
    arrow: arrowHead(tip, control, 6),
  }
}
