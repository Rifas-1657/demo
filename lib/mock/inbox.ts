/** Demo notification center seed. Times are relative labels so the demo never depends on today's date. */

export type InboxCategory = 'learning' | 'book' | 'system'

export interface InboxItem {
  id: string
  category: InboxCategory
  title: string
  body: string
  when: string
  /** Read state before the learner touches anything. */
  read: boolean
  href?: string
  cta?: string
}

export const INBOX_CATEGORIES: { value: InboxCategory; label: string }[] = [
  { value: 'learning', label: 'Learning' },
  { value: 'book', label: 'Book updates' },
  { value: 'system', label: 'System' },
]

export const seedInbox: InboxItem[] = [
  {
    id: 'inbox_streak',
    category: 'learning',
    title: 'Keep your 5-day streak going',
    body: 'One short page of “Loops” today keeps the streak alive.',
    when: '2 hours ago',
    read: false,
    href: '/book/python?chapter=5',
    cta: 'Resume Python',
  },
  {
    id: 'inbox_revision',
    category: 'learning',
    title: '2 topics are due for revision',
    body: 'Integer division in Java and the difference between features and labels could use a quick review.',
    when: 'Today',
    read: false,
    href: '/progress#revision-heading',
    cta: 'See topics',
  },
  {
    id: 'inbox_practice',
    category: 'learning',
    title: 'Practice: fix the runaway loop',
    body: 'A 5-minute code exercise is waiting in Today’s practice.',
    when: 'Yesterday',
    read: true,
    href: '/dashboard',
    cta: 'Open overview',
  },
  {
    id: 'inbox_java_chapter',
    category: 'book',
    title: 'New diagrams in Java Foundations',
    body: 'Chapter 7, “Classes and Objects”, now animates each object as it is created with new.',
    when: '2 days ago',
    read: false,
    href: '/courses/java',
    cta: 'View course',
  },
  {
    id: 'inbox_ml_narration',
    category: 'book',
    title: 'Narration added to Gradient Descent',
    body: 'Machine Learning Essentials chapter 4 can now be listened to with synced highlighting.',
    when: '4 days ago',
    read: true,
    href: '/courses/machine-learning',
    cta: 'View course',
  },
  {
    id: 'inbox_web_soon',
    category: 'book',
    title: 'Web Development Basics is in preparation',
    body: 'This book is not available in the demo yet. It will appear in your courses when it is ready.',
    when: 'Last week',
    read: true,
    href: '/courses/web-development',
    cta: 'Preview outline',
  },
  {
    id: 'inbox_local',
    category: 'system',
    title: 'Your workspace is stored in this browser',
    body: 'Profile, settings, bookmarks, and notes are saved locally for this demo. Nothing is sent to a server.',
    when: 'Last week',
    read: false,
    href: '/settings#privacy-heading',
    cta: 'Manage demo data',
  },
  {
    id: 'inbox_preferences',
    category: 'system',
    title: 'Reader preferences saved on this device',
    body: 'Font size, highlight color, and narration speed stay on this device only.',
    when: '2 weeks ago',
    read: true,
    href: '/settings',
    cta: 'Open settings',
  },
]
