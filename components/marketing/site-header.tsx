import Link from 'next/link'
import { BookeyButton } from '@/components/ui-kit/bookey-button'
import { BookeyLogo } from '@/components/ui-kit/bookey-logo'

const NAV = [
  { href: '/design-system#typography', label: 'Type' },
  { href: '/design-system#colors', label: 'Color' },
  { href: '/design-system#components', label: 'Components' },
  { href: '/design-system#motion', label: 'Motion' },
]

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-md">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-full focus:bg-card focus:px-4 focus:py-2"
      >
        Skip to content
      </a>
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" aria-label="Bookey home" className="rounded-lg">
          <BookeyLogo />
        </Link>
        <nav aria-label="Design system sections" className="hidden md:block">
          <ul className="flex items-center gap-1">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="rounded-full px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <BookeyButton size="sm" variant="dark" nativeButton={false} render={<Link href="/dashboard" />}>
          Open workspace
        </BookeyButton>
      </div>
    </header>
  )
}
