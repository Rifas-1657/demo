'use client'

import { useEffect, useMemo } from 'react'
import type { LearningCourse } from '@/lib/mock/learning'
import { rehydrateAdminDemo, useAdminDemo } from '@/lib/stores/admin-demo'

/**
 * Applies local admin demo edits (title, description, level, language, cover
 * color, publish state) to the public catalog. Chapter edits stay admin-only
 * because reader content is tied to the original chapter structure.
 */
export function usePublicCourses(courses: LearningCourse[]) {
  const hydrated = useAdminDemo((s) => s.hydrated)
  const adminCourses = useAdminDemo((s) => s.courses)

  useEffect(() => {
    rehydrateAdminDemo()
  }, [])

  return useMemo(() => {
    if (!hydrated) return courses
    return courses.flatMap((course) => {
      const admin = adminCourses.find((c) => c.sourceId === course.id)
      if (!admin) return [course]
      if (admin.status === 'draft') return []
      return [
        {
          ...course,
          title: admin.title,
          description: admin.description,
          level: admin.level,
          language: admin.language,
          cover: admin.coverColor === course.cover.base ? course.cover : { ...course.cover, base: admin.coverColor },
        },
      ]
    })
  }, [hydrated, adminCourses, courses])
}
