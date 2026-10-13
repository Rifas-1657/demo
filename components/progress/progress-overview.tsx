import { BookOpen, Clock, Flame, Layers } from 'lucide-react'
import { ProgressRing } from '@/components/ui-kit/progress-ring'
import { DashboardPanel } from '@/components/dashboard/dashboard-panel'
import { demoStreakDays, getCoursePosition, learningCourses } from '@/lib/mock/learning'
import { getOverallCompletion } from '@/lib/mock/progress'

function formatMinutes(minutes: number) {
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return hours > 0 ? `${hours}h ${rest}m` : `${rest}m`
}

export function ProgressOverview() {
  const overall = getOverallCompletion()
  const stats = [
    { icon: <BookOpen />, label: 'Pages read', value: `${overall.completed} of ${overall.total}` },
    { icon: <Layers />, label: 'Chapters done', value: String(overall.chaptersDone) },
    { icon: <Clock />, label: 'Time learning', value: formatMinutes(overall.minutes) },
    { icon: <Flame />, label: 'Current streak', value: `${demoStreakDays} days` },
  ]

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
      <DashboardPanel id="overall" title="Overall completion" description="Across every book in your demo library.">
        <div className="flex flex-col items-center gap-6 sm:flex-row lg:flex-col 2xl:flex-row">
          <ProgressRing
            value={overall.percent}
            size={132}
            strokeWidth={12}
            label="Overall demo completion"
            caption={`${overall.completed} of ${overall.total} pages`}
          />
          <dl className="grid w-full grid-cols-2 gap-3">
            {stats.map((stat) => (
              <div key={stat.label} className="rounded-2xl bg-muted/60 p-3">
                <dt className="flex items-center gap-1.5 text-xs text-muted-foreground [&_svg]:size-3.5">
                  <span aria-hidden="true">{stat.icon}</span>
                  {stat.label}
                </dt>
                <dd className="mt-1 font-display text-lg font-semibold tabular-nums">{stat.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </DashboardPanel>

      <DashboardPanel id="courses" title="Per-course progress" description="Pages read in each book.">
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {learningCourses.map((course) => {
            const position = getCoursePosition(course)
            return (
              <li key={course.id} className="flex flex-col items-center gap-2 text-center">
                <ProgressRing
                  value={position.percent}
                  size={88}
                  label={`${course.title} demo progress, ${position.completedPages} of ${position.totalPages} pages`}
                />
                <span className="text-sm font-medium text-balance">{course.title}</span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {position.completedPages}/{position.totalPages} pages
                </span>
              </li>
            )
          })}
        </ul>
      </DashboardPanel>
    </div>
  )
}
