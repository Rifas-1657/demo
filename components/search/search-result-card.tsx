import { BookOpen, FileText, ListOrdered, StickyNote } from 'lucide-react'
import Link from 'next/link'
import type { SearchCategory, SearchResult } from '@/lib/search'
import { Highlight } from './highlight'

const categoryMeta: Record<SearchCategory, { label: string; icon: typeof BookOpen }> = {
  course: { label: 'Course', icon: BookOpen },
  chapter: { label: 'Chapter', icon: ListOrdered },
  page: { label: 'Book page', icon: FileText },
  note: { label: 'Note', icon: StickyNote },
}

interface SearchResultCardProps {
  result: SearchResult
  terms: string[]
  onSelect: () => void
}

export function SearchResultCard({ result, terms, onSelect }: SearchResultCardProps) {
  const { label, icon: Icon } = categoryMeta[result.category]
  const lowerTerms = terms.map((term) => term.toLowerCase())
  const matchedTags = result.tags.filter((tag) => lowerTerms.some((term) => tag.toLowerCase().includes(term))).slice(0, 3)

  return (
    <Link
      href={result.href}
      onClick={onSelect}
      className="group flex gap-4 rounded-2xl border border-border bg-card p-4 outline-none transition-colors hover:border-primary/40 hover:bg-muted/50 focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-ring/30"
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary text-secondary-foreground">
        <Icon aria-hidden="true" className="size-4" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-mono text-[10px] tracking-[0.16em] text-muted-foreground uppercase">{label}</span>
          <span className="truncate text-xs text-muted-foreground">{result.meta}</span>
        </span>
        <span className="font-medium text-pretty group-hover:text-primary">
          <Highlight text={result.title} terms={terms} />
        </span>
        <span className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
          <Highlight text={result.snippet} terms={terms} />
        </span>
        {matchedTags.length > 0 && (
          <span className="mt-1 flex flex-wrap gap-1.5">
            {matchedTags.map((tag) => (
              <span key={tag} className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground">
                <Highlight text={tag} terms={terms} />
              </span>
            ))}
          </span>
        )}
      </span>
    </Link>
  )
}
