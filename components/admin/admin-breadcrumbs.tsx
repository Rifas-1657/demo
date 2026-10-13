'use client'

import { ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { useAdminDemo } from '@/lib/stores/admin-demo'

const LABELS: Record<string, string> = {
  courses: 'Courses',
  'knowledge-base': 'Knowledge base',
  members: 'Members',
  'tutor-settings': 'Tutor settings',
  new: 'New course',
}

export function AdminBreadcrumbs({ pathname }: { pathname: string }) {
  const courses = useAdminDemo((s) => s.courses)
  const segments = pathname.split('/').filter(Boolean).slice(1)
  const crumbs = [{ href: '/admin', label: 'Overview' }]

  segments.forEach((segment, index) => {
    const href = `/admin/${segments.slice(0, index + 1).join('/')}`
    if (segment === 'edit') {
      crumbs.push({ href, label: 'Edit' })
    } else if (segments[0] === 'courses' && index === 1 && segment !== 'new') {
      crumbs.push({ href: `${href}/edit`, label: courses.find((c) => c.id === segment)?.title ?? 'Course' })
    } else {
      crumbs.push({ href, label: LABELS[segment] ?? segment })
    }
  })

  return (
    <nav aria-label="Breadcrumb" className="min-w-0">
      <ol className="flex min-w-0 items-center gap-1.5 text-sm">
        {crumbs.map((crumb, index) => {
          const last = index === crumbs.length - 1
          return (
            <li key={`${crumb.href}-${index}`} className={`flex min-w-0 items-center gap-1.5 ${last ? '' : 'hidden sm:flex'}`}>
              {index > 0 && <ChevronRight aria-hidden="true" className="hidden size-3.5 shrink-0 text-muted-foreground sm:block" />}
              {last ? (
                <span aria-current="page" className="truncate font-medium">
                  {crumb.label}
                </span>
              ) : (
                <Link
                  href={crumb.href}
                  className="truncate rounded text-muted-foreground outline-none hover:text-foreground focus-visible:ring-4 focus-visible:ring-ring/30"
                >
                  {crumb.label}
                </Link>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
