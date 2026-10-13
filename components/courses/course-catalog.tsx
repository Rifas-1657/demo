'use client'

import { LayoutGrid, List, RotateCcw, Search, X } from 'lucide-react'
import { useDeferredValue, useId, useMemo, useState } from 'react'
import { BookeyButton } from '@/components/ui-kit/bookey-button'
import { EmptyState } from '@/components/ui-kit/empty-state'
import { SkeletonCourseCard } from '@/components/ui-kit/skeletons'
import {
  getCoursePosition,
  getTotalMinutes,
  type CourseCategory,
  type CourseLevel,
  type LearningCourse,
} from '@/lib/mock/learning'
import { usePublicCourses } from '@/lib/admin/use-public-courses'
import { cn } from '@/lib/utils'
import { CourseCard } from './course-card'

const CATEGORIES: ('All' | CourseCategory)[] = ['All', 'Programming', 'Data & AI', 'Web']
const LEVELS: ('All' | CourseLevel)[] = ['All', 'Beginner', 'Intermediate', 'Advanced']
const SORTS = {
  recommended: 'Recommended',
  title: 'Title (A–Z)',
  shortest: 'Shortest first',
  progress: 'Most progress',
} as const
type SortKey = keyof typeof SORTS

const selectClass =
  'h-11 w-full rounded-full border border-input bg-card px-4 text-sm text-foreground outline-none transition-[border-color,box-shadow] focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-ring/30'

function matches(course: LearningCourse, query: string) {
  if (!query) return true
  const haystack = [course.title, course.subtitle, course.language, course.category, ...course.topics, ...course.chapters.map((c) => c.title)]
    .join(' ')
    .toLowerCase()
  return query
    .toLowerCase()
    .split(/\s+/)
    .every((word) => haystack.includes(word))
}

export function CourseCatalog({ courses: sourceCourses }: { courses: LearningCourse[] }) {
  const courses = usePublicCourses(sourceCourses)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>('All')
  const [level, setLevel] = useState<(typeof LEVELS)[number]>('All')
  const [sort, setSort] = useState<SortKey>('recommended')
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const deferredQuery = useDeferredValue(query.trim())
  const isPending = deferredQuery !== query.trim()
  const ids = { search: useId(), level: useId(), sort: useId() }

  const results = useMemo(() => {
    const filtered = courses.filter(
      (course) =>
        (category === 'All' || course.category === category) &&
        (level === 'All' || course.level === level) &&
        matches(course, deferredQuery),
    )
    if (sort === 'title') return [...filtered].sort((a, b) => a.title.localeCompare(b.title))
    if (sort === 'shortest') return [...filtered].sort((a, b) => getTotalMinutes(a) - getTotalMinutes(b))
    if (sort === 'progress') return [...filtered].sort((a, b) => getCoursePosition(b).percent - getCoursePosition(a).percent)
    return filtered
  }, [courses, category, level, sort, deferredQuery])

  const hasFilters = query !== '' || category !== 'All' || level !== 'All'

  function reset() {
    setQuery('')
    setCategory('All')
    setLevel('All')
    setSort('recommended')
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 rounded-3xl border border-border bg-card p-4 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <div className="flex-1 space-y-1.5">
            <label htmlFor={ids.search} className="text-xs font-medium text-muted-foreground">
              Search courses
            </label>
            <div className="relative">
              <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                id={ids.search}
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Try “loops”, “Java”, or “regression”"
                autoComplete="off"
                className={cn(selectClass, 'pr-11 pl-11 [&::-webkit-search-cancel-button]:hidden')}
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="absolute top-1/2 right-2 grid size-8 -translate-y-1/2 place-items-center rounded-full text-muted-foreground outline-none hover:bg-muted focus-visible:ring-4 focus-visible:ring-ring/30"
                >
                  <X aria-hidden="true" className="size-4" />
                  <span className="sr-only">Clear search</span>
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:w-auto lg:grid-cols-[11rem_11rem_auto]">
            <div className="space-y-1.5">
              <label htmlFor={ids.level} className="text-xs font-medium text-muted-foreground">
                Difficulty
              </label>
              <select id={ids.level} value={level} onChange={(event) => setLevel(event.target.value as typeof level)} className={selectClass}>
                {LEVELS.map((option) => (
                  <option key={option} value={option}>
                    {option === 'All' ? 'All levels' : option}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label htmlFor={ids.sort} className="text-xs font-medium text-muted-foreground">
                Sort by
              </label>
              <select id={ids.sort} value={sort} onChange={(event) => setSort(event.target.value as SortKey)} className={selectClass}>
                {(Object.keys(SORTS) as SortKey[]).map((key) => (
                  <option key={key} value={key}>
                    {SORTS[key]}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-span-2 space-y-1.5 lg:col-span-1">
              <span id="view-label" className="block text-xs font-medium text-muted-foreground">
                View
              </span>
              <div role="group" aria-labelledby="view-label" className="flex h-11 rounded-full border border-input bg-card p-1">
                {(
                  [
                    ['grid', LayoutGrid, 'Grid'],
                    ['list', List, 'List'],
                  ] as const
                ).map(([value, Icon, label]) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={view === value}
                    onClick={() => setView(value)}
                    className={cn(
                      'flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 text-sm font-medium outline-none transition-colors focus-visible:ring-4 focus-visible:ring-ring/30',
                      view === value ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    <Icon aria-hidden="true" className="size-4" />
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div role="group" aria-label="Filter by category" className="flex flex-wrap gap-2">
          {CATEGORIES.map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={category === option}
              onClick={() => setCategory(option)}
              className={cn(
                'h-9 rounded-full border px-4 text-sm font-medium outline-none transition-colors focus-visible:ring-4 focus-visible:ring-ring/30',
                category === option
                  ? 'border-transparent bg-secondary text-secondary-foreground'
                  : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground',
              )}
            >
              {option === 'All' ? 'All courses' : option}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between gap-4">
        <p aria-live="polite" className="text-sm text-muted-foreground">
          Showing <span className="font-semibold text-foreground tabular-nums">{results.length}</span> of {courses.length} courses
        </p>
        {hasFilters && (
          <BookeyButton variant="ghost" size="sm" onClick={reset}>
            <RotateCcw aria-hidden="true" />
            Reset filters
          </BookeyButton>
        )}
      </div>

      {isPending ? (
        <div className={view === 'grid' ? 'grid gap-5 sm:grid-cols-2 xl:grid-cols-4' : 'grid gap-4'}>
          {Array.from({ length: Math.max(results.length, 2) }, (_, i) => (
            <SkeletonCourseCard key={i} />
          ))}
        </div>
      ) : results.length === 0 ? (
        <EmptyState
          icon={<Search />}
          title="No courses match"
          description={
            deferredQuery ? `Nothing matched “${deferredQuery}” with the current filters.` : 'No demo course fits this combination of filters.'
          }
          action={
            <BookeyButton variant="outline" onClick={reset}>
              <RotateCcw aria-hidden="true" />
              Reset filters
            </BookeyButton>
          }
        />
      ) : (
        <ul className={view === 'grid' ? 'grid gap-5 sm:grid-cols-2 xl:grid-cols-4' : 'grid gap-4'}>
          {results.map((course) => (
            <li key={course.id} className="flex">
              <div className="flex w-full [&>article]:w-full">
                <CourseCard course={course} view={view} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
