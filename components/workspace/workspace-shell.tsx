'use client'

import { useState } from 'react'
import { MobileNavDrawer, MobileTabBar } from './workspace-mobile-nav'
import { WorkspacePreferences } from './workspace-preferences'
import { WorkspaceSidebar } from './workspace-sidebar'
import { WorkspaceTopbar } from './workspace-topbar'

export function WorkspaceShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  return (
    <div className="flex min-h-dvh bg-background">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-full focus:bg-card focus:px-4 focus:py-2 focus:shadow-md"
      >
        Skip to content
      </a>
      <WorkspaceSidebar collapsed={collapsed} />
      <div className="flex min-w-0 flex-1 flex-col">
        <WorkspaceTopbar
          collapsed={collapsed}
          onToggleCollapsed={() => setCollapsed((value) => !value)}
          onOpenMobileNav={() => setMobileNavOpen(true)}
        />
        <main id="main" tabIndex={-1} className="flex-1 px-4 pt-6 pb-28 outline-none sm:px-6 lg:px-8 lg:pt-8 lg:pb-12">
          <WorkspacePreferences>{children}</WorkspacePreferences>
        </main>
      </div>
      <MobileNavDrawer open={mobileNavOpen} onOpenChange={setMobileNavOpen} />
      <MobileTabBar />
    </div>
  )
}
