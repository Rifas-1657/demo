import { cn } from '@/lib/utils'

const NOISE_SVG =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")"

/** Very subtle, static CSS-only film grain. Place inside a `relative` parent. */
export function GrainOverlay({ className, opacity = 0.06 }: { className?: string; opacity?: number }) {
  return (
    <div
      aria-hidden="true"
      className={cn('pointer-events-none absolute inset-0 mix-blend-multiply', className)}
      style={{ backgroundImage: NOISE_SVG, opacity }}
    />
  )
}
