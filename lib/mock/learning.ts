import type { BookCover } from '@/types/learning'

/**
 * Demo learning catalog for the learner workspace. Every derived number
 * (percent, current chapter, page position) is computed from chapter page
 * counts so the dashboard, search, and reader always agree.
 */

export type LearningCourseId = 'python' | 'java' | 'machine-learning' | 'web-development'

export interface LearningChapter {
  number: number
  title: string
  summary: string
  pages: number
}

export type CourseCategory = 'Programming' | 'Data & AI' | 'Web'
export type CourseLevel = 'Beginner' | 'Intermediate' | 'Advanced'

export interface LearningCourse {
  id: LearningCourseId
  title: string
  subtitle: string
  description: string
  level: CourseLevel
  category: CourseCategory
  /** Primary language taught, shown as a badge. */
  language: string
  /** Demo availability. Unavailable courses explain why instead of starting. */
  available: boolean
  author: string
  cover: BookCover
  chapters: LearningChapter[]
  outcomes: string[]
  project: { title: string; description: string }
  topics: string[]
  /** Product demo tutor persona — not a real person. */
  tutorStyle: string
  /** Demo progress: pages completed, read in order from page 1. */
  completedPages: number
  /** Relative label so the demo never depends on today's date. */
  lastOpened: string | null
  minutesPerPage: number
  resumeExcerpt: string
}

function chapters(entries: [string, number, string][]): LearningChapter[] {
  return entries.map(([title, pages, summary], index) => ({ number: index + 1, title, pages, summary }))
}

