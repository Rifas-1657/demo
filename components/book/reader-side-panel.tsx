'use client'

import { Bookmark, BookmarkMinus, Pencil, StickyNote, Trash2 } from 'lucide-react'
import { useId, useState } from 'react'
import { BookeyButton } from '@/components/ui-kit/bookey-button'
import { notify } from '@/components/ui-kit/toast'
import type { LibraryBookmark, LibraryNote, PageRef } from '@/lib/mock/library'
import { formatWhen, samePage } from '@/lib/stores/library'
import { cn } from '@/lib/utils'

export type SidePanelTab = 'notes' | 'bookmarks'

interface ReaderSidePanelProps {
  tab: SidePanelTab
  onTabChange: (tab: SidePanelTab) => void
  currentRef: PageRef
  currentTitle: string
  notes: LibraryNote[]
  bookmarks: LibraryBookmark[]
  maxNoteLength: number
  onAddNote: (text: string) => boolean
  onEditNote: (id: string, text: string) => void
  onRemoveNote: (note: LibraryNote) => void
  onRemoveBookmark: (bookmark: LibraryBookmark) => void
  onJump: (ref: PageRef) => boolean
}

function NoteEditor({
  initial,
  maxLength,
  label,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial: string
  maxLength: number
  label: string
  submitLabel: string
  onSubmit: (text: string) => void
  onCancel?: () => void
}) {
  const id = useId()
  const [text, setText] = useState(initial)
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        if (!text.trim()) return
        onSubmit(text)
        setText('')
      }}
      className="flex flex-col gap-2"
    >
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <textarea
        id={id}
        value={text}
        maxLength={maxLength}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape' && onCancel) onCancel()
        }}
        rows={3}
        placeholder="Write a note for this page…"
        className="w-full resize-y rounded-2xl border border-input bg-background/60 px-3 py-2 text-sm leading-relaxed placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      />
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-xs text-muted-foreground">
          {text.length}/{maxLength}
        </span>
        <div className="flex gap-2">
          {onCancel && (
            <BookeyButton type="button" size="sm" variant="ghost" onClick={onCancel}>
              Cancel
            </BookeyButton>
          )}
          <BookeyButton type="submit" size="sm" disabled={!text.trim()}>
            {submitLabel}
          </BookeyButton>
        </div>
      </div>
    </form>
  )
}

