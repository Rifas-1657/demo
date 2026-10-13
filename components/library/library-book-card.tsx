import { Bookmark, BookmarkCheck, Clock, Play } from 'lucide-react'
import Link from 'next/link'
import { BookStatic } from '@/components/ui-kit/book-3d/book-static'
import { BookeyButton } from '@/components/ui-kit/bookey-button'
import { pageHref, type PageRef } from '@/lib/mock/library'
import { getCoursePosition, type LearningCourse } from '@/lib/mock/learning'
import { cn } from '@/lib/utils'

interface LibraryBookCardProps {
  course: LearningCourse
  bookmarked: boolean
  onToggleBookmark: (ref: PageRef, excerpt: string) => void
}

export function LibraryBookCard({ course, bookmarked, onToggleBookmark }: LibraryBookCardProps) {
  const position = getCoursePosition(course)
  const ref: PageRef = { courseId: course.id, chapter: position.chapter.number, page: position.pageInChapter }
  const headingId = `book-${course.id}`

  return (
    <article aria-labelledby={headingId} className="flex gap-4 rounded-3xl border border-border bg-card p-5 transition-colors hover:border-primary/30">
      <BookStatic title={course.title} author={course.author} cover={course.cover} className="w-24 shrink-0 self-start [&>div]:w-[86%]" />

      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="space-y-1">
          <div className="flex items-start justify-between gap-2">
            <h3 id={headingId} className="font-display text-lg leading-snug font-semibold text-balance">
              {course.title}
            </h3>
            <BookeyButton
              size="icon"
              variant="ghost"
              className="-mt-1.5 -mr-2 size-9"
              aria-pressed={bookmarked}
              aria-label={bookmarked ? `Remove bookmark on ${course.title} resume page` : `Bookmark ${course.title} resume page`}
              onClick={() => onToggleBookmark(ref, course.resumeExcerpt)}
            >
              {bookmarked ? <BookmarkCheck aria-hidden="true" className="text-primary" /> : <Bookmark aria-hidden="true" />}
            </BookeyButton>
          </div>
          <p className="truncate text-sm text-muted-foreground">
            Chapter {position.chapter.number} · {position.chapter.title}
          </p>
          <p className="text-xs text-muted-foreground">
            Page {position.pageInChapter} of {position.chapter.pages} · book page {position.bookPage} of {position.totalPages}
          </p>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-baseline justify-between text-xs">
            <span className="font-medium tabular-nums">{position.percent}% complete</span>
            <span className="flex items-center gap-1 text-muted-foreground">
              <Clock aria-hidden="true" className="size-3.5" />
              <span className="sr-only">Last opened </span>
              {course.lastOpened ?? 'Not opened yet'}
            </span>
          </div>
          <div
            role="progressbar"
            aria-label={`${course.title} progress`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={position.percent}
            aria-valuetext={`${position.completedPages} of ${position.totalPages} pages`}
            className="h-2 overflow-hidden rounded-full bg-muted"
          >
            <div className={cn('h-full rounded-full bg-primary')} style={{ width: `${position.percent}%` }} />
          </div>
        </div>

        <BookeyButton
          size="sm"
          variant={course.available ? 'primary' : 'outline'}
          className="self-start"
          nativeButton={false}
          render={<Link href={pageHref(ref)} />}
        >
          {course.available && <Play aria-hidden="true" className="fill-current" />}
          {course.available ? 'Resume' : 'View course'}
          <span className="sr-only"> {course.title}</span>
        </BookeyButton>
      </div>
    </article>
  )
}
