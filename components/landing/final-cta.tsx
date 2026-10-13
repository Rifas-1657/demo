import { ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { Book3D } from '@/components/ui-kit/book-3d/book-3d'
import { BookeyButton } from '@/components/ui-kit/bookey-button'
import { GrainOverlay } from '@/components/ui-kit/grain-overlay'
import { MagneticButton } from '@/components/ui-kit/magnetic-button'
import { ROUTES } from './data'

export function FinalCta() {
  return (
    <section aria-labelledby="cta-title" className="theme-night relative isolate overflow-hidden bg-night-gradient py-24 sm:py-32">
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[radial-gradient(45%_60%_at_80%_50%,rgb(245_158_11/0.2),transparent_70%),radial-gradient(40%_50%_at_10%_20%,rgb(225_29_72/0.25),transparent_70%)]" />
      <GrainOverlay opacity={0.07} className="-z-10 mix-blend-overlay" />
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 sm:px-8 lg:grid-cols-[1.3fr_1fr]">
        <div>
          <h2 id="cta-title" className="font-display text-[clamp(2.75rem,6.5vw,6rem)] leading-[0.92] font-semibold tracking-[-0.04em] text-[#FFF1F3]">
            Your next book is <span className="text-brand-pink">waiting to open.</span>
          </h2>
          <p className="mt-6 max-w-lg text-lg text-[#FFF1F3]/70">Start with a demo course or bring your own source. Your first chapter is a click away.</p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <MagneticButton size="lg" nativeButton={false} render={<Link href={ROUTES.signup} />}>
              Start learning free
              <ArrowRight aria-hidden="true" />
            </MagneticButton>
            <BookeyButton size="lg" variant="outline" nativeButton={false} render={<Link href={ROUTES.courses} />} className="border-white/20 bg-transparent text-[#FFF1F3] hover:bg-white/8">
              Browse courses
            </BookeyButton>
          </div>
        </div>
        <div className="mx-auto aspect-square w-full max-w-md">
          <Book3D
            title="Your First Book"
            author="Built from your source"
            cover={{ base: '#E11D48', spine: '#9F1239', accent: '#FDBA74', text: '#FFFFFF' }}
            className="size-full"
          />
        </div>
      </div>
    </section>
  )
}
