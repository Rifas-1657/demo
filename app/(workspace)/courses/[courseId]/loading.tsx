import { Skeleton } from '@/components/ui/skeleton'
import { SkeletonText } from '@/components/ui-kit/skeletons'

export default function CourseLoading() {
  return (
    <div role="status" aria-label="Loading course" className="mx-auto flex max-w-7xl flex-col gap-6 lg:gap-8">
      <Skeleton className="h-4 w-28 rounded-full bg-muted" />
      <Skeleton className="h-96 w-full rounded-3xl bg-muted" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-6">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="rounded-3xl border border-border bg-card p-6">
              <Skeleton className="mb-4 h-5 w-40 rounded-full bg-muted" />
              <SkeletonText lines={3} />
            </div>
          ))}
        </div>
        <Skeleton className="h-80 rounded-3xl bg-muted" />
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  )
}
