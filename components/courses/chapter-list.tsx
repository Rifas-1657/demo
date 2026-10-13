'use client'

import { ChevronDown, Circle, CircleCheck, CirclePlay, Lock } from 'lucide-react'
import { useState } from 'react'
import { BookeyBadge } from '@/components/ui-kit/bookey-badge'
import { formatMinutes, getChapterProgress, type ChapterStatus, type LearningCourse } from '@/lib/mock/learning'
import { cn } from '@/lib/utils'
import { CourseStartButton } from './course-start-button'

const STATUS: Record<ChapterStatus, { label: string; icon: typeof Circle; tone: 'success' | 'brand' | 'outline' | 'neutral' }> = {
  completed: { label: 'Completed', icon: CircleCheck, tone: 'success' },
  'in-progress': { label: 'In progress', icon: CirclePlay, tone: 'brand' },
  available: { label: 'Up next', icon: Circle, tone: 'outline' },
  locked: { label: 'Locked', icon: Lock, tone: 'neutral' },
}

export function ChapterList({ course }: { course: LearningCourse }) {
  const rows = getChapterProgress(course)
  const current = rows.find((row) => row.status === 'in-progress' || row.status === 'available')
  const [open, setOpen] = useState<Set<number>>(() => new Set(current ? [current.chapter.number] : []))
  const allOpen = open.size === rows.length

  function toggle(number: number) {
    setOpen((previous) => {
      const next = new Set(previous)
      if (next.has(number)) next.delete(number)
      else next.add(number)
      return next
    })
  }

  return (
    <section aria-labelledby="chapters-heading" className="rounded-3xl border border-border bg-card p-5 sm:p-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="chapters-heading" className="font-display text-xl font-semibold">
            Chapters
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {rows.filter((row) => row.status === 'completed').length} of {rows.length} completed · chapters unlock in order
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(allOpen ? new Set() : new Set(rows.map((row) => row.chapter.number)))}
          className="rounded-full px-3 py-1.5 text-sm font-medium text-primary outline-none hover:bg-muted focus-visible:ring-4 focus-visible:ring-ring/30"
        >
          {allOpen ? 'Collapse all' : 'Expand all'}
        </button>
      </div>

      <ol className="divide-y divide-border overflow-hidden rounded-2xl border border-border">
        {rows.map(({ chapter, status, pagesRead, minutes }) => {
          const meta = STATUS[status]
          const Icon = meta.icon
          const isOpen = open.has(chapter.number)
          const panelId = `chapter-${chapter.number}-panel`
          const buttonId = `chapter-${chapter.number}-button`
          const canOpen = status !== 'locked'

          return (
            <li key={chapter.number} className={cn(status === 'in-progress' && 'bg-secondary/40')}>
              <h3>
                <button
                  id={buttonId}
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() => toggle(chapter.number)}
                  className="flex w-full items-center gap-3 px-4 py-3.5 text-left outline-none transition-colors hover:bg-muted/60 focus-visible:bg-muted focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-inset sm:gap-4"
                >
                  <span
                    className={cn(
                      'grid size-9 shrink-0 place-items-center rounded-full font-mono text-xs tabular-nums',
                      status === 'completed' && 'bg-emerald-50 text-emerald-800',
                      status === 'in-progress' && 'bg-primary text-primary-foreground',
                      status === 'available' && 'bg-secondary text-secondary-foreground',
                      status === 'locked' && 'bg-muted text-muted-foreground',
                    )}
                  >
                    {status === 'completed' ? <CircleCheck aria-hidden="true" className="size-4" /> : String(chapter.number).padStart(2, '0')}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={cn('block font-medium', status === 'locked' && 'text-muted-foreground')}>{chapter.title}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {chapter.pages} pages · {formatMinutes(minutes)}
                      <span className="sr-only"> · {meta.label}</span>
                    </span>
                  </span>
                  <BookeyBadge tone={meta.tone} icon={<Icon aria-hidden="true" />} className="hidden sm:inline-flex" aria-hidden="true">
                    {meta.label}
                  </BookeyBadge>
                  <ChevronDown
                    aria-hidden="true"
                    className={cn('size-4 shrink-0 text-muted-foreground transition-transform duration-200 motion-reduce:transition-none', isOpen && 'rotate-180')}
                  />
                </button>
              </h3>
              <div id={panelId} role="region" aria-labelledby={buttonId} hidden={!isOpen}>
                <div className="flex flex-col gap-4 px-4 pb-4 sm:flex-row sm:items-end sm:justify-between sm:pl-[4.25rem]">
                  <div className="space-y-1.5">
                    <p className="text-sm leading-relaxed text-pretty">{chapter.summary}</p>
                    <p className="text-xs text-muted-foreground">
                      {status === 'locked'
                        ? course.available
                          ? `Unlocks after chapter ${chapter.number - 1}.`
                          : 'Not included in this demo.'
                        : `${pagesRead} of ${chapter.pages} pages read`}
                    </p>
                  </div>
                  {canOpen && (
                    <CourseStartButton
                      course={course}
                      chapter={chapter.number}
                      size="sm"
                      variant={status === 'completed' ? 'outline' : 'primary'}
                      label={status === 'completed' ? 'Review chapter' : status === 'in-progress' ? 'Resume chapter' : 'Open chapter'}
                      className="self-start sm:self-auto"
                    />
                  )}
                </div>
              </div>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