export const learningCourses: LearningCourse[] = [
  {
    id: 'python',
    title: 'Python from Zero',
    subtitle: 'Variables, loops, and functions — with code you run on the page.',
    description:
      'A gentle first programming book. Each chapter introduces one idea, shows it in a few lines of Python, and lets you run and tweak the code right next to the explanation.',
    level: 'Beginner',
    category: 'Programming',
    language: 'Python',
    available: true,
    author: 'Bookey demo',
    cover: { base: '#E11D48', spine: '#9F1239', accent: '#FFE4E6', text: '#FFFFFF' },
    chapters: chapters([
      ['Variables', 6, 'Name values, reassign them, and print what they hold.'],
      ['Data Types', 4, 'Numbers, strings, and booleans — and converting between them.'],
      ['Operators', 7, 'Arithmetic, comparison, and logical operators in everyday expressions.'],
      ['Conditions', 9, 'Use if, elif, and else to make your program choose a path.'],
      ['Loops', 9, 'Repeat work with for and while, and make sure every loop can stop.'],
      ['Functions', 8, 'Package logic into reusable functions with parameters and return values.'],
      ['Lists and Dictionaries', 10, 'Store collections, look items up by key, and loop over both.'],
      ['Files', 7, 'Read from and write to text files safely with a with block.'],
      ['Mini Project', 6, 'Combine everything into a small to-do list app that saves to a file.'],
    ]),
    outcomes: [
      'Write and run short Python programs without copying from a template',
      'Choose the right data type and collection for a problem',
      'Control program flow with conditions and loops',
      'Split code into small, testable functions',
      'Read and save data to plain text files',
    ],
    project: {
      title: 'A to-do list that remembers',
      description: 'A command-line to-do list where you add, complete, and remove tasks, with everything saved to a file between runs.',
    },
    topics: ['Python 3', 'Interactive code cells', 'Variables', 'Control flow', 'Functions', 'File I/O'],
    tutorStyle: 'Patient and example-first: explains one idea at a time, then asks you to predict the output before running it.',
    completedPages: 34,
    lastOpened: 'Yesterday',
    minutesPerPage: 4,
    resumeExcerpt:
      'A while loop keeps running as long as its condition is true. The trick is making sure something inside the loop eventually makes that condition false — otherwise the loop never ends.',
  },
  {
    id: 'java',
    title: 'Java Foundations',
    subtitle: 'Classes and objects explained with diagrams that draw themselves.',
    description:
      'Learn how Java programs are structured, from typed variables to classes and interfaces. Diagrams build up alongside the code so object relationships stay visible.',
    level: 'Intermediate',
    category: 'Programming',
    language: 'Java',
    available: true,
    author: 'Bookey demo',
    cover: { base: '#3B0A14', spine: '#12040A', accent: '#FB7185', text: '#FFE4E6' },
    chapters: chapters([
      ['Meet Java and the JVM', 6, 'How source code becomes bytecode and runs on any machine.'],
      ['Variables and Types', 8, 'Primitive types, String, and why static typing catches mistakes early.'],
      ['Operators and Expressions', 6, 'Arithmetic, comparison, and integer vs. floating-point division.'],
      ['Control Flow', 8, 'if, switch, and boolean logic for branching decisions.'],
      ['Loops', 7, 'for, while, and the enhanced for loop over arrays.'],
      ['Methods', 8, 'Parameters, return types, and overloading.'],
      ['Classes and Objects', 9, 'Fields, constructors, and creating instances with new.'],
      ['Arrays and ArrayList', 8, 'Fixed-size arrays versus growable lists.'],
      ['Inheritance and Interfaces', 9, 'Share behavior with extends and define contracts with interfaces.'],
      ['Exceptions', 7, 'Throw, catch, and handle errors without crashing.'],
      ['Mini Project', 6, 'Build a small library tracker using classes and lists.'],
    ]),
    outcomes: [
      'Read and write typed Java code with confidence',
      'Model real things as classes with fields and methods',
      'Use ArrayList to manage collections of objects',
      'Design simple class hierarchies with interfaces',
      'Handle errors with try, catch, and custom messages',
    ],
    project: {
      title: 'Library book tracker',
      description: 'A console app that adds books, lends them to members, and reports what is overdue — built from a handful of small classes.',
    },
    topics: ['Java 21', 'JVM', 'Object-oriented design', 'Collections', 'Exceptions'],
    tutorStyle: 'Structured and visual: draws a diagram for every new class relationship and checks understanding with quick quizzes.',
    completedPages: 12,
    lastOpened: '3 days ago',
    minutesPerPage: 5,
    resumeExcerpt:
      'Java is statically typed: every variable has a type fixed at compile time. That sounds strict, but it lets the compiler catch whole categories of mistakes before your program ever runs.',
  },
  {
    id: 'machine-learning',
    title: 'Machine Learning Essentials',
    subtitle: 'Gradients and models, narrated step by step by a voice tutor.',
    description:
      'Build an intuition for how models learn from data. You will fit simple models by hand, watch gradient descent move, and learn to judge whether a model is actually good.',
    level: 'Advanced',
    category: 'Data & AI',
    language: 'Python',
    available: true,
    author: 'Bookey demo',
    cover: { base: '#F59E0B', spine: '#C2410C', accent: '#FFFBEB', text: '#292013' },
    chapters: chapters([
      ['What Is Machine Learning', 8, 'Models, parameters, and the difference between rules and learning.'],
      ['Data and Features', 10, 'Turning raw data into features and labels a model can use.'],
      ['Linear Regression', 9, 'Fit a line to data and measure error with mean squared loss.'],
      ['Gradient Descent', 10, 'Follow the slope of the loss to improve parameters step by step.'],
      ['Classification', 9, 'Predict categories with logistic regression and decision thresholds.'],
      ['Training and Testing', 8, 'Split data so you measure performance on examples the model has not seen.'],
      ['Overfitting and Regularization', 9, 'Spot memorization and keep models simple enough to generalize.'],
      ['Decision Trees', 8, 'Split data with yes/no questions and combine trees into forests.'],
      ['Neural Network Basics', 10, 'Layers, activations, and how networks stack simple functions.'],
      ['Mini Project', 7, 'Train and evaluate a model that predicts house prices.'],
    ]),
    outcomes: [
      'Explain what a model learns in plain language',
      'Prepare features and labels from a tabular dataset',
      'Train regression and classification models',
      'Evaluate models honestly with held-out data',
      'Recognize and reduce overfitting',
    ],
    project: {
      title: 'House price predictor',
      description: 'Clean a small housing dataset, train a regression model, and compare it against a simple baseline using held-out data.',
    },
    topics: ['Python', 'NumPy', 'scikit-learn', 'Regression', 'Classification', 'Model evaluation'],
    tutorStyle: 'Narrated and intuition-first: talks through each graph out loud before showing the math behind it.',
    completedPages: 5,
    lastOpened: 'Last week',
    minutesPerPage: 6,
    resumeExcerpt:
      'A model does not memorize answers; it adjusts a handful of numbers until its guesses on known examples stop being wrong in the same direction.',
  },
  {
    id: 'web-development',
    title: 'Web Development Basics',
    subtitle: 'HTML, CSS, and JavaScript with live previews for every chapter.',
    description:
      'Go from an empty file to a responsive, accessible web page. Every chapter has a live preview so you see each line of HTML, CSS, or JavaScript take effect.',
    level: 'Beginner',
    category: 'Web',
    language: 'HTML, CSS & JS',
    available: false,
    author: 'Bookey demo',
    cover: { base: '#FFE4E6', spine: '#FB7185', accent: '#E11D48', text: '#3B0A14' },
    chapters: chapters([
      ['How the Web Works', 5, 'What happens between typing an address and seeing a page.'],
      ['HTML Basics', 7, 'Elements, attributes, and the structure of a document.'],
      ['Semantic HTML', 6, 'Use header, main, nav, and headings so pages make sense to everyone.'],
      ['CSS Fundamentals', 7, 'Selectors, properties, and how the cascade decides styles.'],
      ['The Box Model', 6, 'Margin, border, padding, and content size.'],
      ['Flexbox Layouts', 7, 'Align and distribute items in rows and columns.'],
      ['Responsive Design', 7, 'Mobile-first layouts with media queries and fluid units.'],
      ['JavaScript Basics', 8, 'Variables, functions, and running scripts in the browser.'],
      ['The DOM and Events', 8, 'Find elements, change them, and respond to clicks and input.'],
      ['Forms', 6, 'Labels, inputs, and validating what users type.'],
      ['Mini Project', 6, 'Build and publish a responsive personal landing page.'],
    ]),
    outcomes: [
      'Structure pages with meaningful, accessible HTML',
      'Style layouts with CSS, Flexbox, and media queries',
      'Add interactivity with JavaScript and DOM events',
      'Build forms with clear labels and validation',
    ],
    project: {
      title: 'Personal landing page',
      description: 'A responsive one-page site with a navigation bar, project cards, and a validated contact form.',
    },
    topics: ['HTML5', 'CSS', 'Flexbox', 'JavaScript', 'DOM', 'Accessibility'],
    tutorStyle: 'Hands-on and visual: every explanation is paired with a live preview you can edit.',
    completedPages: 0,
    lastOpened: null,
    minutesPerPage: 4,
    resumeExcerpt:
      'When you type an address, your browser asks a server for an HTML file, then reads it top to bottom, fetching styles, scripts, and images as it discovers them.',
  },
]

