/**
 * Typed REST client for the Bookey backend API.
 *
 * When NEXT_PUBLIC_BOOKEY_API_URL is unset, all methods return mock data from
 * the existing seed files (lib/mock/*). No real network calls are made.
 *
 * When the env var is set, requests are made to that base URL with a JSON
 * Content-Type and the Authorization header from the session token (if any).
 *
 * No secrets ever appear in client code: the API URL is a public endpoint,
 * and auth tokens are read from sessionStorage (set by the server auth flow).
 *
 * Backend API contract:
 *   - All request/response bodies use snake_case (Python/FastAPI convention).
 *   - TypeScript interfaces use camelCase (JS convention).
 *   - Mapping helpers below translate between the two.
 */

import type { LearningCourse } from '@/lib/mock/learning'
import { learningCourses } from '@/lib/mock/learning'

// ---- Types -----------------------------------------------------------------

export interface ApiCourse {
  id: string
  title: string
  subtitle: string
  description: string
  level: string
  category: string
  language: string
  available: boolean
  author: string
  cover: { base: string; spine: string; accent: string; text: string }
  chapters: { number: number; title: string; pages: number; summary: string }[]
  outcomes: string[]
  topics: string[]
  tutorStyle: string
  minutesPerPage: number
}

export interface ApiProgress {
  courseId: string
  completedPages: number
  lastOpened: string | null
  resumeExcerpt: string
}

export interface ApiBookmark {
  id: string
  courseId: string
  chapterNumber: number
  pageId: string
  excerpt: string
  createdAt: string
}

export interface ApiNote {
  id: string
  courseId: string
  chapterNumber: number
  pageId: string
  text: string
  createdAt: string
  updatedAt: string
}

export interface ApiSearchResult {
  courseId: string
  pageId: string
  chapterNumber: number
  title: string
  excerpt: string
  score: number
}

// ---- Backend snake_case shapes (as returned by FastAPI) --------------------
// These match the Pydantic models in backend/app/api/*.py exactly.

interface BackendBookmarkIn {
  course_id: string
  chapter_number: number
  page_id: string
  excerpt: string
}

interface BackendBookmarkOut {
  id: string
  course_id: string
  chapter_number: number
  page_id: string
  excerpt: string
  created_at: string
}

interface BackendNoteIn {
  course_id: string
  chapter_number: number
  page_id: string
  text: string
}

interface BackendNoteOut {
  id: string
  course_id: string
  chapter_number: number
  page_id: string
  text: string
  created_at: string
  updated_at: string
}

// ---- Mapping helpers -------------------------------------------------------

function backendBookmarkToApi(b: BackendBookmarkOut): ApiBookmark {
  return {
    id: b.id,
    courseId: b.course_id,
    chapterNumber: b.chapter_number,
    pageId: b.page_id,
    excerpt: b.excerpt,
    createdAt: b.created_at,
  }
}

function apiBookmarkToBackend(b: Omit<ApiBookmark, 'id' | 'createdAt'>): BackendBookmarkIn {
  return {
    course_id: b.courseId,
    chapter_number: b.chapterNumber,
    page_id: b.pageId,
    excerpt: b.excerpt,
  }
}

function backendNoteToApi(n: BackendNoteOut): ApiNote {
  return {
    id: n.id,
    courseId: n.course_id,
    chapterNumber: n.chapter_number,
    pageId: n.page_id,
    text: n.text,
    createdAt: n.created_at,
    updatedAt: n.updated_at,
  }
}

function apiNoteToBackend(n: Omit<ApiNote, 'id' | 'createdAt' | 'updatedAt'>): BackendNoteIn {
  return {
    course_id: n.courseId,
    chapter_number: n.chapterNumber,
    page_id: n.pageId,
    text: n.text,
  }
}

// ---- Client ----------------------------------------------------------------

const BASE_URL = process.env.NEXT_PUBLIC_BOOKEY_API_URL?.replace(/\/$/, '') ?? null

function getAuthToken(): string | null {
  if (typeof sessionStorage === 'undefined') return null
  return sessionStorage.getItem('bookey:auth:token')
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  if (!BASE_URL) throw new Error('API_URL_NOT_SET')
  const token = getAuthToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string>),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers })
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(`${res.status}: ${text}`)
  }
  return res.json() as Promise<T>
}

// ---- Mock fallback helpers ------------------------------------------------

