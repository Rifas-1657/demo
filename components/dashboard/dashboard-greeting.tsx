import { Flame } from 'lucide-react'
import { BookeyBadge } from '@/components/ui-kit/bookey-badge'
import { demoStreakDays } from '@/lib/mock/learning'

export function DashboardGreeting({ empty }: { empty: boolean }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-2">
        <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">Vanakkam, learner</h1>
        <p className="max-w-xl text-pretty text-muted-foreground">
          {empty
            ? 'Your shelf is ready. Pick a first book and Bookey will keep your place from page one.'
            : 'Good to see you back. One page, one small practice — that is how a book gets finished.'}
        </p>
      </div>
      {!empty && (
        <BookeyBadge tone="soft" icon={<Flame aria-hidden="true" />} className="self-start px-3 py-1 text-sm sm:self-auto">
          {demoStreakDays}-day streak
          <span className="rounded-full bg-background/60 px-1.5 text-[10px] tracking-wide uppercase">Demo</span>
        </BookeyBadge>
      )}
    </div>
  )
}
