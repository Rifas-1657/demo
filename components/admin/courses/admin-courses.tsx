'use client'

import { Copy, Eye, EyeOff, ExternalLink, MoreHorizontal, PencilLine, Plus, Search } from 'lucide-react'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import { BookeyButton } from '@/components/ui-kit/bookey-button'
import { EmptyState } from '@/components/ui-kit/empty-state'
import { notify } from '@/components/ui-kit/toast'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { DEMO_TODAY } from '@/lib/admin/seed'
import type { AdminCourse, AdminCourseStatus } from '@/lib/admin/types'
import { formatDate } from '@/lib/admin/utils'
import type { CourseLevel } from '@/lib/mock/learning'
import { useAdminDemo } from '@/lib/stores/admin-demo'
import { AdminPageHeader, inputClass, StatusBadge, TableScroller, tdClass, thClass } from '../admin-ui'

type SortKey = 'edited' | 'name' | 'chapters'
const LEVELS: CourseLevel[] = ['Beginner', 'Intermediate', 'Advanced']

export function AdminCourses() {
  const courses = useAdminDemo((s) => s.courses)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<'all' | AdminCourseStatus>('all')
  const [level, setLevel] = useState<'all' | CourseLevel>('all')
  const [sort, setSort] = useState<SortKey>('edited')

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return [...courses]
      .filter((c) => (status === 'all' || c.status === status) && (level === 'all' || c.level === level))
      .filter((c) => !q || c.title.toLowerCase().includes(q) || c.slug.includes(q) || c.language.toLowerCase().includes(q))
      .sort((a, b) => {
        if (sort === 'name') return a.title.localeCompare(b.title)
        if (sort === 'chapters') return b.chapters.length - a.chapters.length
        return b.updatedAt.localeCompare(a.updatedAt)
      })
  }, [courses, query, status, level, sort])

  const filtered = query !== '' || status !== 'all' || level !== 'all'

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Courses"
        description="Create and edit demo courses. Changes are saved in this browser and published courses appear in the public catalog."
        actions={
          <BookeyButton nativeButton={false} render={<Link href="/admin/courses/new" />}>
            <Plus aria-hidden="true" />
            New course
          </BookeyButton>
        }
      />

      <div className="flex flex-col gap-3 md:flex-row md:items-end">
        <div className="relative flex-1">
          <label htmlFor="course-search" className="sr-only">
            Search courses
          </label>
          <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            id="course-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title, slug, or language"
            className={`${inputClass} pl-9`}
          />
        </div>
        <div className="grid grid-cols-3 gap-3 md:flex">
          <FilterSelect id="course-status" label="Status" value={status} onChange={(v) => setStatus(v as typeof status)}>
            <option value="all">All statuses</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
          </FilterSelect>
          <FilterSelect id="course-level" label="Level" value={level} onChange={(v) => setLevel(v as typeof level)}>
            <option value="all">All levels</option>
            {LEVELS.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect id="course-sort" label="Sort by" value={sort} onChange={(v) => setSort(v as SortKey)}>
            <option value="edited">Last edited</option>
            <option value="name">Name (A–Z)</option>
            <option value="chapters">Most chapters</option>
          </FilterSelect>
        </div>
      </div>

      <p aria-live="polite" className="text-sm text-muted-foreground">
        Showing {visible.length} of {courses.length} courses
      </p>

      {visible.length === 0 ? (
        <EmptyState
          icon={<Search aria-hidden="true" />}
          title="No courses match"
          description="Try a different search or clear the filters."
          action={
            filtered ? (
              <BookeyButton
                variant="outline"
                onClick={() => {
                  setQuery('')
                  setStatus('all')
                  setLevel('all')
                }}
              >
                Clear filters
              </BookeyButton>
            ) : undefined
          }
        />
      ) : (
        <TableScroller label="Courses table">
          <table className="w-full min-w-[52rem] text-sm">
            <caption className="sr-only">Demo courses with status, level, chapters, and last edited date</caption>
            <thead className="border-b border-border bg-muted/50">
              <tr>
                <th scope="col" className={thClass}>Name</th>
                <th scope="col" className={thClass}>Status</th>
                <th scope="col" className={thClass}>Level</th>
                <th scope="col" className={`${thClass} text-right`}>Chapters</th>
                <th scope="col" className={thClass}>Last edited</th>
                <th scope="col" className={`${thClass} text-right`}>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {visible.map((course) => (
                <CourseRow key={course.id} course={course} />
              ))}
            </tbody>
          </table>
        </TableScroller>
      )}
    </div>
  )
}

