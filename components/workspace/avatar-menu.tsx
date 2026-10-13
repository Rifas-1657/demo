'use client'

import { Bell, LogOut, Settings, UserRound } from 'lucide-react'
import Link from 'next/link'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { getInitials, useProfile } from '@/lib/stores/profile'

const ITEMS = [
  { href: '/profile', label: 'Profile', icon: UserRound },
  { href: '/settings', label: 'Settings', icon: Settings },
  { href: '/notifications', label: 'Notifications', icon: Bell },
]

export function AvatarMenu() {
  const { profile } = useProfile()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Open account menu"
        className="grid size-10 place-items-center overflow-hidden rounded-full bg-primary font-display text-sm font-bold text-primary-foreground outline-none ring-offset-2 ring-offset-background transition-shadow focus-visible:ring-4 focus-visible:ring-ring/30 data-popup-open:ring-2 data-popup-open:ring-primary/40"
      >
        {profile.avatar ? (
          // eslint-disable-next-line @next/next/no-img-element -- local data URL preview
          <img src={profile.avatar} alt="" className="size-full object-cover" />
        ) : (
          <span aria-hidden="true">{getInitials(profile.displayName)}</span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 rounded-2xl p-1.5">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="px-2.5 py-2">
            <span className="block truncate text-sm font-semibold text-foreground">{profile.displayName}</span>
            <span className="block text-xs font-normal text-muted-foreground">Sample account · not signed in</span>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          {ITEMS.map(({ href, label, icon: Icon }) => (
            <DropdownMenuItem key={href} render={<Link href={href} />} className="gap-2.5 rounded-xl px-2.5 py-2">
              <Icon aria-hidden="true" />
              {label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href="/login" />} className="gap-2.5 rounded-xl px-2.5 py-2">
          <LogOut aria-hidden="true" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
