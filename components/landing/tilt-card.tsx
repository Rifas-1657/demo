'use client'

import { useRef } from 'react'
import { useRichMotion } from '@/lib/motion'
import { cn } from '@/lib/utils'

const MAX_TILT = 6

/** Subtle pointer tilt for fine pointers only; a plain container for touch and reduced motion. */
export function TiltCard({ className, children, ...props }: React.ComponentProps<'div'>) {
  const rich = useRichMotion()
  const ref = useRef<HTMLDivElement>(null)

  function handleMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!rich || event.pointerType !== 'mouse' || !ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const px = (event.clientX - rect.left) / rect.width - 0.5
    const py = (event.clientY - rect.top) / rect.height - 0.5
    ref.current.style.setProperty('--tilt-x', `${(-py * MAX_TILT).toFixed(2)}deg`)
    ref.current.style.setProperty('--tilt-y', `${(px * MAX_TILT).toFixed(2)}deg`)
  }

  function reset() {
    ref.current?.style.setProperty('--tilt-x', '0deg')
    ref.current?.style.setProperty('--tilt-y', '0deg')
  }

  return (
    <div className="[perspective:1200px]">
      <div
        ref={ref}
        onPointerMove={handleMove}
        onPointerLeave={reset}
        className={cn(
          'h-full transition-transform duration-300 ease-out [transform:rotateX(var(--tilt-x,0deg))_rotateY(var(--tilt-y,0deg))] will-change-transform',
          className,
        )}
        {...props}
      >
        {children}
      </div>
    </div>
  )
}
