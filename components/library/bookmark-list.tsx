'use client'

import { Bookmark, X } from 'lucide-react'
import Link from 'next/link'
import { useRef } from 'react'
import { toast } from 'sonner'
import { BookeyButton } from '@/components/ui-kit/bookey-button'
import { describePage, pageHref, type LibraryBookmark } from '@/lib/mock/library'
import { formatWhen, useBookmarks } from '@/lib/stores/library'
import { LibraryEmpty } from './library-empty'
import { SectionHeader } from './section-header'

interface BookmarkListProps {
  limit?: number
  onViewAll?: () => void
}

export function BookmarkList({ limit, onViewAll }: BookmarkListProps) {
  const { bookmarks, remove, restore } = useBookmarks()
  const headingRef = useRef<HTMLHeadingElement>(null)
  const shown = limit ? bookmarks.slice(0, limit) : bookmarks

  function handleRemove(bookmark: LibraryBookmark) {
    const index = bookmarks.findIndex((item) => item.id === bookmark.id)
    remove(bookmark.id)
    headingRef.current?.focus()
    toast('Bookmark removed', { action: { label: 'Undo', onClick: () => restore(bookmark, index) } })
  }

  return (
    <section aria-labelledby="bookmarks-heading" className="flex flex-col gap-4">
      <SectionHeader
        id="bookmarks-heading"
        headingRef={headingRef}
        title="Bookmarks"
        count={bookmarks.length}
        action={
          onViewAll && bookmarks.length > shown.length ? (
            <BookeyButton variant="ghost" size="sm" onClick={onViewAll}>
              View all
            </BookeyButton>
          ) : null
        }
      />
      {bookmarks.length === 0 ? (
        <LibraryEmpty
          icon={<Bookmark />}
          title="No bookmarks yet"
          description="Bookmark a page while reading, or use the bookmark icon on a book card, to jump straight back to it later."
        />
      ) : (
        <ul className="flex flex-col gap-2.5">
          {shown.map((bookmark) => {
            const { courseTitle, location } = describePage(bookmark)
            return (
              <li key={bookmark.id} className="group relative flex gap-3 rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/40">
                <Bookmark aria-hidden="true" className="mt-0.5 size-4 shrink-0 fill-book-marker text-book-amber" />
                <div className="min-w-0 flex-1 space-y-1">
                  <Link
                    href={pageHref(bookmark)}
                    className="block rounded-sm text-sm font-medium outline-none after:absolute after:inset-0 after:rounded-2xl focus-visible:after:ring-4 focus-visible:after:ring-ring/30 group-hover:text-primary"
                  >
                    {courseTitle}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {location} · {formatWhen(bookmark.label, bookmark.createdAt)}
                  </p>
                  <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">{bookmark.excerpt}</p>
                </div>
                <BookeyButton
                  size="icon"
                  variant="ghost"
                  className="relative z-10 -mt-1 -mr-1 size-8"
                  onClick={() => handleRemove(bookmark)}
                  aria-label={`Remove bookmark: ${courseTitle}, ${location}`}
                >
                  <X aria-hidden="true" className="size-4" />
                </BookeyButton>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
