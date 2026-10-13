'use client'

import { ArrowLeft, Lock, Play } from 'lucide-react'
import Link from 'next/link'
import { BookeyButton, type BookeyButtonProps } from '@/components/ui-kit/bookey-button'
import { ModalDialog } from '@/components/ui-kit/overlays'
import type { LearningCourse } from '@/lib/mock/learning'
import { getStartLabel } from './course-meta'
import { getBookHref, useCourseSurvey } from './use-course-survey'

interface CourseStartButtonProps {
  course: LearningCourse
  /** Open the book at a specific chapter instead of the saved position. */
  chapter?: number
  label?: string
  size?: BookeyButtonProps['size']
  variant?: BookeyButtonProps['variant']
  className?: string
}

export function CourseStartButton({ course, chapter, label, size = 'lg', variant = 'primary', className }: CourseStartButtonProps) {
  const { completed } = useCourseSurvey(course)

  if (!course.available) {
    return (
      <ModalDialog
        title={`${course.title} is locked in this demo`}
        description="This book is part of the demo catalog so you can explore its outline, but its pages aren't included yet. There's nothing to buy — it simply isn't available to read in this preview."
        trigger={
          <BookeyButton size={size} variant={variant} className={className}>
            <Lock aria-hidden="true" />
            {label ?? 'Start course'}
          </BookeyButton>
        }
        footer={
          <BookeyButton variant="primary" className="w-full sm:w-auto" nativeButton={false} render={<Link href="/courses" />}>
            <ArrowLeft aria-hidden="true" />
            Back to catalog
          </BookeyButton>
        }
      >
        <p className="text-sm text-muted-foreground">
          Try <strong className="font-semibold text-foreground">Python from Zero</strong> or{' '}
          <strong className="font-semibold text-foreground">Java Foundations</strong> to see the full reading experience.
        </p>
      </ModalDialog>
    )
  }

  const href = completed ? getBookHref(course.id, chapter) : `/courses/${course.id}/survey`

  return (
    <BookeyButton size={size} variant={variant} className={className} nativeButton={false} render={<Link href={href} />}>
      <Play aria-hidden="true" className="fill-current" />
      {label ?? getStartLabel(course)}
    </BookeyButton>
  )
}
