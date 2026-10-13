import { ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { getCoursePosition, type LearningCourse } from '@/lib/mock/learning'
import { DashboardPanel, ProgressBar } from './dashboard-panel'

export function ResumeList({ courses }: { courses: LearningCourse[] }) {
  const started = courses.filter((course) => getCoursePosition(course).started && !getCoursePosition(course).finished)

  return (
    <DashboardPanel id="resume" title="Pick up where you left off" description="The chapter you were in for each book.">
      <ul className="-mx-2 flex flex-col">
        {started.map((course) => {
          const { chapter, pageInChapter } = getCoursePosition(course)
          const chapterPercent = ((pageInChapter - 1) / chapter.pages) * 100
          return (
            <li key={course.id}>
              <Link
                href={`/book/${course.id}`}
                className="group flex items-center gap-4 rounded-2xl px-2 py-3 outline-none hover:bg-muted focus-visible:bg-muted focus-visible:ring-4 focus-visible:ring-ring/20"
              >
                <span
                  aria-hidden="true"
                  className="grid size-11 shrink-0 place-items-center rounded-2xl font-display text-sm font-bold"
                  style={{ background: course.cover.base, color: course.cover.text }}
                >
                  {String(chapter.number).padStart(2, '0')}
                </span>
                <span className="min-w-0 flex-1 space-y-1.5">
                  <span className="block truncate text-sm font-medium">{chapter.title}</span>
                  <span className="flex items-center gap-3">
                    <span className="truncate text-xs text-muted-foreground">
                      {course.title} · Page {pageInChapter} of {chapter.pages}
                    </span>
                  </span>
                  <ProgressBar value={chapterPercent} label={`Chapter ${chapter.number} progress`} className="h-1 max-w-48" />
                </span>
                <span className="hidden shrink-0 text-xs text-muted-foreground sm:block">{course.lastOpened}</span>
                <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground group-hover:text-primary" />
              </Link>
            </li>
          )
        })}
      </ul>
    </DashboardPanel>
  )
}
