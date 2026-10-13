import { BookOpen, Clock, Play } from 'lucide-react'
import Link from 'next/link'
import { BookStatic } from '@/components/ui-kit/book-3d/book-static'
import { BookeyButton } from '@/components/ui-kit/bookey-button'
import { getCoursePosition, getRemainingMinutes, type LearningCourse } from '@/lib/mock/learning'

export function ContinueBook({ course }: { course: LearningCourse }) {
  const position = getCoursePosition(course)
  const hoursLeft = Math.round(getRemainingMinutes(course) / 60)

  return (
    <section
      aria-labelledby="continue-heading"
      className="relative isolate overflow-hidden rounded-3xl bg-[image:var(--bk-night-gradient)] p-6 text-[#FFF1F3] sm:p-8"
    >
      <div
        aria-hidden="true"
        className="absolute -top-24 -right-16 -z-10 size-80 rounded-full bg-[radial-gradient(circle,rgb(251_113_133/0.35),transparent_70%)]"
      />
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:gap-8">
        <div className="group mx-auto w-40 shrink-0 transition-transform duration-500 ease-out hover:-translate-y-1 motion-reduce:transition-none sm:mx-0 sm:w-48">
          <BookStatic title={course.title} author={course.author} cover={course.cover} className="w-full [&>div]:w-[78%]" />
        </div>

        <div className="min-w-0 flex-1 space-y-5">
          <div className="space-y-2">
            <p className="font-mono text-[11px] tracking-[0.18em] text-[#FB7185] uppercase">Continue your book</p>
            <h2 id="continue-heading" className="font-display text-2xl font-bold text-balance sm:text-3xl">
              {course.title}
            </h2>
            <p className="text-sm text-[#E4B6BF]">
              Chapter {position.chapter.number} · {position.chapter.title}
            </p>
          </div>

          <dl className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <div className="flex items-center gap-2">
              <BookOpen aria-hidden="true" className="size-4 text-[#FB7185]" />
              <dt className="sr-only">Position</dt>
              <dd>
                Page {position.pageInChapter} of {position.chapter.pages} in this chapter
              </dd>
            </div>
            <div className="flex items-center gap-2">
              <Clock aria-hidden="true" className="size-4 text-[#FB7185]" />
              <dt className="sr-only">Time left</dt>
              <dd>About {hoursLeft} h left</dd>
            </div>
          </dl>

          <div className="space-y-2">
            <div className="flex items-baseline justify-between text-sm">
              <span>
                <span className="font-semibold tabular-nums">{position.completedPages}</span>
                <span className="text-[#E4B6BF]"> of {position.totalPages} pages</span>
              </span>
              <span className="font-mono text-xs text-[#E4B6BF]">{position.percent}% · demo progress</span>
            </div>
            <div
              role="progressbar"
              aria-label={`${course.title} demo progress`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={position.percent}
              aria-valuetext={`${position.completedPages} of ${position.totalPages} pages`}
              className="h-2.5 overflow-hidden rounded-full bg-white/10"
            >
              <div className="h-full rounded-full bg-[#FB7185]" style={{ width: `${position.percent}%` }} />
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <BookeyButton size="lg" nativeButton={false} render={<Link href={`/book/${course.id}`} />}>
              <Play aria-hidden="true" className="fill-current" />
              Resume
            </BookeyButton>
            <BookeyButton
              size="lg"
              variant="ghost"
              className="text-[#FFF1F3] hover:bg-white/10"
              nativeButton={false}
              render={<Link href="/courses" />}
            >
              All courses
            </BookeyButton>
          </div>
        </div>
      </div>
    </section>
  )
}
