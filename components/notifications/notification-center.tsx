'use client'

import { BellOff, BookOpen, CheckCheck, Circle, GraduationCap, MailOpen, RotateCcw, Settings2, X } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { BookeyButton } from '@/components/ui-kit/bookey-button'
import { EmptyState } from '@/components/ui-kit/empty-state'
import { Hint } from '@/components/ui-kit/hint'
import { notify } from '@/components/ui-kit/toast'
import { INBOX_CATEGORIES, type InboxCategory, type InboxItem } from '@/lib/mock/inbox'
import { useNotificationCenter } from '@/lib/stores/notifications'
import { useHydrated } from '@/lib/stores/personalization'
import { cn } from '@/lib/utils'

type Filter = 'all' | InboxCategory

const CATEGORY_ICON: Record<InboxCategory, React.ReactNode> = {
  learning: <GraduationCap />,
  book: <BookOpen />,
  system: <Settings2 />,
}

export function NotificationCenter() {
  const hydrated = useHydrated()
  const { items, unreadCount, setRead, markAllRead, remove, restoreDemo } = useNotificationCenter()
  const [filter, setFilter] = useState<Filter>('all')

  const visible = filter === 'all' ? items : items.filter((item) => item.category === filter)
  const visibleUnread = visible.filter((item) => !item.read)
  const tabs: { value: Filter; label: string; unread: number }[] = [
    { value: 'all', label: 'All', unread: unreadCount },
    ...INBOX_CATEGORIES.map((c) => ({ value: c.value, label: c.label, unread: items.filter((i) => i.category === c.value && !i.read).length })),
  ]

  const handleRemove = (item: InboxItem) => {
    remove(item.id)
    notify.demo('Notification removed', item.title)
  }

  return (
    <section aria-labelledby="inbox-heading" aria-busy={!hydrated} className="rounded-3xl border border-border bg-card p-4 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 id="inbox-heading" className="font-display text-lg font-semibold">
          Inbox <span className="text-sm font-normal text-muted-foreground">· {unreadCount} unread</span>
        </h2>
        <BookeyButton
          size="sm"
          variant="secondary"
          disabled={visibleUnread.length === 0}
          onClick={() => {
            markAllRead(visibleUnread.map((i) => i.id))
            notify.demo('All caught up')
          }}
        >
          <CheckCheck aria-hidden="true" />
          Mark all read
        </BookeyButton>
      </div>

      <div role="group" aria-label="Filter by category" className="relative mt-4 flex gap-2 overflow-x-auto pb-1">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            type="button"
            aria-pressed={filter === tab.value}
            onClick={() => setFilter(tab.value)}
            className={cn(
              'flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-medium outline-none transition-colors focus-visible:ring-4 focus-visible:ring-ring/30',
              filter === tab.value ? 'border-primary bg-primary text-primary-foreground' : 'border-border hover:bg-muted',
            )}
          >
            {tab.label}
            {tab.unread > 0 && (
              <span
                className={cn(
                  'rounded-full px-1.5 text-xs tabular-nums',
                  filter === tab.value ? 'bg-primary-foreground/20' : 'bg-muted text-muted-foreground',
                )}
              >
                {tab.unread}
                <span className="sr-only"> unread</span>
              </span>
            )}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <EmptyState
          className="mt-6"
          icon={<BellOff />}
          title={items.length === 0 ? 'No notifications' : 'Nothing in this category'}
          description={items.length === 0 ? 'You removed everything. Restore the demo inbox any time.' : 'Try another category.'}
          action={
            items.length === 0 ? (
              <BookeyButton size="sm" variant="outline" onClick={restoreDemo}>
                <RotateCcw aria-hidden="true" />
                Restore demo notifications
              </BookeyButton>
            ) : undefined
          }
        />
      ) : (
        <ul className="mt-4 divide-y divide-border">
          {visible.map((item) => (
            <li key={item.id} className={cn('flex gap-3 rounded-2xl px-2 py-4 sm:px-3', !item.read && 'bg-secondary/40')}>
              <span
                aria-hidden="true"
                className="grid size-10 shrink-0 place-items-center rounded-full bg-muted text-foreground [&_svg]:size-4.5"
              >
                {CATEGORY_ICON[item.category]}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-start gap-2">
                  {!item.read && <Circle aria-hidden="true" className="mt-1.5 size-2 shrink-0 fill-primary text-primary" />}
                  <p className={cn('text-sm', item.read ? 'font-medium' : 'font-semibold')}>
                    <span className="sr-only">{item.read ? 'Read: ' : 'Unread: '}</span>
                    {item.title}
                  </p>
                </div>
                <p className="mt-1 text-sm text-pretty text-muted-foreground">{item.body}</p>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span>{INBOX_CATEGORIES.find((c) => c.value === item.category)?.label}</span>
                  <span aria-hidden="true">·</span>
                  <span>{item.when}</span>
                  {item.href && (
                    <Link
                      href={item.href}
                      onClick={() => setRead(item.id, true)}
                      className="font-medium text-primary underline-offset-4 hover:underline"
                    >
                      {item.cta ?? 'Open'}
                    </Link>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 items-start gap-1">
                <Hint label={item.read ? 'Mark as unread' : 'Mark as read'}>
                  <BookeyButton
                    size="icon"
                    variant="ghost"
                    className="size-9"
                    aria-label={`${item.read ? 'Mark as unread' : 'Mark as read'}: ${item.title}`}
                    onClick={() => setRead(item.id, !item.read)}
                  >
                    {item.read ? <Circle aria-hidden="true" /> : <MailOpen aria-hidden="true" />}
                  </BookeyButton>
                </Hint>
                <Hint label="Remove">
                  <BookeyButton
                    size="icon"
                    variant="ghost"
                    className="size-9"
                    aria-label={`Remove: ${item.title}`}
                    onClick={() => handleRemove(item)}
                  >
                    <X aria-hidden="true" />
                  </BookeyButton>
                </Hint>
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className="sr-only" aria-live="polite">
        {unreadCount} unread notifications
      </p>
    </section>
  )
}
