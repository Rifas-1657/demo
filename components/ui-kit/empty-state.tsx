import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
  headingLevel?: 'h1' | 'h2' | 'h3'
}

export function EmptyState({ icon, title, description, action, className, headingLevel = 'h3' }: EmptyStateProps) {
  const Heading = headingLevel
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-border bg-card/60 px-6 py-12 text-center',
        className,
      )}
    >
      {icon && (
        <div className="grid size-12 place-items-center rounded-2xl bg-secondary text-secondary-foreground [&_svg]:size-5" aria-hidden="true">
          {icon}
        </div>
      )}
      <Heading className="text-lg font-semibold">{title}</Heading>
      {description && <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
