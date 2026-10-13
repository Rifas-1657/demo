import { Briefcase, GraduationCap, Users } from 'lucide-react'
import { SectionLabel } from '@/components/ui-kit/section-label'
import { Reveal } from './reveal'

const CASES = [
  {
    icon: Briefcase,
    who: 'The career switcher',
    scenario: 'Learning to code after work, in twenty-minute sessions.',
    quote: 'I finally finish what I start, because each page is small enough to fit in my evening.',
  },
  {
    icon: GraduationCap,
    who: 'The student revising',
    scenario: 'Turning a semester of recorded lectures into something reviewable.',
    quote: 'Instead of rewatching two hours, I ask the tutor and jump straight to the part I missed.',
  },
  {
    icon: Users,
    who: 'The team lead onboarding',
    scenario: 'Converting internal walkthrough recordings into a shared book.',
    quote: 'New hires can try the examples themselves instead of just watching someone else do it.',
  },
]

export function UseCases() {
  return (
    <section aria-labelledby="usecases-title" className="bg-background pb-24 sm:pb-32">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="max-w-2xl">
          <SectionLabel index="07">Who it is for</SectionLabel>
          <h2 id="usecases-title" className="mt-5 text-4xl leading-[1.02] font-semibold tracking-tight sm:text-6xl">
            Made for people who learn on their own time.
          </h2>
          <p className="mt-4 text-sm text-muted-foreground">Illustrative scenarios — not customer testimonials.</p>
        </div>
        <ul className="mt-14 grid gap-5 md:grid-cols-3">
          {CASES.map(({ icon: Icon, who, scenario, quote }, i) => (
            <Reveal as="li" key={who} delay={i * 0.08}>
              <figure className="flex h-full flex-col rounded-3xl border border-border bg-card p-7">
                <Icon aria-hidden="true" className="size-6 text-primary" />
                <figcaption className="mt-5">
                  <p className="text-xl font-semibold">{who}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{scenario}</p>
                </figcaption>
                <blockquote className="mt-6 border-l-2 border-primary/40 pl-4 font-display text-lg leading-snug italic">
                  {`\u201C${quote}\u201D`}
                </blockquote>
              </figure>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  )
}
