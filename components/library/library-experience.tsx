'use client'

import { BookOpen } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useMemo, useRef, useState } from 'react'
import { getChapterProgress, getCoursePosition, learningCourses } from '@/lib/mock/learning'
import { samePage, useBookmarks, useNotes, useReadingHistory } from '@/lib/stores/library'
import { cn } from '@/lib/utils'
import { BookmarkList } from './bookmark-list'
import { CompletedList, type CompletedGroup } from './completed-list'
import { LibraryBookCard } from './library-book-card'
import { LibraryEmpty } from './library-empty'
import { NotesPanel } from './notes-panel'
import { ReadingHistory } from './reading-history'
import { SectionHeader } from './section-header'

const tabs = [
  { id: 'all', label: 'All' },
  { id: 'recent', label: 'Recent' },
  { id: 'bookmarks', label: 'Bookmarks' },
  { id: 'notes', label: 'Notes' },
  { id: 'completed', label: 'Completed' },
] as const

type TabId = (typeof tabs)[number]['id']

function parseTab(value: string | null): TabId {
  return tabs.some((tab) => tab.id === value) ? (value as TabId) : 'all'
}

const startedBooks = learningCourses.filter((course) => getCoursePosition(course).started)

const completedGroups: CompletedGroup[] = learningCourses
  .map((course) => ({
    course,
    chapters: getChapterProgress(course).filter((entry) => entry.pagesRead === entry.chapter.pages),
  }))
  .filter((group) => group.chapters.length > 0)

export function LibraryExperience() {
  const router = useRouter()
  const params = useSearchParams()
  const urlTab = parseTab(params.get('tab'))
  const [tab, setTab] = useState<TabId>(urlTab)
  const [syncedTab, setSyncedTab] = useState<TabId>(urlTab)
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({})

  if (urlTab !== syncedTab) {
    setSyncedTab(urlTab)
    setTab(urlTab)
  }

  const { bookmarks, toggle } = useBookmarks()
  const { notes } = useNotes()
  const { history } = useReadingHistory()

  const counts = useMemo<Record<TabId, number>>(
    () => ({
      all: startedBooks.length,
      recent: history.length,
      bookmarks: bookmarks.length,
      notes: notes.length,
      completed: completedGroups.reduce((sum, group) => sum + group.chapters.length, 0),
    }),
    [bookmarks.length, history.length, notes.length],
  )

  function select(next: TabId, focus = false) {
    setTab(next)
    setSyncedTab(next)
    router.replace(next === 'all' ? '/library' : `/library?tab=${next}`, { scroll: false })
    if (focus) tabRefs.current[next]?.focus()
  }

  function onTabKeyDown(event: React.KeyboardEvent) {
    const index = tabs.findIndex((item) => item.id === tab)
    const moves: Record<string, number> = { ArrowRight: index + 1, ArrowLeft: index - 1, Home: 0, End: tabs.length - 1 }
    if (!(event.key in moves)) return
    event.preventDefault()
    const nextIndex = (moves[event.key] + tabs.length) % tabs.length
    select(tabs[nextIndex].id, true)
  }

  const viewAll = (next: TabId) => () => select(next, true)

  return (
    <div className="flex flex-col gap-6">
      <div role="tablist" aria-label="Library sections" onKeyDown={onTabKeyDown} className="relative -mx-1 flex gap-1.5 overflow-x-auto px-1 py-1">
        {tabs.map((item) => {
          const active = item.id === tab
          return (
            <button
              key={item.id}
              ref={(element) => {
                tabRefs.current[item.id] = element
              }}
              id={`library-tab-${item.id}`}
              type="button"
              role="tab"
              aria-selected={active}
              aria-controls="library-panel"
              tabIndex={active ? 0 : -1}
              onClick={() => select(item.id)}
              className={cn(
                'inline-flex h-9 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-medium outline-none transition-colors focus-visible:ring-4 focus-visible:ring-ring/30',
                active ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-foreground hover:border-primary/40',
              )}
            >
              {item.label}
              <span className={cn('font-mono text-xs', active ? 'text-primary-foreground/80' : 'text-muted-foreground')}>
                {counts[item.id]}
              </span>
            </button>
          )
        })}
      </div>

      <div id="library-panel" role="tabpanel" aria-labelledby={`library-tab-${tab}`} tabIndex={0} className="rounded-3xl outline-none focus-visible:ring-4 focus-visible:ring-ring/20">
        {tab === 'all' && (
          <div className="flex flex-col gap-10">
            <BookGrid bookmarks={bookmarks} onToggle={toggle} />
            <div className="grid gap-10 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
              <NotesPanel limit={3} onViewAll={viewAll('notes')} />
              <div className="flex flex-col gap-10">
                <BookmarkList limit={3} onViewAll={viewAll('bookmarks')} />
                <ReadingHistory limit={4} onViewAll={viewAll('recent')} />
              </div>
            </div>
          </div>
        )}
        {tab === 'recent' && (
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <ReadingHistory />
            <RecentBooks />
          </div>
        )}
        {tab === 'bookmarks' && <BookmarkList />}
        {tab === 'notes' && <NotesPanel />}
        {tab === 'completed' && <CompletedList groups={completedGroups} />}
      </div>
    </div>
  )
}

type BookmarkState = ReturnType<typeof useBookmarks>

function BookGrid({ bookmarks, onToggle }: { bookmarks: BookmarkState['bookmarks']; onToggle: BookmarkState['toggle'] }) {
  return (
    <section aria-labelledby="books-heading" className="flex flex-col gap-4">
      <SectionHeader id="books-heading" title="Your books" count={startedBooks.length} />
      {startedBooks.length === 0 ? (
        <LibraryEmpty
          icon={<BookOpen />}
          title="Your shelf is empty"
          description="Start a course and its book will appear here with your progress and a one-click Resume."
        />
      ) : (
        <ul className="grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-2 xl:grid-cols-3">
          {startedBooks.map((course) => {
            const position = getCoursePosition(course)
            const ref = { courseId: course.id, chapter: position.chapter.number, page: position.pageInChapter }
            return (
              <li key={course.id} className="min-w-0">
                <LibraryBookCard course={course} bookmarked={bookmarks.some((item) => samePage(item, ref))} onToggleBookmark={onToggle} />
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

function RecentBooks() {
  const { bookmarks, toggle } = useBookmarks()
  const recent = startedBooks.filter((course) => course.lastOpened)

  return (
    <section aria-labelledby="recent-books-heading" className="flex flex-col gap-4">
      <SectionHeader id="recent-books-heading" title="Recently opened" count={recent.length} />
      {recent.length === 0 ? (
        <LibraryEmpty icon={<BookOpen />} title="No recently opened books" description="Books you open will be listed here, most recent first." />
      ) : (
        <ul className="flex flex-col gap-4">
          {recent.map((course) => {
            const position = getCoursePosition(course)
            const ref = { courseId: course.id, chapter: position.chapter.number, page: position.pageInChapter }
            return (
              <li key={course.id}>
                <LibraryBookCard course={course} bookmarked={bookmarks.some((item) => samePage(item, ref))} onToggleBookmark={toggle} />
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
