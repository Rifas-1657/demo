'use client'

import { useState } from 'react'
import { AlertCircle, Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AuthFieldProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'id'> {
  id: string
  label: string
  error?: string
  ref?: React.Ref<HTMLInputElement>
  /** Extra element rendered beside the label (e.g. a "Forgot password?" link). */
  labelAction?: React.ReactNode
  /** Content rendered under the input (e.g. strength meter). Should have its own id referenced via `describedBy`. */
  children?: React.ReactNode
  describedBy?: string
  trailing?: React.ReactNode
}

export const authInputClass =
  'h-12 w-full rounded-xl border border-input bg-white px-4 text-base text-ink shadow-[0_1px_0_rgb(31_10_16/0.03)] transition-[border-color,box-shadow] outline-none placeholder:text-ink-muted/60 hover:border-[#dfb3bd] focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-ring/15 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-70 aria-invalid:border-destructive aria-invalid:focus-visible:ring-destructive/15 motion-reduce:transition-none'

export function AuthField({ id, label, error, labelAction, children, describedBy, trailing, className, ...inputProps }: AuthFieldProps) {
  const errorId = `${id}-error`
  const describedByIds = [error ? errorId : null, describedBy].filter(Boolean).join(' ') || undefined

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={id} className="text-sm font-medium text-ink">
          {label}
        </label>
        {labelAction}
      </div>
      <div className="relative">
        <input
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedByIds}
          className={cn(authInputClass, trailing && 'pr-12', className)}
          {...inputProps}
        />
        {trailing && <div className="absolute inset-y-0 right-1.5 flex items-center">{trailing}</div>}
      </div>
      {children}
      {error && (
        <p id={errorId} className="flex items-start gap-1.5 text-sm text-destructive">
          <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          {error}
        </p>
      )}
    </div>
  )
}

type PasswordFieldProps = Omit<AuthFieldProps, 'type' | 'trailing'>

export function PasswordField(props: PasswordFieldProps) {
  const [visible, setVisible] = useState(false)
  return (
    <AuthField
      {...props}
      type={visible ? 'text' : 'password'}
      trailing={
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
          aria-controls={props.id}
          disabled={props.disabled}
          className="grid size-9 place-items-center rounded-lg text-ink-muted transition-colors outline-none hover:bg-muted hover:text-ink focus-visible:ring-4 focus-visible:ring-ring/25 disabled:opacity-50"
        >
          {visible ? <EyeOff aria-hidden="true" className="size-4" /> : <Eye aria-hidden="true" className="size-4" />}
        </button>
      }
    />
  )
}

interface AuthCheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'id'> {
  id: string
  children: React.ReactNode
  error?: string
}

export function AuthCheckbox({ id, children, error, ...props }: AuthCheckboxProps) {
  const errorId = `${id}-error`
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-start gap-3">
        <input
          id={id}
          type="checkbox"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className="mt-0.5 size-[1.125rem] shrink-0 cursor-pointer rounded accent-[var(--bk-primary)] outline-none focus-visible:ring-4 focus-visible:ring-ring/25 disabled:cursor-not-allowed aria-invalid:outline-2 aria-invalid:outline-offset-1 aria-invalid:outline-destructive"
          {...props}
        />
        <label htmlFor={id} className="cursor-pointer text-sm leading-snug text-ink-muted">
          {children}
        </label>
      </div>
      {error && (
        <p id={errorId} className="flex items-start gap-1.5 pl-[1.875rem] text-sm text-destructive">
          <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          {error}
        </p>
      )}
    </div>
  )
}
