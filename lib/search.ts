import { describePage, pageExcerpts, pageHref, type LibraryNote } from '@/lib/mock/library'
import { learningCourses } from '@/lib/mock/learning'

export type SearchCategory = 'course' | 'chapter' | 'page' | 'note'

export const searchCategories: { id: SearchCategory; label: string }[] = [
  { id: 'course', label: 'Courses' },
  { id: 'chapter', label: 'Chapters' },
  { id: 'page', label: 'Book Pages' },
  { id: 'note', label: 'Notes' },
]

export interface SearchDoc {
  id: string
  category: SearchCategory
  title: string
  meta: string
  body: string
  tags: string[]
  href: string
}

export interface SearchResult extends SearchDoc {
  score: number
  snippet: string
}

export const MAX_QUERY_LENGTH = 80

const staticDocs: SearchDoc[] = [
  ...learningCourses.map((course) => ({
    id: `course_${course.id}`,
    category: 'course' as const,
    title: course.title,
    meta: `${course.level} · ${course.category} · ${course.chapters.length} chapters${course.available ? '' : ' · Coming soon'}`,
    body: `${course.subtitle} ${course.description}`,
    tags: [course.language, ...course.topics],
    href: `/courses/${course.id}`,
  })),
  ...learningCourses.flatMap((course) =>
    course.chapters.map((chapter) => ({
      id: `chapter_${course.id}_${chapter.number}`,
      category: 'chapter' as const,
      title: chapter.title,
      meta: `${course.title} · Chapter ${chapter.number} · ${chapter.pages} pages`,
      body: chapter.summary,
      tags: [course.language],
      href: pageHref({ courseId: course.id, chapter: chapter.number, page: 1 }),
    })),
  ),
  ...pageExcerpts.map((excerpt) => {
    const { courseTitle, location } = describePage(excerpt)
    return {
      id: excerpt.id,
      category: 'page' as const,
      title: excerpt.title,
      meta: `${courseTitle} · ${location}`,
      body: excerpt.text,
      tags: excerpt.tags,
      href: pageHref(excerpt),
    }
  }),
]

export function buildSearchIndex(notes: LibraryNote[]): SearchDoc[] {
  const noteDocs = notes.map((note) => {
    const { courseTitle, location } = describePage(note)
    return {
      id: note.id,
      category: 'note' as const,
      title: note.quote ? `“${note.quote}”` : `Note in ${courseTitle}`,
      meta: `${courseTitle} · ${location}`,
      body: note.text,
      tags: [],
      href: `/library?tab=notes#${note.id}`,
    }
  })
  return [...staticDocs, ...noteDocs]
}

export function tokenize(query: string) {
  return Array.from(new Set(query.toLowerCase().split(/\s+/).filter((token) => token.length > 0)))
}

function makeSnippet(body: string, tokens: string[], radius = 90) {
  const lower = body.toLowerCase()
  const first = tokens.map((token) => lower.indexOf(token)).filter((index) => index >= 0).sort((a, b) => a - b)[0]
  if (first === undefined || body.length <= radius * 2) return body
  const start = Math.max(0, first - radius / 2)
  const end = Math.min(body.length, start + radius * 2)
  return `${start > 0 ? '…' : ''}${body.slice(start, end).trim()}${end < body.length ? '…' : ''}`
}

/** Every token must match somewhere; title and tag matches rank higher. */
export function searchDocs(query: string, docs: SearchDoc[]): SearchResult[] {
  const tokens = tokenize(query)
  if (tokens.length === 0) return []
  const phrase = query.trim().toLowerCase()

  const results: SearchResult[] = []
  for (const doc of docs) {
    const title = doc.title.toLowerCase()
    const tags = doc.tags.join(' ').toLowerCase()
    const rest = `${doc.meta} ${doc.body}`.toLowerCase()
    let score = 0
    let matchedAll = true
    for (const token of tokens) {
      const inTitle = title.includes(token)
      const inTags = tags.includes(token)
      const inRest = rest.includes(token)
      if (!inTitle && !inTags && !inRest) {
        matchedAll = false
        break
      }
      score += (inTitle ? 4 : 0) + (inTags ? 2 : 0) + (inRest ? 1 : 0)
    }
    if (!matchedAll) continue
    if (title.startsWith(phrase)) score += 6
    else if (title.includes(phrase)) score += 3
    results.push({ ...doc, score, snippet: makeSnippet(doc.body, tokens) })
  }
  return results.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
}
