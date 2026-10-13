'use client'

import { Check, Save } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import { BookeyButton } from '@/components/ui-kit/bookey-button'
import { notify } from '@/components/ui-kit/toast'
import { SegmentedControl } from '@/components/workspace/form-controls'
import { DEMO_TODAY, seedCourses } from '@/lib/admin/seed'
import type { AdminCourse, AdminCourseStatus } from '@/lib/admin/types'
import { SLUG_PATTERN, slugify } from '@/lib/admin/utils'
import type { CourseLevel } from '@/lib/mock/learning'
import { useAdminDemo } from '@/lib/stores/admin-demo'
import { cn } from '@/lib/utils'
import { AdminPageHeader, AdminPanel, describedBy, Field, inputClass, StatusBadge, textareaClass } from '../admin-ui'
import { ChapterEditor } from './chapter-editor'

const NAMED_COLORS = [
  { value: '#BE123C', label: 'Bookey red' },
  { value: '#7C2D12', label: 'Rust' },
  { value: '#B45309', label: 'Amber' },
  { value: '#0F766E', label: 'Teal' },
  { value: '#1D4ED8', label: 'Blue' },
  { value: '#6D28D9', label: 'Violet' },
  { value: '#3B0A14', label: 'Burgundy' },
]

const COVER_COLORS = [
  ...NAMED_COLORS,
  ...Array.from(new Set(seedCourses.map((c) => c.coverColor)))
    .filter((hex) => !NAMED_COLORS.some((n) => n.value.toLowerCase() === hex.toLowerCase()))
    .map((hex) => ({ value: hex, label: `Course color ${hex}` })),
]

const LANGUAGES = ['English', 'Spanish', 'French', 'German', 'Portuguese', 'Hindi', 'Japanese']

type Errors = Record<string, string>

function validate(values: AdminCourse, otherSlugs: string[]): Errors {
  const errors: Errors = {}
  const title = values.title.trim()
  if (title.length < 3) errors.title = 'Enter a title of at least 3 characters.'
  else if (title.length > 80) errors.title = 'Keep the title under 80 characters.'
  if (!SLUG_PATTERN.test(values.slug)) errors.slug = 'Use lowercase letters, numbers, and single hyphens.'
  else if (otherSlugs.includes(values.slug)) errors.slug = 'Another course already uses this slug.'
  const description = values.description.trim()
  if (description.length < 20) errors.description = 'Write at least 20 characters so learners know what to expect.'
  else if (description.length > 600) errors.description = 'Keep the description under 600 characters.'
  if (!values.language.trim()) errors.language = 'Enter the course language or topic.'
  if (values.chapters.length === 0) errors.chapters = 'Add at least one chapter.'
  values.chapters.forEach((chapter, index) => {
    if (!chapter.title.trim()) errors[`${chapter.id}-title`] = `Chapter ${index + 1} needs a title.`
    if (!Number.isInteger(chapter.pages) || chapter.pages < 1 || chapter.pages > 50)
      errors[`${chapter.id}-pages`] = 'Use 1–50 pages.'
  })
  return errors
}

const FIELD_ORDER = ['title', 'slug', 'description', 'language']

