'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { BookeyButton } from '@/components/ui-kit/bookey-button'

export default function RouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <main
      role="alert"
      className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-background px-6 py-16 text-center text-foreground"
    >
      <div className="flex max-w-md flex-col items-center gap-3">
        <p className="font-mono text-sm font-medium text-primary">Something went wrong</p>
        <h1 className="text-balance font-display text-3xl font-semibold tracking-tight">We lost our place on this page</h1>
        <p className="text-pretty leading-relaxed text-muted-foreground">
          An unexpected error stopped this page from loading. Your saved notes and preferences on this device are untouched.
        </p>
        {error.digest && <p className="font-mono text-xs text-muted-foreground">Reference: {error.digest}</p>}
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <BookeyButton onClick={reset}>Try again</BookeyButton>
        <BookeyButton variant="outline" nativeButton={false} render={<Link href="/" />}>
          Go to home
        </BookeyButton>
      </div>
    </main>
  )
}
