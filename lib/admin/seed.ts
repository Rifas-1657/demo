import { learningCourses } from '@/lib/mock/learning'
import type { AdminCourse, AdminDocument, DemoMember, TutorSettings } from './types'

/** Fixed "today" for the demo so every timestamp stays deterministic. */
export const DEMO_TODAY = '2026-10-10T12:00:00Z'

const EDIT_DATES = ['2026-10-08T14:20:00Z', '2026-10-03T09:45:00Z', '2026-09-26T16:10:00Z', '2026-09-18T11:30:00Z']

export const seedCourses: AdminCourse[] = [
  ...learningCourses.map<AdminCourse>((course, index) => ({
    id: `course_${course.id}`,
    sourceId: course.id,
    title: course.title,
    slug: course.id,
    description: course.description,
    language: course.language,
    level: course.level,
    coverColor: course.cover.base,
    chapters: course.chapters.map((chapter) => ({
      id: `${course.id}_ch${chapter.number}`,
      title: chapter.title,
      pages: chapter.pages,
    })),
    status: 'published',
    updatedAt: EDIT_DATES[index % EDIT_DATES.length],
  })),
  {
    id: 'course_sql-analysts',
    sourceId: null,
    title: 'SQL for Analysts',
    slug: 'sql-for-analysts',
    description: 'Query real-looking datasets with SELECT, JOIN, and GROUP BY, then turn the results into answers a team can act on.',
    language: 'SQL',
    level: 'Intermediate',
    coverColor: '#0F766E',
    chapters: [
      { id: 'sql_ch1', title: 'Selecting rows', pages: 6 },
      { id: 'sql_ch2', title: 'Filtering and sorting', pages: 7 },
      { id: 'sql_ch3', title: 'Joins', pages: 9 },
    ],
    status: 'draft',
    updatedAt: '2026-10-09T10:05:00Z',
  },
]

export const seedMembers: DemoMember[] = [
  {
    id: 'member_mara',
    name: 'Mara Okafor',
    email: 'mara.okafor@demo.example',
    courseIds: ['course_python', 'course_web-development'],
    lastActiveAt: '2026-10-09T18:12:00Z',
    status: 'active',
  },
  {
    id: 'member_theo',
    name: 'Theo Lindgren',
    email: 'theo.lindgren@demo.example',
    courseIds: ['course_java'],
    lastActiveAt: '2026-10-07T08:30:00Z',
    status: 'active',
  },
  {
    id: 'member_ines',
    name: 'Inés Carvalho',
    email: 'ines.carvalho@demo.example',
    courseIds: ['course_machine-learning', 'course_python'],
    lastActiveAt: '2026-10-04T21:47:00Z',
    status: 'active',
  },
  {
    id: 'member_ravi',
    name: 'Ravi Menon',
    email: 'ravi.menon@demo.example',
    courseIds: ['course_sql-analysts'],
    lastActiveAt: null,
    status: 'invited',
  },
]

export const seedDocuments: AdminDocument[] = [
  {
    id: 'doc_style',
    name: 'python-style-notes.md',
    type: 'MD',
    size: 18_432,
    lastModified: '2026-09-29T10:00:00Z',
    courseId: 'course_python',
    stage: 'ready',
    progress: 100,
    instructions: 'Prefer short examples that follow these naming conventions.',
    sample: true,
  },
  {
    id: 'doc_java',
    name: 'java-oop-glossary.pdf',
    type: 'PDF',
    size: 1_284_096,
    lastModified: '2026-09-21T15:30:00Z',
    courseId: 'course_java',
    stage: 'ready',
    progress: 100,
    instructions: '',
    sample: true,
  },
]

export const defaultTutorSettings: TutorSettings = {
  narrationLanguage: 'en-US',
  speakingSpeed: 1,
  explanationStyle: 'balanced',
  captions: true,
  animation: 'full',
  voice: 'ember',
  applyToAllCourses: true,
  scopedCourseIds: [],
}

export const overviewMetrics = {
  activeReaders: 27,
  booksOpened: 184,
  questionsAsked: 412,
}

export const activitySeries = [
  { day: 'Sep 27', readers: 12, questions: 18 },
  { day: 'Sep 28', readers: 9, questions: 11 },
  { day: 'Sep 29', readers: 15, questions: 24 },
  { day: 'Sep 30', readers: 18, questions: 29 },
  { day: 'Oct 1', readers: 16, questions: 22 },
  { day: 'Oct 2', readers: 21, questions: 35 },
  { day: 'Oct 3', readers: 19, questions: 31 },
  { day: 'Oct 4', readers: 11, questions: 14 },
  { day: 'Oct 5', readers: 13, questions: 17 },
  { day: 'Oct 6', readers: 22, questions: 38 },
  { day: 'Oct 7', readers: 24, questions: 41 },
  { day: 'Oct 8', readers: 23, questions: 36 },
  { day: 'Oct 9', readers: 27, questions: 44 },
  { day: 'Oct 10', readers: 20, questions: 27 },
]

export const recentAdminActivity = [
  { id: 'act_1', who: 'Mara Okafor', what: 'finished chapter 5 of Python from Zero', when: '2026-10-09T18:12:00Z' },
  { id: 'act_2', who: 'Inés Carvalho', what: 'asked the tutor 6 questions in Machine Learning Basics', when: '2026-10-09T15:40:00Z' },
  { id: 'act_3', who: 'Demo owner', what: 'saved SQL for Analysts as a draft', when: '2026-10-09T10:05:00Z' },
  { id: 'act_4', who: 'Theo Lindgren', what: 'opened Java Foundations', when: '2026-10-07T08:30:00Z' },
  { id: 'act_5', who: 'Demo owner', what: 'invited Ravi Menon (simulated)', when: '2026-10-06T12:00:00Z' },
]
