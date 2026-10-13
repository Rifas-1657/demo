import type { Metadata } from 'next'
import { ButtonsBadgesSection } from '@/components/design-system/buttons-badges-section'
import { CardsProgressSection } from '@/components/design-system/cards-progress-section'
import { ColorsSection } from '@/components/design-system/colors-section'
import { DesignSystemHero } from '@/components/design-system/hero'
import { FeedbackSection } from '@/components/design-system/feedback-section'
import { MotionSection } from '@/components/design-system/motion-section'
import { TypographySection } from '@/components/design-system/typography-section'

export const metadata: Metadata = {
  title: 'Design system',
  description: 'Bookey foundations: typography, color tokens, components, progress, and motion.',
}

export default function DesignSystemPage() {
  return (
    <>
      <DesignSystemHero />
      <TypographySection />
      <ColorsSection />
      <ButtonsBadgesSection />
      <CardsProgressSection />
      <FeedbackSection />
      <MotionSection />
    </>
  )
}
