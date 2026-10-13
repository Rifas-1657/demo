'use client'

import { Award, Check, Lock, RotateCcw, Undo2 } from 'lucide-react'
import Link from 'next/link'
import { DashboardPanel } from '@/components/dashboard/dashboard-panel'
import { BookeyBadge } from '@/components/ui-kit/bookey-badge'
import { BookeyButton } from '@/components/ui-kit/bookey-button'
import { EmptyState } from '@/components/ui-kit/empty-state'
import { notify } from '@/components/ui-kit/toast'
import { getLearningCourse } from '@/lib/mock/learning'
import { getBadges, revisionTopics } from '@/lib/mock/progress'
import { storageKeys, useLocalStorage } from '@/lib/storage'
import { cn } from '@/lib/utils'

export function RevisionTopics() {
  const [raw, setRevised] = useLocalStorage<unknown>(storageKeys.revisedTopics, [])
  const revised = Array.isArray(raw) ? raw.filter((id): id is string => typeof id === 'string') : []
  const pending = revisionTopics.filter((topic) => !revised.includes(topic.id))

  const markRevised = (id: string, topic: string) => {
    setRevised([...revised, id])
    notify.demo(`Marked “${topic}” as revised`)
  }

  return (
    <DashboardPanel
      id="revision"
      title="Needs revision"
      description="Topics where demo quiz answers were shaky."
      action={
        revised.length > 0 ? (
          <BookeyButton size="sm" variant="ghost" onClick={() => setRevised([])}>
            <Undo2 aria-hidden="true" />
            Restore
          </BookeyButton>
        ) : undefined
      }
    >
      {pending.length === 0 ? (
        <EmptyState icon={<Check />} title="All caught up" description="Nothing is waiting for revision right now." />
      ) : (
        <ul className="flex flex-col gap-3">
          {pending.map((topic) => {
            const course = getLearningCourse(topic.courseId)
            return (
              <li key={topic.id} className="rounded-2xl border border-border p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium">{topic.topic}</p>
                    <p className="text-xs text-muted-foreground">
                      {course?.title} · Chapter {topic.chapter}
                    </p>
                  </div>
                  <BookeyBadge tone="warning">{topic.score}% score</BookeyBadge>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{topic.reason}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <BookeyButton
                    size="sm"
                    variant="secondary"
                    nativeButton={false}
                    render={<Link href={`/book/${topic.courseId}?chapter=${topic.chapter}`} />}
                  >
                    <RotateCcw aria-hidden="true" />
                    Review chapter
                  </BookeyButton>
                  <BookeyButton size="sm" variant="ghost" onClick={() => markRevised(topic.id, topic.topic)}>
                    <Check aria-hidden="true" />
                    Mark revised
                  </BookeyButton>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </DashboardPanel>
  )
}

export function BadgeGrid() {
  const badges = getBadges()
  const earned = badges.filter((badge) => badge.earned).length
  return (
    <DashboardPanel id="badges" title="Badges" description={`${earned} of ${badges.length} earned in this demo.`}>
      <ul className="grid gap-3 sm:grid-cols-2">
        {badges.map((badge) => (
          <li
            key={badge.id}
            className={cn('flex gap-3 rounded-2xl border p-3', badge.earned ? 'border-primary/30 bg-secondary/50' : 'border-dashed border-border')}
          >
            <span
              aria-hidden="true"
              className={cn(
                'grid size-10 shrink-0 place-items-center rounded-full [&_svg]:size-5',
                badge.earned ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
              )}
            >
              {badge.earned ? <Award /> : <Lock />}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold">
                {badge.title}
                <span className="sr-only">{badge.earned ? ', earned' : ', locked'}</span>
              </p>
              <p className="text-xs text-muted-foreground">{badge.description}</p>
              <p className="mt-1 text-xs font-medium tabular-nums">{badge.progress}</p>
            </div>
          </li>
        ))}
      </ul>
    </DashboardPanel>
  )
}
