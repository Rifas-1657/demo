'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { notify } from '@/components/ui-kit/toast'
import { AuthCheckbox, AuthField, PasswordField } from './auth-field'
import { AuthSubmit, AuthSwitch, authLinkClass } from './auth-submit'
import { focusFirstError, validateEmail, validateExistingPassword, type FieldErrors } from './validation'

type LoginField = 'email' | 'password'

const DEMO_DELAY_MS = 700

export function LoginForm() {
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [errors, setErrors] = useState<FieldErrors<LoginField>>({})
  const [pending, setPending] = useState(false)

  useEffect(() => () => clearTimeout(timer.current), [])

  const validators: Record<LoginField, () => string | undefined> = {
    email: () => validateEmail(email),
    password: () => validateExistingPassword(password),
  }

  function revalidate(field: LoginField) {
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: validators[field]() }))
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return
    const next: FieldErrors<LoginField> = { email: validators.email(), password: validators.password() }
    setErrors(next)
    if (next.email || next.password) {
      requestAnimationFrame(() => focusFirstError(formRef.current))
      return
    }
    setPending(true)
    timer.current = setTimeout(() => {
      router.push('/dashboard')
      notify.demo('Demo sign-in — no account was created', 'Authentication is not connected. You are viewing sample data.')
    }, DEMO_DELAY_MS)
  }

  return (
    <>
      <form ref={formRef} onSubmit={handleSubmit} noValidate aria-busy={pending}>
        <fieldset disabled={pending} className="flex flex-col gap-5">
          <legend className="sr-only">Log in with email</legend>
          <AuthField
            id="login-email"
            label="Email"
            type="email"
            name="email"
            autoComplete="email"
            inputMode="email"
            placeholder="name@example.com"
            value={email}
            error={errors.email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => revalidate('email')}
          />
          <PasswordField
            id="login-password"
            label="Password"
            name="password"
            autoComplete="current-password"
            placeholder="Your password"
            value={password}
            error={errors.password}
            onChange={(e) => setPassword(e.target.value)}
            onBlur={() => revalidate('password')}
            labelAction={
              <Link href="/forgot-password" className={`text-sm ${authLinkClass}`}>
                Forgot password?
              </Link>
            }
          />
          <AuthCheckbox id="login-remember" name="remember" checked={remember} onChange={(e) => setRemember(e.target.checked)}>
            Remember me on this device
          </AuthCheckbox>
          <div className="pt-1">
            <AuthSubmit pending={pending} label="Log in" pendingLabel="Signing in…" />
          </div>
        </fieldset>
        <p aria-live="polite" className="sr-only">
          {pending ? 'Signing in to the demo.' : ''}
        </p>
      </form>
      <AuthSwitch>
        New to Bookey?{' '}
        <Link href="/signup" className={authLinkClass}>
          Create an account
        </Link>
      </AuthSwitch>
    </>
  )
}
