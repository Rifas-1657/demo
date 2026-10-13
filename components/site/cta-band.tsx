import { ArrowRight, BookOpen } from 'lucide-react'
import Link from 'next/link'
import { ROUTES } from '@/components/landing/data'
import { Reveal } from '@/components/landing/reveal'
import { BookeyButton } from '@/components/ui-kit/bookey-button'
import { MagneticButton } from '@/components/ui-kit/magnetic-button'

interface CtaBandProps {
  title?: React.ReactNode
  lead?: string
}

/** Closing call to action shared by secondary marketing pages: open the demo course or sign up. */
export function CtaBand({
  title = (
    <>
      Open a book and <span className="text-primary">see for yourself.</span>
    </>
  ),
  lead = 'The demo course runs entirely in your browser. No upload, no setup, nothing to configure.',
}: CtaBandProps) {
  return (
    <section aria-labelledby="cta-band-title" className="px-3 py-20 sm:px-5 sm:py-28">
      <Reveal className="relative mx-auto max-w-6xl overflow-hidden rounded-[2rem] border border-border bg-card px-6 py-14 shadow-[0_40px_80px_-50px_rgb(159_18_57/0.45)] sm:px-14 sm:py-16">
        <div aria-hidden="true" className="bloom-pink absolute inset-0" />
        <div className="relative flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <h2 id="cta-band-title" className="text-4xl leading-[1] font-semibold tracking-tight sm:text-6xl">
              {title}
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-muted-foreground">{lead}</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row lg:shrink-0">
            <MagneticButton size="lg" nativeButton={false} render={<Link href={ROUTES.demoCourse} />}>
              <BookOpen aria-hidden="true" />
              Open demo course
            </MagneticButton>
            <BookeyButton size="lg" variant="outline" nativeButton={false} render={<Link href={ROUTES.signup} />}>
              Create an account
              <ArrowRight aria-hidden="true" />
            </BookeyButton>
          </div>
        </div>
      </Reveal>
    </section>
  )
}
