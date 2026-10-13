import { ArrowUpRight } from 'lucide-react'
import Link from 'next/link'
import { BookeyBadge } from '@/components/ui-kit/bookey-badge'
import { getCoursePosition, type LearningCourse } from '@/lib/mock/learning'
import { ProgressBar } from './dashboard-panel'

export function CourseProgressCard({ course }: { course: LearningCourse }) {
  const position = getCoursePosition(course)

  return (
    <Link
      href={`/book/${course.id}`}
      className="group flex h-full flex-col gap-4 rounded-3xl border border-border bg-card p-5 text-card-foreground transition-[border-color,box-shadow,transform] duration-300 outline-none hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[0_24px_50px_-30px_color-mix(in_oklab,var(--primary)_60%,transparent)] focus-visible:ring-4 focus-visible:ring-ring/30 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
    >
      <div className="flex items-start justify-between gap-3">
        <span
          aria-hidden="true"
          className="relative h-16 w-12 shrink-0 overflow-hidden rounded-r-md rounded-l-sm shadow-md"
          style={{ background: course.cover.base }}
        >
          <span className="absolute inset-y-0 left-0 w-1.5" style={{ background: course.cover.spine }} />
          <span className="absolute -top-3 -right-3 size-8 rounded-full opacity-50 blur-md" style={{ background: course.cover.accent }} />
        </span>
        <ArrowUpRight
          aria-hidden="true"
          className="size-5 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary"
        />
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="font-display text-base leading-snug font-semibold">{course.title}</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          {course.level} · {course.chapters.length} chapters
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex items-baseline justify-between text-xs">
          <span className="text-muted-foreground">
            <span className="font-semibold text-foreground tabular-nums">{position.completedPages}</span> / {position.totalPages} pages
          </span>
          <span className="font-mono tabular-nums">{position.percent}%</span>
        </div>
        <ProgressBar value={position.percent} label={`${course.title} demo progress`} />
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-border pt-3 text-xs">
        {position.started ? (
          <span className="truncate text-muted-foreground">Next: Ch. {position.chapter.number}, {position.chapter.title}</span>
        ) : (
          <BookeyBadge tone="outline">Not started</BookeyBadge>
        )}
        <span className="shrink-0 font-medium text-primary">{position.started ? 'Continue' : 'Start'}</span>
      </div>
    </Link>
  )
}

export function CourseProgressGrid({ courses }: { courses: LearningCourse[] }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {courses.map((course) => (
        <li key={course.id}>
          <CourseProgressCard course={course} />
        </li>
      ))}
    </ul>
  )
}
