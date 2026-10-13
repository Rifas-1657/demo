'use client'

import { CircleCheck, FileStack, FileUp, LoaderCircle, MessageSquareText, Play, Trash2, TriangleAlert } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { BookeyBadge } from '@/components/ui-kit/bookey-badge'
import { BookeyButton } from '@/components/ui-kit/bookey-button'
import { EmptyState } from '@/components/ui-kit/empty-state'
import { notify } from '@/components/ui-kit/toast'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { AdminDocument, DocumentType } from '@/lib/admin/types'
import { formatBytes, formatDate, newId } from '@/lib/admin/utils'
import { useAdminDemo } from '@/lib/stores/admin-demo'
import { cn } from '@/lib/utils'
import { AdminPageHeader, ConfirmDialog, DemoNotice, inputClass, TableScroller, tdClass, textareaClass, thClass } from '../admin-ui'

const ACCEPTED: Record<string, DocumentType> = { pdf: 'PDF', docx: 'DOCX', md: 'MD', txt: 'TXT' }
const MAX_BYTES = 10 * 1024 * 1024

export function KnowledgeBase() {
  const documents = useAdminDemo((s) => s.documents)
  const advanceProcessing = useAdminDemo((s) => s.advanceProcessing)
  const processing = documents.some((d) => d.stage === 'processing')

  useEffect(() => {
    if (!processing) return
    const timer = window.setInterval(() => advanceProcessing(10), 450)
    return () => window.clearInterval(timer)
  }, [processing, advanceProcessing])

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Knowledge base"
        description="Attach source documents to courses so the tutor can reference them. In this demo, only file metadata is recorded."
      />
      <DemoNotice>
        <strong className="font-semibold">Nothing is uploaded or read.</strong> Selecting a file stores its name, type, size, and
        modified date in this browser. “Processing” is a simulated progress bar — no AI indexing happens.
      </DemoNotice>
      <UploadZone />
      {documents.length === 0 ? (
        <EmptyState
          icon={<FileStack aria-hidden="true" />}
          title="No documents yet"
          description="Select PDF, DOCX, Markdown, or text files to add their metadata."
        />
      ) : (
        <DocumentsTable documents={documents} />
      )}
    </div>
  )
}

