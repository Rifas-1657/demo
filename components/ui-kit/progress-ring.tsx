import { cn } from '@/lib/utils'

interface ProgressRingProps {
  value: number
  size?: number
  strokeWidth?: number
  label: string
  /** Optional text under the percentage, e.g. "4 of 6 pages". */
  caption?: string
  className?: string
}

export function ProgressRing({ value, size = 96, strokeWidth = 8, label, caption, className }: ProgressRingProps) {
  const clamped = Math.min(100, Math.max(0, Math.round(value)))
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - clamped / 100)

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={clamped}
      aria-valuetext={caption ? `${clamped}% — ${caption}` : `${clamped}%`}
      className={cn('relative inline-grid place-items-center', className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--muted)" strokeWidth={strokeWidth} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--primary)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      <span className="absolute inset-0 grid place-content-center text-center" aria-hidden="true">
        <span className="font-display text-lg leading-none font-semibold tabular-nums">{clamped}%</span>
        {caption && <span className="mt-1 text-[10px] leading-tight text-muted-foreground">{caption}</span>}
      </span>
    </div>
  )
}
