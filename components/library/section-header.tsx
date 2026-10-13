interface SectionHeaderProps {
  id: string
  title: string
  count?: number
  action?: React.ReactNode
  headingRef?: React.Ref<HTMLHeadingElement>
}

export function SectionHeader({ id, title, count, action, headingRef }: SectionHeaderProps) {
  return (
    <div className="flex min-h-9 items-center justify-between gap-3">
      <h2
        id={id}
        ref={headingRef}
        tabIndex={-1}
        className="flex items-baseline gap-2 rounded-md font-display text-lg font-semibold outline-none focus-visible:ring-4 focus-visible:ring-ring/30"
      >
        {title}
        {count !== undefined && <span className="font-mono text-xs font-normal text-muted-foreground">{count}</span>}
      </h2>
      {action}
    </div>
  )
}
