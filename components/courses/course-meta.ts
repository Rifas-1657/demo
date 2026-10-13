import { getCoursePosition, type LearningCourse } from '@/lib/mock/learning'

export type CourseStatusKind = 'locked' | 'completed' | 'in-progress' | 'not-started'

export interface CourseStatus {
  kind: CourseStatusKind
  label: string
  percent: number
}

export function getCourseStatus(course: LearningCourse): CourseStatus {
  const position = getCoursePosition(course)
  if (!course.available) return { kind: 'locked', label: 'Locked in demo', percent: 0 }
  if (position.finished) return { kind: 'completed', label: 'Completed', percent: 100 }
  if (position.started) return { kind: 'in-progress', label: `In progress · ${position.percent}%`, percent: position.percent }
  return { kind: 'not-started', label: 'Not started', percent: 0 }
}

export function getStartLabel(course: LearningCourse) {
  const { kind } = getCourseStatus(course)
  if (kind === 'in-progress') return 'Resume course'
  if (kind === 'completed') return 'Read again'
  return 'Start course'
}
