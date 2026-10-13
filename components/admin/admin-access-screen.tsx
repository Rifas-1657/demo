'use client'

import { ArrowLeft, KeyRound, ShieldOff } from 'lucide-react'
import Link from 'next/link'
import { BookeyButton } from '@/components/ui-kit/bookey-button'
import { useAdminDemo } from '@/lib/stores/admin-demo'

export function AdminAccessScreen() {
  const setDemoAdmin = useAdminDemo((s) => s.setDemoAdmin)

  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-6 rounded-3xl border border-border bg-card px-6 py-12 text-center sm:px-10">
      <span aria-hidden="true" className="grid size-14 place-items-center rounded-2xl bg-secondary text-secondary-foreground">
        <ShieldOff className="size-7" />
      </span>
      <div className="space-y-2">
        <h1 className="font-display text-2xl font-bold text-balance">Demo admin console</h1>
        <p className="leading-relaxed text-pretty text-muted-foreground">
          This area previews the owner tools for Bookey. It is a navigation state for the demo, not a sign-in: there are no
          real accounts, roles, or permissions, and every change stays in this browser.
        </p>
      </div>
      <ul className="w-full space-y-2 rounded-2xl bg-muted p-4 text-left text-sm text-muted-foreground">
        <li>All members, metrics, and documents are fictional sample records.</li>
        <li>Nothing is uploaded, sent, or indexed by AI.</li>
        <li>You can leave demo admin mode at any time from the profile menu.</li>
      </ul>
      <div className="flex flex-col gap-2 sm:flex-row">
        <BookeyButton size="lg" onClick={() => setDemoAdmin(true)}>
          <KeyRound aria-hidden="true" />
          Enter demo admin
        </BookeyButton>
        <BookeyButton size="lg" variant="outline" nativeButton={false} render={<Link href="/dashboard" />}>
          <ArrowLeft aria-hidden="true" />
          Back to workspace
        </BookeyButton>
      </div>
    </div>
  )
}
