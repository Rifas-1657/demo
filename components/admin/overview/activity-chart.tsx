'use client'

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

interface ActivityPoint {
  day: string
  readers: number
  questions: number
}

const SERIES = [
  { key: 'questions', label: 'Questions asked', color: 'var(--chart-2)' },
  { key: 'readers', label: 'Active readers', color: 'var(--chart-1)' },
] as const

export function ActivityChart({ data }: { data: ActivityPoint[] }) {
  const totalQuestions = data.reduce((sum, d) => sum + d.questions, 0)
  const peak = data.reduce((best, d) => (d.readers > best.readers ? d : best), data[0])

  return (
    <figure className="space-y-4">
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground" aria-hidden="true">
        {SERIES.map((s) => (
          <span key={s.key} className="flex items-center gap-2">
            <span className="size-2.5 rounded-full" style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
            <defs>
              {SERIES.map((s) => (
                <linearGradient key={s.key} id={`fill-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={s.color} stopOpacity={0.28} />
                  <stop offset="100%" stopColor={s.color} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={12} tick={{ fill: 'var(--muted-foreground)' }} interval="preserveStartEnd" minTickGap={24} />
            <YAxis tickLine={false} axisLine={false} fontSize={12} tick={{ fill: 'var(--muted-foreground)' }} allowDecimals={false} />
            <Tooltip
              contentStyle={{ borderRadius: 12, border: '1px solid var(--border)', background: 'var(--popover)', fontSize: 12 }}
              labelStyle={{ fontWeight: 600, color: 'var(--foreground)' }}
            />
            {SERIES.map((s) => (
              <Area
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.label}
                stroke={s.color}
                strokeWidth={2}
                fill={`url(#fill-${s.key})`}
                isAnimationActive={false}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="text-xs text-muted-foreground">
        Sample data: {totalQuestions} questions over {data.length} days, peaking at {peak.readers} readers on {peak.day}.
      </figcaption>
    </figure>
  )
}
