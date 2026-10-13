'use client'

import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { BookeyButton } from '@/components/ui-kit/bookey-button'
import type { AdminChapter } from '@/lib/admin/types'
import { newId } from '@/lib/admin/utils'
import { cn } from '@/lib/utils'
import { inputClass } from '../admin-ui'

interface ChapterEditorProps {
  chapters: AdminChapter[]
  onChange: (chapters: AdminChapter[]) => void
  errors: Record<string, string>
  listError?: string
}

const iconButton =
  'grid size-9 shrink-0 place-items-center rounded-full text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-4 focus-visible:ring-ring/30 disabled:pointer-events-none disabled:opacity-35'

export function ChapterEditor({ chapters, onChange, errors, listError }: ChapterEditorProps) {
  const [announcement, setAnnouncement] = useState('')

  const update = (id: string, patch: Partial<AdminChapter>) =>
    onChange(chapters.map((c) => (c.id === id ? { ...c, ...patch } : c)))

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction
    if (target < 0 || target >= chapters.length) return
    const next = [...chapters]
    const [moved] = next.splice(index, 1)
    next.splice(target, 0, moved)
    onChange(next)
    setAnnouncement(`“${moved.title || 'Untitled chapter'}” moved to position ${target + 1} of ${next.length}.`)
    // Keep focus on the moved chapter's control; fall back to the opposite arrow at the list edges.
    requestAnimationFrame(() => {
      const preferred = document.getElementById(`${moved.id}-${direction === -1 ? 'up' : 'down'}`) as HTMLButtonElement | null
      const fallback = document.getElementById(`${moved.id}-${direction === -1 ? 'down' : 'up'}`) as HTMLButtonElement | null
      ;(preferred && !preferred.disabled ? preferred : fallback)?.focus()
    })
  }

  const remove = (index: number) => {
    const removed = chapters[index]
    const next = chapters.filter((_, i) => i !== index)
    onChange(next)
    setAnnouncement(`Removed “${removed.title || 'Untitled chapter'}”.`)
    requestAnimationFrame(() => {
      const neighbour = next[Math.min(index, next.length - 1)]
      document.getElementById(neighbour ? `${neighbour.id}-title` : 'add-chapter')?.focus()
    })
  }

  const add = () => {
    const chapter: AdminChapter = { id: newId('ch'), title: '', pages: 5 }
    onChange([...chapters, chapter])
    setAnnouncement(`Added chapter ${chapters.length + 1}.`)
    requestAnimationFrame(() => document.getElementById(`${chapter.id}-title`)?.focus())
  }

  return (
    <div className="space-y-3">
      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
      {listError && (
        <p id="chapters-error" className="text-sm font-medium text-destructive">
          {listError}
        </p>
      )}
      <ol className="space-y-2" aria-describedby={listError ? 'chapters-error' : undefined}>
        {chapters.map((chapter, index) => {
          const titleError = errors[`${chapter.id}-title`]
          const pagesError = errors[`${chapter.id}-pages`]
          return (
            <li key={chapter.id} className="rounded-xl border border-border bg-background p-3">
              <div className="flex flex-wrap items-start gap-3 sm:flex-nowrap">
                <span
                  aria-hidden="true"
                  className="mt-1 grid size-8 shrink-0 place-items-center rounded-lg bg-secondary font-display text-sm font-semibold text-secondary-foreground tabular-nums"
                >
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1 basis-48">
                  <label htmlFor={`${chapter.id}-title`} className="sr-only">
                    Chapter {index + 1} title
                  </label>
                  <input
                    id={`${chapter.id}-title`}
                    value={chapter.title}
                    onChange={(e) => update(chapter.id, { title: e.target.value })}
                    placeholder="Chapter title"
                    aria-invalid={titleError ? true : undefined}
                    aria-describedby={titleError ? `${chapter.id}-title-error` : undefined}
                    className={inputClass}
                  />
                  {titleError && (
                    <p id={`${chapter.id}-title-error`} className="mt-1 text-xs font-medium text-destructive">
                      {titleError}
                    </p>
                  )}
                </div>
                <div className="w-24 shrink-0">
                  <label htmlFor={`${chapter.id}-pages`} className="sr-only">
                    Chapter {index + 1} page count
                  </label>
                  <div className="relative">
                    <input
                      id={`${chapter.id}-pages`}
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={50}
                      value={Number.isNaN(chapter.pages) ? '' : chapter.pages}
                      onChange={(e) => update(chapter.id, { pages: e.target.valueAsNumber })}
                      aria-invalid={pagesError ? true : undefined}
                      aria-describedby={pagesError ? `${chapter.id}-pages-error` : undefined}
                      className={cn(inputClass, 'pr-12 tabular-nums')}
                    />
                    <span aria-hidden="true" className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-muted-foreground">
                      pages
                    </span>
                  </div>
                  {pagesError && (
                    <p id={`${chapter.id}-pages-error`} className="mt-1 text-xs font-medium text-destructive">
                      {pagesError}
                    </p>
                  )}
                </div>
                <div className="ml-auto flex shrink-0 items-center gap-0.5">
                  <button
                    type="button"
                    id={`${chapter.id}-up`}
                    onClick={() => move(index, -1)}
                    disabled={index === 0}
                    className={iconButton}
                  >
                    <ArrowUp aria-hidden="true" className="size-4" />
                    <span className="sr-only">Move chapter {index + 1} up</span>
                  </button>
                  <button
                    type="button"
                    id={`${chapter.id}-down`}
                    onClick={() => move(index, 1)}
                    disabled={index === chapters.length - 1}
                    className={iconButton}
                  >
                    <ArrowDown aria-hidden="true" className="size-4" />
                    <span className="sr-only">Move chapter {index + 1} down</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    disabled={chapters.length === 1}
                    className={cn(iconButton, 'hover:bg-destructive/10 hover:text-destructive')}
                  >
                    <Trash2 aria-hidden="true" className="size-4" />
                    <span className="sr-only">Remove chapter {index + 1}</span>
                  </button>
                </div>
              </div>
            </li>
          )
        })}
      </ol>
      <BookeyButton id="add-chapter" type="button" variant="outline" size="sm" onClick={add} disabled={chapters.length >= 30}>
        <Plus aria-hidden="true" />
        Add chapter
      </BookeyButton>
    </div>
  )
}
