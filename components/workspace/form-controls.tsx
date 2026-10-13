'use client'

import { useId } from 'react'
import { cn } from '@/lib/utils'

interface SettingSwitchProps {
  label: string
  description?: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}

/** Native checkbox exposed as a switch; the whole row is the hit target. */
export function SettingSwitch({ label, description, checked, onCheckedChange }: SettingSwitchProps) {
  const descriptionId = useId()
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl px-1 py-3 has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-ring/30">
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="font-medium">{label}</span>
        {description && (
          <span id={descriptionId} className="text-sm text-muted-foreground">
            {description}
          </span>
        )}
      </span>
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        aria-describedby={description ? descriptionId : undefined}
        onChange={(event) => onCheckedChange(event.target.checked)}
        className="sr-only"
      />
      <span
        aria-hidden="true"
        className={cn('relative h-7 w-12 shrink-0 rounded-full transition-colors', checked ? 'bg-primary' : 'bg-input')}
      >
        <span
          className={cn(
            'absolute top-1 left-1 size-5 rounded-full bg-white shadow-sm transition-transform duration-200',
            checked && 'translate-x-5',
          )}
        />
      </span>
    </label>
  )
}

interface SegmentedOption<T extends string> {
  value: T
  label: string
  icon?: React.ReactNode
}

interface SegmentedControlProps<T extends string> {
  label: string
  description?: string
  name: string
  options: SegmentedOption<T>[]
  value: T
  onChange: (value: T) => void
  /** Always place the label above the options; use for long option labels. */
  stacked?: boolean
  /** Visually hide the label while keeping it for assistive tech. */
  hideLabel?: boolean
}

/** Radio group styled as a segmented pill; arrow keys move between options. */
export function SegmentedControl<T extends string>({
  label,
  description,
  name,
  options,
  value,
  onChange,
  stacked = false,
  hideLabel = false,
}: SegmentedControlProps<T>) {
  const labelId = useId()
  const descriptionId = useId()
  return (
    <div
      className={cn(
        'flex flex-col gap-3 py-3',
        !stacked && 'sm:flex-row sm:items-center sm:justify-between sm:gap-6',
      )}
    >
      <div className={cn('flex min-w-0 flex-col gap-0.5 px-1', hideLabel && !description && 'sr-only')}>
        <span id={labelId} className={cn('font-medium', hideLabel && 'sr-only')}>
          {label}
        </span>
        {description && (
          <span id={descriptionId} className="text-sm text-muted-foreground">
            {description}
          </span>
        )}
      </div>
      <div
        role="radiogroup"
        aria-labelledby={labelId}
        aria-describedby={description ? descriptionId : undefined}
        className={cn(
          'flex max-w-full flex-wrap gap-1 self-start bg-muted p-1',
          stacked ? 'rounded-3xl' : 'shrink-0 rounded-full sm:self-auto',
        )}
      >
        {options.map((option) => {
          const checked = option.value === value
          return (
            <label
              key={option.value}
              className={cn(
                'flex cursor-pointer items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-ring/30 [&_svg]:size-4',
                checked ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <input
                type="radio"
                name={name}
                value={option.value}
                checked={checked}
                onChange={() => onChange(option.value)}
                className="sr-only"
              />
              {option.icon && <span aria-hidden="true">{option.icon}</span>}
              {option.label}
            </label>
          )
        })}
      </div>
    </div>
  )
}

/** Card section with a real heading for landmarks and anchor links. */
export function FormSection({
  id,
  title,
  description,
  icon,
  children,
  className,
}: {
  id: string
  title: string
  description?: string
  icon?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <section
      aria-labelledby={`${id}-heading`}
      className={cn('scroll-mt-24 rounded-3xl border border-border bg-card p-5 text-card-foreground sm:p-6', className)}
    >
      <div className="mb-3 flex items-start gap-3">
        {icon && (
          <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-2xl bg-secondary text-secondary-foreground [&_svg]:size-5">
            {icon}
          </span>
        )}
        <div className="min-w-0">
          <h2 id={`${id}-heading`} className="font-display text-lg font-semibold">
            {title}
          </h2>
          {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
        </div>
      </div>
      <div className="divide-y divide-border">{children}</div>
    </section>
  )
}
