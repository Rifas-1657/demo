import type { Metadata } from 'next'
import { Reveal } from '@/components/landing/reveal'
import { ProcessTimeline } from '@/components/how-it-works/process-timeline'
import { CtaBand } from '@/components/site/cta-band'
import { DemoNotice } from '@/components/site/demo-notice'
import { PageHero } from '@/components/site/page-hero'
import { SectionLabel } from '@/components/ui-kit/section-label'

export const metadata: Metadata = {
  title: 'How it works',
  description: 'From a long video or conversation to an interactive book in five steps: upload, analyze, structure, read, and learn.',
}

const GUARANTEES = [
  { title: 'Grounded in your source', body: 'Pages, narration, and answers trace back to the original material. Nothing is invented and passed off as part of it.' },
  { title: 'Short pages, real structure', body: 'An hour of video becomes chapters you can scan in minutes and come back to without scrubbing a timeline.' },
  { title: 'You stay in control', body: 'Skip, reorder, or regenerate any part. The book adapts to you, not the other way around.' },
]

export default function HowItWorksPage() {
  return (
    <>
      <PageHero
        eyebrow="How it works"
        title={
          <>
            From an hour of video <span className="text-brand-pink">to a book you can step inside.</span>
          </>
        }
        lead="Five steps, most of them automatic. Here is what happens between dropping in a source and opening your first page."
      />

      <section aria-labelledby="process-title" className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <Reveal className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <SectionLabel index="01">The process</SectionLabel>
              <h2 id="process-title" className="mt-5 max-w-2xl text-4xl leading-[1.02] font-semibold tracking-tight sm:text-5xl">
                Select a step to see it happen.
              </h2>
            </div>
            <DemoNotice title="Generation is simulated in this prototype" className="max-w-md">
              The steps below illustrate the intended pipeline. Uploading and generating books from your own sources is not live yet.
            </DemoNotice>
          </Reveal>
          <div className="mt-14">
            <ProcessTimeline />
          </div>
        </div>
      </section>

      <section aria-labelledby="principles-title" className="theme-night bg-ink py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <Reveal>
            <SectionLabel index="02" className="text-brand-pink">
              What stays true
            </SectionLabel>
            <h2 id="principles-title" className="mt-5 max-w-3xl text-4xl leading-[1.02] font-semibold tracking-tight text-[#FFF1F3] sm:text-5xl">
              Every book follows the same three rules.
            </h2>
          </Reveal>
          <ol className="mt-14 grid gap-px overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/10 md:grid-cols-3">
            {GUARANTEES.map((g, i) => (
              <Reveal as="li" key={g.title} delay={i * 0.08} className="bg-ink p-7 sm:p-9">
                <span className="font-mono text-sm text-brand-pink">{String(i + 1).padStart(2, '0')}</span>
                <h3 className="mt-8 text-2xl font-semibold text-[#FFF1F3]">{g.title}</h3>
                <p className="mt-3 leading-relaxed text-[#FFF1F3]/65">{g.body}</p>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      <CtaBand
        title={
          <>
            Skip to step four <span className="text-primary">with the demo book.</span>
          </>
        }
      />
    </>
  )
}
