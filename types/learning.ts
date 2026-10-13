export type CourseId = `course_${string}`
export type ChapterId = `chapter_${string}`
export type PageId = `page_${string}`
export type UserId = `user_${string}`
export type NotificationId = `notif_${string}`

export type CourseLevel = 'Foundations' | 'Intermediate' | 'Advanced'
export type CourseStatus = 'published' | 'draft' | 'review'

export type PageKind = 'reading' | 'exercise' | 'quiz' | 'reflection'

export interface BookPage {
  id: PageId
  chapterId: ChapterId
  order: number
  kind: PageKind
  title: string
  /** Short plain-text body used for previews and the reader canvas. */
  body: string
  estimatedMinutes: number
}

export interface Chapter {
  id: ChapterId
  courseId: CourseId
  order: number
  title: string
  summary: string
  pageIds: PageId[]
}

export interface Course {
  id: CourseId
  slug: string
  title: string
  subtitle: string
  author: string
  level: CourseLevel
  status: CourseStatus
  category: string
  /** Cover colors used by the 3D book and static fallback. */
  cover: BookCover
  chapterIds: ChapterId[]
  tags: string[]
  publishedAt: string
}

export interface BookCover {
  base: string
  spine: string
  accent: string
  text: string
}

export interface CourseProgress {
  userId: UserId
  courseId: CourseId
  completedPageIds: PageId[]
  lastPageId: PageId | null
  lastOpenedAt: string
  /** Minutes studied per day for the trailing week (oldest first). */
  weeklyMinutes: number[]
}

export type NotificationKind = 'streak' | 'course' | 'system' | 'community'

export interface AppNotification {
  id: NotificationId
  kind: NotificationKind
  title: string
  body: string
  createdAt: string
  read: boolean
  href?: string
}

export type AdminRole = 'owner' | 'editor' | 'reviewer'

export interface AdminMember {
  id: UserId
  name: string
  email: string
  role: AdminRole
  lastActiveAt: string
}

export interface Learner {
  id: UserId
  name: string
  handle: string
  joinedAt: string
  streakDays: number
}