export function getLearningCourse(id: string): LearningCourse | undefined {
  return learningCourses.find((course) => course.id === id)
}

export interface CoursePosition {
  totalPages: number
  completedPages: number
  percent: number
  /** Chapter containing the next unread page (the last chapter when finished). */
  chapter: LearningChapter
  /** 1-based page within that chapter. */
  pageInChapter: number
  /** 1-based page across the whole book. */
  bookPage: number
  started: boolean
  finished: boolean
}

export function getCoursePosition(course: LearningCourse): CoursePosition {
  const totalPages = course.chapters.reduce((sum, chapter) => sum + chapter.pages, 0)
  const completedPages = Math.min(course.completedPages, totalPages)
  const finished = completedPages >= totalPages
  const bookPage = finished ? totalPages : completedPages + 1

  let pagesBefore = 0
  let chapter = course.chapters[course.chapters.length - 1]
  for (const candidate of course.chapters) {
    if (bookPage <= pagesBefore + candidate.pages) {
      chapter = candidate
      break
    }
    pagesBefore += candidate.pages
  }

  return {
    totalPages,
    completedPages,
    percent: totalPages === 0 ? 0 : Math.round((completedPages / totalPages) * 100),
    chapter,
    pageInChapter: bookPage - pagesBefore,
    bookPage,
    started: completedPages > 0,
    finished,
  }
}

