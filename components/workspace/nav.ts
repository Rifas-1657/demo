import {
  BookMarked,
  LayoutDashboard,
  Library,
  Search,
  Settings,
  TrendingUp,
  UserRound,
  type LucideIcon,
} from 'lucide-react'

export interface WorkspaceNavItem {
  href: string
  label: string
  icon: LucideIcon
  /** Shown in the compact mobile tab bar. */
  tab?: boolean
}

export const WORKSPACE_NAV: WorkspaceNavItem[] = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard, tab: true },
  { href: '/courses', label: 'Courses', icon: BookMarked, tab: true },
  { href: '/library', label: 'Library', icon: Library },
  { href: '/search', label: 'Search', icon: Search, tab: true },
  { href: '/progress', label: 'Progress', icon: TrendingUp, tab: true },
  { href: '/profile', label: 'Profile', icon: UserRound },
  { href: '/settings', label: 'Settings', icon: Settings },
]

const EXTRA_TITLES: Record<string, string> = { '/notifications': 'Notifications' }

export function isNavActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function getWorkspaceTitle(pathname: string) {
  const match = WORKSPACE_NAV.find((item) => isNavActive(pathname, item.href))
  return match?.label ?? EXTRA_TITLES[pathname] ?? 'Workspace'
}
