'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer'
import { cn } from '@/lib/utils'

interface OverlayProps {
  /** Element that opens the overlay (rendered as the trigger). */
  trigger: React.ReactElement
  title: string
  description?: string
  children?: React.ReactNode
  footer?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  className?: string
}

/** Accessible modal dialog: focus trap, Esc to close, labelled by title/description. */
export function ModalDialog({ trigger, title, description, children, footer, open, onOpenChange, className }: OverlayProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger render={trigger} />
      <DialogContent className={cn('rounded-3xl p-6 sm:max-w-md', className)}>
        <DialogHeader>
          <DialogTitle className="font-display text-xl">{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        {children}
        {footer && <DialogFooter>{footer}</DialogFooter>}
      </DialogContent>
    </Dialog>
  )
}

/** Bottom sheet on mobile, side panel when `side="right"`. */
export function SideDrawer({
  trigger,
  title,
  description,
  children,
  footer,
  open,
  onOpenChange,
  className,
  side = 'down',
}: OverlayProps & { side?: 'down' | 'right' }) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange} swipeDirection={side} showSwipeHandle={side === 'down'}>
      <DrawerTrigger render={trigger} />
      <DrawerContent className={className}>
        <DrawerHeader>
          <DrawerTitle className="font-display text-xl">{title}</DrawerTitle>
          {description && <DrawerDescription>{description}</DrawerDescription>}
        </DrawerHeader>
        <div className="px-4 pb-2">{children}</div>
        {footer && <DrawerFooter>{footer}</DrawerFooter>}
      </DrawerContent>
    </Drawer>
  )
}
