interface FeatureIndexProps {
  items: { id: string; label: string }[]
}

/** Sticky table of contents for the features page. Scrolls horizontally on small screens. */
export function FeatureIndex({ items }: FeatureIndexProps) {
  return (
    <nav aria-label="Features on this page" className="sticky top-16 z-30 border-b border-border bg-background/85 backdrop-blur-xl">
      <ol className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-5 py-3 [scrollbar-width:none] sm:px-8">
        {items.map((item, i) => (
          <li key={item.id} className="shrink-0">
            <a
              href={`#${item.id}`}
              className="inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-secondary-foreground focus-visible:ring-4 focus-visible:ring-ring/30 focus-visible:outline-none"
            >
              <span className="font-mono text-[11px] text-primary">{String(i + 1).padStart(2, '0')}</span>
              {item.label}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  )
}
