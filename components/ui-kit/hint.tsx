'use client'

import { Tooltip as TooltipPrimitive } from '@base-ui/react/tooltip'
import { Tooltip, TooltipContent } from '@/components/ui/tooltip'

interface HintProps {
  label: string
  /** A single focusable element (e.g. an icon button). */
  children: React.ReactElement
  side?: 'top' | 'bottom' | 'left' | 'right'
}

/** Short tooltip. Never put essential information only in a tooltip. */
export function Hint({ label, children, side = 'top' }: HintProps) {
  return (
    <Tooltip>
      {/* Primitive trigger: the shadcn wrapper's data-slot collides with the child's and causes a hydration mismatch. */}
      <TooltipPrimitive.Trigger render={children} />
      <TooltipContent side={side}>{label}</TooltipContent>
    </Tooltip>
  )
}
