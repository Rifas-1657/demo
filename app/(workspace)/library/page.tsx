import type { Metadata } from 'next'
import { Suspense } from 'react'
import { LibraryExperience } from '@/components/library/library-experience'
import { LibrarySkeleton } from '@/components/library/library-skeleton'
import { WorkspacePage } from '@/components/workspace/workspace-page'

export const metadata: Metadata = { title: 'Library' }

export default function LibraryPage() {
  return (
    <WorkspacePage title="Library" description="Your books, saved notes, bookmarks, and reading history. Everything here is stored in this browser only.">
      <Suspense fallback={<LibrarySkeleton />}>
        <LibraryExperience />
      </Suspense>
    </WorkspacePage>
  )
}
