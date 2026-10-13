'use client'

import { Check } from 'lucide-react'
import type { Choice } from './survey-config'
import { cn } from '@/lib/utils'

interface GroupBaseProps {
  name: string
  labelledBy: string
  describedBy?: string
  invalid?: boolean
}

const cardBase =
  'group relative flex cursor-pointer rounded-2xl border bg-card text-left transition-[border-color,background-color,box-shadow] duration-200 has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-ring/30'

function Indicator({ checked, shape }: { checked: boolean; shape: 'round' | 'square' }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex size-6 shrink-0 items-center justify-center border-2 transition-colors',
        shape === 'round' ? 'rounded-full' : 'rounded-lg',
        checked ? 'border-primary bg-primary text-primary-foreground' : 'border-input bg-card',
      )}
    >
      {checked && <Check className="size-3.5" strokeWidth={3} />}
    </span>
  )
}

interface SingleChoiceProps<T extends string> extends GroupBaseProps {
  choices: Choice<T>[]
  value: T | null
  onChange: (value: T) => void
  columns?: 1 | 2 | 3
}

/** Native radio group: arrow keys move between options, Enter submits the step. */
export function SingleChoice<T extends string>({
  name,
  labelledBy,
  describedBy,
  invalid,
  choices,
  value,
  onChange,
  columns = 1,
}: SingleChoiceProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      aria-invalid={invalid || undefined}
      aria-required="true"
      className={cn('grid gap-3', columns === 2 && 'sm:grid-cols-2', columns === 3 && 'sm:grid-cols-3')}
    >
      {choices.map((choice, index) => {
        const checked = value === choice.value
        return (
          <label
            key={choice.value}
            className={cn(
              cardBase,
              'items-start gap-4 p-4 sm:p-5',
              checked ? 'border-primary bg-secondary/60 shadow-[0_10px_30px_-18px_var(--primary)]' : 'border-border hover:border-primary/40',
              invalid && !value && 'border-destructive/50',
            )}
          >
            <input
              type="radio"
              name={name}
              value={choice.value}
              checked={checked}
              data-first-field={index === 0 || undefined}
              onChange={() => onChange(choice.value)}
              className="sr-only"
            />
            <Indicator checked={checked} shape="round" />
            <span className="flex flex-col gap-1">
              <span className="font-display text-lg leading-tight font-semibold">{choice.label}</span>
              {choice.description && <span className="text-sm text-muted-foreground">{choice.description}</span>}
            </span>
          </label>
        )
      })}
    </div>
  )
}

interface MultiChoiceProps<T extends string> extends GroupBaseProps {
  choices: Choice<T>[]
  values: T[]
  onChange: (values: T[]) => void
}

export function MultiChoice<T extends string>({ name, labelledBy, describedBy, invalid, choices, values, onChange }: MultiChoiceProps<T>) {
  function toggle(value: T) {
    onChange(values.includes(value) ? values.filter((item) => item !== value) : [...values, value])
  }

  return (
    <div
      role="group"
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      aria-invalid={invalid || undefined}
      className="grid grid-cols-2 gap-3 sm:grid-cols-3"
    >
      {choices.map((choice, index) => {
        const checked = values.includes(choice.value)
        return (
          <label
            key={choice.value}
            className={cn(
              cardBase,
              'items-center gap-3 px-4 py-3.5',
              checked ? 'border-primary bg-secondary/60' : 'border-border hover:border-primary/40',
              invalid && values.length === 0 && 'border-destructive/50',
            )}
          >
            <input
              type="checkbox"
              name={name}
              value={choice.value}
              checked={checked}
              data-first-field={index === 0 || undefined}
              onChange={() => toggle(choice.value)}
              className="sr-only"
            />
            <Indicator checked={checked} shape="square" />
            <span className="font-medium">{choice.label}</span>
          </label>
        )
      })}
    </div>
  )
}

interface OptionalChipsProps<T extends string> extends GroupBaseProps {
  choices: Choice<T>[]
  value: T | null
  onChange: (value: T | null) => void
}

/** Optional single choice; picking the active chip again clears it. */
export function OptionalChips<T extends string>({ name, labelledBy, describedBy, choices, value, onChange }: OptionalChipsProps<T>) {
  return (
    <div role="radiogroup" aria-labelledby={labelledBy} aria-describedby={describedBy} className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2.5">
        {choices.map((choice, index) => {
          const checked = value === choice.value
          return (
            <label
              key={choice.value}
              className={cn(
                'cursor-pointer rounded-full border px-5 py-2.5 font-medium transition-colors has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-ring/30',
                checked ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card hover:border-primary/40',
              )}
            >
              <input
                type="radio"
                name={name}
                value={choice.value}
                checked={checked}
                data-first-field={index === 0 || undefined}
                onChange={() => onChange(choice.value)}
                onClick={() => checked && onChange(null)}
                className="sr-only"
              />
              {choice.label}
            </label>
          )
        })}
      </div>
      {value && (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="self-start rounded-full text-sm font-medium text-muted-foreground underline-offset-4 outline-none hover:text-foreground hover:underline focus-visible:ring-4 focus-visible:ring-ring/30"
        >
          Clear selection
        </button>
      )}
    </div>
  )
}

interface ToggleItem<K extends string> {
  key: K
  label: string
  description: string
}

interface ToggleListProps<K extends string> {
  labelledBy: string
  items: ToggleItem<K>[]
  values: Record<K, boolean>
  onChange: (key: K, checked: boolean) => void
}

export function ToggleList<K extends string>({ labelledBy, items, values, onChange }: ToggleListProps<K>) {
  return (
    <div role="group" aria-labelledby={labelledBy} className="flex flex-col gap-3">
      {items.map((item, index) => {
        const checked = values[item.key]
        const descriptionId = `toggle-${item.key}-desc`
        return (
          <label
            key={item.key}
            className={cn(
              cardBase,
              'items-center justify-between gap-4 p-4 sm:p-5',
              checked ? 'border-primary bg-secondary/60' : 'border-border hover:border-primary/40',
            )}
          >
            <span className="flex flex-col gap-1">
              <span className="font-display text-lg leading-tight font-semibold">{item.label}</span>
              <span id={descriptionId} className="text-sm text-muted-foreground">
                {item.description}
              </span>
            </span>
            <input
              type="checkbox"
              role="switch"
              checked={checked}
              aria-describedby={descriptionId}
              data-first-field={index === 0 || undefined}
              onChange={(event) => onChange(item.key, event.target.checked)}
              className="sr-only"
            />
            <span
              aria-hidden="true"
              className={cn(
                'relative h-7 w-12 shrink-0 rounded-full transition-colors',
                checked ? 'bg-primary' : 'bg-input',
              )}
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
      })}
    </div>
  )
}