export function getRemainingMinutes(course: LearningCourse) {
  const { totalPages, completedPages } = getCoursePosition(course)
  return (totalPages - completedPages) * course.minutesPerPage
}

/** Most recently opened in-progress course, used for "Continue your book". */
export const featuredCourseId: LearningCourseId = 'python'

export interface PracticeTask {
  id: string
  courseId: LearningCourseId
  title: string
  detail: string
  minutes: number
  kind: 'Code' | 'Quiz' | 'Recall'
}

export const todaysPractice: PracticeTask[] = [
  {
    id: 'practice_loop',
    courseId: 'python',
    title: 'Fix the runaway loop',
    detail: 'Chapter 5 · Add the missing counter update so the loop stops.',
    minutes: 5,
    kind: 'Code',
  },
  {
    id: 'practice_types',
    courseId: 'java',
    title: 'Pick the right type',
    detail: 'Chapter 2 · Four quick questions on int, double, and String.',
    minutes: 3,
    kind: 'Quiz',
  },
  {
    id: 'practice_model',
    courseId: 'machine-learning',
    title: 'Explain a model in one sentence',
    detail: 'Chapter 1 · Recall the core idea without looking back.',
    minutes: 2,
    kind: 'Recall',
  },
]

/** Demo minutes per weekday (Mon → Sun). */
export const weeklyActivity = [
  { day: 'Mon', minutes: 24 },
  { day: 'Tue', minutes: 36 },
  { day: 'Wed', minutes: 12 },
  { day: 'Thu', minutes: 40 },
  { day: 'Fri', minutes: 28 },
  { day: 'Sat', minutes: 0 },
  { day: 'Sun', minutes: 18 },
]

export interface ActivityEvent {
  id: string
  courseId: LearningCourseId
  kind: 'page' | 'quiz' | 'chapter' | 'note'
  title: string
  when: string
}

export const recentActivity: ActivityEvent[] = [
  { id: 'act_1', courseId: 'python', kind: 'page', title: 'Read “Loops”, page 8', when: 'Yesterday' },
  { id: 'act_2', courseId: 'python', kind: 'chapter', title: 'Finished chapter 4, “Conditions”', when: 'Yesterday' },
  { id: 'act_3', courseId: 'java', kind: 'quiz', title: 'Scored 4 of 5 on the control-flow check', when: '3 days ago' },
  { id: 'act_4', courseId: 'machine-learning', kind: 'note', title: 'Saved a note on features vs. labels', when: 'Last week' },
]

export const demoStreakDays = 5

export type ChapterStatus = 'completed' | 'in-progress' | 'available' | 'locked'

export interface ChapterProgress {
  chapter: LearningChapter
  status: ChapterStatus
  pagesRead: number
  minutes: number
}

/** Chapters open in order: finished ones plus the next unread chapter. */
export function getChapterProgress(course: LearningCourse): ChapterProgress[] {
  let pagesBefore = 0
  let reachedNext = false
  return course.chapters.map((chapter) => {
    const pagesRead = Math.max(0, Math.min(chapter.pages, course.completedPages - pagesBefore))
    pagesBefore += chapter.pages
    let status: ChapterStatus
    if (!course.available) status = 'locked'
    else if (pagesRead === chapter.pages) status = 'completed'
    else if (!reachedNext) {
      status = pagesRead > 0 ? 'in-progress' : 'available'
      reachedNext = true
    } else status = 'locked'
    return { chapter, status, pagesRead, minutes: chapter.pages * course.minutesPerPage }
  })
}

export function getTotalMinutes(course: LearningCourse) {
  return getCoursePosition(course).totalPages * course.minutesPerPage
}

export function formatMinutes(minutes: number) {
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`
}
