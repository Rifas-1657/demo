import { Info } from 'lucide-react'
import type { Metadata } from 'next'
import { ActivityHeatmap } from '@/components/progress/activity-heatmap'
import { MasteryList } from '@/components/progress/mastery-list'
import { ProgressOverview } from '@/components/progress/progress-overview'
import { BadgeGrid, RevisionTopics } from '@/components/progress/revision-and-badges'
import { TimeChart } from '@/components/progress/time-chart'
import { BookeyBadge } from '@/components/ui-kit/bookey-badge'
import { WorkspacePage } from '@/components/workspace/workspace-page'

export const metadata: Metadata = { title: 'Progress' }

export default function ProgressPage() {
  return (
    <WorkspacePage
      title="Progress"
      description="Long-term trends across chapters, practice, and streaks. Every number here comes from the demo seed, not a real learner."
      aside={
        <BookeyBadge tone="neutral" icon={<Info />}>
          Demo data
        </BookeyBadge>
      }
    >
      <ProgressOverview />
      <div className="grid gap-6 lg:grid-cols-2">
        <ActivityHeatmap />
        <TimeChart />
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <MasteryList />
        <RevisionTopics />
      </div>
      <BadgeGrid />
    </WorkspacePage>
  )
}
