'use client'

import { ArrowRight, BookOpen, FileStack, MessageCircleQuestion, Plus, SlidersHorizontal, UserCheck, Users } from 'lucide-react'
import Link from 'next/link'
import { activitySeries, overviewMetrics, recentAdminActivity } from '@/lib/admin/seed'
import { formatDate } from '@/lib/admin/utils'
import { useAdminDemo } from '@/lib/stores/admin-demo'
import { AdminPageHeader, AdminPanel, SampleBadge } from '../admin-ui'
import { ActivityChart } from './activity-chart'

const QUICK_LINKS = [
  { href: '/admin/courses/new', label: 'Create course', description: 'Draft a new course with chapters.', icon: Plus },
  { href: '/admin/knowledge-base', label: 'Manage sources', description: 'Attach demo documents to courses.', icon: FileStack },
  { href: '/admin/tutor-settings', label: 'Tutor settings', description: 'Narration and explanation defaults.', icon: SlidersHorizontal },
]

export function AdminOverview() {
  const members = useAdminDemo((s) => s.members)
  const courses = useAdminDemo((s) => s.courses)
  const published = courses.filter((c) => c.status === 'published').length

  const stats = [
    { label: 'Demo members', value: members.length, note: `${members.filter((m) => m.status === 'invited').length} invite pending`, icon: Users },
    { label: 'Active readers', value: overviewMetrics.activeReaders, note: 'Last 7 days', icon: UserCheck },
    { label: 'Books opened', value: overviewMetrics.booksOpened, note: `Across ${published} published courses`, icon: BookOpen },
    { label: 'Questions asked', value: overviewMetrics.questionsAsked, note: 'Tutor questions, last 14 days', icon: MessageCircleQuestion },
  ]

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Overview"
        description="A snapshot of how the demo workspace is being used. Every number on this page is sample data generated for the preview."
        actions={<SampleBadge label="All metrics are sample data" />}
      />

      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(({ label, value, note, icon: Icon }) => (
          <li key={label} className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-muted-foreground">{label}</p>
              <span aria-hidden="true" className="grid size-9 place-items-center rounded-xl bg-secondary text-secondary-foreground">
                <Icon className="size-4" />
              </span>
            </div>
            <p className="mt-3 font-display text-3xl font-bold tabular-nums">{value.toLocaleString('en-US')}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {note} <span className="font-medium text-amber-800">· sample</span>
            </p>
          </li>
        ))}
      </ul>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <AdminPanel title="Reading activity" description="Readers and tutor questions per day · sample data">
          <ActivityChart data={activitySeries} />
        </AdminPanel>

        <AdminPanel title="Recent activity" description="Seeded sample events" bodyClassName="p-0">
          <ol className="divide-y divide-border">
            {recentAdminActivity.map((item) => (
              <li key={item.id} className="px-5 py-3.5">
                <p className="text-sm leading-relaxed">
                  <span className="font-medium">{item.who}</span> <span className="text-muted-foreground">{item.what}</span>
                </p>
                <time dateTime={item.when} className="text-xs text-muted-foreground">
                  {formatDate(item.when)}
                </time>
              </li>
            ))}
          </ol>
        </AdminPanel>
      </div>

      <section aria-labelledby="quick-links-heading" className="space-y-3">
        <h2 id="quick-links-heading" className="font-display text-base font-semibold">
          Quick links
        </h2>
        <ul className="grid gap-4 md:grid-cols-3">
          {QUICK_LINKS.map(({ href, label, description, icon: Icon }) => (
            <li key={href}>
              <Link
                href={href}
                className="group flex h-full items-center gap-4 rounded-2xl border border-border bg-card p-5 outline-none transition-colors hover:border-primary/40 focus-visible:ring-4 focus-visible:ring-ring/30"
              >
                <span aria-hidden="true" className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
                  <Icon className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{label}</span>
                  <span className="block text-sm text-muted-foreground">{description}</span>
                </span>
                <ArrowRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
