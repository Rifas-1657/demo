import { ArrowRight, BookOpen, CircleCheck, ListChecks, NotebookPen } from 'lucide-react'
import Link from 'next/link'
import { WeeklyChart } from '@/components/design-system/weekly-chart'
import { BookeyBadge } from '@/components/ui-kit/bookey-badge'
import { BookeyButton } from '@/components/ui-kit/bookey-button'
import {
  getCoursePosition,
  getLearningCourse,
  learningCourses,
  recentActivity,
  weeklyActivity,
  type ActivityEvent,
} from '@/lib/mock/learning'
import { DashboardPanel } from './dashboard-panel'

export function WeeklyActivity() {
  const total = weeklyActivity.reduce((sum, day) => sum + day.minutes, 0)
  const activeDays = weeklyActivity.filter((day) => day.minutes > 0).length

  return (
    <DashboardPanel
      id="weekly"
      title="Weekly learning activity"
      description={`${total} minutes across ${activeDays} days`}
      action={<BookeyBadge tone="neutral">Demo data</BookeyBadge>}
    >
      <WeeklyChart data={weeklyActivity} />
    </DashboardPanel>
  )
}

const EVENT_ICON: Record<ActivityEvent['kind'], typeof BookOpen> = {
  page: BookOpen,
  chapter: CircleCheck,
  quiz: ListChecks,
  note: NotebookPen,
}

export function RecentActivity() {
  return (
    <DashboardPanel id="recent" title="Recent activity" description="Your last few sessions.">
      <ol className="relative flex flex-col gap-5 before:absolute before:top-2 before:bottom-2 before:left-[1.0625rem] before:w-px before:bg-border">
        {recentActivity.map((event) => {
          const Icon = EVENT_ICON[event.kind]
          const course = getLearningCourse(event.courseId)
          return (
            <li key={event.id} className="relative flex gap-3">
              <span className="relative grid size-9 shrink-0 place-items-center rounded-full border border-border bg-card text-primary">
                <Icon aria-hidden="true" className="size-4" />
              </span>
              <div className="min-w-0 pt-1">
                <p className="text-sm leading-snug">{event.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {course?.title} · {event.when}
                </p>
              </div>
            </li>
          )
        })}
      </ol>
    </DashboardPanel>
  )
}

export function RecommendedNext() {
  const recommended = learningCourses.find((course) => !getCoursePosition(course).started) ?? learningCourses[0]
  const firstChapter = recommended.chapters[0]
  const { totalPages } = getCoursePosition(recommended)

  return (
    <DashboardPanel id="recommended" title="Recommended next" description="A good fit after your Python chapters.">
      <div className="flex flex-1 flex-col gap-4 rounded-2xl p-4" style={{ background: recommended.cover.base, color: recommended.cover.text }}>
        <span className="font-mono text-[10px] tracking-[0.2em] uppercase opacity-80">
          {recommended.level} · {totalPages} pages
        </span>
        <div>
          <h3 className="font-display text-xl font-bold text-balance">{recommended.title}</h3>
          <p className="mt-1 text-sm opacity-85">{recommended.subtitle}</p>
        </div>
        <p className="text-xs opacity-80">
          Starts with Chapter 1, &ldquo;{firstChapter.title}&rdquo; · {firstChapter.pages} pages
        </p>
      </div>
      <BookeyButton
        variant="outline"
        className="mt-4 w-full"
        nativeButton={false}
        render={<Link href={`/book/${recommended.id}`} />}
      >
        Start reading
        <ArrowRight aria-hidden="true" />
      </BookeyButton>
    </DashboardPanel>
  )
}
