import type { Metadata } from 'next'
import { EditCoursePage } from '@/components/admin/courses/course-editor-pages'

export const metadata: Metadata = { title: 'Edit course' }

export default async function AdminEditCoursePage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params
  return <EditCoursePage courseId={courseId} />
}
