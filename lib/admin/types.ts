import type { CourseLevel, LearningCourseId } from '@/lib/mock/learning'
import type { NarrationRate } from '@/types/book'

export type AdminCourseStatus = 'published' | 'draft'

export interface AdminChapter {
  id: string
  title: string
  pages: number
}

export interface AdminCourse {
  id: string
  /** Links the admin record to a public demo course so edits can sync to the catalog. */
  sourceId: LearningCourseId | null
  title: string
  slug: string
  description: string
  language: string
  level: CourseLevel
  coverColor: string
  chapters: AdminChapter[]
  status: AdminCourseStatus
  updatedAt: string
}

export type DocumentType = 'PDF' | 'DOCX' | 'MD' | 'TXT'
export type DocumentStage = 'selected' | 'processing' | 'ready'

/** Metadata only — file contents are never read or stored. */
export interface AdminDocument {
  id: string
  name: string
  type: DocumentType
  size: number
  lastModified: string
  courseId: string | null
  stage: DocumentStage
  progress: number
  instructions: string
  sample: boolean
}

export interface DemoMember {
  id: string
  name: string
  email: string
  courseIds: string[]
  lastActiveAt: string | null
  status: 'active' | 'invited'
}

export type ExplanationStyle = 'concise' | 'balanced' | 'detailed'
export type AnimationPreference = 'full' | 'reduced' | 'off'
export type SampleVoice = 'ember' | 'sage' | 'atlas'

export interface TutorSettings {
  narrationLanguage: string
  speakingSpeed: NarrationRate
  explanationStyle: ExplanationStyle
  captions: boolean
  animation: AnimationPreference
  voice: SampleVoice
  applyToAllCourses: boolean
  scopedCourseIds: string[]
}
