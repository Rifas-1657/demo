import { BookX } from 'lucide-react'
import Link from 'next/link'
import { BookeyButton } from '@/components/ui-kit/bookey-button'
import { EmptyState } from '@/components/ui-kit/empty-state'
import { learningCourses } from '@/lib/mock/learning'

export default function CourseNotFound() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 py-6">
      <EmptyState
        icon={<BookX />}
        headingLevel="h1"
        title="We couldn't find that course"
        description="The link may be outdated or the course isn't part of this demo shelf. Here's what is available:"
        className="py-14"
        action={
          <div className="flex flex-col items-center gap-4">
            <ul className="flex flex-wrap justify-center gap-2">
              {learningCourses.map((course) => (
                <li key={course.id}>
                  <Link
                    href={`/courses/${course.id}`}
                    className="inline-flex rounded-full border border-border bg-card px-3 py-1.5 text-sm font-medium outline-none hover:border-primary/40 focus-visible:ring-4 focus-visible:ring-ring/30"
                  >
                    {course.title}
                  </Link>
                </li>
              ))}
            </ul>
            <BookeyButton nativeButton={false} render={<Link href="/courses" />}>
              Browse the catalog
            </BookeyButton>
          </div>
        }
      />
    </div>
  )
}
