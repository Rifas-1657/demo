import { FlaskConical } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DemoNoticeProps {
  title: string
  children?: React.ReactNode
  className?: string
  tone?: 'light' | 'night'
}

/** Visible, non-dismissable label for anything that is simulated in this prototype. */
export function DemoNotice({ title, children, className, tone = 'light' }: DemoNoticeProps) {
  return (
    <div
      role="note"
      className={cn(
        'flex items-start gap-3 rounded-2xl border px-4 py-3.5 text-sm',
        tone === 'light'
          ? 'border-book-amber/40 bg-book-marker/20 text-book-ink'
          : 'border-book-marker/30 bg-book-marker/10 text-[#FFF1F3]',
        className,
      )}
    >
      <FlaskConical aria-hidden="true" className={cn('mt-0.5 size-4 shrink-0', tone === 'light' ? 'text-book-deep' : 'text-book-marker')} />
      <div>
        <p className="font-semibold">{title}</p>
        {children && <div className={cn('mt-0.5 leading-relaxed', tone === 'light' ? 'text-book-ink/80' : 'text-[#FFF1F3]/70')}>{children}</div>}
      </div>
    </div>
  )
}
