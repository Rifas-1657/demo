import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { BookReader } from '@/components/book/book-reader'
import { BookClientProvider } from '@/lib/book-client/react'
import { getBookPages } from '@/lib/mock/book-pages'
import { getLearningCourse, learningCourses } from '@/lib/mock/learning'

interface BookPageProps {
  params: Promise<{ courseId: string }>
  searchParams: Promise<{ chapter?: string; page?: string }>
}

export function generateStaticParams() {
  return learningCourses.map((course) => ({ courseId: course.id }))
}

export async function generateMetadata({ params }: BookPageProps): Promise<Metadata> {
  const { courseId } = await params
  const course = getLearningCourse(courseId)
  return {
    title: course ? `Reading ${course.title}` : 'Book not found',
    description: course ? `Read ${course.title} as an interactive, narrated book.` : undefined,
  }
}

function toPositiveInt(value: string | undefined) {
  if (!value) return undefined
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined
}

export default async function BookReaderPage({ params, searchParams }: BookPageProps) {
  const [{ courseId }, query] = await Promise.all([params, searchParams])
  const course = getLearningCourse(courseId)
  if (!course) notFound()

  return (
    <BookClientProvider>
      <BookReader
        course={{ id: course.id, title: course.title, chapters: course.chapters }}
        pages={getBookPages(course.id)}
        initialChapter={toPositiveInt(query.chapter)}
        initialPage={toPositiveInt(query.page)}
      />
    </BookClientProvider>
  )
}
