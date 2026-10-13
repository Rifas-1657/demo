import type { Metadata } from 'next'
import { Reveal } from '@/components/landing/reveal'
import { CtaBand } from '@/components/site/cta-band'
import { PageHero } from '@/components/site/page-hero'
import { BookeyBadge } from '@/components/ui-kit/bookey-badge'
import { SectionLabel } from '@/components/ui-kit/section-label'
import { cn } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'About',
  description: 'Why Bookey exists, how we think about learning, the principles we build by, and what is on the roadmap.',
}

const PHILOSOPHY = [
  { title: 'Structure before speed', body: 'An idea you can locate is an idea you can return to. Chapters and short pages beat a faster playback rate.' },
  { title: 'Several ways in', body: 'Reading, listening, seeing a diagram draw, and trying the code reinforce one another. You choose the mix.' },
  { title: 'Active, not passive', body: 'Questions, practice, and notes turn watching into learning. Every page invites you to do something with it.' },
  { title: 'Trust the source', body: 'Explanations stay anchored to the original material and say clearly when they go beyond it.' },
]

const PRINCIPLES = [
  ['Honest by default', 'Anything simulated is labelled as simulated. No invented numbers, no fake social proof.'],
  ['Accessible from the start', 'Keyboard navigation, screen reader labels, captions, and reduced-motion support are requirements, not extras.'],
  ['Private unless shared', 'Your sources and notes belong to you. Sharing is always an explicit choice.'],
  ['Calm interface', 'Motion explains rather than decorates. Nothing competes with the page you are reading.'],
] as const

const ROADMAP = [
  { phase: 'Now', status: 'Prototype', items: ['Interactive demo book', 'Narration, diagrams, and code practice', 'Local notes, bookmarks, and progress'] },
  { phase: 'Next', status: 'Planned', items: ['Accounts and synced progress', 'Generating books from your own sources', 'Source-cited tutor answers'] },
  { phase: 'Later', status: 'Exploring', items: ['Creator publishing and sharing', 'Personalized depth and pace', 'Offline reading and exports'] },
]

export default function AboutPage() {
  return (
    <>
      <PageHero
        eyebrow="About Bookey"
        title={
          <>
            The best lectures deserve <span className="text-brand-pink">better than a scrub bar.</span>
          </>
        }
        lead="So much valuable teaching lives in long videos and conversations that are hard to skim, revisit, or practice with. Bookey exists to turn that material into books you can actually learn from."
      />

      <section aria-labelledby="mission-title" className="py-20 sm:py-28">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 sm:px-8 lg:grid-cols-[0.6fr_1.4fr] lg:gap-20">
          <Reveal>
            <SectionLabel index="01">Mission</SectionLabel>
          </Reveal>
          <Reveal delay={0.08}>
            <h2 id="mission-title" className="text-3xl leading-[1.15] font-semibold tracking-tight text-balance sm:text-5xl sm:leading-[1.08]">
              Make long-form knowledge as easy to <span className="text-primary">navigate, revisit, and practice</span> as a well-made book.
            </h2>
            <p className="mt-8 max-w-2xl text-lg leading-relaxed text-muted-foreground">
              A video moves at its own pace; a book moves at yours. We want to keep what makes the original teaching great,
              the voice, the examples, the reasoning, and give it the structure that makes learning stick.
            </p>
          </Reveal>
        </div>
      </section>

      <section aria-labelledby="philosophy-title" className="bg-card py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <Reveal>
            <SectionLabel index="02">Learning philosophy</SectionLabel>
            <h2 id="philosophy-title" className="mt-5 max-w-2xl text-4xl leading-[1.02] font-semibold tracking-tight sm:text-5xl">
              Four beliefs shape every page.
            </h2>
          </Reveal>
          <ol className="mt-14 grid gap-x-12 gap-y-12 sm:grid-cols-2">
            {PHILOSOPHY.map((p, i) => (
              <Reveal as="li" key={p.title} delay={i * 0.06} className="flex gap-6 border-t border-border pt-7">
                <span className="font-display text-5xl leading-none font-semibold text-primary/25 tabular-nums">{i + 1}</span>
                <div>
                  <h3 className="text-2xl font-semibold">{p.title}</h3>
                  <p className="mt-3 leading-relaxed text-muted-foreground">{p.body}</p>
                </div>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      <section aria-labelledby="principles-title" className="theme-night bg-ink py-20 sm:py-28">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 sm:px-8 lg:grid-cols-[0.8fr_1.2fr]">
          <Reveal>
            <SectionLabel index="03" className="text-brand-pink">
              Build principles
            </SectionLabel>
            <h2 id="principles-title" className="mt-5 text-4xl leading-[1.02] font-semibold tracking-tight text-[#FFF1F3] sm:text-5xl">
              How we decide what to build.
            </h2>
          </Reveal>
          <dl className="divide-y divide-white/10 border-y border-white/10">
            {PRINCIPLES.map(([term, desc], i) => (
              <Reveal key={term} delay={i * 0.06} className="grid gap-2 py-6 sm:grid-cols-[14rem_1fr] sm:gap-8">
                <dt className="text-lg font-semibold text-[#FFF1F3]">{term}</dt>
                <dd className="leading-relaxed text-[#FFF1F3]/65">{desc}</dd>
              </Reveal>
            ))}
          </dl>
        </div>
      </section>

      <section aria-labelledby="roadmap-title" className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <Reveal>
            <SectionLabel index="04">Roadmap</SectionLabel>
            <h2 id="roadmap-title" className="mt-5 max-w-2xl text-4xl leading-[1.02] font-semibold tracking-tight sm:text-5xl">
              Where Bookey is, and where it is going.
            </h2>
            <p className="mt-5 max-w-xl text-muted-foreground">Direction, not dates. Priorities may change as we learn.</p>
          </Reveal>
          <ol className="mt-14 grid gap-5 md:grid-cols-3">
            {ROADMAP.map((r, i) => (
              <Reveal
                as="li"
                key={r.phase}
                delay={i * 0.08}
                className={cn('rounded-[1.75rem] border p-7', i === 0 ? 'border-primary/40 bg-secondary/50' : 'border-border bg-card')}
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-3xl font-semibold">{r.phase}</h3>
                  <BookeyBadge tone={i === 0 ? 'brand' : 'neutral'}>{r.status}</BookeyBadge>
                </div>
                <ul className="mt-6 space-y-3">
                  {r.items.map((item) => (
                    <li key={item} className="flex gap-3 text-sm leading-relaxed">
                      <span aria-hidden="true" className={cn('mt-2 size-1.5 shrink-0 rounded-full', i === 0 ? 'bg-primary' : 'bg-muted-foreground/40')} />
                      {item}
                    </li>
                  ))}
                </ul>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      <CtaBand />
    </>
  )
}
