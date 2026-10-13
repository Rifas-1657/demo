'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, MailCheck } from 'lucide-react'
import { BookeyButton } from '@/components/ui-kit/bookey-button'
import { AuthField } from './auth-field'
import { AuthSubmit, AuthSwitch, authLinkClass } from './auth-submit'
import { validateEmail } from './validation'

const DEMO_DELAY_MS = 600

export function ForgotPasswordForm() {
  const inputRef = useRef<HTMLInputElement>(null)
  const statusRef = useRef<HTMLDivElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string>()
  const [pending, setPending] = useState(false)
  const [submittedEmail, setSubmittedEmail] = useState<string>()

  useEffect(() => () => clearTimeout(timer.current), [])

  useEffect(() => {
    if (submittedEmail) statusRef.current?.focus()
  }, [submittedEmail])

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return
    const nextError = validateEmail(email)
    setError(nextError)
    if (nextError) {
      inputRef.current?.focus()
      return
    }
    setPending(true)
    timer.current = setTimeout(() => {
      setPending(false)
      setSubmittedEmail(email.trim())
    }, DEMO_DELAY_MS)
  }

  function reset() {
    setSubmittedEmail(undefined)
    requestAnimationFrame(() => inputRef.current?.focus())
  }

  if (submittedEmail) {
    return (
      <>
        <div
          ref={statusRef}
          tabIndex={-1}
          role="status"
          className="rounded-2xl border border-book-amber/40 bg-book-marker/15 p-5 outline-none focus-visible:ring-4 focus-visible:ring-ring/20"
        >
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-white text-book-deep shadow-sm">
              <MailCheck aria-hidden="true" className="size-5" />
            </span>
            <div>
              <p className="font-semibold text-book-ink">Demo only — password reset is not connected</p>
              <p className="mt-1 text-sm leading-relaxed text-book-ink/80">
                In the real app, a reset link would go to <span className="font-medium break-all text-book-ink">{submittedEmail}</span>. No
                email was sent.
              </p>
            </div>
          </div>
        </div>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <BookeyButton nativeButton={false} render={<Link href="/login" />} size="lg" className="flex-1">
            <ArrowLeft aria-hidden="true" />
            Back to log in
          </BookeyButton>
          <BookeyButton type="button" variant="outline" size="lg" onClick={reset} className="flex-1">
            Use another email
          </BookeyButton>
        </div>
      </>
    )
  }

  return (
    <>
      <form onSubmit={handleSubmit} noValidate aria-busy={pending}>
        <fieldset disabled={pending} className="flex flex-col gap-5">
          <legend className="sr-only">Request a password reset</legend>
          <AuthField
            ref={inputRef}
            id="forgot-email"
            label="Email"
            type="email"
            name="email"
            autoComplete="email"
            inputMode="email"
            placeholder="name@example.com"
            value={email}
            error={error}
            onChange={(e) => {
              setEmail(e.target.value)
              if (error) setError(validateEmail(e.target.value))
            }}
          />
          <AuthSubmit pending={pending} label="Send reset link" pendingLabel="Checking…" />
        </fieldset>
      </form>
      <AuthSwitch>
        Remembered it?{' '}
        <Link href="/login" className={authLinkClass}>
          Back to log in
        </Link>
      </AuthSwitch>
    </>
  )
}
