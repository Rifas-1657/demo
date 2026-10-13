import { GrainOverlay } from '@/components/ui-kit/grain-overlay'
import { Reveal } from '@/components/landing/reveal'
import { cn } from '@/lib/utils'

interface PageHeroProps {
  eyebrow: string
  title: React.ReactNode
  lead?: React.ReactNode
  /** Optional visual rendered beside the copy on large screens. */
  aside?: React.ReactNode
  /** Actions or notes under the lead. */
  children?: React.ReactNode
  size?: 'default' | 'compact'
  id?: string
}

/** Dark burgundy page intro used by every secondary marketing route. Pairs with the transparent landing header. */
export function PageHero({ eyebrow, title, lead, aside, children, size = 'default', id = 'page-title' }: PageHeroProps) {
  return (
    <section
      aria-labelledby={id}
      className={cn(
        'theme-night relative isolate overflow-hidden bg-night-gradient',
        size === 'compact' ? 'pt-32 pb-14 sm:pt-36 sm:pb-16' : 'pt-32 pb-20 sm:pt-40 sm:pb-24',
      )}
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[radial-gradient(50%_60%_at_85%_30%,rgb(225_29_72/0.22),transparent_70%),radial-gradient(35%_45%_at_5%_100%,rgb(245_158_11/0.1),transparent_70%)]"
      />
      <GrainOverlay opacity={0.07} className="-z-10 mix-blend-overlay" />

      <div
        className={cn(
          'mx-auto grid max-w-7xl gap-12 px-5 sm:px-8',
          aside && 'lg:grid-cols-[1.35fr_1fr] lg:items-center',
        )}
      >
        <Reveal>
          <p className="inline-flex items-center gap-3 font-mono text-xs tracking-[0.24em] text-brand-pink uppercase">
            <span aria-hidden="true" className="h-px w-8 bg-current" />
            {eyebrow}
          </p>
          <h1
            id={id}
            className={cn(
              'mt-6 max-w-4xl font-semibold tracking-[-0.04em] text-[#FFF1F3]',
              size === 'compact'
                ? 'text-[clamp(2.5rem,5.5vw,4.5rem)] leading-[0.95]'
                : 'text-[clamp(2.75rem,7vw,6.25rem)] leading-[0.92]',
            )}
          >
            {title}
          </h1>
          {lead && <p className="mt-7 max-w-2xl text-lg leading-relaxed text-[#FFF1F3]/72">{lead}</p>}
          {children && <div className="mt-9">{children}</div>}
        </Reveal>
        {aside && <Reveal delay={0.15}>{aside}</Reveal>}
      </div>
    </section>
  )
}
