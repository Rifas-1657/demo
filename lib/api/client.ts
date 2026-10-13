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

/**
 * Matches backend CourseProgressSummary from GET /me/progress.
 * Returns one entry per course with aggregate completed/total counts.
 */
interface BackendProgressSummary {
  course_id: string
  completed_pages: number
  total_pages: number
}

/**
 * Matches backend ProgressItem from GET /me/progress/{course_id}.
 * Returns one entry per page the user has interacted with.
 */
interface BackendProgressItem {
  course_id: string
  page_id: string
  completed: boolean
  last_word_index: number
  last_segment_id: string | null
  completed_at: string | null
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

/**
 * Maps a backend CourseProgressSummary (from GET /me/progress) to ApiProgress.
 *
 * The backend does not store a per-course "last opened" timestamp or a resume
 * excerpt — those fields only exist in the mock data. When calling the real
 * API, lastOpened and resumeExcerpt are set to null/"" respectively so that
 * callers can detect the backend mode and avoid showing stale mock values.
 */
function backendProgressSummaryToApi(s: BackendProgressSummary): ApiProgress {
  return {
    courseId: s.course_id,
    completedPages: s.completed_pages,
    lastOpened: null,
    resumeExcerpt: '',
  }
}


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

/**
 * GET /me/progress — returns the course-level progress summary for a specific course.
 *
 * The backend endpoint GET /me/progress returns list[CourseProgressSummary] for all
 * courses. We fetch the full list and filter to the requested courseId.
 * GET /me/progress/{courseId} returns per-page ProgressItem rows, NOT a summary —
 * do not use that endpoint here.
 *
 * When BASE_URL is unset, falls back to mock data (preserving lastOpened and resumeExcerpt).
 * When calling the real API, lastOpened and resumeExcerpt are null/"" because the
 * backend does not store those fields.
 */
export async function getCourseProgress(courseId: string): Promise<ApiProgress | null> {
  if (!BASE_URL) {
    const course = learningCourses.find((c) => c.id === courseId)
    return course ? mockProgress(course) : null
  }
  try {
    const summaries = await apiFetch<BackendProgressSummary[]>('/me/progress')
    const match = summaries.find((s) => s.course_id === courseId)
    return match ? backendProgressSummaryToApi(match) : null
  } catch {
    return null
  }
}

/**
 * GET /me/progress/:courseId — returns per-page progress items for a course.
 *
 * Use this when you need page-level detail (last_word_index, completed_at, etc.)
 * rather than the course-level summary.
 */
export async function getCourseProgressItems(courseId: string): Promise<BackendProgressItem[]> {
  if (!BASE_URL) return []
  try {
    return await apiFetch<BackendProgressItem[]>(`/me/progress/${courseId}`)
  } catch {
    return []
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

// ---- Voice (TTS & STT) ----------------------------------------------------

export interface ApiSTTResponse {
  transcript: string
  language: string
  duration_s: number
}

export interface ApiTTSResponseJSON {
  audio_base64: string
  mime_type: string
  duration_ms: number
}

/**
 * POST /api/voice/tts — Synthesize lesson speech via Gemini TTS.
 * Returns raw audio Blob for direct HTML5 Audio playback.
 */
export async function synthesizeSpeech(
  text: string,
  voice?: string,
  speed: number = 1.0,
): Promise<Blob> {
  if (!BASE_URL) throw new Error('API_URL_NOT_SET')
  const token = getAuthToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE_URL}/api/voice/tts`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ text, voice, speed }),
  })
  if (!res.ok) {
    const textErr = await res.text().catch(() => res.statusText)
    throw new Error(`${res.status}: ${textErr}`)
  }
  return res.blob()
}

/**
 * POST /api/voice/stt — Transcribe audio recording via Groq Whisper.
 * Sends recorded audio Blob as multipart/form-data.
 */
export async function transcribeAudio(
  file: Blob,
  language?: string,
): Promise<ApiSTTResponse> {
  if (!BASE_URL) throw new Error('API_URL_NOT_SET')
  const token = getAuthToken()
  const headers: Record<string, string> = {}
  if (token) headers['Authorization'] = `Bearer ${token}`

  const formData = new FormData()
  formData.append('file', file, 'recording.webm')
  if (language) {
    formData.append('language', language)
  }

  const res = await fetch(`${BASE_URL}/api/voice/stt`, {
    method: 'POST',
    headers,
    body: formData,
  })
  if (!res.ok) {
    const textErr = await res.text().catch(() => res.statusText)
    throw new Error(`${res.status}: ${textErr}`)
  }
  return res.json() as Promise<ApiSTTResponse>
}

