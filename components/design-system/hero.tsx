import { ArrowRight, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { BookeyBadge } from '@/components/ui-kit/bookey-badge'
import { BookeyButton } from '@/components/ui-kit/bookey-button'
import { Book3D } from '@/components/ui-kit/book-3d/book-3d'
import { GrainOverlay } from '@/components/ui-kit/grain-overlay'
import { MagneticButton } from '@/components/ui-kit/magnetic-button'
import { RevealText } from '@/components/ui-kit/reveal-text'
import { learningCourses } from '@/lib/mock/learning'

export function DesignSystemHero() {
  const featured = learningCourses[0]
  return (
    <section aria-labelledby="ds-hero-heading" className="relative isolate overflow-hidden">
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[radial-gradient(50%_60%_at_80%_20%,rgb(251_113_133/0.22),transparent_70%)]"
      />
      <GrainOverlay />
      <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 pt-14 pb-16 sm:px-6 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] md:pt-20 lg:px-8">
        <div className="space-y-7">
          <BookeyBadge tone="outline" icon={<Sparkles aria-hidden="true" />}>
            Design system · v0.1 foundation
          </BookeyBadge>
          <h1 id="ds-hero-heading" className="text-5xl leading-[0.95] font-extrabold sm:text-6xl lg:text-7xl">
            <RevealText text="Learning that reads like a" immediate />{' '}
            <span className="text-primary">
              <RevealText text="good book." immediate delay={0.25} />
            </span>
          </h1>
          <p className="max-w-lg text-lg leading-relaxed text-muted-foreground">
            The tokens, type, and primitives behind Bookey. Rose for the product, warm paper for the reader, and motion
            that only moves when it means something.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <MagneticButton size="lg" nativeButton={false} render={<Link href="#components" />}>
              Explore components
              <ArrowRight aria-hidden="true" />
            </MagneticButton>
            <BookeyButton size="lg" variant="outline" nativeButton={false} render={<Link href="/book/python" />}>
              Preview the reader
            </BookeyButton>
          </div>
        </div>
        <Book3D
          title={featured.title}
          author={featured.author}
          cover={featured.cover}
          className="mx-auto max-w-md"
        />
      </div>
    </section>
  )
}
