import { CheckCircle2, Trophy } from 'lucide-react'
import Link from 'next/link'
import { pageHref } from '@/lib/mock/library'
import { formatMinutes, getCoursePosition, type ChapterProgress, type LearningCourse } from '@/lib/mock/learning'
import { LibraryEmpty } from './library-empty'
import { SectionHeader } from './section-header'

export interface CompletedGroup {
  course: LearningCourse
  chapters: ChapterProgress[]
}

export function CompletedList({ groups }: { groups: CompletedGroup[] }) {
  const total = groups.reduce((sum, group) => sum + group.chapters.length, 0)

  return (
    <section aria-labelledby="completed-heading" className="flex flex-col gap-4">
      <SectionHeader id="completed-heading" title="Completed chapters" count={total} />
      {total === 0 ? (
        <LibraryEmpty
          icon={<Trophy />}
          title="Nothing completed yet"
          description="Finish every page in a chapter and it will show up here, ready to review."
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {groups.map(({ course, chapters }) => {
            const position = getCoursePosition(course)
            return (
              <article key={course.id} aria-labelledby={`completed-${course.id}`} className="rounded-3xl border border-border bg-card p-5">
                <div className="mb-3 flex items-baseline justify-between gap-3">
                  <h3 id={`completed-${course.id}`} className="font-display font-semibold">
                    {course.title}
                  </h3>
                  <span className="text-xs text-muted-foreground">
                    {position.finished ? 'Book finished' : `${chapters.length} of ${course.chapters.length} chapters`}
                  </span>
                </div>
                <ul className="flex flex-col gap-1">
                  {chapters.map(({ chapter, minutes }) => (
                    <li key={chapter.number}>
                      <Link
                        href={pageHref({ courseId: course.id, chapter: chapter.number, page: 1 })}
                        className="flex items-center gap-3 rounded-xl px-2 py-2 outline-none transition-colors hover:bg-muted focus-visible:ring-4 focus-visible:ring-ring/30"
                      >
                        <CheckCircle2 aria-hidden="true" className="size-4 shrink-0 text-emerald-600" />
                        <span className="min-w-0 flex-1 truncate text-sm">
                          <span className="text-muted-foreground">Ch {chapter.number} · </span>
                          {chapter.title}
                        </span>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {chapter.pages} pages · {formatMinutes(minutes)}
                        </span>
                        <span className="sr-only">, completed. Review chapter.</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}