function mockCourse(course: LearningCourse): ApiCourse {
  return {
    id: course.id,
    title: course.title,
    subtitle: course.subtitle,
    description: course.description,
    level: course.level,
    category: course.category,
    language: course.language,
    available: course.available,
    author: course.author,
    cover: course.cover,
    chapters: course.chapters,
    outcomes: course.outcomes,
    topics: course.topics,
    tutorStyle: course.tutorStyle,
    minutesPerPage: course.minutesPerPage,
  }
}

function mockProgress(course: LearningCourse): ApiProgress {
  return {
    courseId: course.id,
    completedPages: course.completedPages,
    lastOpened: course.lastOpened,
    resumeExcerpt: course.resumeExcerpt,
  }
}

// ---- Public API -----------------------------------------------------------

/** GET /courses — returns catalog. Falls back to mock when API URL unset. */
export async function getCourses(): Promise<ApiCourse[]> {
  if (!BASE_URL) return learningCourses.map(mockCourse)
  return apiFetch<ApiCourse[]>('/courses')
}

/** GET /courses/:id */
export async function getCourse(id: string): Promise<ApiCourse | null> {
  if (!BASE_URL) {
    const course = learningCourses.find((c) => c.id === id)
    return course ? mockCourse(course) : null
  }
  try {
    return await apiFetch<ApiCourse>(`/courses/${id}`)
  } catch {
    return null
  }
}

/** GET /me/progress/:courseId */
export async function getCourseProgress(courseId: string): Promise<ApiProgress | null> {
  if (!BASE_URL) {
    const course = learningCourses.find((c) => c.id === courseId)
    return course ? mockProgress(course) : null
  }
  try {
    return await apiFetch<ApiProgress>(`/me/progress/${courseId}`)
  } catch {
    return null
  }
}

/** GET /me/bookmarks */
export async function getBookmarks(): Promise<ApiBookmark[]> {
  if (!BASE_URL) return []
  const raw = await apiFetch<BackendBookmarkOut[]>('/me/bookmarks')
  return raw.map(backendBookmarkToApi)
}

/** POST /me/bookmarks */
export async function createBookmark(bookmark: Omit<ApiBookmark, 'id' | 'createdAt'>): Promise<ApiBookmark> {
  if (!BASE_URL) {
    return { ...bookmark, id: `bm_${Date.now()}`, createdAt: new Date().toISOString() }
  }
  const raw = await apiFetch<BackendBookmarkOut>('/me/bookmarks', {
    method: 'POST',
    body: JSON.stringify(apiBookmarkToBackend(bookmark)),
  })
  return backendBookmarkToApi(raw)
}

/** DELETE /me/bookmarks/:id */
export async function deleteBookmark(id: string): Promise<void> {
  if (!BASE_URL) return
  await apiFetch(`/me/bookmarks/${id}`, { method: 'DELETE' })
}

/** GET /me/notes */
export async function getNotes(): Promise<ApiNote[]> {
  if (!BASE_URL) return []
  const raw = await apiFetch<BackendNoteOut[]>('/me/notes')
  return raw.map(backendNoteToApi)
}

/** POST /me/notes */
export async function createNote(note: Omit<ApiNote, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiNote> {
  if (!BASE_URL) {
    const now = new Date().toISOString()
    return { ...note, id: `note_${Date.now()}`, createdAt: now, updatedAt: now }
  }
  const raw = await apiFetch<BackendNoteOut>('/me/notes', {
    method: 'POST',
    body: JSON.stringify(apiNoteToBackend(note)),
  })
  return backendNoteToApi(raw)
}

/** PATCH /me/notes/:id */
export async function updateNote(id: string, text: string): Promise<ApiNote> {
  if (!BASE_URL) {
    const now = new Date().toISOString()
    return { id, courseId: '', chapterNumber: 0, pageId: '', text, createdAt: now, updatedAt: now }
  }
  const raw = await apiFetch<BackendNoteOut>(`/me/notes/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ text }),
  })
  return backendNoteToApi(raw)
}

/** DELETE /me/notes/:id */
export async function deleteNote(id: string): Promise<void> {
  if (!BASE_URL) return
  await apiFetch(`/me/notes/${id}`, { method: 'DELETE' })
}

/** GET /search?q=&courseId= */
export async function search(query: string, courseId?: string): Promise<ApiSearchResult[]> {
  if (!BASE_URL) return []
  const params = new URLSearchParams({ q: query })
  if (courseId) params.set('courseId', courseId)
  return apiFetch<ApiSearchResult[]>(`/search?${params}`)
}

/** Returns true when a live API URL is configured. */
export function isApiConfigured(): boolean {
  return BASE_URL !== null
}

