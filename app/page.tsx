import type { Metadata } from 'next'
import { BentoShowcase } from '@/components/landing/bento-showcase'
import { CourseSpotlights } from '@/components/landing/course-spotlights'
import { Faq } from '@/components/landing/faq'
import { FeatureGrid } from '@/components/landing/feature-grid'
import { FinalCta } from '@/components/landing/final-cta'
import { Hero } from '@/components/landing/hero/hero'
import { HowItWorks } from '@/components/landing/how-it-works'
import { LandingFooter } from '@/components/landing/landing-footer'
import { LandingHeader } from '@/components/landing/landing-header'
import { Marquee } from '@/components/landing/marquee'
import { ProblemSolution } from '@/components/landing/problem-solution'
import { ProductPreview } from '@/components/landing/product-preview'
import { UseCases } from '@/components/landing/use-cases'

export const metadata: Metadata = {
  title: 'Bookey — Step inside the knowledge',
  description:
    'Turn long videos and conversations into living books with a voice tutor, diagrams that draw as you learn, and code you can try yourself.',
}

export default function LandingPage() {
  return (
    <>
      <LandingHeader />
      <main id="main" className="overflow-x-clip">
        <Hero />
        <Marquee />
        <ProblemSolution />
        <HowItWorks />
        <ProductPreview />
        <FeatureGrid />
        <CourseSpotlights />
        <BentoShowcase />
        <UseCases />
        <Faq />
        <FinalCta />
      </main>
      <LandingFooter />
    </>
  )
}
