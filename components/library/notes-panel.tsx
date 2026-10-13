'use client'

import { ExternalLink, Pencil, StickyNote, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useId, useRef, useState } from 'react'
import { toast } from 'sonner'
import { BookeyButton } from '@/components/ui-kit/bookey-button'
import { describePage, pageHref, type LibraryNote } from '@/lib/mock/library'
import { formatWhen, useNotes } from '@/lib/stores/library'
import { LibraryEmpty } from './library-empty'
import { SectionHeader } from './section-header'

interface NotesPanelProps {
  limit?: number
  onViewAll?: () => void
}

export function NotesPanel({ limit, onViewAll }: NotesPanelProps) {
  const { notes, edit, remove, restore, maxLength } = useNotes()
  const headingRef = useRef<HTMLHeadingElement>(null)
  const shown = limit ? notes.slice(0, limit) : notes

  function handleDelete(note: LibraryNote) {
    const index = notes.findIndex((item) => item.id === note.id)
    remove(note.id)
    headingRef.current?.focus()
    toast('Note deleted', {
      description: 'Removed from this browser.',
      action: { label: 'Undo', onClick: () => restore(note, index) },
    })
  }

  return (
    <section aria-labelledby="notes-heading" className="flex flex-col gap-4">
      <SectionHeader
        id="notes-heading"
        headingRef={headingRef}
        title="Saved notes"
        count={notes.length}
        action={
          onViewAll && notes.length > shown.length ? (
            <BookeyButton variant="ghost" size="sm" onClick={onViewAll}>
              View all notes
            </BookeyButton>
          ) : null
        }
      />
      {notes.length === 0 ? (
        <LibraryEmpty
          icon={<StickyNote />}
          title="No saved notes yet"
          description="Open a book and use the notes panel to jot down ideas. They will collect here with a link back to the page."
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {shown.map((note) => (
            <li key={note.id}>
              <NoteCard note={note} maxLength={maxLength} onSave={(text) => edit(note.id, text)} onDelete={() => handleDelete(note)} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

interface NoteCardProps {
  note: LibraryNote
  maxLength: number
  onSave: (text: string) => void
  onDelete: () => void
}

function NoteCard({ note, maxLength, onSave, onDelete }: NoteCardProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(note.text)
  const returnFocus = useRef(false)
  const fieldId = useId()
  const { courseTitle, location } = describePage(note)

  function startEditing() {
    setDraft(note.text)
    setEditing(true)
  }

  function stopEditing() {
    returnFocus.current = true
    setEditing(false)
  }

  function save() {
    if (!draft.trim()) return
    onSave(draft)
    stopEditing()
  }

  return (
    <article
      id={note.id}
      aria-label={`Note in ${courseTitle}, ${location}`}
      className="scroll-mt-24 rounded-2xl border border-border bg-card p-4 target:border-primary target:ring-4 target:ring-ring/20"
    >
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <p className="min-w-0 text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">{courseTitle}</span> · {location}
        </p>
        <span className="text-xs text-muted-foreground">{formatWhen(note.label, note.updatedAt)}</span>
      </div>

      {note.quote && (
        <blockquote className="mt-3 border-l-4 border-book-marker bg-book-paper/60 px-3 py-2 text-sm text-pretty italic text-book-ink">
          {note.quote}
        </blockquote>
      )}

      {editing ? (
        <form
          className="mt-3 flex flex-col gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            save()
          }}
        >
          <label htmlFor={fieldId} className="sr-only">
            Edit note
          </label>
          <textarea
            id={fieldId}
            autoFocus
            value={draft}
            maxLength={maxLength}
            rows={3}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.nativeEvent.isComposing || event.keyCode === 229) return
              if (event.key === 'Escape') {
                event.preventDefault()
                stopEditing()
              } else if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
                event.preventDefault()
                save()
              }
            }}
            aria-describedby={`${fieldId}-hint`}
            className="w-full resize-y rounded-xl border border-input bg-background px-3 py-2 text-sm leading-relaxed outline-none focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-ring/25"
          />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p id={`${fieldId}-hint`} className="text-xs text-muted-foreground">
              <span className="tabular-nums">
                {draft.length}/{maxLength}
              </span>{' '}
              · Ctrl+Enter to save, Esc to cancel
            </p>
            <div className="flex gap-2">
              <BookeyButton type="button" variant="ghost" size="sm" onClick={stopEditing}>
                Cancel
              </BookeyButton>
              <BookeyButton type="submit" size="sm" disabled={!draft.trim()}>
                Save note
              </BookeyButton>
            </div>
          </div>
        </form>
      ) : (
        <>
          <p className="mt-3 text-sm leading-relaxed text-pretty whitespace-pre-line">{note.text}</p>
          <div className="mt-3 flex flex-wrap items-center gap-1">
            <BookeyButton variant="link" size="sm" className="mr-auto text-xs" nativeButton={false} render={<Link href={pageHref(note)} />}>
              <ExternalLink aria-hidden="true" className="size-3.5" />
              Open page
            </BookeyButton>
            <BookeyButton
              ref={(element: HTMLButtonElement | null) => {
                if (element && returnFocus.current) {
                  returnFocus.current = false
                  element.focus()
                }
              }}
              variant="ghost"
              size="sm"
              className="h-8 px-3"
              onClick={startEditing}
              aria-label={`Edit note in ${courseTitle}`}
            >
              <Pencil aria-hidden="true" className="size-3.5" />
              Edit
            </BookeyButton>
            <BookeyButton
              variant="ghost"
              size="sm"
              className="h-8 px-3 text-destructive hover:bg-destructive/10"
              onClick={onDelete}
              aria-label={`Delete note in ${courseTitle}`}
            >
              <Trash2 aria-hidden="true" className="size-3.5" />
              Delete
            </BookeyButton>
          </div>
        </>
      )}
    </article>
  )
}
