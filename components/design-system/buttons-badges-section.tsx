import { BookOpen, Bookmark, CheckCircle2, Clock, Flame, Settings } from 'lucide-react'
import { BookeyBadge } from '@/components/ui-kit/bookey-badge'
import { BookeyButton } from '@/components/ui-kit/bookey-button'
import { Hint } from '@/components/ui-kit/hint'
import { DsSection } from './ds-section'

export function ButtonsBadgesSection() {
  return (
    <DsSection
      id="components"
      index="03"
      label="Components"
      title="Buttons and badges."
      description="Pill buttons with a clear focus ring. Status badges always pair color with an icon or word, never color alone."
      className="bg-card/60"
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6 rounded-3xl border bg-card p-6">
          <h3 className="text-lg font-semibold">Buttons</h3>
          <div className="flex flex-wrap items-center gap-3">
            <BookeyButton>
              <BookOpen aria-hidden="true" />
              Start reading
            </BookeyButton>
            <BookeyButton variant="secondary">Save for later</BookeyButton>
            <BookeyButton variant="outline">Preview</BookeyButton>
            <BookeyButton variant="ghost">Skip</BookeyButton>
            <BookeyButton variant="dark">Continue</BookeyButton>
            <BookeyButton variant="link">View syllabus</BookeyButton>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <BookeyButton size="sm">Small</BookeyButton>
            <BookeyButton size="md">Medium</BookeyButton>
            <BookeyButton size="lg">Large</BookeyButton>
            <BookeyButton disabled>Disabled</BookeyButton>
            <Hint label="Bookmark this page">
              <BookeyButton size="icon" variant="outline" aria-label="Bookmark this page">
                <Bookmark aria-hidden="true" />
              </BookeyButton>
            </Hint>
            <Hint label="Reader settings">
              <BookeyButton size="icon" variant="ghost" aria-label="Reader settings">
                <Settings aria-hidden="true" />
              </BookeyButton>
            </Hint>
          </div>
        </div>
        <div className="space-y-6 rounded-3xl border bg-card p-6">
          <h3 className="text-lg font-semibold">Badges</h3>
          <div className="flex flex-wrap gap-2">
            <BookeyBadge tone="brand">New</BookeyBadge>
            <BookeyBadge tone="soft">Foundations</BookeyBadge>
            <BookeyBadge tone="outline">Productivity</BookeyBadge>
            <BookeyBadge tone="neutral" icon={<Clock aria-hidden="true" />}>
              5 min
            </BookeyBadge>
            <BookeyBadge tone="success" icon={<CheckCircle2 aria-hidden="true" />}>
              Completed
            </BookeyBadge>
            <BookeyBadge tone="warning" icon={<Flame aria-hidden="true" />}>
              Streak at risk
            </BookeyBadge>
            <BookeyBadge tone="book">Reflection</BookeyBadge>
          </div>
        </div>
      </div>
    </DsSection>
  )
}
