'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'
import { BookeyLogo } from '@/components/ui-kit/bookey-logo'
import { cn } from '@/lib/utils'
import { isNavActive, WORKSPACE_NAV } from './nav'
import { WorkspaceNavList } from './workspace-nav-list'

interface MobileNavDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function MobileNavDrawer({ open, onOpenChange }: MobileNavDrawerProps) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange} swipeDirection="left">
      <DrawerContent className="w-72 max-w-[85vw]">
        <DrawerHeader className="items-start gap-3 text-left">
          <BookeyLogo />
          <DrawerTitle className="sr-only">Workspace navigation</DrawerTitle>
          <DrawerDescription className="text-xs">Demo workspace · sample data only</DrawerDescription>
        </DrawerHeader>
        <nav aria-label="Workspace" className="flex-1 overflow-y-auto px-3 pb-6">
          <WorkspaceNavList onNavigate={() => onOpenChange(false)} />
        </nav>
      </DrawerContent>
    </Drawer>
  )
}

const TABS = WORKSPACE_NAV.filter((item) => item.tab)

/** Bottom tab bar keeping the most-used routes one tap away on small screens. */
export function MobileTabBar() {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Quick navigation"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
    >
      <ul className="mx-auto flex max-w-md">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = isNavActive(pathname, href)
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium outline-none focus-visible:bg-muted',
                  active ? 'text-primary' : 'text-muted-foreground',
                )}
              >
                <span className={cn('grid h-7 w-12 place-items-center rounded-full transition-colors', active && 'bg-secondary')}>
                  <Icon aria-hidden="true" className="size-[1.125rem]" />
                </span>
                {label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
