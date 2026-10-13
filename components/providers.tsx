'use client'

import { MotionConfig } from 'framer-motion'
import { TooltipProvider } from '@/components/ui/tooltip'
import { BookeyToaster } from '@/components/ui-kit/toast'

/** Root client providers shared by every layout. */
export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <TooltipProvider delay={300}>
        {children}
        <BookeyToaster />
      </TooltipProvider>
    </MotionConfig>
  )
}
