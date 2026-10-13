import { BookeyBadge } from '@/components/ui-kit/bookey-badge'
import { GlowCard } from '@/components/ui-kit/glow-card'
import { ProgressRing } from '@/components/ui-kit/progress-ring'
import { getCoursePosition, getTotalMinutes, learningCourses, weeklyActivity } from '@/lib/mock/learning'
import { DsSection } from './ds-section'
import { WeeklyChart } from './weekly-chart'

export function CardsProgressSection() {
  const weekly = weeklyActivity
  const weekTotal = weekly.reduce((sum, day) => sum + day.minutes, 0)

  return (
    <DsSection
      id="cards"
      index="04"
      label="Cards & progress"
      title="Progress you can trust."
      description="Every figure is derived from the shared mock catalog, so page counts, rings, and charts always agree."
    >
      <div className="grid gap-6 md:grid-cols-3">
        {learningCourses.slice(0, 3).map((course) => {
          const position = getCoursePosition(course)
          const stats = {
            chapterCount: course.chapters.length,
            pageCount: position.totalPages,
            totalMinutes: getTotalMinutes(course),
          }
          return (
            <GlowCard key={course.id} className="flex flex-col gap-5 p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 space-y-2">
                  <BookeyBadge tone="soft">{course.level}</BookeyBadge>
                  <h3 className="text-xl font-semibold">{course.title}</h3>
                  <p className="text-sm text-muted-foreground">{course.author}</p>
                </div>
                <ProgressRing
                  value={position.percent}
                  size={72}
                  strokeWidth={7}
                  label={`${course.title} progress`}
                  caption={`${position.completedPages}/${position.totalPages}`}
                />
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">{course.subtitle}</p>
              <dl className="mt-auto grid grid-cols-3 gap-2 border-t pt-4 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">Chapters</dt>
                  <dd className="font-semibold">{stats.chapterCount}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Pages</dt>
                  <dd className="font-semibold">{stats.pageCount}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Minutes</dt>
                  <dd className="font-semibold">{stats.totalMinutes}</dd>
                </div>
              </dl>
            </GlowCard>
          )
        })}
      </div>

      <div className="mt-6 rounded-3xl border bg-card p-6">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-lg font-semibold">This week</h3>
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{weekTotal} min</span> across all courses · sample data
          </p>
        </div>
        <WeeklyChart data={weekly} />
      </div>
    </DsSection>
  )
}
