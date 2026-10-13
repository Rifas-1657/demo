import type { BookCover } from '@/types/learning'

/**
 * Contract for the reusable 3D book. The cinematic open/flip sequence is
 * intentionally NOT built yet; `state` reserves the API for it.
 */
export interface Book3DProps {
  title: string
  author: string
  cover: BookCover
  /** Future: 'opening' | 'open' drive the cinematic sequence. */
  state?: 'closed' | 'opening' | 'open'
  /** Gentle idle float + pointer tilt. Ignored with reduced motion. */
  interactive?: boolean
  className?: string
}
