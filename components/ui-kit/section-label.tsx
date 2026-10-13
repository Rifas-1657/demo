import { cn } from '@/lib/utils'

interface SectionLabelProps {
  children: React.ReactNode
  index?: string
  className?: string
}

export function SectionLabel({ children, index, className }: SectionLabelProps) {
  return (
    <p
      className={cn(
        'inline-flex items-center gap-2 font-mono text-xs font-medium tracking-[0.18em] text-primary uppercase',
        className,
      )}
    >
      {index && <span className="text-muted-foreground">{index}</span>}
      <span aria-hidden="true" className="h-px w-6 bg-current" />
      {children}
    </p>
  )
}
