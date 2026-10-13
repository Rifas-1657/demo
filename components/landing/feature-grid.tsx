import { BookMarked, Code2, Mic, NotebookPen, Quote, Route, Shapes } from 'lucide-react'
import { SectionLabel } from '@/components/ui-kit/section-label'
import { cn } from '@/lib/utils'
import { Reveal } from './reveal'
import { TiltCard } from './tilt-card'

const FEATURES = [
  {
    icon: Mic,
    title: 'A voice tutor that listens',
    body: 'Interrupt any page with a question. The tutor answers out loud, at your level, then picks up where you left off.',
    span: 'lg:col-span-4',
    tone: 'theme-night bg-night-gradient text-[#FFF1F3]',
    art: 'wave',
  },
  {
    icon: Shapes,
    title: 'Diagrams that draw',
    body: 'Visuals build line by line with the narration, so you see how ideas connect.',
    span: 'lg:col-span-2',
    tone: 'bg-book-paper',
  },
  {
    icon: Code2,
    title: 'Practice you can run',
    body: 'Edit examples and see the output instantly, right inside the chapter.',
    span: 'lg:col-span-2',
    tone: 'bg-book-ink text-book-paper',
  },
  {
    icon: Route,
    title: 'A path that adapts',
    body: 'Chapters adjust to your goals and what you already know.',
    span: 'lg:col-span-2',
    tone: 'bg-card',
  },
  {
    icon: NotebookPen,
    title: 'Notes and highlights',
    body: 'Mark what matters and keep your own margin notes on every page.',
    span: 'lg:col-span-2',
    tone: 'bg-secondary',
  },
]

function Wave() {
  return (
    <div aria-hidden="true" className="mt-8 flex h-16 items-center gap-1.5">
      {Array.from({ length: 36 }, (_, i) => (
        <span
          key={i}
          className="w-1.5 flex-1 origin-center rounded-full bg-brand-pink/80 motion-safe:animate-[landing-wave_1.4s_ease-in-out_infinite]"
          style={{ height: `${30 + Math.abs(Math.sin(i * 0.7)) * 70}%`, animationDelay: `${-i * 0.08}s` }}
        />
      ))}
    </div>
  )
}

export function FeatureGrid() {
  return (
    <section id="features" aria-labelledby="features-title" className="scroll-mt-24 bg-background py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="max-w-2xl">
          <SectionLabel index="04">Features</SectionLabel>
          <h2 id="features-title" className="mt-5 text-4xl leading-[1.02] font-semibold tracking-tight sm:text-6xl">
            Everything a great teacher does, built into the page.
          </h2>
        </div>

        <ul className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
          {FEATURES.map(({ icon: Icon, title, body, span, tone, art }, i) => (
            <Reveal as="li" key={title} delay={(i % 3) * 0.06} className={cn(span, i === 0 && 'sm:col-span-2')}>
              <TiltCard className={cn('flex flex-col rounded-3xl border border-border p-6 sm:p-8', tone)}>
                <span className="grid size-11 place-items-center rounded-2xl bg-primary/15 text-primary">
                  <Icon aria-hidden="true" className="size-5" />
                </span>
                <h3 className="mt-6 text-2xl font-semibold">{title}</h3>
                <p className="mt-2 max-w-md text-sm leading-relaxed opacity-75">{body}</p>
                {art === 'wave' && <Wave />}
              </TiltCard>
            </Reveal>
          ))}
          <Reveal as="li" className="sm:col-span-2 lg:col-span-6">
            <div className="grid items-center gap-8 rounded-3xl border border-border bg-card p-6 sm:p-10 md:grid-cols-[1fr_1.2fr]">
              <div>
                <span className="grid size-11 place-items-center rounded-2xl bg-primary/15 text-primary">
                  <BookMarked aria-hidden="true" className="size-5" />
                </span>
                <h3 className="mt-6 text-3xl font-semibold">Answers grounded in your source</h3>
                <p className="mt-3 max-w-md leading-relaxed text-muted-foreground">
                  The tutor answers from the material first and links back to where it came from — and tells you when it goes
                  beyond it.
                </p>
              </div>
              <figure className="rounded-2xl border border-border bg-background p-5">
                <blockquote className="flex gap-3 text-sm leading-relaxed">
                  <Quote aria-hidden="true" className="size-4 shrink-0 text-primary" />
                  <p>
                    {'"A loop stops when the sequence has no items left."'}
                  </p>
                </blockquote>
                <figcaption className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="rounded-full bg-secondary px-2.5 py-1 font-mono text-secondary-foreground">Source · 14:08</span>
                  <span className="rounded-full bg-secondary px-2.5 py-1 font-mono text-secondary-foreground">Chapter 4, page 2</span>
                  <span>Example citation</span>
                </figcaption>
              </figure>
            </div>
          </Reveal>
        </ul>
      </div>
    </section>
  )
}
