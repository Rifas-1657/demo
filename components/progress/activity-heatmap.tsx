import { DashboardPanel } from '@/components/dashboard/dashboard-panel'
import { DAY_LABELS, HEATMAP_WEEKS, getHeatmapSummary, heatmap } from '@/lib/mock/progress'
import { cn } from '@/lib/utils'

const LEVELS = [
  { className: 'bg-muted', label: 'No learning' },
  { className: 'bg-primary/20', label: 'Under 15 min' },
  { className: 'bg-primary/45', label: '15–24 min' },
  { className: 'bg-primary/70', label: '25–34 min' },
  { className: 'bg-primary', label: '35+ min' },
] as const

function weekLabel(week: number) {
  const ago = HEATMAP_WEEKS - 1 - week
  return ago === 0 ? 'this week' : ago === 1 ? 'last week' : `${ago} weeks ago`
}

export function ActivityHeatmap() {
  const summary = getHeatmapSummary()
  const busiest = `${summary.busiest.day} ${weekLabel(summary.busiest.week)} (${summary.busiest.minutes} min)`

  return (
    <DashboardPanel id="heatmap" title="Weekly activity" description={`Daily learning over the last ${HEATMAP_WEEKS} weeks.`}>
      <p className="mb-4 text-sm text-pretty text-muted-foreground">
        Active on <strong className="text-foreground">{summary.activeDays}</strong> of {summary.totalDays} days, longest run{' '}
        <strong className="text-foreground">{summary.longestStreak} days</strong>, busiest day {busiest}.
      </p>

      <div className="overflow-x-auto pb-1">
        <table className="border-separate border-spacing-1">
          <caption className="sr-only">
            Minutes learned per day. Rows are weekdays, columns are weeks from oldest to this week.
          </caption>
          <thead>
            <tr>
              <th scope="col" className="sr-only">
                Day
              </th>
              {heatmap.map((_, week) => (
                <th key={week} scope="col" className="text-[10px] font-normal text-muted-foreground">
                  <span aria-hidden="true">{week === HEATMAP_WEEKS - 1 ? 'Now' : week % 3 === 0 ? `W${week + 1}` : ''}</span>
                  <span className="sr-only">{weekLabel(week)}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {DAY_LABELS.map((day, dayIndex) => (
              <tr key={day}>
                <th scope="row" className="pr-1 text-left text-[11px] font-normal text-muted-foreground">
                  {day}
                </th>
                {heatmap.map((week, weekIndex) => {
                  const cell = week[dayIndex]
                  return (
                    <td
                      key={weekIndex}
                      title={`${day}, ${weekLabel(weekIndex)}: ${cell.minutes} min`}
                      className={cn('size-5 rounded-[5px] sm:size-6', LEVELS[cell.level].className)}
                    >
                      <span className="sr-only">{cell.minutes} minutes</span>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul aria-label="Heatmap legend" className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
        {LEVELS.map((level) => (
          <li key={level.label} className="flex items-center gap-1.5">
            <span aria-hidden="true" className={cn('size-3.5 rounded-[4px]', level.className)} />
            {level.label}
          </li>
        ))}
      </ul>
    </DashboardPanel>
  )
}
