import { Skeleton } from '@/components/ui/skeleton'
import { SkeletonCourseCard } from '@/components/ui-kit/skeletons'

export default function CoursesLoading() {
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 lg:gap-8">
      <div className="space-y-3">
        <Skeleton className="h-8 w-56 rounded-full bg-muted" />
        <Skeleton className="h-4 w-full max-w-lg rounded-full bg-muted" />
      </div>
      <Skeleton className="h-36 w-full rounded-3xl bg-muted" />
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <SkeletonCourseCard key={i} />
        ))}
      </div>
    </div>
  )
}
