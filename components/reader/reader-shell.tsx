'use client'

import { ArrowLeft, Minus, Plus } from 'lucide-react'
import Link from 'next/link'
import { useEffect } from 'react'
import { BookeyBadge } from '@/components/ui-kit/bookey-badge'
import { BookeyButton } from '@/components/ui-kit/bookey-button'
import { Hint } from '@/components/ui-kit/hint'
import { rehydrateReaderPreferences, useReaderPreferences } from '@/lib/stores/reader-preferences'
import type { BookPage } from '@/types/learning'

interface ReaderShellProps {
  courseTitle: string
  author: string
  page: BookPage
}

export function ReaderShell({ courseTitle, author, page }: ReaderShellProps) {
  const fontScale = useReaderPreferences((s) => s.fontScale)
  const setFontScale = useReaderPreferences((s) => s.setFontScale)

  useEffect(() => {
    rehydrateReaderPreferences()
  }, [])

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-20 border-b bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4">
          <Hint label="Back to dashboard">
            <BookeyButton
              size="icon"
              variant="ghost"
              aria-label="Back to dashboard"
              nativeButton={false}
              render={<Link href="/dashboard" />}
            >
              <ArrowLeft aria-hidden="true" />
            </BookeyButton>
          </Hint>
          <p className="min-w-0 truncate text-sm font-medium">{courseTitle}</p>
          <div className="flex items-center gap-1" role="group" aria-label="Text size">
            <BookeyButton
              size="icon"
              variant="ghost"
              aria-label="Decrease text size"
              disabled={fontScale <= 0.85}
              onClick={() => setFontScale(fontScale - 0.1)}
            >
              <Minus aria-hidden="true" />
            </BookeyButton>
            <BookeyButton
              size="icon"
              variant="ghost"
              aria-label="Increase text size"
              disabled={fontScale >= 1.4}
              onClick={() => setFontScale(fontScale + 0.1)}
            >
              <Plus aria-hidden="true" />
            </BookeyButton>
          </div>
        </div>
      </header>

      <main id="main" className="flex-1 px-4 py-10 sm:py-16">
        <article
          data-theme="book"
          className="mx-auto max-w-2xl rounded-3xl border p-6 shadow-[0_30px_80px_-40px_rgb(194_65_12/0.35)] sm:p-12"
          style={{ fontSize: `${fontScale}rem` }}
        >
          <div className="mb-6 flex flex-wrap items-center gap-2">
            <BookeyBadge tone="book" className="capitalize">
              {page.kind}
            </BookeyBadge>
            <span className="font-mono text-xs text-muted-foreground">{page.estimatedMinutes} min</span>
          </div>
          <h1 className="font-display text-[2em] leading-tight font-bold text-balance">{page.title}</h1>
          <p className="mt-2 text-[0.875em] text-muted-foreground">{author}</p>
          <p className="mt-8 font-serif text-[1.125em] leading-relaxed">{page.body}</p>
          <p className="mt-10 border-t pt-6 text-[0.8em] text-muted-foreground">
            Reader shell placeholder — page navigation, highlights, and exercises arrive in the reader build.
          </p>
        </article>
      </main>
    </div>
  )
}
