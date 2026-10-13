'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Hint } from '@/components/ui-kit/hint'
import { cn } from '@/lib/utils'
import { isNavActive, WORKSPACE_NAV } from './nav'

interface WorkspaceNavListProps {
  collapsed?: boolean
  onNavigate?: () => void
}

export function WorkspaceNavList({ collapsed = false, onNavigate }: WorkspaceNavListProps) {
  const pathname = usePathname()

  return (
    <ul className="flex flex-col gap-1">
      {WORKSPACE_NAV.map(({ href, label, icon: Icon }) => {
        const active = isNavActive(pathname, href)
        const link = (
          <Link
            href={href}
            onClick={onNavigate}
            aria-current={active ? 'page' : undefined}
            aria-label={collapsed ? label : undefined}
            className={cn(
              'group relative flex h-11 items-center gap-3 rounded-2xl text-sm font-medium transition-colors outline-none focus-visible:ring-4 focus-visible:ring-ring/30',
              collapsed ? 'justify-center px-0' : 'px-3.5',
              active
                ? 'bg-secondary text-secondary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                'absolute top-1/2 left-0 h-5 w-1 -translate-y-1/2 rounded-full bg-primary transition-opacity',
                active ? 'opacity-100' : 'opacity-0',
              )}
            />
            <Icon aria-hidden="true" className="size-[1.125rem] shrink-0" />
            {!collapsed && <span className="truncate">{label}</span>}
          </Link>
        )

        return (
          <li key={href}>
            {collapsed ? (
              <Hint label={label} side="right">
                {link}
              </Hint>
            ) : (
              link
            )}
          </li>
        )
      })}
    </ul>
  )
}
