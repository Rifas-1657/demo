import type { Metadata } from 'next'
import { AdminCourses } from '@/components/admin/courses/admin-courses'

export const metadata: Metadata = { title: 'Courses' }

export default function AdminCoursesPage() {
  return <AdminCourses />
}
