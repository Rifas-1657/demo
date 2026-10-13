import type { Metadata } from 'next'
import { Reveal } from '@/components/landing/reveal'
import { PricingPlans } from '@/components/pricing/pricing-plans'
import { AccordionList } from '@/components/site/accordion-list'
import { CtaBand } from '@/components/site/cta-band'
import { DemoNotice } from '@/components/site/demo-notice'
import { PageHero } from '@/components/site/page-hero'
import { SectionLabel } from '@/components/ui-kit/section-label'

export const metadata: Metadata = {
  title: 'Pricing',
  description: 'Example Bookey plans for learners and creators. Demo pricing: checkout is not connected in this prototype.',
}

const PRICING_FAQ = [
  {
    q: 'Can I actually subscribe today?',
    a: 'No. These plans are an example of how Bookey could be priced. Checkout is not connected, no payment provider is called, and nothing is charged.',
  },
  {
    q: 'Does the demo upload my files anywhere?',
    a: 'No. This prototype does not upload files to a server. The demo book is bundled with the app, and your notes, bookmarks, and progress stay in your browser.',
  },
  {
    q: 'What would the limits mean in practice?',
    a: 'Limits like “10 books a month” or “sources up to 3 hours” are illustrative tiers. They would cap how much source material is processed, not how often you read the books you already have.',
  },
  {
    q: 'What happens to my data if I stop paying?',
    a: 'In the planned product, books you generated would stay readable and exportable. In this prototype there is no account data on a server to keep or delete.',
  },
  {
    q: 'Is there a discount for students or teams?',
    a: 'Not defined yet. When billing is real, any education or team pricing will be listed here.',
  },
]

export default function PricingPage() {
  return (
    <>
      <PageHero
        size="compact"
        eyebrow="Pricing"
        title={
          <>
            Simple plans, <span className="text-brand-pink">shown honestly.</span>
          </>
        }
        lead="Start with the free demo. The paid tiers below show how Bookey could be priced once generation is live."
      />

      <section aria-labelledby="plans-title" className="py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <h2 id="plans-title" className="sr-only">
            Plans
          </h2>
          <Reveal>
            <DemoNotice title="Demo pricing — checkout is not connected" className="mx-auto mb-12 max-w-2xl">
              Prices are examples. Switching billing only changes what is displayed; no payment provider is contacted.
            </DemoNotice>
            <PricingPlans />
          </Reveal>
        </div>
      </section>

      <section aria-labelledby="pricing-faq-title" className="border-t border-border py-16 sm:py-24">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 sm:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <Reveal>
            <SectionLabel index="?">Questions</SectionLabel>
            <h2 id="pricing-faq-title" className="mt-5 text-4xl leading-[1.02] font-semibold tracking-tight sm:text-5xl">
              Limits, uploads, and your data.
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <AccordionList items={PRICING_FAQ} defaultOpen={1} />
          </Reveal>
        </div>
      </section>

      <CtaBand />
    </>
  )
}
