import { Skeleton } from '@/components/ui/skeleton'

export function LibrarySkeleton() {
  return (
    <div role="status" aria-label="Loading library" className="flex flex-col gap-6">
      <div className="flex gap-2">
        {Array.from({ length: 5 }, (_, index) => (
          <Skeleton key={index} className="h-9 w-24 rounded-full bg-muted" />
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="flex gap-4 rounded-3xl border border-border bg-card p-5">
            <Skeleton className="h-32 w-24 shrink-0 rounded-lg bg-muted" />
            <div className="flex-1 space-y-3">
              <Skeleton className="h-4 w-3/4 rounded-full bg-muted" />
              <Skeleton className="h-3 w-1/2 rounded-full bg-muted" />
              <Skeleton className="h-2 w-full rounded-full bg-muted" />
              <Skeleton className="h-9 w-24 rounded-full bg-muted" />
            </div>
          </div>
        ))}
      </div>
      <span className="sr-only">Loading library…</span>
    </div>
  )
}
