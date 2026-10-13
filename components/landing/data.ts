import type { BookCover } from '@/types/learning'

export const LANDING_NAV = [
  { href: '/features', label: 'Features' },
  { href: '/how-it-works', label: 'How it works' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/about', label: 'About' },
  { href: '/faq', label: 'FAQ' },
] as const

export const ROUTES = {
  login: '/login',
  signup: '/signup',
  courses: '/courses',
  demoCourse: '/book/python',
  features: '/features',
  howItWorks: '/how-it-works',
  pricing: '/pricing',
  about: '/about',
  faq: '/faq',
  privacy: '/privacy',
  terms: '/terms',
} as const

export interface SpotlightCourse {
  slug: string
  title: string
  author: string
  blurb: string
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced'
  chapters: number
  cover: BookCover
}

export const SPOTLIGHT_COURSES: SpotlightCourse[] = [
  {
    slug: 'python-from-zero',
    title: 'Python from Zero',
    author: 'Bookey demo',
    blurb: 'Variables, loops, and functions — with code you run on the page.',
    difficulty: 'Beginner',
    chapters: 12,
    cover: { base: '#E11D48', spine: '#9F1239', accent: '#FFE4E6', text: '#FFFFFF' },
  },
  {
    slug: 'java-foundations',
    title: 'Java Foundations',
    author: 'Bookey demo',
    blurb: 'Classes and objects explained with diagrams that draw themselves.',
    difficulty: 'Intermediate',
    chapters: 14,
    cover: { base: '#3B0A14', spine: '#12040A', accent: '#FB7185', text: '#FFE4E6' },
  },
  {
    slug: 'machine-learning-intuition',
    title: 'Machine Learning Intuition',
    author: 'Bookey demo',
    blurb: 'Gradients and models, narrated step by step by a voice tutor.',
    difficulty: 'Advanced',
    chapters: 10,
    cover: { base: '#F59E0B', spine: '#C2410C', accent: '#FFFBEB', text: '#292013' },
  },
  {
    slug: 'web-development-essentials',
    title: 'Web Development Essentials',
    author: 'Bookey demo',
    blurb: 'HTML, CSS, and JavaScript with live previews for every chapter.',
    difficulty: 'Beginner',
    chapters: 16,
    cover: { base: '#FFE4E6', spine: '#FB7185', accent: '#E11D48', text: '#3B0A14' },
  },
]

export const FAQS = [
  {
    q: 'What can I turn into a Bookey book?',
    a: 'Long-form learning material: recorded lectures, tutorial videos, podcasts, or conversations. Bookey restructures the source into chapters and pages, then adds narration, diagrams, and practice where they help.',
  },
  {
    q: 'Are answers from the voice tutor made up?',
    a: 'The tutor is designed to answer from your source first and point back to the moment it came from. When something goes beyond the source, it says so instead of presenting it as part of the material.',
  },
  {
    q: 'Do I need to install anything to run the code?',
    a: 'No. Practice snippets are meant to run right on the page, so you can edit an example and see what changes without setting up a local environment.',
  },
  {
    q: 'Are the courses on this page real?',
    a: 'The Python, Java, Machine Learning, and Web Development books shown here are demo courses that illustrate the experience. They are labeled as demos wherever they appear.',
  },
  {
    q: 'Can I learn at my own pace?',
    a: 'Yes. Books are split into short pages, your place is saved, and you can bookmark, take notes, and replay narration whenever you come back.',
  },
]
