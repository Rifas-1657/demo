'use client'

import { Search, X } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useDeferredValue, useMemo, useRef, useState } from 'react'
import { useNotes, useRecentSearches } from '@/lib/stores/library'
import {
  MAX_QUERY_LENGTH,
  buildSearchIndex,
  searchCategories,
  searchDocs,
  tokenize,
  type SearchCategory,
  type SearchResult,
} from '@/lib/search'
import { cn } from '@/lib/utils'
import { SearchResultCard } from './search-result-card'
import { SearchError, SearchIdle, SearchNoResults, SearchResultsSkeleton } from './search-states'

export const SEARCH_INPUT_ID = 'workspace-search-input'

type Filter = SearchCategory | 'all'

type Outcome =
  | { status: 'idle' }
  | { status: 'error'; message: string }
  | { status: 'ready'; results: SearchResult[] }

export function SearchExperience() {
  const router = useRouter()
  const params = useSearchParams()
  const urlQuery = params.get('q') ?? ''
  const inputRef = useRef<HTMLInputElement>(null)

  const [query, setQuery] = useState(urlQuery)
  const [syncedUrlQuery, setSyncedUrlQuery] = useState(urlQuery)
  const [filter, setFilter] = useState<Filter>('all')

  // Adopt a new ?q= when the top bar (or back/forward) changes it.
  if (urlQuery !== syncedUrlQuery) {
    setSyncedUrlQuery(urlQuery)
    setQuery(urlQuery)
    setFilter('all')
  }

  const deferredQuery = useDeferredValue(query)
  const isStale = deferredQuery !== query

  const { notes } = useNotes()
  const recent = useRecentSearches()
  const docs = useMemo(() => buildSearchIndex(notes), [notes])

  const outcome = useMemo<Outcome>(() => {
    const trimmed = deferredQuery.trim()
    if (!trimmed) return { status: 'idle' }
    if (trimmed.length > MAX_QUERY_LENGTH) {
      return { status: 'error', message: `Search terms can be up to ${MAX_QUERY_LENGTH} characters. Shorten your query and try again.` }
    }
    try {
      return { status: 'ready', results: searchDocs(trimmed, docs) }
    } catch {
      return { status: 'error', message: 'Something went wrong while searching the demo library. Try a different term.' }
    }
  }, [deferredQuery, docs])

  const terms = useMemo(() => tokenize(deferredQuery), [deferredQuery])
  const results = outcome.status === 'ready' ? outcome.results : []
  const counts = useMemo(() => {
    const map: Record<SearchCategory, number> = { course: 0, chapter: 0, page: 0, note: 0 }
    for (const result of results) map[result.category] += 1
    return map
  }, [results])
  const visible = filter === 'all' ? results : results.filter((result) => result.category === filter)

  function commit(next: string) {
    const trimmed = next.trim()
    if (trimmed && trimmed.length <= MAX_QUERY_LENGTH) recent.add(trimmed)
    const href = trimmed ? `/search?q=${encodeURIComponent(trimmed)}` : '/search'
    setSyncedUrlQuery(trimmed)
    router.replace(href, { scroll: false })
  }

  function pick(next: string) {
    setQuery(next)
    setFilter('all')
    commit(next)
    inputRef.current?.focus()
  }

  function clear() {
    setQuery('')
    setFilter('all')
    commit('')
    inputRef.current?.focus()
  }

  const trimmedDeferred = deferredQuery.trim()
  const announcement =
    outcome.status === 'ready'
      ? `${results.length} ${results.length === 1 ? 'result' : 'results'} for “${trimmedDeferred}”`
      : outcome.status === 'error'
        ? 'Search error'
        : ''

  return (
    <div className="flex flex-col gap-6">
      <form
        role="search"
        onSubmit={(event) => {
          event.preventDefault()
          commit(query)
        }}
        className="relative"
      >
        <label htmlFor={SEARCH_INPUT_ID} className="sr-only">
          Search courses, chapters, book pages, and notes
        </label>
        <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-5 size-5 -translate-y-1/2 text-muted-foreground" />
        <input
          ref={inputRef}
          id={SEARCH_INPUT_ID}
          type="search"
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Escape' && query) {
              event.preventDefault()
              clear()
            }
          }}
          placeholder="Search courses, chapters, pages, and notes"
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="search"
          aria-describedby="search-status"
          className="h-14 w-full rounded-2xl border border-input bg-card pr-14 pl-13 text-base outline-none transition-[border-color,box-shadow] placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-ring/25 [&::-webkit-search-cancel-button]:appearance-none"
        />
        {query && (
          <button
            type="button"
            onClick={clear}
            aria-label="Clear search"
            className="absolute top-1/2 right-3 grid size-9 -translate-y-1/2 place-items-center rounded-full text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-4 focus-visible:ring-ring/30"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        )}
      </form>

      <p id="search-status" className="sr-only" aria-live="polite" aria-atomic="true">
        {isStale ? '' : announcement}
      </p>

      {outcome.status === 'idle' ? (
        <SearchIdle recent={recent.searches} onPick={pick} onRemove={recent.remove} onClear={recent.clear} />
      ) : outcome.status === 'error' ? (
        <SearchError message={outcome.message} onReset={clear} />
      ) : (
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground" aria-hidden="true">
              <span className="font-semibold text-foreground">{results.length}</span> {results.length === 1 ? 'result' : 'results'} for{' '}
              <span className="font-semibold text-foreground">&ldquo;{trimmedDeferred}&rdquo;</span>
            </p>
            {results.length > 0 && (
              <div role="group" aria-label="Filter by category" className="flex flex-wrap gap-1.5">
                <FilterChip active={filter === 'all'} onClick={() => setFilter('all')} label="All" count={results.length} />
                {searchCategories.map((category) => (
                  <FilterChip
                    key={category.id}
                    active={filter === category.id}
                    onClick={() => setFilter(category.id)}
                    label={category.label}
                    count={counts[category.id]}
                  />
                ))}
              </div>
            )}
          </div>

          {isStale ? (
            <SearchResultsSkeleton />
          ) : results.length === 0 ? (
            <SearchNoResults query={trimmedDeferred} onPick={pick} />
          ) : (
            <div className="flex flex-col gap-8">
              {searchCategories
                .filter((category) => (filter === 'all' || filter === category.id) && counts[category.id] > 0)
                .map((category) => {
                  const items = visible.filter((result) => result.category === category.id)
                  return (
                    <section key={category.id} aria-labelledby={`results-${category.id}`} className="flex flex-col gap-3">
                      <h2 id={`results-${category.id}`} className="flex items-baseline gap-2 font-display text-lg font-semibold">
                        {category.label}
                        <span className="font-mono text-xs font-normal text-muted-foreground">{items.length}</span>
                      </h2>
                      <ul className="flex flex-col gap-2.5">
                        {items.map((result) => (
                          <li key={result.id}>
                            <SearchResultCard result={result} terms={terms} onSelect={() => recent.add(trimmedDeferred)} />
                          </li>
                        ))}
                      </ul>
                    </section>
                  )
                })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function FilterChip({ active, onClick, label, count }: { active: boolean; onClick: () => void; label: string; count: number }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      disabled={count === 0}
      className={cn(
        'inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-medium outline-none transition-colors focus-visible:ring-4 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-40',
        active ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-foreground hover:border-primary/40',
      )}
    >
      {label}
      <span className={cn('font-mono', active ? 'text-primary-foreground/80' : 'text-muted-foreground')}>{count}</span>
    </button>
  )
}
