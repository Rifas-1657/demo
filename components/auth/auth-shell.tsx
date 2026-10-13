import Link from 'next/link'
import { ArrowLeft, FlaskConical } from 'lucide-react'
import { BookeyLogo } from '@/components/ui-kit/bookey-logo'
import { PageTransition } from '@/components/ui-kit/page-transition'
import { AuthShowcase } from './auth-showcase'

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-[#FFFCFA] lg:grid lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      <AuthShowcase />

      <div className="flex min-h-dvh flex-col">
        <header className="flex items-center justify-between gap-4 px-5 pt-5 sm:px-10 sm:pt-8">
          <Link
            href="/"
            className="rounded-lg outline-none focus-visible:ring-4 focus-visible:ring-ring/30 lg:invisible"
            aria-label="Bookey home"
          >
            <BookeyLogo />
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-ink-muted transition-colors outline-none hover:text-ink focus-visible:ring-4 focus-visible:ring-ring/30"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            Back to site
          </Link>
        </header>

        <main id="main" className="flex flex-1 items-center justify-center px-5 py-10 sm:px-10">
          <PageTransition className="w-full max-w-[26rem]">{children}</PageTransition>
        </main>

        <footer className="flex flex-col items-center gap-3 px-5 pb-6 text-xs text-ink-muted sm:flex-row sm:justify-between sm:px-10 sm:pb-8">
          <p className="inline-flex items-center gap-1.5">
            <FlaskConical aria-hidden="true" className="size-3.5 text-book-deep" />
            Demo UI: authentication is not connected
          </p>
          <nav aria-label="Legal" className="flex items-center gap-4">
            <Link href="/terms" className="rounded hover:text-ink focus-visible:text-ink focus-visible:underline focus-visible:outline-none">
              Terms
            </Link>
            <Link href="/privacy" className="rounded hover:text-ink focus-visible:text-ink focus-visible:underline focus-visible:outline-none">
              Privacy
            </Link>
          </nav>
        </footer>
      </div>
    </div>
  )
}
