import { ArrowRight, BookOpen, CircleCheck, Clock, Layers, Lock } from 'lucide-react'
import Link from 'next/link'
import { BookStatic } from '@/components/ui-kit/book-3d/book-static'
import { BookeyBadge } from '@/components/ui-kit/bookey-badge'
import { BookeyButton } from '@/components/ui-kit/bookey-button'
import { formatMinutes, getCoursePosition, getTotalMinutes, type LearningCourse } from '@/lib/mock/learning'
import { cn } from '@/lib/utils'
import { getCourseStatus } from './course-meta'

const ACTION_LABEL = {
  locked: 'View outline',
  completed: 'Review course',
  'in-progress': 'Continue',
  'not-started': 'View course',
} as const

export function CourseCard({ course, view }: { course: LearningCourse; view: 'grid' | 'list' }) {
  const status = getCourseStatus(course)
  const { totalPages } = getCoursePosition(course)
  const isList = view === 'list'

  return (
    <article
      aria-labelledby={`course-${course.id}-title`}
      className={cn(
        'group flex overflow-hidden rounded-3xl border border-border bg-card text-card-foreground transition-[border-color,box-shadow] duration-200 hover:border-primary/40 hover:shadow-[0_18px_40px_-24px_rgb(225_29_72/0.45)]',
        isList ? 'flex-col sm:flex-row' : 'flex-col',
      )}
    >
      <div
        className={cn('relative grid shrink-0 place-items-center overflow-hidden', isList ? 'aspect-[4/3] sm:aspect-auto sm:w-52' : 'aspect-[4/3]')}
        style={{ background: `linear-gradient(150deg, ${course.cover.accent}55, ${course.cover.spine}33)` }}
      >
        <BookStatic
          title={course.title}
          author={course.author}
          cover={course.cover}
          className="size-full py-4 transition-transform duration-500 ease-out group-hover:-translate-y-1 motion-reduce:transition-none [&>div]:w-[46%]"
        />
        {status.kind === 'locked' && (
          <span className="absolute top-3 right-3 grid size-8 place-items-center rounded-full bg-card/90 text-foreground">
            <Lock aria-hidden="true" className="size-4" />
            <span className="sr-only">Locked</span>
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-4 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <BookeyBadge tone="soft">{course.category}</BookeyBadge>
          <BookeyBadge tone="outline">{course.level}</BookeyBadge>
        </div>

        <div className="space-y-1.5">
          <h2 id={`course-${course.id}-title`} className="font-display text-xl font-bold text-balance">
            {course.title}
          </h2>
          <p className="text-sm leading-relaxed text-pretty text-muted-foreground">{course.subtitle}</p>
        </div>

        <dl className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Layers aria-hidden="true" className="size-4" />
            <dt className="sr-only">Chapters</dt>
            <dd>{course.chapters.length} chapters</dd>
          </div>
          <div className="flex items-center gap-1.5">
            <BookOpen aria-hidden="true" className="size-4" />
            <dt className="sr-only">Pages</dt>
            <dd>{totalPages} pages</dd>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock aria-hidden="true" className="size-4" />
            <dt className="sr-only">Estimated duration</dt>
            <dd>{formatMinutes(getTotalMinutes(course))}</dd>
          </div>
        </dl>

        <div className="mt-auto space-y-3">
          <CourseStatusLine courseTitle={course.title} status={status} />
          <BookeyButton
            variant={status.kind === 'in-progress' ? 'primary' : 'outline'}
            className="w-full"
            nativeButton={false}
            render={<Link href={`/courses/${course.id}`} aria-label={`${ACTION_LABEL[status.kind]}: ${course.title}`} />}
          >
            {ACTION_LABEL[status.kind]}
            <ArrowRight aria-hidden="true" />
          </BookeyButton>
        </div>
      </div>
    </article>
  )
}

function CourseStatusLine({ courseTitle, status }: { courseTitle: string; status: ReturnType<typeof getCourseStatus> }) {
  if (status.kind === 'in-progress') {
    return (
      <div className="space-y-1.5">
        <p className="text-xs font-medium text-foreground">{status.label}</p>
        <div
          role="progressbar"
          aria-label={`${courseTitle} demo progress`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={status.percent}
          className="h-1.5 overflow-hidden rounded-full bg-muted"
        >
          <div className="h-full rounded-full bg-primary" style={{ width: `${status.percent}%` }} />
        </div>
      </div>
    )
  }

  return (
    <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
      {status.kind === 'locked' && <Lock aria-hidden="true" className="size-3.5" />}
      {status.kind === 'completed' && <CircleCheck aria-hidden="true" className="size-3.5 text-primary" />}
      {status.label}
    </p>
  )
}
