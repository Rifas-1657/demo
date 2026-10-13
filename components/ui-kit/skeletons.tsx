import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn('space-y-2', className)} aria-hidden="true">
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} className={cn('h-3 rounded-full bg-muted', i === lines - 1 && 'w-2/3')} />
      ))}
    </div>
  )
}

export function SkeletonCourseCard({ className }: { className?: string }) {
  return (
    <div role="status" aria-label="Loading course" className={cn('rounded-3xl border border-border bg-card p-5', className)}>
      <Skeleton className="aspect-[4/3] w-full rounded-2xl bg-muted" />
      <Skeleton className="mt-4 h-5 w-3/4 rounded-full bg-muted" />
      <SkeletonText lines={2} className="mt-3" />
      <span className="sr-only">Loading…</span>
    </div>
  )
}

export function SkeletonRow({ className }: { className?: string }) {
  return (
    <div role="status" aria-label="Loading" className={cn('flex items-center gap-3', className)}>
      <Skeleton className="size-10 rounded-full bg-muted" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3 w-1/3 rounded-full bg-muted" />
        <Skeleton className="h-3 w-1/2 rounded-full bg-muted" />
      </div>
    </div>
  )
}