function FilterSelect({
  id,
  label,
  value,
  onChange,
  children,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  children: React.ReactNode
}) {
  return (
    <div className="min-w-0 space-y-1">
      <label htmlFor={id} className="text-xs font-medium text-muted-foreground">
        {label}
      </label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={`${inputClass} md:w-40`}>
        {children}
      </select>
    </div>
  )
}

function CourseRow({ course }: { course: AdminCourse }) {
  const duplicateCourse = useAdminDemo((s) => s.duplicateCourse)
  const togglePublish = useAdminDemo((s) => s.togglePublish)
  const publishing = course.status === 'draft'

  return (
    <tr className="hover:bg-muted/40">
      <td className={tdClass}>
        <div className="flex items-center gap-3">
          <span aria-hidden="true" className="h-9 w-7 shrink-0 rounded-md shadow-sm" style={{ background: course.coverColor }} />
          <div className="min-w-0">
            <Link
              href={`/admin/courses/${course.id}/edit`}
              className="font-medium outline-none hover:text-primary hover:underline focus-visible:ring-4 focus-visible:ring-ring/30"
            >
              {course.title}
            </Link>
            <p className="font-mono text-xs text-muted-foreground">/{course.slug}</p>
          </div>
        </div>
      </td>
      <td className={tdClass}>
        <StatusBadge status={course.status} />
      </td>
      <td className={`${tdClass} whitespace-nowrap`}>{course.level}</td>
      <td className={`${tdClass} text-right tabular-nums`}>{course.chapters.length}</td>
      <td className={`${tdClass} whitespace-nowrap text-muted-foreground`}>
        <time dateTime={course.updatedAt}>{formatDate(course.updatedAt)}</time>
      </td>
      <td className={`${tdClass} text-right`}>
        <div className="flex items-center justify-end gap-1">
          <BookeyButton variant="ghost" size="sm" nativeButton={false} render={<Link href={`/admin/courses/${course.id}/edit`} />}>
            <PencilLine aria-hidden="true" />
            Edit<span className="sr-only"> {course.title}</span>
          </BookeyButton>
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label={`More actions for ${course.title}`}
              className="grid size-9 place-items-center rounded-full outline-none hover:bg-muted focus-visible:ring-4 focus-visible:ring-ring/30 data-popup-open:bg-muted"
            >
              <MoreHorizontal aria-hidden="true" className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 rounded-2xl p-1.5">
              <DropdownMenuItem
                className="gap-2 rounded-xl px-2.5 py-2"
                onClick={() => {
                  togglePublish(course.id, DEMO_TODAY)
                  notify.demo(publishing ? `Published “${course.title}”` : `Moved “${course.title}” to drafts`)
                }}
              >
                {publishing ? <Eye aria-hidden="true" /> : <EyeOff aria-hidden="true" />}
                {publishing ? 'Publish' : 'Unpublish'}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="gap-2 rounded-xl px-2.5 py-2"
                onClick={() => {
                  const copy = duplicateCourse(course.id, DEMO_TODAY)
                  if (copy) notify.demo(`Created “${copy.title}” as a draft`)
                }}
              >
                <Copy aria-hidden="true" />
                Duplicate
              </DropdownMenuItem>
              {course.sourceId && course.status === 'published' && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem render={<Link href={`/courses/${course.sourceId}`} />} className="gap-2 rounded-xl px-2.5 py-2">
                    <ExternalLink aria-hidden="true" />
                    View public page
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </td>
    </tr>
  )
}
