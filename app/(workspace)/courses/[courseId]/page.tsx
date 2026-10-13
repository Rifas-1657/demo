import { ChevronLeft } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChapterList } from '@/components/courses/chapter-list'
import { CourseHero } from '@/components/courses/course-hero'
import { CourseOverview, CourseStartCard } from '@/components/courses/course-sections'
import { getLearningCourse, learningCourses } from '@/lib/mock/learning'

export function generateStaticParams() {
  return learningCourses.map((course) => ({ courseId: course.id }))
}

export async function generateMetadata({ params }: { params: Promise<{ courseId: string }> }): Promise<Metadata> {
  const { courseId } = await params
  const course = getLearningCourse(courseId)
  return course ? { title: course.title, description: course.subtitle } : { title: 'Course not found' }
}

export default async function CourseDetailPage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params
  const course = getLearningCourse(courseId)
  if (!course) notFound()

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 lg:gap-8">
      <nav aria-label="Breadcrumb">
        <Link
          href="/courses"
          className="inline-flex items-center gap-1 rounded-full text-sm font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:ring-4 focus-visible:ring-ring/30"
        >
          <ChevronLeft aria-hidden="true" className="size-4" />
          All courses
        </Link>
      </nav>

      <CourseHero course={course} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-8">
        <aside aria-label="Start this course" className="lg:sticky lg:top-24 lg:col-start-2 lg:row-start-1">
          <CourseStartCard course={course} />
        </aside>
        <div className="flex min-w-0 flex-col gap-6 lg:col-start-1 lg:row-start-1">
          <CourseOverview course={course} />
          <ChapterList course={course} />
        </div>
      </div>
    </div>
  )
}
