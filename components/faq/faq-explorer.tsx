'use client'

import { Search, X } from 'lucide-react'
import { useDeferredValue, useMemo, useState } from 'react'
import { AccordionList } from '@/components/site/accordion-list'
import { cn } from '@/lib/utils'
import { FAQ_CATEGORIES, FAQ_ITEMS, type FaqCategory } from './faq-data'

export function FaqExplorer() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<FaqCategory | 'all'>('all')
  const deferredQuery = useDeferredValue(query)

  const results = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase()
    return FAQ_ITEMS.filter(
      (item) =>
        (category === 'all' || item.category === category) &&
        (!q || item.q.toLowerCase().includes(q) || item.a.toLowerCase().includes(q)),
    )
  }, [deferredQuery, category])

  return (
    <div className="grid gap-10 lg:grid-cols-[16rem_1fr] lg:gap-16">
      <div className="space-y-6 lg:sticky lg:top-28 lg:self-start">
        <div className="relative">
          <label htmlFor="faq-search" className="sr-only">
            Search questions
          </label>
          <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            id="faq-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search questions"
            className="h-12 w-full rounded-full border border-border bg-card pr-10 pl-11 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-ring/25 [&::-webkit-search-cancel-button]:hidden"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Clear search"
              className="absolute top-1/2 right-3 grid size-7 -translate-y-1/2 place-items-center rounded-full text-muted-foreground hover:bg-muted"
            >
              <X aria-hidden="true" className="size-4" />
            </button>
          )}
        </div>
        <fieldset>
          <legend className="mb-3 font-mono text-[11px] tracking-[0.16em] text-muted-foreground uppercase">Topic</legend>
          <div className="flex flex-wrap gap-2 lg:flex-col lg:items-stretch">
            {([['all', 'All questions'], ...FAQ_CATEGORIES] as const).map(([value, label]) => {
              const count = value === 'all' ? FAQ_ITEMS.length : FAQ_ITEMS.filter((i) => i.category === value).length
              const selected = category === value
              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setCategory(value)}
                  className={cn(
                    'flex items-center justify-between gap-3 rounded-full px-4 py-2 text-sm transition-colors focus-visible:ring-4 focus-visible:ring-ring/30 focus-visible:outline-none lg:rounded-xl',
                    selected ? 'bg-primary text-primary-foreground' : 'border border-border bg-card hover:bg-muted lg:border-transparent lg:bg-transparent',
                  )}
                >
                  {label}
                  <span className={cn('font-mono text-xs tabular-nums', selected ? 'text-primary-foreground/75' : 'text-muted-foreground')}>{count}</span>
                </button>
              )
            })}
          </div>
        </fieldset>
      </div>

      <div>
        <p className="mb-2 text-sm text-muted-foreground" aria-live="polite">
          {results.length === 1 ? '1 question' : `${results.length} questions`}
          {deferredQuery.trim() && ` matching “${deferredQuery.trim()}”`}
        </p>
        {results.length ? (
          <AccordionList
            key={`${category}-${deferredQuery}`}
            items={results.map((r) => ({ q: r.q, a: r.a, meta: FAQ_CATEGORIES.find(([v]) => v === r.category)?.[1] }))}
          />
        ) : (
          <div className="rounded-[1.75rem] border border-dashed border-border px-6 py-14 text-center">
            <p className="text-lg font-semibold">No questions match that search.</p>
            <p className="mt-2 text-muted-foreground">Try a different word, or browse all topics.</p>
            <button
              type="button"
              onClick={() => {
                setQuery('')
                setCategory('all')
              }}
              className="mt-6 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Reset filters
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
