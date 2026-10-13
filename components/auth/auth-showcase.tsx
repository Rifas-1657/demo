import Link from 'next/link'
import { Book3D } from '@/components/ui-kit/book-3d/book-3d'
import { BookeyLogo } from '@/components/ui-kit/bookey-logo'
import { GrainOverlay } from '@/components/ui-kit/grain-overlay'

const SHOWCASE_COVER = { base: '#E11D48', spine: '#9F1239', accent: '#FFE4E6', text: '#FFFFFF' }

export function AuthShowcase() {
  return (
    <aside
      aria-label="About Bookey"
      className="theme-night relative isolate hidden overflow-hidden bg-[image:var(--bk-night-gradient)] lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col lg:justify-between lg:p-12 xl:p-14"
    >
      <div aria-hidden="true" className="pointer-events-none absolute -top-40 -left-32 -z-10 size-[34rem] rounded-full bg-[radial-gradient(circle,rgb(225_29_72/0.35),transparent_65%)] blur-2xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-24 -bottom-48 -z-10 size-[30rem] rounded-full bg-[radial-gradient(circle,rgb(251_113_133/0.18),transparent_65%)] blur-2xl" />
      <GrainOverlay className="-z-10 mix-blend-overlay" opacity={0.08} />

      <Link href="/" className="w-fit rounded-lg outline-none focus-visible:ring-4 focus-visible:ring-ring/40" aria-label="Bookey home">
        <BookeyLogo tone="light" />
      </Link>

      <Book3D
        title="Python from Zero"
        author="Bookey demo"
        cover={SHOWCASE_COVER}
        className="mx-auto aspect-square w-full max-w-md flex-1 max-h-[46vh]"
      />

      <div className="max-w-md">
        <p className="font-mono text-xs tracking-[0.2em] text-brand-pink uppercase">Interactive learning</p>
        <h2 className="mt-4 font-display text-4xl leading-[1.05] font-bold text-pretty xl:text-5xl">
          Every great book, one page at a time.
        </h2>
        <p className="mt-4 leading-relaxed text-muted-foreground">
          Guided chapters, quick exercises, and reflections that fit into the minutes you already have.
        </p>
        <dl className="mt-8 flex gap-8 border-t border-border pt-6 text-sm">
          <div>
            <dt className="text-muted-foreground">Average session</dt>
            <dd className="mt-1 font-display text-2xl font-bold">12 min</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Format</dt>
            <dd className="mt-1 font-display text-2xl font-bold">Read · Try · Reflect</dd>
          </div>
        </dl>
      </div>
    </aside>
  )
}