export function CourseForm({ initial, mode }: { initial: AdminCourse; mode: 'new' | 'edit' }) {
  const router = useRouter()
  const courses = useAdminDemo((s) => s.courses)
  const saveCourse = useAdminDemo((s) => s.saveCourse)
  const [values, setValues] = useState(initial)
  const [errors, setErrors] = useState<Errors>({})
  const [slugEdited, setSlugEdited] = useState(mode === 'edit')
  const summaryRef = useRef<HTMLDivElement>(null)

  const otherSlugs = courses.filter((c) => c.id !== values.id).map((c) => c.slug)
  const set = <K extends keyof AdminCourse>(key: K, value: AdminCourse[K]) => setValues((v) => ({ ...v, [key]: value }))
  const errorCount = Object.keys(errors).length

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    const nextErrors = validate(values, otherSlugs)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      requestAnimationFrame(() => summaryRef.current?.focus())
      return
    }
    saveCourse({
      ...values,
      title: values.title.trim(),
      description: values.description.trim(),
      language: values.language.trim(),
      chapters: values.chapters.map((c) => ({ ...c, title: c.title.trim() })),
      updatedAt: DEMO_TODAY,
    })
    notify.demo(mode === 'new' ? `Created “${values.title.trim()}”` : `Saved “${values.title.trim()}”`)
    router.push('/admin/courses')
  }

  const errorTarget = (key: string) => (FIELD_ORDER.includes(key) ? `course-${key}` : key === 'chapters' ? 'add-chapter' : key)

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      <AdminPageHeader
        title={mode === 'new' ? 'New course' : `Edit ${initial.title}`}
        description="Demo form — saving updates this browser only. Published courses with a public page sync their title, description, level, and color to the catalog."
        actions={
          <>
            <BookeyButton variant="outline" nativeButton={false} render={<Link href="/admin/courses" />}>
              Cancel
            </BookeyButton>
            <BookeyButton type="submit">
              <Save aria-hidden="true" />
              {mode === 'new' ? 'Create course' : 'Save changes'}
            </BookeyButton>
          </>
        }
      />

      {errorCount > 0 && (
        <div
          ref={summaryRef}
          tabIndex={-1}
          role="alert"
          className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm outline-none focus-visible:ring-4 focus-visible:ring-destructive/20"
        >
          <p className="font-semibold text-destructive">
            Fix {errorCount} {errorCount === 1 ? 'issue' : 'issues'} before saving
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {Object.entries(errors).map(([key, message]) => (
              <li key={key}>
                <a href={`#${errorTarget(key)}`} className="underline underline-offset-2 hover:text-destructive">
                  {message}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-6">
          <AdminPanel title="Details">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field id="course-title" label="Title" error={errors.title} className="sm:col-span-2">
                <input
                  id="course-title"
                  value={values.title}
                  onChange={(e) => {
                    const title = e.target.value
                    setValues((v) => ({ ...v, title, slug: slugEdited ? v.slug : slugify(title) }))
                  }}
                  aria-invalid={errors.title ? true : undefined}
                  aria-describedby={describedBy('course-title', errors.title)}
                  className={inputClass}
                />
              </Field>
              <Field id="course-slug" label="Slug" error={errors.slug} hint="Used in the course URL.">
                <div className="flex">
                  <span className="grid place-items-center rounded-l-xl border border-r-0 border-input bg-muted px-3 font-mono text-xs text-muted-foreground">
                    /courses/
                  </span>
                  <input
                    id="course-slug"
                    value={values.slug}
                    onChange={(e) => {
                      setSlugEdited(true)
                      set('slug', e.target.value.toLowerCase().replace(/\s+/g, '-'))
                    }}
                    aria-invalid={errors.slug ? true : undefined}
                    aria-describedby={describedBy('course-slug', errors.slug, 'Used in the course URL.')}
                    className={cn(inputClass, 'rounded-l-none font-mono')}
                  />
                </div>
              </Field>
              <Field id="course-language" label="Language" error={errors.language} hint="Programming language or topic, e.g. Python.">
                <input
                  id="course-language"
                  value={values.language}
                  onChange={(e) => set('language', e.target.value)}
                  aria-invalid={errors.language ? true : undefined}
                  aria-describedby={describedBy('course-language', errors.language, 'hint')}
                  className={inputClass}
                />
              </Field>
              <Field
                id="course-description"
                label="Description"
                error={errors.description}
                hint={`${values.description.trim().length}/600 characters`}
                className="sm:col-span-2"
              >
                <textarea
                  id="course-description"
                  rows={4}
                  value={values.description}
                  onChange={(e) => set('description', e.target.value)}
                  aria-invalid={errors.description ? true : undefined}
                  aria-describedby={describedBy('course-description', errors.description, 'hint')}
                  className={textareaClass}
                />
              </Field>
            </div>
          </AdminPanel>

          <AdminPanel
            title="Chapters"
            description="Reorder with the arrow buttons — they work with keyboard and screen readers."
          >
            <ChapterEditor
              chapters={values.chapters}
              onChange={(chapters) => set('chapters', chapters)}
              errors={errors}
              listError={errors.chapters}
            />
          </AdminPanel>
        </div>

        <div className="space-y-6">
          <AdminPanel title="Publishing">
            <div className="space-y-5">
              <SegmentedControl<AdminCourseStatus>
                label="Status"
                name="course-status"
                value={values.status}
                onChange={(v) => set('status', v)}
                options={[
                  { value: 'draft', label: 'Draft' },
                  { value: 'published', label: 'Published' },
                ]}
              />
              <SegmentedControl<CourseLevel>
                label="Level"
                name="course-level"
                stacked
                value={values.level}
                onChange={(v) => set('level', v)}
                options={[
                  { value: 'Beginner', label: 'Beginner' },
                  { value: 'Intermediate', label: 'Intermediate' },
                  { value: 'Advanced', label: 'Advanced' },
                ]}
              />
              <Field id="course-locale" label="Content language">
                <select id="course-locale" className={inputClass} defaultValue="English" aria-describedby="course-locale-hint">
                  {LANGUAGES.map((l) => (
                    <option key={l}>{l}</option>
                  ))}
                </select>
              </Field>
              <p id="course-locale-hint" className="-mt-3 text-xs text-muted-foreground">
                Demo only — content is English for now.
              </p>
            </div>
          </AdminPanel>

          <AdminPanel title="Cover color">
            <fieldset>
              <legend className="sr-only">Cover color</legend>
              <div className="flex flex-wrap gap-2">
                {COVER_COLORS.map((color) => {
                  const selected = values.coverColor.toLowerCase() === color.value.toLowerCase()
                  return (
                    <label
                      key={color.value}
                      title={color.label}
                      className="relative grid size-10 cursor-pointer place-items-center rounded-xl ring-offset-2 ring-offset-card has-focus-visible:ring-4 has-focus-visible:ring-ring/40"
                      style={{ background: color.value }}
                    >
                      <input
                        type="radio"
                        name="cover-color"
                        value={color.value}
                        checked={selected}
                        onChange={() => set('coverColor', color.value)}
                        className="sr-only"
                      />
                      <span className="sr-only">{color.label}</span>
                      {selected && <Check aria-hidden="true" className="size-5 text-white drop-shadow" />}
                    </label>
                  )
                })}
              </div>
            </fieldset>
            <div className="mt-5 flex items-center gap-4 rounded-xl bg-muted p-3" aria-hidden="true">
              <span className="h-20 w-14 shrink-0 rounded-lg shadow-md" style={{ background: values.coverColor }} />
              <div className="min-w-0">
                <p className="truncate font-display font-semibold">{values.title || 'Untitled course'}</p>
                <p className="text-xs text-muted-foreground">
                  {values.chapters.length} chapters · {values.level}
                </p>
                <div className="mt-2">
                  <StatusBadge status={values.status} />
                </div>
              </div>
            </div>
          </AdminPanel>
        </div>
      </div>
    </form>
  )
}
