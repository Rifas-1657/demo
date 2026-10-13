'use client'

import { Bell, Menu, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BookeyButton } from '@/components/ui-kit/bookey-button'
import { BookeyLogo } from '@/components/ui-kit/bookey-logo'
import { Hint } from '@/components/ui-kit/hint'
import { useNotificationCenter } from '@/lib/stores/notifications'
import { AvatarMenu } from './avatar-menu'
import { GlobalSearch } from './global-search'
import { getWorkspaceTitle } from './nav'

interface WorkspaceTopbarProps {
  collapsed: boolean
  onToggleCollapsed: () => void
  onOpenMobileNav: () => void
}

export function WorkspaceTopbar({ collapsed, onToggleCollapsed, onOpenMobileNav }: WorkspaceTopbarProps) {
  const pathname = usePathname()
  const title = getWorkspaceTitle(pathname)
  const onNotifications = pathname === '/notifications'
  const { unreadCount } = useNotificationCenter()

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="flex h-16 items-center gap-2 px-3 sm:gap-3 sm:px-6 lg:px-8">
        <Hint label="Open navigation">
          <BookeyButton size="icon" variant="ghost" aria-label="Open navigation" className="lg:hidden" onClick={onOpenMobileNav}>
            <Menu aria-hidden="true" />
          </BookeyButton>
        </Hint>
        <Hint label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
          <BookeyButton
            size="icon"
            variant="ghost"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-expanded={!collapsed}
            className="hidden lg:inline-flex"
            onClick={onToggleCollapsed}
          >
            {collapsed ? <PanelLeftOpen aria-hidden="true" /> : <PanelLeftClose aria-hidden="true" />}
          </BookeyButton>
        </Hint>

        <Link href="/dashboard" aria-label="Bookey overview" className="rounded-xl sm:hidden">
          <BookeyLogo markOnly />
        </Link>

        <nav aria-label="Breadcrumb" className="min-w-0 flex-1">
          <ol className="flex items-center gap-2 text-sm">
            <li className="hidden text-muted-foreground sm:block">
              <Link href="/dashboard" className="rounded-md hover:text-foreground">
                Workspace
              </Link>
            </li>
            <li aria-hidden="true" className="hidden text-muted-foreground/60 sm:block">
              /
            </li>
            <li className="truncate font-display text-base font-semibold" aria-current="page">
              {title}
            </li>
          </ol>
        </nav>

        <GlobalSearch />

        <Hint label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}>
          <BookeyButton
            size="icon"
            variant={onNotifications ? 'secondary' : 'ghost'}
            aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
            aria-current={onNotifications ? 'page' : undefined}
            nativeButton={false}
            render={<Link href="/notifications" />}
            className="relative"
          >
            <Bell aria-hidden="true" />
            {unreadCount > 0 && (
              <span
                aria-hidden="true"
                className="absolute top-1 right-1 grid min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] leading-4 font-bold text-primary-foreground"
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </BookeyButton>
        </Hint>

        <AvatarMenu />
      </div>
    </header>
  )
}
