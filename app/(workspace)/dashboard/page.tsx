import type { Metadata } from 'next'
import { CourseProgressGrid } from '@/components/dashboard/course-progress-grid'
import { ContinueBook } from '@/components/dashboard/continue-book'
import { RecentActivity, RecommendedNext, WeeklyActivity } from '@/components/dashboard/activity-panels'
import { DashboardEmpty, DevPreviewToggle } from '@/components/dashboard/dashboard-empty'
import { DashboardGreeting } from '@/components/dashboard/dashboard-greeting'
import { ResumeList } from '@/components/dashboard/resume-list'
import { TodaysPractice } from '@/components/dashboard/todays-practice'
import { featuredCourseId, getLearningCourse, learningCourses } from '@/lib/mock/learning'

export const metadata: Metadata = {
  title: 'Overview',
  description: 'Continue your book, practice for a few minutes, and track demo progress across your courses.',
}

interface DashboardPageProps {
  searchParams: Promise<{ preview?: string }>
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const { preview } = await searchParams
  const empty = process.env.NODE_ENV === 'development' && preview === 'empty'
  const featured = getLearningCourse(featuredCourseId) ?? learningCourses[0]

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 lg:gap-8">
      <DevPreviewToggle empty={empty} />
      <DashboardGreeting empty={empty} />

      {empty ? (
        <DashboardEmpty />
      ) : (
        <>
          <div className="grid gap-6 xl:grid-cols-3">
            <div className="xl:col-span-2">
              <ContinueBook course={featured} />
            </div>
            <TodaysPractice />
          </div>

          <section aria-labelledby="courses-heading" className="space-y-4">
            <div className="flex items-baseline justify-between gap-4">
              <h2 id="courses-heading" className="font-display text-lg font-semibold">
                Course progress
              </h2>
              <span className="text-xs text-muted-foreground">Demo progress · page counts are per book</span>
            </div>
            <CourseProgressGrid courses={learningCourses} />
          </section>

          <div className="grid gap-6 lg:grid-cols-3">
            <WeeklyActivity />
            <ResumeList courses={learningCourses} />
            <RecommendedNext />
          </div>

          <RecentActivity />
        </>
      )}
    </div>
  )
}
