import Link from 'next/link'
import { BookeyLogo } from '@/components/ui-kit/bookey-logo'
import { LANDING_NAV, ROUTES } from './data'

const COLUMNS = [
  { title: 'Product', links: LANDING_NAV },
  {
    title: 'Account',
    links: [
      { href: ROUTES.login, label: 'Log in' },
      { href: ROUTES.signup, label: 'Sign up' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { href: ROUTES.privacy, label: 'Privacy' },
      { href: ROUTES.terms, label: 'Terms' },
    ],
  },
]

export function LandingFooter() {
  return (
    <footer className="theme-night border-t border-white/10 bg-night-deep">
      <div className="mx-auto grid max-w-7xl gap-12 px-5 py-16 sm:px-8 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div>
          <BookeyLogo tone="light" />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-[#FFF1F3]/60">
            Interactive books with a voice tutor, live diagrams, and practice you can run.
          </p>
        </div>
        {COLUMNS.map((col) => (
          <nav key={col.title} aria-label={col.title}>
            <p className="font-mono text-xs tracking-[0.18em] text-[#FFF1F3]/45 uppercase">{col.title}</p>
            <ul className="mt-4 space-y-2.5">
              {col.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-[#FFF1F3]/80 transition-colors hover:text-brand-pink">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="mx-auto max-w-7xl border-t border-white/10 px-5 py-6 text-xs text-[#FFF1F3]/45 sm:px-8">
        {`\u00A9 ${new Date().getFullYear()} Bookey. All rights reserved.`}
      </div>
    </footer>
  )
}
