'use client'

import { BookmarkPlus, Inbox } from 'lucide-react'
import { useState } from 'react'
import { BookeyButton } from '@/components/ui-kit/bookey-button'
import { EmptyState } from '@/components/ui-kit/empty-state'
import { ModalDialog, SideDrawer } from '@/components/ui-kit/overlays'
import { SkeletonCourseCard, SkeletonRow } from '@/components/ui-kit/skeletons'
import { notify } from '@/components/ui-kit/toast'
import { learningCourses } from '@/lib/mock/learning'
import { storageKeys, useLocalStorage } from '@/lib/storage'
import { DsSection } from './ds-section'

export function FeedbackSection() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [bookmarks, setBookmarks] = useLocalStorage<string[]>(storageKeys.bookmarks, [])
  const demoPage = 'python:1:1'
  const isBookmarked = bookmarks.includes(demoPage)

  function toggleBookmark() {
    const ok = setBookmarks((prev) => (prev.includes(demoPage) ? prev.filter((id) => id !== demoPage) : [...prev, demoPage]))
    if (ok) notify.demo(isBookmarked ? 'Bookmark removed' : 'Bookmark saved')
    else notify.error('Storage unavailable', 'Your browser blocked local storage, so this was not kept.')
  }

  return (
    <DsSection
      id="feedback"
      index="05"
      label="Overlays & feedback"
      title="Dialogs, drawers, toasts, and loading."
      description="Overlays trap focus, close with Escape, and are labelled by their titles. Demo actions say so in the toast."
      className="bg-card/60"
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4 rounded-3xl border bg-card p-6">
          <h3 className="text-lg font-semibold">Overlays</h3>
          <div className="flex flex-wrap gap-3">
            <ModalDialog
              open={dialogOpen}
              onOpenChange={setDialogOpen}
              trigger={<BookeyButton variant="outline">Open dialog</BookeyButton>}
              title="Finish this chapter?"
              description="You have one practice prompt left in “Variables”."
              footer={
                <>
                  <BookeyButton variant="ghost" onClick={() => setDialogOpen(false)}>
                    Not now
                  </BookeyButton>
                  <BookeyButton onClick={() => setDialogOpen(false)}>Keep going</BookeyButton>
                </>
              }
            />
            <SideDrawer
              side="right"
              trigger={<BookeyButton variant="outline">Open drawer</BookeyButton>}
              title="Chapter outline"
              description="Python from Zero"
            >
              <ol className="space-y-3 px-4 text-sm">
                {learningCourses[0].chapters.slice(0, 4).map((chapter) => (
                  <li key={chapter.number}>
                    {chapter.number}. {chapter.title}
                  </li>
                ))}
              </ol>
            </SideDrawer>
            <BookeyButton variant="secondary" onClick={toggleBookmark} aria-pressed={isBookmarked}>
              <BookmarkPlus aria-hidden="true" />
              {isBookmarked ? 'Bookmarked (local)' : 'Bookmark (local demo)'}
            </BookeyButton>
            <BookeyButton variant="ghost" onClick={() => notify.info('Chapter unlocked', 'Feedback loops is ready to read.')}>
              Show toast
            </BookeyButton>
          </div>
        </div>
        <div className="space-y-4 rounded-3xl border bg-card p-6">
          <h3 className="text-lg font-semibold">Empty state</h3>
          <EmptyState
            icon={<Inbox aria-hidden="true" />}
            title="No notes yet"
            description="Highlight a sentence in the reader to start your first note."
          />
        </div>
      </div>
      <div className="mt-6 grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]" aria-busy="true" aria-label="Loading examples">
        <SkeletonCourseCard />
        <div className="space-y-3 rounded-3xl border bg-card p-6">
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </div>
      </div>
    </DsSection>
  )
}
