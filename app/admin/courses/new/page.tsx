import type { Metadata } from 'next'
import { NewCoursePage } from '@/components/admin/courses/course-editor-pages'

export const metadata: Metadata = { title: 'New course' }

export default function AdminNewCoursePage() {
  return <NewCoursePage />
}
