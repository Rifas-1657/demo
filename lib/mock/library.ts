import { getLearningCourse, type LearningCourseId } from './learning'

/**
 * Fixed demo seed data for the Library and Search. "When" labels are static
 * relative strings so the demo never depends on today's date. Items the
 * learner creates later get a real timestamp instead.
 */

export interface PageRef {
  courseId: LearningCourseId
  /** 1-based chapter number. */
  chapter: number
  /** 1-based page within the chapter. */
  page: number
}

export interface LibraryBookmark extends PageRef {
  id: string
  excerpt: string
  /** Fixed label for seed items. */
  label?: string
  /** ISO timestamp for items created in this browser. */
  createdAt?: string
}

export interface LibraryNote extends PageRef {
  id: string
  quote?: string
  text: string
  label?: string
  updatedAt?: string
}

export interface ReadingSession extends PageRef {
  id: string
  label: string
  minutes: number
  summary: string
}

export interface PageExcerpt extends PageRef {
  id: string
  title: string
  text: string
  tags: string[]
}

export const seedBookmarks: LibraryBookmark[] = [
  {
    id: 'bm_python_while',
    courseId: 'python',
    chapter: 5,
    page: 4,
    excerpt: 'A while loop keeps running as long as its condition is true.',
    label: 'Yesterday',
  },
  {
    id: 'bm_java_static',
    courseId: 'java',
    chapter: 2,
    page: 5,
    excerpt: 'Every variable has a type fixed at compile time.',
    label: '3 days ago',
  },
  {
    id: 'bm_python_types',
    courseId: 'python',
    chapter: 2,
    page: 3,
    excerpt: 'int("42") turns text into a number you can do math with.',
    label: '4 days ago',
  },
  {
    id: 'bm_ml_rules',
    courseId: 'machine-learning',
    chapter: 1,
    page: 4,
    excerpt: 'Rules are written by people; models find their own from examples.',
    label: 'Last week',
  },
]

export const seedNotes: LibraryNote[] = [
  {
    id: 'note_python_loop',
    courseId: 'python',
    chapter: 5,
    page: 8,
    quote: 'Make sure something inside the loop eventually makes that condition false.',
    text: 'Every while loop needs a line that moves it toward stopping, usually a counter += 1.',
    label: 'Yesterday',
  },
  {
    id: 'note_python_elif',
    courseId: 'python',
    chapter: 4,
    page: 6,
    text: 'elif is only checked when the if above it was false. Order the conditions from most to least specific.',
    label: '2 days ago',
  },
  {
    id: 'note_java_typing',
    courseId: 'java',
    chapter: 2,
    page: 4,
    quote: 'Static typing lets the compiler catch whole categories of mistakes.',
    text: 'Static typing means type mistakes show up at compile time, not when users run the program.',
    label: '3 days ago',
  },
  {
    id: 'note_ml_features',
    courseId: 'machine-learning',
    chapter: 1,
    page: 5,
    text: 'Features are the inputs a model sees; the label is the answer it is trying to predict.',
    label: 'Last week',
  },
]

export const seedReadingHistory: ReadingSession[] = [
  { id: 'rs_1', courseId: 'python', chapter: 5, page: 8, label: 'Yesterday', minutes: 24, summary: 'Read “Loops” up to page 8' },
  { id: 'rs_2', courseId: 'python', chapter: 4, page: 9, label: 'Yesterday', minutes: 18, summary: 'Finished “Conditions”' },
  { id: 'rs_3', courseId: 'java', chapter: 2, page: 6, label: '3 days ago', minutes: 30, summary: 'Read “Variables and Types” up to page 6' },
  { id: 'rs_4', courseId: 'python', chapter: 4, page: 3, label: '4 days ago', minutes: 12, summary: 'Started “Conditions”' },
  { id: 'rs_5', courseId: 'machine-learning', chapter: 1, page: 5, label: 'Last week', minutes: 28, summary: 'Read “What Is Machine Learning” up to page 5' },
]

