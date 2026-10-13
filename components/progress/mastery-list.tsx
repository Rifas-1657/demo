'use client'

import { CheckCircle2, Circle, CircleDashed } from 'lucide-react'
import { useState } from 'react'
import { DashboardPanel, ProgressBar } from '@/components/dashboard/dashboard-panel'
import { SegmentedControl } from '@/components/workspace/form-controls'
import { learningCourses, type LearningCourseId } from '@/lib/mock/learning'
import { getChapterMastery } from '@/lib/mock/progress'

const STATUS = {
  completed: { icon: <CheckCircle2 className="text-emerald-600" />, label: 'Completed' },
  'in-progress': { icon: <CircleDashed className="text-primary" />, label: 'In progress' },
  'not-started': { icon: <Circle className="text-muted-foreground" />, label: 'Not started' },
} as const

export function MasteryList() {
  const [courseId, setCourseId] = useState<LearningCourseId>(learningCourses[0].id)
  const course = learningCourses.find((c) => c.id === courseId) ?? learningCourses[0]
  const chapters = getChapterMastery(course)

  return (
    <DashboardPanel id="mastery" title="Chapter mastery" description="Quiz and recall scores for each chapter.">
      <div className="-mt-3 mb-2">
        <SegmentedControl
          label="Book"
          hideLabel
          stacked
          name="mastery-course"
          value={courseId}
          onChange={setCourseId}
          options={learningCourses.map((c) => ({ value: c.id, label: c.title }))}
        />
      </div>
      <ol className="divide-y divide-border">
        {chapters.map((entry) => {
          const status = STATUS[entry.status as keyof typeof STATUS] ?? STATUS['not-started']
          return (
            <li key={entry.chapter.number} className="flex items-center gap-3 py-3">
              <span aria-hidden="true" className="[&_svg]:size-5">
                {status.icon}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="truncate text-sm font-medium">
                    <span className="text-muted-foreground">Ch {entry.chapter.number} · </span>
                    {entry.chapter.title}
                  </p>
                  <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                    <span className="sr-only">{status.label}, mastery </span>
                    {entry.mastery}%
                  </span>
                </div>
                <ProgressBar value={entry.mastery} label={`Chapter ${entry.chapter.number} demo mastery`} className="mt-2 h-1.5" />
              </div>
            </li>
          )
        })}
      </ol>
    </DashboardPanel>
  )
}
