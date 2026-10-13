'use client'

import { useRef } from 'react'
import { cn } from '@/lib/utils'

interface GlowCardProps extends React.ComponentProps<'div'> {
  glow?: 'pink' | 'amber'
}

/** Card with a pointer-following radial glow. The glow is purely decorative. */
export function GlowCard({ className, glow = 'pink', children, onPointerMove, ...props }: GlowCardProps) {
  const ref = useRef<HTMLDivElement>(null)

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    onPointerMove?.(event)
    if (event.pointerType !== 'mouse' || !ref.current) return
    const rect = ref.current.getBoundingClientRect()
    ref.current.style.setProperty('--glow-x', `${event.clientX - rect.left}px`)
    ref.current.style.setProperty('--glow-y', `${event.clientY - rect.top}px`)
  }

  return (
    <div
      ref={ref}
      onPointerMove={handlePointerMove}
      className={cn(
        'group/glow relative isolate overflow-hidden rounded-3xl border border-border bg-card p-6 text-card-foreground transition-[border-color,box-shadow] duration-300 hover:border-primary/30 hover:shadow-[0_24px_60px_-30px_color-mix(in_oklab,var(--primary)_55%,transparent)]',
        className,
      )}
      {...props}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 opacity-0 transition-opacity duration-300 group-hover/glow:opacity-100"
        style={{
          background: `radial-gradient(320px circle at var(--glow-x, 50%) var(--glow-y, 0%), ${
            glow === 'pink' ? 'rgb(251 113 133 / 0.18)' : 'rgb(250 204 21 / 0.25)'
          }, transparent 70%)`,
        }}
      />
      {children}
    </div>
  )
}
