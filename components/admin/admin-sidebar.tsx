'use client'

import { ArrowLeft, BookOpen, FileStack, LayoutDashboard, PanelLeftClose, PanelLeftOpen, SlidersHorizontal, Users, X } from 'lucide-react'
import Link from 'next/link'
import { useAdminDemo } from '@/lib/stores/admin-demo'
import { cn } from '@/lib/utils'

export const ADMIN_NAV = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard },
  { href: '/admin/courses', label: 'Courses', icon: BookOpen },
  { href: '/admin/knowledge-base', label: 'Knowledge base', icon: FileStack },
  { href: '/admin/members', label: 'Members', icon: Users },
  { href: '/admin/tutor-settings', label: 'Tutor settings', icon: SlidersHorizontal },
] as const

export function isActive(pathname: string, href: string) {
  return href === '/admin' ? pathname === '/admin' : pathname === href || pathname.startsWith(`${href}/`)
}

interface AdminSidebarProps {
  pathname: string
  compact: boolean
  showCompactToggle?: boolean
  onNavigate?: () => void
  onClose?: () => void
}

export function AdminSidebar({ pathname, compact, showCompactToggle, onNavigate, onClose }: AdminSidebarProps) {
  const setCompact = useAdminDemo((s) => s.setSidebarCompact)
  const linkBase =
    'group relative flex h-11 items-center gap-3 rounded-xl text-sm font-medium outline-none transition-colors focus-visible:ring-4 focus-visible:ring-ring/40'

  return (
    <div className="flex h-full flex-col gap-6 p-3">
      <div className={cn('flex items-center gap-3 px-2 pt-2', compact && 'justify-center px-0')}>
        <span
          aria-hidden="true"
          className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary font-display text-lg font-bold text-primary-foreground"
        >
          B
        </span>
        {!compact && (
          <div className="min-w-0 flex-1">
            <p className="font-display text-lg leading-tight font-bold">Bookey</p>
            <p className="text-xs text-muted-foreground">Demo admin console</p>
          </div>
        )}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="grid size-9 place-items-center rounded-full outline-none hover:bg-white/10 focus-visible:ring-4 focus-visible:ring-ring/40"
          >
            <X aria-hidden="true" className="size-4" />
            <span className="sr-only">Close navigation</span>
          </button>
        )}
      </div>

      <nav aria-label="Admin sections" className="flex-1">
        <ul className="flex flex-col gap-1">
          {ADMIN_NAV.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href)
            return (
              <li key={href}>
                <Link
                  href={href}
                  onClick={onNavigate}
                  aria-current={active ? 'page' : undefined}
                  title={compact ? label : undefined}
                  className={cn(
                    linkBase,
                    compact ? 'justify-center' : 'px-3',
                    active ? 'bg-white/12 text-white' : 'text-muted-foreground hover:bg-white/6 hover:text-foreground',
                  )}
                >
                  {active && <span aria-hidden="true" className="absolute top-2.5 bottom-2.5 left-0 w-1 rounded-full bg-primary" />}
                  <Icon aria-hidden="true" className={cn('size-5 shrink-0', active && 'text-primary')} />
                  <span className={cn(compact && 'sr-only')}>{label}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="flex flex-col gap-1 border-t border-white/10 pt-3">
        <Link
          href="/dashboard"
          onClick={onNavigate}
          title={compact ? 'Back to workspace' : undefined}
          className={cn(linkBase, compact ? 'justify-center' : 'px-3', 'text-muted-foreground hover:bg-white/6 hover:text-foreground')}
        >
          <ArrowLeft aria-hidden="true" className="size-5 shrink-0" />
          <span className={cn(compact && 'sr-only')}>Back to workspace</span>
        </Link>
        {showCompactToggle && (
          <button
            type="button"
            onClick={() => setCompact(!compact)}
            aria-pressed={compact}
            title={compact ? 'Expand sidebar' : undefined}
            className={cn(linkBase, compact ? 'justify-center' : 'px-3', 'text-muted-foreground hover:bg-white/6 hover:text-foreground')}
          >
            {compact ? (
              <PanelLeftOpen aria-hidden="true" className="size-5 shrink-0" />
            ) : (
              <PanelLeftClose aria-hidden="true" className="size-5 shrink-0" />
            )}
            <span className={cn(compact && 'sr-only')}>Compact sidebar</span>
          </button>
        )}
      </div>
    </div>
  )
}
