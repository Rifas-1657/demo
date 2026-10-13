import { BookOpen, FlaskConical } from 'lucide-react'
import Link from 'next/link'
import { BookeyButton } from '@/components/ui-kit/bookey-button'
import { EmptyState } from '@/components/ui-kit/empty-state'
import { learningCourses } from '@/lib/mock/learning'

export function DashboardEmpty() {
  const starter = learningCourses[0]
  return (
    <EmptyState
      icon={<BookOpen />}
      title="No books in progress yet"
      description={`Start with ${starter.title} — short pages, code you run on the page, and your place saved as you go. Your progress, practice, and activity will appear here.`}
      action={
        <div className="flex flex-wrap justify-center gap-3">
          <BookeyButton nativeButton={false} render={<Link href={`/book/${starter.id}`} />}>
            Start {starter.title}
          </BookeyButton>
          <BookeyButton variant="outline" nativeButton={false} render={<Link href="/courses" />}>
            Browse courses
          </BookeyButton>
        </div>
      }
      className="py-16"
    />
  )
}

/** Development-only switch for inspecting the empty dashboard. Never rendered in production. */
export function DevPreviewToggle({ empty }: { empty: boolean }) {
  if (process.env.NODE_ENV !== 'development') return null
  return (
    <aside
      aria-label="Developer preview"
      className="flex flex-wrap items-center gap-3 rounded-2xl border border-dashed border-amber-500/50 px-4 py-2.5 text-xs text-muted-foreground"
    >
      <FlaskConical aria-hidden="true" className="size-4 text-amber-500" />
      <span>
        <span className="font-semibold text-foreground">Dev only:</span> previewing the {empty ? 'empty' : 'populated'} state.
      </span>
      <Link
        href={empty ? '/dashboard' : '/dashboard?preview=empty'}
        className="font-medium text-primary underline-offset-4 hover:underline"
      >
        Show {empty ? 'populated' : 'empty'} state
      </Link>
    </aside>
  )
}
