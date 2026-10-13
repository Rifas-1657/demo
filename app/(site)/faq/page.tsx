import type { Metadata } from 'next'
import { FaqExplorer } from '@/components/faq/faq-explorer'
import { CtaBand } from '@/components/site/cta-band'
import { PageHero } from '@/components/site/page-hero'

export const metadata: Metadata = {
  title: 'FAQ',
  description: 'Answers about turning videos into books, narration, supported content, privacy in the demo, accessibility, and what is coming next.',
}

export default function FaqPage() {
  return (
    <>
      <PageHero
        size="compact"
        eyebrow="FAQ"
        title={
          <>
            Questions, <span className="text-brand-pink">answered plainly.</span>
          </>
        }
        lead="Search or filter by topic. If something is simulated in this prototype, the answer says so."
      />
      <section aria-label="Frequently asked questions" className="py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <FaqExplorer />
        </div>
      </section>
      <CtaBand title={<>Still curious? <span className="text-primary">Try the demo book.</span></>} />
    </>
  )
}
