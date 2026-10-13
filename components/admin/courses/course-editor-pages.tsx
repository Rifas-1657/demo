'use client'

import { BookX } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { BookeyButton } from '@/components/ui-kit/bookey-button'
import { EmptyState } from '@/components/ui-kit/empty-state'
import { DEMO_TODAY } from '@/lib/admin/seed'
import type { AdminCourse } from '@/lib/admin/types'
import { newId } from '@/lib/admin/utils'
import { useAdminDemo } from '@/lib/stores/admin-demo'
import { CourseForm } from './course-form'

export function NewCoursePage() {
  const [initial] = useState<AdminCourse>(() => ({
    id: newId('course'),
    sourceId: null,
    title: '',
    slug: '',
    description: '',
    language: '',
    level: 'Beginner',
    coverColor: '#BE123C',
    chapters: [{ id: newId('ch'), title: '', pages: 5 }],
    status: 'draft',
    updatedAt: DEMO_TODAY,
  }))
  return <CourseForm initial={initial} mode="new" />
}

export function EditCoursePage({ courseId }: { courseId: string }) {
  const course = useAdminDemo((s) => s.courses.find((c) => c.id === courseId))
  if (!course) {
    return (
      <EmptyState
        icon={<BookX aria-hidden="true" />}
        title="Course not found"
        description="This demo course doesn't exist in this browser. It may have been reset."
        action={
          <BookeyButton nativeButton={false} render={<Link href="/admin/courses" />}>
            Back to courses
          </BookeyButton>
        }
      />
    )
  }
  return <CourseForm key={course.id} initial={course} mode="edit" />
}
