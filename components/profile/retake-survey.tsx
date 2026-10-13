'use client'

import { ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { useId, useState } from 'react'
import { BookeyButton } from '@/components/ui-kit/bookey-button'
import { learningCourses, type LearningCourseId } from '@/lib/mock/learning'

/** Picks a course first; `initialCourse` preselects it when the page was opened from a course. */
export function RetakeSurvey({ initialCourse }: { initialCourse?: LearningCourseId }) {
  const selectId = useId()
  const [courseId, setCourseId] = useState<LearningCourseId | ''>(initialCourse ?? '')

  return (
    <div className="flex flex-col gap-3 py-3 sm:flex-row sm:items-end">
      <div className="flex flex-1 flex-col gap-1.5">
        <label htmlFor={selectId} className="text-sm font-medium">
          Course to personalize
        </label>
        <select
          id={selectId}
          value={courseId}
          onChange={(event) => setCourseId(event.target.value as LearningCourseId | '')}
          className="h-11 rounded-2xl border border-input bg-background px-3 text-sm outline-none focus-visible:ring-4 focus-visible:ring-ring/30"
        >
          <option value="">Choose a course…</option>
          {learningCourses.map((course) => (
            <option key={course.id} value={course.id}>
              {course.title}
            </option>
          ))}
        </select>
      </div>
      {courseId ? (
        <BookeyButton variant="outline" nativeButton={false} render={<Link href={`/courses/${courseId}/survey`} />}>
          Retake personalization survey
          <ArrowRight aria-hidden="true" />
        </BookeyButton>
      ) : (
        <BookeyButton variant="outline" disabled>
          Retake personalization survey
        </BookeyButton>
      )}
    </div>
  )
}