/** Searchable demo page text. Kept short; the reader renders the full page. */
export const pageExcerpts: PageExcerpt[] = [
  {
    id: 'pg_python_1_2',
    courseId: 'python',
    chapter: 1,
    page: 2,
    title: 'Naming a value',
    text: 'A variable is a name that points at a value. Write score = 10, then print(score) to see what it holds. Reassigning score = 12 simply points the name somewhere new.',
    tags: ['variables', 'assignment', 'print'],
  },
  {
    id: 'pg_python_5_9',
    courseId: 'python',
    chapter: 5,
    page: 9,
    title: 'Loops that stop',
    text: 'A while loop keeps running as long as its condition is true. The trick is making sure something inside the loop eventually makes that condition false — otherwise the loop never ends.',
    tags: ['while', 'loops', 'infinite loop'],
  },
  {
    id: 'pg_python_6_1',
    courseId: 'python',
    chapter: 6,
    page: 1,
    title: 'Your first function',
    text: 'Use def to package a few lines under one name. Parameters are the inputs, and return hands a result back to whoever called the function.',
    tags: ['functions', 'def', 'return', 'parameters'],
  },
  {
    id: 'pg_python_7_3',
    courseId: 'python',
    chapter: 7,
    page: 3,
    title: 'Looking things up by key',
    text: 'A dictionary maps keys to values, so ages["Ada"] finds a value instantly instead of searching a list item by item.',
    tags: ['dictionaries', 'lists', 'lookup'],
  },
  {
    id: 'pg_java_2_7',
    courseId: 'java',
    chapter: 2,
    page: 7,
    title: 'Why types are fixed',
    text: 'Java is statically typed: every variable has a type fixed at compile time. That sounds strict, but it lets the compiler catch whole categories of mistakes before your program ever runs.',
    tags: ['static typing', 'compiler', 'types'],
  },
  {
    id: 'pg_java_7_2',
    courseId: 'java',
    chapter: 7,
    page: 2,
    title: 'Blueprints and instances',
    text: 'A class is a blueprint that lists fields and methods. Calling new Book("Dune") creates an object, one concrete instance built from that blueprint.',
    tags: ['classes', 'objects', 'constructors'],
  },
  {
    id: 'pg_java_10_1',
    courseId: 'java',
    chapter: 10,
    page: 1,
    title: 'When things go wrong',
    text: 'An exception interrupts normal flow. Wrap risky code in try, handle the failure in catch, and use finally for cleanup that must always run.',
    tags: ['exceptions', 'try', 'catch'],
  },
  {
    id: 'pg_ml_1_6',
    courseId: 'machine-learning',
    chapter: 1,
    page: 6,
    title: 'Learning, not memorizing',
    text: 'A model does not memorize answers; it adjusts a handful of numbers until its guesses on known examples stop being wrong in the same direction.',
    tags: ['models', 'parameters', 'training'],
  },
  {
    id: 'pg_ml_4_2',
    courseId: 'machine-learning',
    chapter: 4,
    page: 2,
    title: 'Walking downhill',
    text: 'Gradient descent measures which way the loss slopes and nudges each parameter a small step downhill. The learning rate decides how big that step is.',
    tags: ['gradient descent', 'loss', 'learning rate'],
  },
  {
    id: 'pg_ml_7_1',
    courseId: 'machine-learning',
    chapter: 7,
    page: 1,
    title: 'Too good on training data',
    text: 'Overfitting happens when a model fits noise in the training data. It scores brilliantly on examples it has seen and poorly on new ones.',
    tags: ['overfitting', 'regularization', 'generalization'],
  },
  {
    id: 'pg_web_1_1',
    courseId: 'web-development',
    chapter: 1,
    page: 1,
    title: 'From address to page',
    text: 'When you type an address, your browser asks a server for an HTML file, then reads it top to bottom, fetching styles, scripts, and images as it discovers them.',
    tags: ['HTML', 'browser', 'HTTP'],
  },
  {
    id: 'pg_web_6_2',
    courseId: 'web-development',
    chapter: 6,
    page: 2,
    title: 'Rows and columns',
    text: 'display: flex lines children up in a row. justify-content spreads them along that row and align-items lines them up across it.',
    tags: ['CSS', 'flexbox', 'layout'],
  },
]

/**
 * Link to a specific page. The reader currently opens the saved resume
 * position; chapter/page params are already included so deep links work once
 * the reader reads them. Unavailable demo courses link to their overview.
 */
export function pageHref({ courseId, chapter, page }: PageRef) {
  const course = getLearningCourse(courseId)
  if (!course?.available) return `/courses/${courseId}`
  return `/book/${courseId}?chapter=${chapter}&page=${page}`
}

export function describePage({ courseId, chapter, page }: PageRef) {
  const course = getLearningCourse(courseId)
  const chapterTitle = course?.chapters.find((entry) => entry.number === chapter)?.title
  return {
    courseTitle: course?.title ?? 'Unknown book',
    location: `Chapter ${chapter}${chapterTitle ? ` · ${chapterTitle}` : ''} · Page ${page}`,
  }
}
