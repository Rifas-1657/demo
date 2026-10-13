import { cn } from '@/lib/utils'
import type { DiagramLegendItem, DiagramLegendSwatch } from '@/types/diagram'

const boxSwatch: Partial<Record<DiagramLegendSwatch, string>> = {
  node: 'fill-book-page stroke-book-ink/70',
  highlight: 'fill-book-marker/25 stroke-book-orange',
  valid: 'fill-emerald-50 stroke-emerald-600',
  invalid: 'fill-red-50 stroke-red-600',
}

function Swatch({ swatch }: { swatch: DiagramLegendSwatch }) {
  return (
    <svg viewBox="0 0 18 12" className="h-3 w-[18px] shrink-0" aria-hidden="true">
      {swatch === 'edge' && (
        <g className="stroke-book-deep" fill="none" strokeWidth={1.5} strokeLinecap="round">
          <path d="M1 6 H16" />
          <path d="M12 2.5 L16 6 L12 9.5" />
        </g>
      )}
      {swatch === 'group' && (
        <rect x={1} y={1} width={16} height={10} rx={3} className="fill-book-paper stroke-book-amber" strokeDasharray="3 2" />
      )}
      {swatch === 'illustrative' && (
        <rect x={1} y={1} width={16} height={10} rx={2} className="fill-book-paper stroke-book-amber" strokeDasharray="2 2" />
      )}
      {swatch === 'marker' && <rect x={1} y={3} width={16} height={6} rx={1.5} className="fill-book-marker" />}
      {boxSwatch[swatch] && (
        <rect x={1} y={1} width={16} height={10} rx={2.5} className={cn(boxSwatch[swatch])} strokeWidth={1.4} />
      )}
    </svg>
  )
}

export function DiagramLegend({ items }: { items: DiagramLegendItem[] }) {
  if (!items.length) return null
  return (
    <ul aria-label="Legend" className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
      {items.map((item) => (
        <li key={`${item.swatch}-${item.label}`} className="flex items-center gap-1.5">
          <Swatch swatch={item.swatch} />
          {item.label}
        </li>
      ))}
    </ul>
  )
}
