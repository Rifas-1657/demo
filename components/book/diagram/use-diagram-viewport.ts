'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

export const MIN_ZOOM = 1
export const MAX_ZOOM = 2.5
const ZOOM_STEP = 0.25
const PAN_KEY_STEP = 24

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

/** Tracks the rendered width so the canvas can switch to its compact frame. */
export function useElementWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState<number | null>(null)
  useEffect(() => {
    const element = ref.current
    if (!element) return
    const observer = new ResizeObserver(([entry]) => {
      const next = entry.contentRect.width
      // Hidden mobile tab panels report 0; keep the last real width.
      if (next > 0) setWidth(next)
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  return { ref, width }
}

interface Size {
  width: number
  height: number
}

/** Zoom + pan expressed as an SVG viewBox so text stays crisp at every scale. */
export function useDiagramViewport(content: Size, padding: number) {
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const drag = useRef<{ id: number; x: number; y: number; scale: number } | null>(null)

  const fullW = content.width + padding * 2
  const fullH = content.height + padding * 2
  const viewW = fullW / zoom
  const viewH = fullH / zoom
  const maxPanX = (fullW - viewW) / 2
  const maxPanY = (fullH - viewH) / 2
  const panX = clamp(pan.x, -maxPanX, maxPanX)
  const panY = clamp(pan.y, -maxPanY, maxPanY)
  const viewBox = [
    -padding + (fullW - viewW) / 2 + panX,
    -padding + (fullH - viewH) / 2 + panY,
    viewW,
    viewH,
  ]
    .map((n) => Math.round(n * 100) / 100)
    .join(' ')

  const zoomBy = useCallback((delta: number) => setZoom((z) => clamp(Math.round((z + delta) * 100) / 100, MIN_ZOOM, MAX_ZOOM)), [])

  const reset = useCallback(() => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }, [])

  const panBy = useCallback(
    (dx: number, dy: number) => setPan((p) => ({ x: clamp(p.x + dx, -maxPanX, maxPanX), y: clamp(p.y + dy, -maxPanY, maxPanY) })),
    [maxPanX, maxPanY],
  )

  const pointerHandlers = {
    onPointerDown: (event: React.PointerEvent<SVGSVGElement>) => {
      if (zoom === 1 || event.button !== 0) return
      event.currentTarget.setPointerCapture(event.pointerId)
      drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, scale: viewW / event.currentTarget.clientWidth }
    },
    onPointerMove: (event: React.PointerEvent<SVGSVGElement>) => {
      const state = drag.current
      if (!state || state.id !== event.pointerId) return
      panBy((state.x - event.clientX) * state.scale, (state.y - event.clientY) * state.scale)
      state.x = event.clientX
      state.y = event.clientY
    },
    onPointerUp: () => {
      drag.current = null
    },
    onPointerCancel: () => {
      drag.current = null
    },
  }

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (zoom === 1) return
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-PAN_KEY_STEP, 0],
      ArrowRight: [PAN_KEY_STEP, 0],
      ArrowUp: [0, -PAN_KEY_STEP],
      ArrowDown: [0, PAN_KEY_STEP],
    }
    const move = moves[event.key]
    if (!move) return
    event.preventDefault()
    event.stopPropagation()
    panBy(move[0], move[1])
  }

  return {
    zoom,
    viewBox,
    zoomIn: () => zoomBy(ZOOM_STEP),
    zoomOut: () => zoomBy(-ZOOM_STEP),
    reset,
    pointerHandlers,
    onKeyDown,
    canZoomIn: zoom < MAX_ZOOM,
    canZoomOut: zoom > MIN_ZOOM,
    isDefault: zoom === 1 && panX === 0 && panY === 0,
  }
}