export function ReaderSidePanel(props: ReaderSidePanelProps) {
  const { tab, onTabChange, currentRef, currentTitle, notes, bookmarks, maxNoteLength } = props
  const [editingId, setEditingId] = useState<string | null>(null)
  const pageNotes = notes.filter((note) => samePage(note, currentRef))
  const otherNotes = notes.filter((note) => note.courseId === currentRef.courseId && !samePage(note, currentRef))
  const courseBookmarks = bookmarks.filter((bookmark) => bookmark.courseId === currentRef.courseId)

  const tabs = [
    { id: 'notes' as const, label: 'Notes', count: pageNotes.length + otherNotes.length, icon: StickyNote },
    { id: 'bookmarks' as const, label: 'Bookmarks', count: courseBookmarks.length, icon: Bookmark },
  ]

  function jump(ref: PageRef) {
    if (!props.onJump(ref)) notify.info?.('That page isn’t part of the demo yet.')
  }

  function renderNote(note: LibraryNote) {
    const editing = editingId === note.id
    return (
      <li key={note.id} className="rounded-2xl border border-border bg-card/50 p-3">
        {note.quote && (
          <blockquote className="mb-2 border-l-2 border-book-marker pl-2 text-xs text-muted-foreground italic">
            {note.quote}
          </blockquote>
        )}
        {editing ? (
          <NoteEditor
            initial={note.text}
            maxLength={maxNoteLength}
            label="Edit note"
            submitLabel="Save"
            onSubmit={(text) => {
              props.onEditNote(note.id, text)
              setEditingId(null)
            }}
            onCancel={() => setEditingId(null)}
          />
        ) : (
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{note.text}</p>
        )}
        {!editing && (
          <div className="mt-2 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => jump(note)}
              className="truncate text-left text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              Ch {note.chapter} · Page {note.page} · {formatWhen(note.label, note.updatedAt)}
            </button>
            <div className="flex shrink-0">
              <BookeyButton size="icon" variant="ghost" className="size-8" aria-label="Edit note" onClick={() => setEditingId(note.id)}>
                <Pencil aria-hidden="true" />
              </BookeyButton>
              <BookeyButton size="icon" variant="ghost" className="size-8" aria-label="Delete note" onClick={() => props.onRemoveNote(note)}>
                <Trash2 aria-hidden="true" />
              </BookeyButton>
            </div>
          </div>
        )}
      </li>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div role="tablist" aria-label="Reader panel" className="flex gap-1 rounded-full border border-border bg-background/40 p-1">
        {tabs.map(({ id, label, count, icon: Icon }) => (
          <button
            key={id}
            id={`side-tab-${id}`}
            type="button"
            role="tab"
            aria-selected={tab === id}
            aria-controls={`side-panel-${id}`}
            tabIndex={tab === id ? 0 : -1}
            onClick={() => onTabChange(id)}
            onKeyDown={(event) => {
              if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
                const next = id === 'notes' ? 'bookmarks' : 'notes'
                onTabChange(next)
                document.getElementById(`side-tab-${next}`)?.focus()
              }
            }}
            className={cn(
              'inline-flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
              tab === id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon className="size-4" aria-hidden="true" />
            {label}
            <span className="font-mono text-xs opacity-80">{count}</span>
          </button>
        ))}
      </div>

      <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1">
        {tab === 'notes' ? (
          <div id="side-panel-notes" role="tabpanel" aria-labelledby="side-tab-notes" className="flex flex-col gap-4">
            <section aria-label="Add a note" className="flex flex-col gap-2">
              <p className="text-xs text-muted-foreground">
                On <span className="font-medium text-foreground">{currentTitle}</span>
              </p>
              <NoteEditor
                initial=""
                maxLength={maxNoteLength}
                label={`New note for ${currentTitle}`}
                submitLabel="Add note"
                onSubmit={(text) => {
                  if (props.onAddNote(text)) notify.success?.('Note saved on this device')
                }}
              />
            </section>
            {pageNotes.length > 0 && (
              <section aria-labelledby="this-page-notes">
                <h3 id="this-page-notes" className="mb-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                  This page
                </h3>
                <ul className="flex flex-col gap-2">{pageNotes.map(renderNote)}</ul>
              </section>
            )}
            {otherNotes.length > 0 && (
              <section aria-labelledby="other-notes">
                <h3 id="other-notes" className="mb-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                  Elsewhere in this book
                </h3>
                <ul className="flex flex-col gap-2">{otherNotes.map(renderNote)}</ul>
              </section>
            )}
            {pageNotes.length + otherNotes.length === 0 && (
              <p className="rounded-2xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
                No notes for this book yet.
              </p>
            )}
          </div>
        ) : (
          <div id="side-panel-bookmarks" role="tabpanel" aria-labelledby="side-tab-bookmarks">
            {courseBookmarks.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
                No bookmarks yet. Use the bookmark button in the top bar to save this page.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {courseBookmarks.map((bookmark) => (
                  <li
                    key={bookmark.id}
                    className={cn(
                      'flex items-start gap-2 rounded-2xl border border-border bg-card/50 p-3',
                      samePage(bookmark, currentRef) && 'border-primary/60',
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => jump(bookmark)}
                      className="min-w-0 flex-1 rounded-lg text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                    >
                      <span className="block text-xs text-muted-foreground">
                        Ch {bookmark.chapter} · Page {bookmark.page} · {formatWhen(bookmark.label, bookmark.createdAt)}
                      </span>
                      <span className="mt-1 line-clamp-2 block text-sm">{bookmark.excerpt}</span>
                    </button>
                    <BookeyButton
                      size="icon"
                      variant="ghost"
                      className="size-8 shrink-0"
                      aria-label="Remove bookmark"
                      onClick={() => props.onRemoveBookmark(bookmark)}
                    >
                      <BookmarkMinus aria-hidden="true" />
                    </BookeyButton>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
