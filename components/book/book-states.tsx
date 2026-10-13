import { BookX } from 'lucide-react'
import Link from 'next/link'
import { BookeyButton } from '@/components/ui-kit/bookey-button'
import { Skeleton } from '@/components/ui/skeleton'

export function BookSpreadSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading page"
      className="grid h-full min-h-[28rem] gap-3 rounded-[1.75rem] bg-white/5 p-3 lg:grid-cols-2"
    >
      {[0, 1].map((side) => (
        <div key={side} className={side === 1 ? 'hidden flex-col gap-4 rounded-[1.25rem] bg-white/5 p-8 lg:flex' : 'flex flex-col gap-4 rounded-[1.25rem] bg-white/5 p-8'}>
          <Skeleton className="h-3 w-24 bg-white/10" />
          <Skeleton className="h-8 w-2/3 bg-white/10" />
          <Skeleton className="h-20 w-full bg-white/10" />
          <Skeleton className="h-4 w-full bg-white/10" />
          <Skeleton className="h-4 w-11/12 bg-white/10" />
          <Skeleton className="h-4 w-4/5 bg-white/10" />
        </div>
      ))}
      <span className="sr-only">Loading page…</span>
    </div>
  )
}

export function BookReaderSkeleton() {
  return (
    <div className="theme-night flex min-h-dvh flex-col bg-night-gradient text-foreground">
      <div className="flex h-16 items-center gap-3 border-b border-border px-4">
        <Skeleton className="size-10 rounded-full bg-white/10" />
        <Skeleton className="h-4 w-48 bg-white/10" />
      </div>
      <div className="flex-1 p-4 lg:p-8">
        <BookSpreadSkeleton />
      </div>
    </div>
  )
}

interface BookMissingProps {
  title: string
  description: string
  primary: { href: string; label: string }
  secondary?: { href: string; label: string }
}

export function BookMissing({ title, description, primary, secondary }: BookMissingProps) {
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="flex max-w-md flex-col items-center gap-4 rounded-3xl border border-border bg-card/50 px-8 py-12 text-center backdrop-blur-md">
        <div className="grid size-12 place-items-center rounded-2xl bg-secondary text-secondary-foreground" aria-hidden="true">
          <BookX className="size-5" />
        </div>
        <h1 className="text-xl font-semibold">{title}</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
        <div className="mt-2 flex flex-wrap justify-center gap-2">
          <BookeyButton nativeButton={false} render={<Link href={primary.href} />}>
            {primary.label}
          </BookeyButton>
          {secondary && (
            <BookeyButton variant="outline" nativeButton={false} render={<Link href={secondary.href} />}>
              {secondary.label}
            </BookeyButton>
          )}
        </div>
      </div>
    </div>
  )
}