function UploadZone() {
  const addDocuments = useAdminDemo((s) => s.addDocuments)
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [rejections, setRejections] = useState<string[]>([])

  const handleFiles = (list: FileList | null) => {
    if (!list || list.length === 0) return
    const accepted: AdminDocument[] = []
    const rejected: string[] = []
    Array.from(list).forEach((file) => {
      const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
      const type = ACCEPTED[ext]
      if (!type) rejected.push(`${file.name}: unsupported type. Use PDF, DOCX, MD, or TXT.`)
      else if (file.size === 0) rejected.push(`${file.name}: the file is empty.`)
      else if (file.size > MAX_BYTES) rejected.push(`${file.name}: ${formatBytes(file.size)} exceeds the 10 MB demo limit.`)
      else
        accepted.push({
          id: newId('doc'),
          name: file.name,
          type,
          size: file.size,
          lastModified: new Date(file.lastModified).toISOString(),
          courseId: null,
          stage: 'selected',
          progress: 0,
          instructions: '',
          sample: false,
        })
    })
    setRejections(rejected)
    if (accepted.length > 0) {
      addDocuments(accepted)
      notify.demo(`Recorded ${accepted.length} ${accepted.length === 1 ? 'file' : 'files'}`, 'Metadata only — file contents were not read.')
    }
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          handleFiles(e.dataTransfer.files)
        }}
        className={cn(
          'flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors',
          dragging ? 'border-primary bg-secondary' : 'border-border bg-card',
        )}
      >
        <span aria-hidden="true" className="grid size-12 place-items-center rounded-2xl bg-secondary text-secondary-foreground">
          <FileUp className="size-6" />
        </span>
        <div>
          <p className="font-medium">Drag files here, or choose from your device</p>
          <p id="upload-hint" className="text-sm text-muted-foreground">
            PDF, DOCX, MD, or TXT · up to 10 MB each · metadata only
          </p>
        </div>
        <input
          ref={inputRef}
          id="kb-file-input"
          type="file"
          multiple
          accept=".pdf,.docx,.md,.txt,application/pdf,text/markdown,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={(e) => handleFiles(e.target.files)}
          aria-describedby="upload-hint"
          className="sr-only"
        />
        <BookeyButton type="button" variant="outline" onClick={() => inputRef.current?.click()}>
          Choose files
        </BookeyButton>
      </div>
      {rejections.length > 0 && (
        <div role="alert" className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
          <p className="flex items-center gap-2 font-semibold text-destructive">
            <TriangleAlert aria-hidden="true" className="size-4" />
            {rejections.length} {rejections.length === 1 ? 'file was' : 'files were'} not added
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {rejections.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function DocumentsTable({ documents }: { documents: AdminDocument[] }) {
  const courses = useAdminDemo((s) => s.courses)
  const updateDocument = useAdminDemo((s) => s.updateDocument)
  const startProcessing = useAdminDemo((s) => s.startProcessing)
  const removeDocument = useAdminDemo((s) => s.removeDocument)
  const [pendingDelete, setPendingDelete] = useState<AdminDocument | null>(null)

  return (
    <>
      <TableScroller label="Knowledge base documents">
        <table className="w-full min-w-[64rem] text-sm">
          <caption className="sr-only">Documents with type, size, assigned course, and simulated processing status</caption>
          <thead className="border-b border-border bg-muted/50">
            <tr>
              <th scope="col" className={thClass}>File</th>
              <th scope="col" className={thClass}>Type</th>
              <th scope="col" className={`${thClass} text-right`}>Size</th>
              <th scope="col" className={thClass}>Preview metadata</th>
              <th scope="col" className={thClass}>Assigned course</th>
              <th scope="col" className={thClass}>Status</th>
              <th scope="col" className={`${thClass} text-right`}>
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {documents.map((doc) => (
              <tr key={doc.id} className="hover:bg-muted/40">
                <td className={tdClass}>
                  <p className="max-w-56 truncate font-medium" title={doc.name}>
                    {doc.name}
                  </p>
                  {doc.sample && <p className="text-xs text-amber-800">Sample record</p>}
                </td>
                <td className={tdClass}>
                  <BookeyBadge tone="outline">{doc.type}</BookeyBadge>
                </td>
                <td className={`${tdClass} text-right whitespace-nowrap tabular-nums`}>{formatBytes(doc.size)}</td>
                <td className={`${tdClass} text-xs text-muted-foreground`}>
                  <p>Modified {formatDate(doc.lastModified)}</p>
                  <p>{doc.instructions ? 'Has tutor instructions' : 'Contents not read'}</p>
                </td>
                <td className={tdClass}>
                  <label htmlFor={`${doc.id}-course`} className="sr-only">
                    Assign {doc.name} to a course
                  </label>
                  <select
                    id={`${doc.id}-course`}
                    value={doc.courseId ?? ''}
                    onChange={(e) => updateDocument(doc.id, { courseId: e.target.value || null })}
                    className={cn(inputClass, 'h-9 w-48')}
                  >
                    <option value="">Unassigned</option>
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                </td>
                <td className={tdClass}>
                  <ProcessingStatus doc={doc} />
                </td>
                <td className={tdClass}>
                  <div className="flex items-center justify-end gap-1">
                    {doc.stage === 'selected' && (
                      <BookeyButton variant="secondary" size="sm" onClick={() => startProcessing(doc.id)}>
                        <Play aria-hidden="true" />
                        Simulate<span className="sr-only"> processing for {doc.name}</span>
                      </BookeyButton>
                    )}
                    <InstructionsDialog doc={doc} onSave={(instructions) => updateDocument(doc.id, { instructions })} />
                    <button
                      type="button"
                      onClick={() => setPendingDelete(doc)}
                      className="grid size-9 place-items-center rounded-full text-muted-foreground outline-none hover:bg-destructive/10 hover:text-destructive focus-visible:ring-4 focus-visible:ring-ring/30"
                    >
                      <Trash2 aria-hidden="true" className="size-4" />
                      <span className="sr-only">Remove {doc.name}</span>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableScroller>
      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title="Remove document?"
        description={`“${pendingDelete?.name ?? ''}” will be removed from this demo knowledge base.`}
        confirmLabel="Remove document"
        onConfirm={() => {
          if (!pendingDelete) return
          removeDocument(pendingDelete.id)
          notify.demo(`Removed ${pendingDelete.name}`)
        }}
      />
    </>
  )
}

function ProcessingStatus({ doc }: { doc: AdminDocument }) {
  if (doc.stage === 'selected') return <BookeyBadge tone="neutral">Selected</BookeyBadge>
  if (doc.stage === 'ready')
    return (
      <BookeyBadge tone="success" icon={<CircleCheck aria-hidden="true" />}>
        Demo ready
      </BookeyBadge>
    )
  return (
    <div className="w-36 space-y-1.5">
      <p className="flex items-center gap-1.5 text-xs font-medium">
        <LoaderCircle aria-hidden="true" className="size-3.5 animate-spin motion-reduce:animate-none" />
        Simulated processing
      </p>
      <div
        role="progressbar"
        aria-label={`Simulated processing for ${doc.name}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={doc.progress}
        className="h-1.5 overflow-hidden rounded-full bg-muted"
      >
        <div className="h-full rounded-full bg-primary transition-[width] duration-300" style={{ width: `${doc.progress}%` }} />
      </div>
    </div>
  )
}

function InstructionsDialog({ doc, onSave }: { doc: AdminDocument; onSave: (value: string) => void }) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(doc.instructions)
  const fieldId = `${doc.id}-instructions`

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) setDraft(doc.instructions)
      }}
    >
      <BookeyButton variant="ghost" size="sm" onClick={() => setOpen(true)}>
        <MessageSquareText aria-hidden="true" />
        Instructions<span className="sr-only"> for {doc.name}</span>
      </BookeyButton>
      <DialogContent className="rounded-3xl p-6 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Tutor instructions</DialogTitle>
          <DialogDescription>Tell the tutor how to use “{doc.name}”. Saved in this browser only.</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            onSave(draft.trim())
            setOpen(false)
            notify.demo('Instructions saved')
          }}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <label htmlFor={fieldId} className="text-sm font-medium">
              Instructions
            </label>
            <textarea
              id={fieldId}
              rows={5}
              maxLength={500}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="For example: cite this glossary when a learner asks about definitions."
              aria-describedby={`${fieldId}-count`}
              className={textareaClass}
            />
            <p id={`${fieldId}-count`} className="text-xs text-muted-foreground">
              {draft.length}/500 characters
            </p>
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <DialogClose render={<BookeyButton type="button" variant="outline" />}>Cancel</DialogClose>
            <BookeyButton type="submit">Save instructions</BookeyButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
