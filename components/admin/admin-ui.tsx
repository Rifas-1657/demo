'use client'

import { CircleCheck, FlaskConical, PencilLine } from 'lucide-react'
import { useId } from 'react'
import { BookeyBadge } from '@/components/ui-kit/bookey-badge'
import { BookeyButton } from '@/components/ui-kit/bookey-button'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { AdminCourseStatus } from '@/lib/admin/types'
import { cn } from '@/lib/utils'

export const inputClass =
  'h-10 w-full rounded-xl border border-input bg-card px-3 text-sm text-foreground outline-none transition-[border-color,box-shadow] placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-ring/25 aria-invalid:border-destructive aria-invalid:ring-destructive/15'

export const textareaClass = cn(inputClass, 'h-auto min-h-24 py-2.5 leading-relaxed')

export function AdminPageHeader({
  title,
  description,
  actions,
}: {
  title: string
  description?: string
  actions?: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0 space-y-1">
        <h1 className="font-display text-2xl font-bold text-balance sm:text-3xl">{title}</h1>
        {description && <p className="max-w-2xl text-sm leading-relaxed text-pretty text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </div>
  )
}

export function AdminPanel({
  title,
  description,
  actions,
  children,
  className,
  bodyClassName,
}: {
  title?: string
  description?: string
  actions?: React.ReactNode
  children: React.ReactNode
  className?: string
  bodyClassName?: string
}) {
  const headingId = useId()
  return (
    <section
      aria-labelledby={title ? headingId : undefined}
      className={cn('rounded-2xl border border-border bg-card text-card-foreground', className)}
    >
      {title && (
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <h2 id={headingId} className="font-display text-base font-semibold">
              {title}
            </h2>
            {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
          </div>
          {actions}
        </div>
      )}
      <div className={cn('p-5', bodyClassName)}>{children}</div>
    </section>
  )
}

export function Field({
  id,
  label,
  hint,
  error,
  children,
  className,
}: {
  id: string
  label: string
  hint?: string
  error?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-xs font-medium text-destructive">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="text-xs text-muted-foreground">
            {hint}
          </p>
        )
      )}
    </div>
  )
}

export function describedBy(id: string, error?: string, hint?: string) {
  if (error) return `${id}-error`
  if (hint) return `${id}-hint`
  return undefined
}

export function StatusBadge({ status }: { status: AdminCourseStatus }) {
  return status === 'published' ? (
    <BookeyBadge tone="success" icon={<CircleCheck aria-hidden="true" />}>
      Published
    </BookeyBadge>
  ) : (
    <BookeyBadge tone="neutral" icon={<PencilLine aria-hidden="true" />}>
      Draft
    </BookeyBadge>
  )
}

export function SampleBadge({ label = 'Sample data' }: { label?: string }) {
  return (
    <BookeyBadge tone="warning" icon={<FlaskConical aria-hidden="true" />}>
      {label}
    </BookeyBadge>
  )
}

export function DemoNotice({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      role="note"
      className={cn(
        'flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-950',
        className,
      )}
    >
      <FlaskConical aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <div className="min-w-0">{children}</div>
    </div>
  )
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmLabel: string
  onConfirm: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl p-6 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
          <DialogClose render={<BookeyButton variant="outline" />}>Cancel</DialogClose>
          <BookeyButton
            className="bg-destructive text-white shadow-none hover:bg-[color-mix(in_oklab,var(--destructive)_85%,black)]"
            onClick={() => {
              onConfirm()
              onOpenChange(false)
            }}
          >
            {confirmLabel}
          </BookeyButton>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/** Horizontal scroll wrapper so dense tables never break the mobile layout. */
export function TableScroller({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div
      role="region"
      aria-label={label}
      tabIndex={0}
      className="relative overflow-x-auto rounded-2xl border border-border bg-card outline-none focus-visible:ring-4 focus-visible:ring-ring/25"
    >
      {children}
    </div>
  )
}

export const thClass = 'px-4 py-3 text-left text-xs font-medium whitespace-nowrap text-muted-foreground'
export const tdClass = 'px-4 py-3 align-middle'
