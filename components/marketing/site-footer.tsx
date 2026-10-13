import Link from 'next/link'
import { BookeyLogo } from '@/components/ui-kit/bookey-logo'
import { GrainOverlay } from '@/components/ui-kit/grain-overlay'

export function SiteFooter() {
  return (
    <footer className="theme-night relative isolate overflow-hidden bg-night-gradient">
      <div aria-hidden="true" className="bloom-pink absolute inset-0 -z-10" />
      <GrainOverlay opacity={0.08} className="mix-blend-overlay" />
      <div className="relative mx-auto flex max-w-7xl flex-col gap-8 px-4 py-14 sm:px-6 md:flex-row md:items-end md:justify-between lg:px-8">
        <div className="max-w-sm space-y-3">
          <BookeyLogo tone="light" />
          <p className="text-sm leading-relaxed text-muted-foreground">
            Design system foundation. Every number on this site is sample data, and nothing you do here is sent to a
            server.
          </p>
        </div>
        <nav aria-label="Footer">
          <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <li>
              <Link href="/dashboard" className="hover:text-primary">
                Workspace
              </Link>
            </li>
            <li>
              <Link href="/book/python" className="hover:text-primary">
                Reader
              </Link>
            </li>
            <li>
              <Link href="/admin" className="hover:text-primary">
                Admin
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </footer>
  )
}
