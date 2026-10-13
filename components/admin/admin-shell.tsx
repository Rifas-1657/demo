'use client'

import { Menu } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { BookeyBadge } from '@/components/ui-kit/bookey-badge'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { rehydrateAdminDemo, useAdminDemo } from '@/lib/stores/admin-demo'
import { cn } from '@/lib/utils'
import { AdminAccessScreen } from './admin-access-screen'
import { AdminBreadcrumbs } from './admin-breadcrumbs'
import { AdminProfileMenu } from './admin-profile-menu'
import { AdminSidebar } from './admin-sidebar'

export function AdminShell({ children }: { children: React.ReactNode }) {
  const hydrated = useAdminDemo((s) => s.hydrated)
  const demoAdmin = useAdminDemo((s) => s.demoAdmin)
  const compact = useAdminDemo((s) => s.sidebarCompact)
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    rehydrateAdminDemo()
  }, [])

  return (
    <div className="flex min-h-dvh bg-background text-foreground">
      <a
        href="#admin-main"
        className="sr-only z-50 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>

      <aside
        aria-label="Admin"
        className={cn(
          'theme-night sticky top-0 hidden h-dvh shrink-0 text-foreground transition-[width] duration-200 motion-reduce:transition-none lg:block',
          compact ? 'w-20' : 'w-64',
        )}
        style={{ background: 'var(--bk-night-gradient)' }}
      >
        <AdminSidebar pathname={pathname} compact={compact} showCompactToggle />
      </aside>

      <Dialog open={mobileOpen} onOpenChange={setMobileOpen}>
        <DialogContent
          showCloseButton={false}
          className="theme-night top-0 left-0 h-dvh w-72 max-w-[85vw] translate-x-0 translate-y-0 rounded-none p-0 text-foreground ring-0 sm:max-w-[85vw] data-open:zoom-in-100 data-open:slide-in-from-left-10 data-closed:zoom-out-100 data-closed:slide-out-to-left-10"
          style={{ background: 'var(--bk-night-gradient)' }}
        >
          <DialogTitle className="sr-only">Admin navigation</DialogTitle>
          <AdminSidebar pathname={pathname} compact={false} onNavigate={() => setMobileOpen(false)} onClose={() => setMobileOpen(false)} />
        </DialogContent>
      </Dialog>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/90 px-4 backdrop-blur sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="grid size-10 shrink-0 place-items-center rounded-full text-foreground outline-none hover:bg-muted focus-visible:ring-4 focus-visible:ring-ring/30 lg:hidden"
          >
            <Menu aria-hidden="true" className="size-5" />
            <span className="sr-only">Open admin navigation</span>
          </button>
          <AdminBreadcrumbs pathname={pathname} />
          <div className="ml-auto flex shrink-0 items-center gap-3">
            <BookeyBadge tone="warning" className="hidden sm:inline-flex">
              Demo admin console
            </BookeyBadge>
            {hydrated && demoAdmin && <AdminProfileMenu />}
          </div>
        </header>

        <main id="admin-main" tabIndex={-1} className="flex-1 px-4 py-6 outline-none sm:px-6 lg:px-8 lg:py-8">
          <div className="mx-auto w-full max-w-6xl">
            {!hydrated ? <ShellSkeleton /> : demoAdmin ? children : <AdminAccessScreen />}
          </div>
        </main>
      </div>
    </div>
  )
}

function ShellSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading demo admin console" className="space-y-6">
      <Skeleton className="h-9 w-64 rounded-xl" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-72 rounded-2xl" />
    </div>
  )
}
