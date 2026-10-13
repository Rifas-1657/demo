'use client'

import type { LearningCourse } from '@/lib/mock/learning'
import { useHydrated } from '@/lib/stores/personalization'
import { SurveyWizard } from './survey-wizard'

/** Saved answers live in localStorage, so wait for the client before seeding the wizard. */
export function SurveyExperience({ course }: { course: LearningCourse }) {
  const hydrated = useHydrated()

  if (!hydrated) {
    return (
      <div className="flex min-h-dvh flex-col gap-6 px-4 py-6 sm:px-8 lg:px-14" aria-busy="true">
        <span className="sr-only">Loading your personalization survey</span>
        <div className="h-10 w-48 animate-pulse rounded-full bg-muted" />
        <div className="h-1.5 w-full animate-pulse rounded-full bg-muted" />
        <div className="mx-auto mt-16 flex w-full max-w-2xl flex-col gap-4 lg:mx-0">
          <div className="h-4 w-40 animate-pulse rounded-full bg-muted" />
          <div className="h-16 w-full animate-pulse rounded-2xl bg-muted" />
          <div className="h-24 w-full animate-pulse rounded-2xl bg-muted" />
          <div className="h-24 w-full animate-pulse rounded-2xl bg-muted" />
        </div>
      </div>
    )
  }

  return <SurveyWizard course={course} />
}
