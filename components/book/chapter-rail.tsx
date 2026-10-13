'use client'

import { CheckCircle2, Circle, CircleDot, Lock } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { LearningChapter } from '@/lib/mock/learning'
import type { BookLessonPage } from '@/types/book'

interface ChapterRailProps {
  chapters: LearningChapter[]
  pages: BookLessonPage[]
  currentIndex: number
  visited: string[]
  onSelectPage: (index: number) => void
}

export function ChapterRail({ chapters, pages, currentIndex, visited, onSelectPage }: ChapterRailProps) {
  const current = pages[currentIndex]

  return (
    <nav aria-label="Chapters" className="flex flex-col gap-1">
      <ol className="flex flex-col gap-1">
        {chapters.map((chapter) => {
          const chapterPages = pages
            .map((page, index) => ({ page, index }))
            .filter(({ page }) => page.chapterNumber === chapter.number)
          const seeded = chapterPages.length > 0
          const isCurrent = current?.chapterNumber === chapter.number
          const readCount = chapterPages.filter(({ page }) => visited.includes(page.id)).length
          const complete = seeded && readCount === chapterPages.length
          const StatusIcon = !seeded ? Lock : complete ? CheckCircle2 : isCurrent ? CircleDot : Circle
          const status = !seeded ? 'Generated when the tutor backend is connected' : complete ? 'Completed' : `${readCount} of ${chapterPages.length} read`

          return (
            <li key={chapter.number}>
              <button
                type="button"
                disabled={!seeded}
                onClick={() => seeded && onSelectPage(chapterPages[0].index)}
                aria-current={isCurrent ? 'true' : undefined}
                className={cn(
                  'flex w-full items-start gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                  isCurrent ? 'bg-secondary text-secondary-foreground' : 'hover:bg-muted',
                  !seeded && 'cursor-not-allowed opacity-55 hover:bg-transparent',
                )}
              >
                <StatusIcon
                  className={cn('mt-0.5 size-4 shrink-0', complete ? 'text-emerald-400' : isCurrent ? 'text-primary' : 'text-muted-foreground')}
                  aria-hidden="true"
                />
                <span className="min-w-0">
                  <span className="block text-sm font-medium">
                    {chapter.number}. {chapter.title}
                  </span>
                  <span className="block text-xs text-muted-foreground">{status}</span>
                </span>
              </button>

              {isCurrent && seeded && (
                <ol aria-label={`Pages in ${chapter.title}`} className="mt-1 mb-2 ml-10 flex flex-wrap gap-1.5">
                  {chapterPages.map(({ page, index }, position) => {
                    const active = index === currentIndex
                    const read = visited.includes(page.id)
                    return (
                      <li key={page.id}>
                        <button
                          type="button"
                          onClick={() => onSelectPage(index)}
                          aria-current={active ? 'page' : undefined}
                          aria-label={`Page ${position + 1}: ${page.title}${read ? ', read' : ''}`}
                          className={cn(
                            'grid size-7 place-items-center rounded-full border font-mono text-xs transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                            active
                              ? 'border-primary bg-primary text-primary-foreground'
                              : read
                                ? 'border-primary/40 bg-primary/15 text-foreground'
                                : 'border-border text-muted-foreground hover:border-primary/50',
                          )}
                        >
                          {position + 1}
                        </button>
                      </li>
                    )
                  })}
                </ol>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
