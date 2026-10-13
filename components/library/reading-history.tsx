'use client'

import { History, RotateCcw } from 'lucide-react'
import Link from 'next/link'
import { BookeyButton } from '@/components/ui-kit/bookey-button'
import { describePage, pageHref } from '@/lib/mock/library'
import { useReadingHistory } from '@/lib/stores/library'
import { LibraryEmpty } from './library-empty'
import { SectionHeader } from './section-header'

interface ReadingHistoryProps {
  limit?: number
  onViewAll?: () => void
}

export function ReadingHistory({ limit, onViewAll }: ReadingHistoryProps) {
  const { history, clear, restoreDemo } = useReadingHistory()
  const shown = limit ? history.slice(0, limit) : history

  return (
    <section aria-labelledby="history-heading" className="flex flex-col gap-4">
      <SectionHeader
        id="history-heading"
        title="Reading history"
        count={history.length}
        action={
          history.length === 0 ? null : onViewAll && history.length > shown.length ? (
            <BookeyButton variant="ghost" size="sm" onClick={onViewAll}>
              View all
            </BookeyButton>
          ) : (
            <BookeyButton variant="ghost" size="sm" onClick={clear}>
              Clear history
            </BookeyButton>
          )
        }
      />
      {history.length === 0 ? (
        <LibraryEmpty
          icon={<History />}
          title="No reading history"
          description="Sessions you read will appear here so you can retrace your steps."
          extra={
            <BookeyButton variant="outline" size="sm" onClick={restoreDemo}>
              <RotateCcw aria-hidden="true" />
              Restore demo history
            </BookeyButton>
          }
        />
      ) : (
        <ol className="relative flex flex-col gap-1 border-l border-border pl-5">
          {shown.map((session) => {
            const { courseTitle, location } = describePage(session)
            return (
              <li key={session.id} className="relative">
                <span aria-hidden="true" className="absolute top-4 -left-[25px] size-2.5 rounded-full border-2 border-card bg-primary" />
                <Link
                  href={pageHref(session)}
                  className="flex flex-col gap-0.5 rounded-xl px-3 py-2.5 outline-none transition-colors hover:bg-muted focus-visible:ring-4 focus-visible:ring-ring/30"
                >
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="text-sm font-medium">{session.summary}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">{session.label}</span>
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {courseTitle} · {location} · {session.minutes} min
                  </span>
                </Link>
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}
