/**
 * Demo progress analytics derived from the learning catalog seed. Nothing
 * here describes a real learner: numbers come from the fixed seed below and
 * from `completedPages` in `learning.ts`, so they always agree with the
 * dashboard.
 */
import {
  demoStreakDays,
  getChapterProgress,
  getCoursePosition,
  learningCourses,
  weeklyActivity,
  type LearningCourse,
  type LearningCourseId,
} from './learning'

export const HEATMAP_WEEKS = 12
export const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const

/** Small deterministic PRNG so the heatmap looks the same on server and client. */
function seeded(seed: number) {
  let state = seed
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296
    return state / 4294967296
  }
}

export interface HeatmapDay {
  week: number
  day: (typeof DAY_LABELS)[number]
  minutes: number
  level: 0 | 1 | 2 | 3 | 4
}

export function minutesToLevel(minutes: number): HeatmapDay['level'] {
  if (minutes === 0) return 0
  if (minutes < 15) return 1
  if (minutes < 25) return 2
  if (minutes < 35) return 3
  return 4
}

/** 12 weeks oldest → newest, Mon → Sun. The final week matches the dashboard chart. */
export const heatmap: HeatmapDay[][] = (() => {
  const random = seeded(42)
  return Array.from({ length: HEATMAP_WEEKS }, (_, week) =>
    DAY_LABELS.map((day, dayIndex) => {
      let minutes: number
      if (week === HEATMAP_WEEKS - 1) {
        minutes = weeklyActivity[dayIndex]?.minutes ?? 0
      } else {
        const ramp = 0.45 + (week / HEATMAP_WEEKS) * 0.4
        minutes = random() < ramp ? Math.round(6 + random() * 38) : 0
      }
      return { week, day, minutes, level: minutesToLevel(minutes) }
    }),
  )
})()

export const weeklyTotals = heatmap.map((days, index) => ({
  label: index === HEATMAP_WEEKS - 1 ? 'This wk' : `Wk ${index + 1}`,
  fullLabel: index === HEATMAP_WEEKS - 1 ? 'This week' : `${HEATMAP_WEEKS - 1 - index} weeks ago`,
  minutes: days.reduce((sum, day) => sum + day.minutes, 0),
}))

export function getHeatmapSummary() {
  const days = heatmap.flat()
  const active = days.filter((day) => day.minutes > 0)
  const total = days.reduce((sum, day) => sum + day.minutes, 0)
  const busiest = days.reduce((best, day) => (day.minutes > best.minutes ? day : best), days[0])
  let longest = 0
  let run = 0
  for (const day of days) {
    run = day.minutes > 0 ? run + 1 : 0
    longest = Math.max(longest, run)
  }
  return { activeDays: active.length, totalDays: days.length, totalMinutes: total, busiest, longestStreak: longest }
}

/** Demo quiz mastery for finished chapters, stable per course and chapter. */
export function getChapterMastery(course: LearningCourse) {
  const random = seeded(course.id.length * 97 + course.chapters.length)
  return getChapterProgress(course).map((entry) => {
    const roll = random()
    const mastery =
      entry.status === 'completed'
        ? Math.round(62 + roll * 36)
        : entry.status === 'in-progress'
          ? Math.round((entry.pagesRead / entry.chapter.pages) * 55)
          : 0
    return { ...entry, mastery }
  })
}

export function getOverallCompletion() {
  const positions = learningCourses.map((course) => getCoursePosition(course))
  const completed = positions.reduce((sum, p) => sum + p.completedPages, 0)
  const total = positions.reduce((sum, p) => sum + p.totalPages, 0)
  const minutes = learningCourses.reduce((sum, course) => sum + getCoursePosition(course).completedPages * course.minutesPerPage, 0)
  const chaptersDone = learningCourses.reduce(
    (sum, course) => sum + getChapterProgress(course).filter((c) => c.status === 'completed').length,
    0,
  )
  return {
    completed,
    total,
    percent: total === 0 ? 0 : Math.round((completed / total) * 100),
    minutes,
    chaptersDone,
    coursesStarted: positions.filter((p) => p.started).length,
  }
}

export interface RevisionTopic {
  id: string
  courseId: LearningCourseId
  chapter: number
  topic: string
  reason: string
  score: number
}

export const revisionTopics: RevisionTopic[] = [
  {
    id: 'rev_java_division',
    courseId: 'java',
    chapter: 3,
    topic: 'Integer vs. floating-point division',
    reason: 'Missed 2 of 3 quiz questions on 7 / 2',
    score: 33,
  },
  {
    id: 'rev_ml_features',
    courseId: 'machine-learning',
    chapter: 1,
    topic: 'Features vs. labels',
    reason: 'Recall check answered after a hint',
    score: 50,
  },
  {
    id: 'rev_py_types',
    courseId: 'python',
    chapter: 2,
    topic: 'Converting strings to numbers',
    reason: 'Code cell raised a ValueError twice',
    score: 58,
  },
  {
    id: 'rev_py_elif',
    courseId: 'python',
    chapter: 4,
    topic: 'Ordering elif conditions',
    reason: 'Predicted output was wrong once',
    score: 66,
  },
]

export interface Badge {
  id: string
  title: string
  description: string
  earned: boolean
  progress: string
}

export function getBadges(): Badge[] {
  const overall = getOverallCompletion()
  const best = Math.max(...learningCourses.map((course) => getCoursePosition(course).percent))
  const { longestStreak } = getHeatmapSummary()
  return [
    { id: 'first-page', title: 'First page', description: 'Read your first page in any book.', earned: overall.completed > 0, progress: `${overall.completed} pages read` },
    { id: 'chapter', title: 'Chapter finisher', description: 'Complete a whole chapter.', earned: overall.chaptersDone > 0, progress: `${overall.chaptersDone} chapters done` },
    { id: 'streak-5', title: 'Five-day streak', description: 'Learn five days in a row.', earned: demoStreakDays >= 5, progress: `Current streak ${demoStreakDays} days` },
    { id: 'explorer', title: 'Explorer', description: 'Start three different books.', earned: overall.coursesStarted >= 3, progress: `${overall.coursesStarted} of 3 started` },
    { id: 'halfway', title: 'Halfway there', description: 'Reach 50% in any book.', earned: best >= 50, progress: `Best book at ${best}%` },
    { id: 'marathon', title: 'Two-week run', description: 'Keep a 14-day learning streak.', earned: longestStreak >= 14, progress: `Longest run ${longestStreak} days` },
  ]
}
