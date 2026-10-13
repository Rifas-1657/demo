'use client'

import { Check, Code2, ListChecks, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { getLearningCourse, todaysPractice } from '@/lib/mock/learning'
import { cn } from '@/lib/utils'
import { DashboardPanel } from './dashboard-panel'

const KIND_ICON = { Code: Code2, Quiz: ListChecks, Recall: Sparkles }

export function TodaysPractice() {
  const [done, setDone] = useState<Set<string>>(() => new Set())
  const totalMinutes = todaysPractice.reduce((sum, task) => sum + task.minutes, 0)

  function toggle(id: string) {
    setDone((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <DashboardPanel
      id="practice"
      title="Today’s practice"
      description={`Three bite-sized tasks · about ${totalMinutes} min`}
      action={
        <span className="shrink-0 font-mono text-xs text-muted-foreground tabular-nums" aria-live="polite">
          {done.size}/{todaysPractice.length} done
        </span>
      }
    >
      <ul className="flex flex-col gap-2.5">
        {todaysPractice.map((task) => {
          const Icon = KIND_ICON[task.kind]
          const checked = done.has(task.id)
          const course = getLearningCourse(task.courseId)
          return (
            <li
              key={task.id}
              className={cn(
                'flex items-start gap-3 rounded-2xl border border-border p-3 transition-colors',
                checked ? 'bg-muted/60' : 'bg-background/40',
              )}
            >
              <button
                type="button"
                role="checkbox"
                aria-checked={checked}
                aria-label={`Mark “${task.title}” as done`}
                onClick={() => toggle(task.id)}
                className={cn(
                  'mt-0.5 grid size-6 shrink-0 place-items-center rounded-lg border-2 transition-colors outline-none focus-visible:ring-4 focus-visible:ring-ring/30',
                  checked ? 'border-primary bg-primary text-primary-foreground' : 'border-input hover:border-primary',
                )}
              >
                {checked && <Check aria-hidden="true" className="size-3.5" strokeWidth={3} />}
              </button>
              <div className="min-w-0 flex-1">
                <p className={cn('text-sm font-medium', checked && 'text-muted-foreground line-through')}>{task.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {course?.title} · {task.detail}
                </p>
                <div className="mt-2 flex items-center gap-3 text-xs">
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    <Icon aria-hidden="true" className="size-3.5" />
                    {task.kind} · {task.minutes} min
                  </span>
                  <Link href={`/book/${task.courseId}`} className="font-medium text-primary underline-offset-4 hover:underline">
                    Open<span className="sr-only"> {task.title}</span>
                  </Link>
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </DashboardPanel>
  )
}
