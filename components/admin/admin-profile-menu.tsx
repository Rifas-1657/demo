'use client'

import { ArrowLeft, LogOut, RotateCcw } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { notify } from '@/components/ui-kit/toast'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAdminDemo } from '@/lib/stores/admin-demo'
import { ConfirmDialog } from './admin-ui'

export function AdminProfileMenu() {
  const setDemoAdmin = useAdminDemo((s) => s.setDemoAdmin)
  const resetDemoData = useAdminDemo((s) => s.resetDemoData)
  const [confirmReset, setConfirmReset] = useState(false)

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label="Open demo admin profile menu"
          className="grid size-10 place-items-center rounded-full bg-ink font-display text-sm font-bold text-[#FFF1F3] outline-none transition-shadow focus-visible:ring-4 focus-visible:ring-ring/30 data-popup-open:ring-2 data-popup-open:ring-primary/40"
        >
          <span aria-hidden="true">DO</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60 rounded-2xl p-1.5">
          <DropdownMenuGroup>
            <DropdownMenuLabel className="px-2.5 py-2">
              <span className="block text-sm font-semibold text-foreground">Demo owner</span>
              <span className="block text-xs font-normal">Fictional identity · no real account</span>
            </DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem render={<Link href="/dashboard" />} className="gap-2 rounded-xl px-2.5 py-2">
            <ArrowLeft aria-hidden="true" />
            Back to workspace
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setConfirmReset(true)} className="gap-2 rounded-xl px-2.5 py-2">
            <RotateCcw aria-hidden="true" />
            Reset demo data
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => {
              setDemoAdmin(false)
              notify.demo('Left demo admin mode')
            }}
            className="gap-2 rounded-xl px-2.5 py-2"
          >
            <LogOut aria-hidden="true" />
            Exit demo admin
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ConfirmDialog
        open={confirmReset}
        onOpenChange={setConfirmReset}
        title="Reset demo data?"
        description="Courses, documents, members, and tutor settings return to the original sample records in this browser."
        confirmLabel="Reset demo data"
        onConfirm={() => {
          resetDemoData()
          notify.demo('Demo data reset')
        }}
      />
    </>
  )
}
