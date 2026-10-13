import { AlertTriangle, Clock, SearchX, Sparkles, X } from 'lucide-react'
import Link from 'next/link'
import { Skeleton } from '@/components/ui/skeleton'
import { BookeyButton } from '@/components/ui-kit/bookey-button'
import { EmptyState } from '@/components/ui-kit/empty-state'

const SUGGESTIONS = ['loops', 'classes', 'gradient descent', 'functions', 'HTML']

export function SearchResultsSkeleton() {
  return (
    <div role="status" aria-label="Loading results" className="flex flex-col gap-3">
      {Array.from({ length: 4 }, (_, index) => (
        <div key={index} className="flex gap-4 rounded-2xl border border-border bg-card p-4">
          <Skeleton className="size-10 shrink-0 rounded-xl bg-muted" />
          <div className="flex-1 space-y-2.5">
            <Skeleton className="h-3 w-1/4 rounded-full bg-muted" />
            <Skeleton className="h-4 w-1/2 rounded-full bg-muted" />
            <Skeleton className="h-3 w-5/6 rounded-full bg-muted" />
          </div>
        </div>
      ))}
      <span className="sr-only">Loading results…</span>
    </div>
  )
}

interface IdleProps {
  recent: string[]
  onPick: (query: string) => void
  onRemove: (query: string) => void
  onClear: () => void
}

export function SearchIdle({ recent, onPick, onRemove, onClear }: IdleProps) {
  return (
    <div className="flex flex-col gap-8">
      <section aria-labelledby="recent-searches-heading" className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 id="recent-searches-heading" className="flex items-center gap-2 text-sm font-semibold">
            <Clock aria-hidden="true" className="size-4 text-muted-foreground" />
            Recent searches
          </h2>
          {recent.length > 0 && (
            <BookeyButton variant="ghost" size="sm" onClick={onClear}>
              Clear history
            </BookeyButton>
          )}
        </div>
        {recent.length === 0 ? (
          <p className="text-sm text-muted-foreground">Searches you run are saved in this browser only.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {recent.map((query) => (
              <li key={query} className="flex items-center rounded-full border border-border bg-card">
                <button
                  type="button"
                  onClick={() => onPick(query)}
                  className="rounded-l-full py-1.5 pr-1 pl-3.5 text-sm outline-none hover:text-primary focus-visible:ring-4 focus-visible:ring-ring/30"
                >
                  {query}
                </button>
                <button
                  type="button"
                  onClick={() => onRemove(query)}
                  aria-label={`Remove “${query}” from recent searches`}
                  className="grid size-7 place-items-center rounded-full text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-4 focus-visible:ring-ring/30"
                >
                  <X aria-hidden="true" className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="suggested-heading" className="flex flex-col gap-3">
        <h2 id="suggested-heading" className="flex items-center gap-2 text-sm font-semibold">
          <Sparkles aria-hidden="true" className="size-4 text-muted-foreground" />
          Try searching for
        </h2>
        <ul className="flex flex-wrap gap-2">
          {SUGGESTIONS.map((query) => (
            <li key={query}>
              <button
                type="button"
                onClick={() => onPick(query)}
                className="rounded-full bg-secondary px-3.5 py-1.5 text-sm text-secondary-foreground outline-none transition-colors hover:bg-primary hover:text-primary-foreground focus-visible:ring-4 focus-visible:ring-ring/30"
              >
                {query}
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

export function SearchNoResults({ query, onPick }: { query: string; onPick: (query: string) => void }) {
  return (
    <EmptyState
      icon={<SearchX />}
      title={`No matches for “${query}”`}
      description="Check the spelling, use fewer words, or try one of the suggestions below. Search covers demo courses, chapters, book pages, and your notes."
      action={
        <div className="flex flex-wrap items-center justify-center gap-2">
          {SUGGESTIONS.slice(0, 3).map((suggestion) => (
            <BookeyButton key={suggestion} variant="outline" size="sm" onClick={() => onPick(suggestion)}>
              {suggestion}
            </BookeyButton>
          ))}
          <BookeyButton variant="link" size="sm" nativeButton={false} render={<Link href="/courses" />}>
            Browse all courses
          </BookeyButton>
        </div>
      }
    />
  )
}

export function SearchError({ message, onReset }: { message: string; onReset: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-start gap-3 rounded-3xl border border-destructive/40 bg-destructive/5 p-6 sm:flex-row sm:items-center">
      <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-destructive/15 text-destructive">
        <AlertTriangle aria-hidden="true" className="size-5" />
      </span>
      <div className="flex-1 space-y-1">
        <p className="font-semibold">{"We couldn't run that search"}</p>
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
      <BookeyButton variant="outline" size="sm" onClick={onReset}>
        Start a new search
      </BookeyButton>
    </div>
  )
}
