import { Bot, Check, Hammer } from 'lucide-react'
import { BookeyBadge } from '@/components/ui-kit/bookey-badge'
import { formatMinutes, getCoursePosition, getRemainingMinutes, getTotalMinutes, type LearningCourse } from '@/lib/mock/learning'
import { cn } from '@/lib/utils'
import { getCourseStatus } from './course-meta'
import { CourseStartButton } from './course-start-button'

function Panel({ id, title, children, className }: { id: string; title: string; children: React.ReactNode; className?: string }) {
  return (
    <section aria-labelledby={`${id}-heading`} className={cn('rounded-3xl border border-border bg-card p-5 sm:p-6', className)}>
      <h2 id={`${id}-heading`} className="mb-4 font-display text-xl font-semibold">
        {title}
      </h2>
      {children}
    </section>
  )
}

export function CourseOverview({ course }: { course: LearningCourse }) {
  return (
    <>
      <Panel id="summary" title="Course summary">
        <p className="leading-relaxed text-pretty text-muted-foreground">{course.subtitle}</p>
        <p className="mt-3 leading-relaxed text-pretty">{course.description}</p>
      </Panel>

      <Panel id="outcomes" title="What you'll learn">
        <ul className="grid gap-3 sm:grid-cols-2">
          {course.outcomes.map((outcome) => (
            <li key={outcome} className="flex gap-3 text-sm leading-relaxed">
              <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-secondary text-secondary-foreground">
                <Check aria-hidden="true" className="size-3" />
              </span>
              {outcome}
            </li>
          ))}
        </ul>
      </Panel>

      <div className="grid gap-6 md:grid-cols-2">
        <Panel id="build" title="What you'll build" className="bg-book-paper text-book-ink dark:bg-card dark:text-card-foreground">
          <div className="flex gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-book-marker/40 text-book-ink dark:bg-secondary dark:text-secondary-foreground">
              <Hammer aria-hidden="true" className="size-5" />
            </span>
            <div>
              <h3 className="font-semibold">{course.project.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-book-muted dark:text-muted-foreground">{course.project.description}</p>
              <p className="mt-2 text-xs text-book-muted dark:text-muted-foreground">
                Built in chapter {course.chapters.length}, “{course.chapters.at(-1)?.title}”.
              </p>
            </div>
          </div>
        </Panel>

        <Panel id="tutor" title="Your tutor">
          <div className="flex gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-secondary text-secondary-foreground">
              <Bot aria-hidden="true" className="size-5" />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-semibold">Bookey Tutor</h3>
                <BookeyBadge tone="neutral">Product demo</BookeyBadge>
              </div>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{course.tutorStyle}</p>
              <p className="mt-2 text-xs text-muted-foreground">An AI teaching style for this demo — not a real instructor.</p>
            </div>
          </div>
        </Panel>
      </div>

      <Panel id="topics" title="Tools and topics">
        <ul className="flex flex-wrap gap-2">
          {course.topics.map((topic) => (
            <li key={topic}>
              <BookeyBadge tone="outline" className="px-3 py-1 text-sm">
                {topic}
              </BookeyBadge>
            </li>
          ))}
        </ul>
      </Panel>
    </>
  )
}

export function CourseStartCard({ course }: { course: LearningCourse }) {
  const position = getCoursePosition(course)
  const status = getCourseStatus(course)

  return (
    <section aria-labelledby="start-card-heading" className="rounded-3xl border border-border bg-card p-5 shadow-[0_24px_60px_-40px_rgb(31_10_16/0.5)] sm:p-6">
      <p className="font-mono text-[11px] tracking-[0.18em] text-primary uppercase">{status.label}</p>
      <h2 id="start-card-heading" className="mt-2 font-display text-xl font-semibold text-balance">
        {status.kind === 'in-progress'
          ? `Chapter ${position.chapter.number} · ${position.chapter.title}`
          : status.kind === 'locked'
            ? 'Preview the outline'
            : `Begin with “${course.chapters[0].title}”`}
      </h2>

      {status.kind === 'in-progress' && (
        <div className="mt-4 space-y-2">
          <div className="flex items-baseline justify-between text-sm">
            <span>
              <span className="font-semibold tabular-nums">{position.completedPages}</span>
              <span className="text-muted-foreground"> of {position.totalPages} pages</span>
            </span>
            <span className="font-mono text-xs text-muted-foreground">{position.percent}%</span>
          </div>
          <div
            role="progressbar"
            aria-label={`${course.title} demo progress`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={position.percent}
            className="h-2 overflow-hidden rounded-full bg-muted"
          >
            <div className="h-full rounded-full bg-primary" style={{ width: `${position.percent}%` }} />
          </div>
        </div>
      )}

      <dl className="mt-5 divide-y divide-border text-sm">
        {[
          ['Chapters', `${course.chapters.length}`],
          ['Pages', `${position.totalPages}`],
          ['Study time', formatMinutes(getTotalMinutes(course))],
          ...(status.kind === 'in-progress' ? [['Time left', `About ${formatMinutes(getRemainingMinutes(course))}`]] : []),
          ['Level', course.level],
        ].map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4 py-2.5">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="font-medium tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>

      <CourseStartButton course={course} className="mt-5 w-full" />
      <p className="mt-3 text-center text-xs text-muted-foreground">
        {course.available ? 'Free in this demo · progress stays on this device' : 'Not included in this demo preview'}
      </p>
    </section>
  )
}
