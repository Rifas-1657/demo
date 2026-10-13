import { cn } from '@/lib/utils'

interface BookeyLogoProps {
  className?: string
  /** Hide the wordmark and show only the mark. */
  markOnly?: boolean
  tone?: 'brand' | 'light'
}

export function BookeyLogo({ className, markOnly = false, tone = 'brand' }: BookeyLogoProps) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <svg
        viewBox="0 0 32 32"
        className="size-8 shrink-0"
        aria-hidden={markOnly ? undefined : true}
        role={markOnly ? 'img' : undefined}
        aria-label={markOnly ? 'Bookey' : undefined}
      >
        <rect width="32" height="32" rx="9" fill={tone === 'brand' ? 'var(--bk-primary)' : '#FFF1F3'} />
        <path
          d="M9 8.5h7.2c3 0 4.9 1.6 4.9 4 0 1.5-.8 2.7-2.1 3.3 1.8.5 3 1.9 3 3.8 0 2.7-2.1 4.4-5.3 4.4H9z"
          fill={tone === 'brand' ? '#FFFFFF' : 'var(--bk-primary-deep)'}
        />
        <path d="M13 12v3h3c1 0 1.6-.6 1.6-1.5S17 12 16 12zM13 18.2v3.3h3.4c1.1 0 1.8-.6 1.8-1.7s-.7-1.6-1.8-1.6z" fill={tone === 'brand' ? 'var(--bk-primary)' : '#FFF1F3'} />
        <circle cx="23.5" cy="9" r="2.2" fill="var(--bk-pink)" />
      </svg>
      {!markOnly && (
        <span
          className={cn(
            'font-display text-xl font-bold tracking-tight',
            tone === 'brand' ? 'text-ink' : 'text-[#FFF1F3]',
          )}
        >
          Bookey
        </span>
      )}
    </span>
  )
}
