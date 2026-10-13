import { cn } from '@/lib/utils'
import { getPasswordStrength } from './validation'

const BAR_COLORS = ['bg-[#d6455d]', 'bg-book-amber', 'bg-[#16a34a]', 'bg-[#15803d]'] as const

export function PasswordStrengthMeter({ id, password }: { id: string; password: string }) {
  const { score, label } = getPasswordStrength(password)
  const activeColor = score > 0 ? BAR_COLORS[score - 1] : ''

  return (
    <div id={id} className="flex items-center gap-3">
      <div aria-hidden="true" className="grid flex-1 grid-cols-4 gap-1.5">
        {[1, 2, 3, 4].map((step) => (
          <span
            key={step}
            className={cn(
              'h-1.5 rounded-full bg-muted transition-colors duration-300 motion-reduce:transition-none',
              step <= score && activeColor,
            )}
          />
        ))}
      </div>
      <p className="min-w-20 text-right text-xs text-ink-muted" aria-live="polite">
        <span className="sr-only">Password strength: </span>
        {password ? label : '8+ characters'}
      </p>
    </div>
  )
}
