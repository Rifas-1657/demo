'use client'

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

interface WeeklyChartProps {
  data: { day: string; minutes: number }[]
}

export function WeeklyChart({ data }: WeeklyChartProps) {
  const summary = data.map((d) => `${d.day} ${d.minutes} minutes`).join(', ')
  return (
    <figure>
      <figcaption className="sr-only">Minutes studied per day: {summary}.</figcaption>
      <div className="h-56 w-full" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }} />
            <YAxis tickLine={false} axisLine={false} tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }} />
            <Tooltip
              cursor={{ fill: 'var(--muted)' }}
              contentStyle={{
                background: 'var(--popover)',
                border: '1px solid var(--border)',
                borderRadius: 12,
                fontSize: 12,
              }}
              formatter={(value) => [`${value} min`, 'Studied']}
            />
            <Bar dataKey="minutes" fill="var(--chart-1)" radius={[8, 8, 4, 4]} maxBarSize={36} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </figure>
  )
}
