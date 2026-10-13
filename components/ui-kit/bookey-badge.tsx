import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap [&_svg]:size-3.5 [&_svg]:shrink-0",
  {
    variants: {
      tone: {
        brand: 'border-transparent bg-primary text-primary-foreground',
        soft: 'border-transparent bg-secondary text-secondary-foreground',
        outline: 'border-border bg-card text-foreground',
        success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
        warning: 'border-amber-200 bg-amber-50 text-amber-900',
        neutral: 'border-border bg-muted text-muted-foreground',
        book: 'border-book-amber/40 bg-book-marker/30 text-book-ink',
      },
    },
    defaultVariants: { tone: 'soft' },
  },
)

interface BookeyBadgeProps extends React.ComponentProps<'span'>, VariantProps<typeof badgeVariants> {
  /** Leading icon; pair status tones with an icon or text so color is never the only signal. */
  icon?: React.ReactNode
}

export function BookeyBadge({ className, tone, icon, children, ...props }: BookeyBadgeProps) {
  return (
    <span className={cn(badgeVariants({ tone }), className)} {...props}>
      {icon}
      {children}
    </span>
  )
}
