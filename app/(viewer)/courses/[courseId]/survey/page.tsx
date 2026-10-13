import { Lock } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { BookClientProvider } from '@/lib/book-client/react'
import { SurveyExperience } from '@/components/survey/survey-experience'
import { BookeyButton } from '@/components/ui-kit/bookey-button'
import { EmptyState } from '@/components/ui-kit/empty-state'
import { getLearningCourse, learningCourses } from '@/lib/mock/learning'

interface SurveyPageProps {
  params: Promise<{ courseId: string }>
}

export function generateStaticParams() {
  return learningCourses.map((course) => ({ courseId: course.id }))
}

export async function generateMetadata({ params }: SurveyPageProps): Promise<Metadata> {
  const { courseId } = await params
  const course = getLearningCourse(courseId)
  return {
    title: course ? `Personalize · ${course.title}` : 'Course not found',
    description: course ? `Tune ${course.title} to your level, interests, language, and pace.` : undefined,
  }
}

export default async function CourseSurveyPage({ params }: SurveyPageProps) {
  const { courseId } = await params
  const course = getLearningCourse(courseId)
  if (!course) notFound()

  if (!course.available) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-3xl items-center px-4 py-10">
        <EmptyState
          icon={<Lock />}
          title={`${course.title} is locked in this demo`}
          description="This book's pages aren't included in the preview, so there's nothing to personalize yet."
          action={
            <BookeyButton nativeButton={false} render={<Link href="/courses" />}>
              Back to catalog
            </BookeyButton>
          }
        />
      </main>
    )
  }

  return (
    <main>
      <BookClientProvider>
        <SurveyExperience course={course} />
      </BookClientProvider>
    </main>
  )
}
