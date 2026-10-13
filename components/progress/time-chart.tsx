'use client'

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { DashboardPanel } from '@/components/dashboard/dashboard-panel'
import { weeklyTotals } from '@/lib/mock/progress'

export function TimeChart() {
  const total = weeklyTotals.reduce((sum, week) => sum + week.minutes, 0)
  const average = Math.round(total / weeklyTotals.length)
  const best = weeklyTotals.reduce((a, b) => (b.minutes > a.minutes ? b : a))

  return (
    <DashboardPanel id="time" title="Time on learning" description="Minutes per week.">
      <p className="mb-4 text-sm text-muted-foreground">
        Average <strong className="text-foreground">{average} min</strong> a week. Best week: {best.fullLabel.toLowerCase()} with{' '}
        {best.minutes} min.
      </p>
      <div className="h-52 w-full" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={weeklyTotals} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
              tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
            />
            <YAxis tickLine={false} axisLine={false} tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} />
            <Tooltip
              cursor={{ fill: 'var(--muted)' }}
              contentStyle={{ background: 'var(--popover)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 12 }}
              labelFormatter={(_, payload) => payload?.[0]?.payload?.fullLabel ?? ''}
              formatter={(value) => [`${value} min`, 'Learned']}
            />
            <Bar dataKey="minutes" fill="var(--chart-1)" radius={[6, 6, 3, 3]} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
        <span aria-hidden="true" className="size-3 rounded-[3px] bg-[var(--chart-1)]" />
        Minutes learned per week
      </div>

      <details className="group mt-4 rounded-2xl border border-border">
        <summary className="cursor-pointer rounded-2xl px-4 py-2.5 text-sm font-medium outline-none focus-visible:ring-4 focus-visible:ring-ring/30">
          Show data as a table
        </summary>
        <div className="max-h-64 overflow-y-auto px-4 pb-3">
          <table className="w-full text-sm">
            <caption className="sr-only">Minutes learned per week, oldest first</caption>
            <thead>
              <tr className="text-left text-muted-foreground">
                <th scope="col" className="py-1.5 font-medium">
                  Week
                </th>
                <th scope="col" className="py-1.5 text-right font-medium">
                  Minutes
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {weeklyTotals.map((week) => (
                <tr key={week.label}>
                  <th scope="row" className="py-1.5 text-left font-normal">
                    {week.fullLabel}
                  </th>
                  <td className="py-1.5 text-right tabular-nums">{week.minutes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </DashboardPanel>
  )
}
