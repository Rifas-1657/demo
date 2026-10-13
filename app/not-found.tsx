import type { Metadata } from 'next'
import Link from 'next/link'
import { BookeyButton } from '@/components/ui-kit/bookey-button'
import { BookeyLogo } from '@/components/ui-kit/bookey-logo'

export const metadata: Metadata = {
  title: 'Page not found',
}

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8 bg-background px-6 py-16 text-center text-foreground">
      <Link href="/" className="rounded-xl outline-none focus-visible:ring-4 focus-visible:ring-ring/30">
        <BookeyLogo />
        <span className="sr-only">Bookey home</span>
      </Link>
      <div className="flex max-w-md flex-col items-center gap-3">
        <p className="font-mono text-sm font-medium text-primary">404</p>
        <h1 className="text-balance font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          This page isn&apos;t in the book
        </h1>
        <p className="text-pretty leading-relaxed text-muted-foreground">
          The link may be mistyped or the page may have moved. Head back to somewhere familiar.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <BookeyButton nativeButton={false} render={<Link href="/" />}>
          Go to home
        </BookeyButton>
        <BookeyButton variant="outline" nativeButton={false} render={<Link href="/courses" />}>
          Browse courses
        </BookeyButton>
      </div>
    </main>
  )
}
