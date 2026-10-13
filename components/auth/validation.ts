export type FieldErrors<K extends string> = Partial<Record<K, string>>

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export function validateEmail(value: string): string | undefined {
  const email = value.trim()
  if (!email) return 'Enter your email address.'
  if (!EMAIL_PATTERN.test(email)) return 'Enter a valid email, like name@example.com.'
}

export function validateName(value: string): string | undefined {
  const name = value.trim()
  if (!name) return 'Enter your name.'
  if (name.length < 2) return 'Your name should be at least 2 characters.'
}

export function validateExistingPassword(value: string): string | undefined {
  if (!value) return 'Enter your password.'
  if (value.length < 8) return 'Passwords are at least 8 characters.'
}

export interface PasswordStrength {
  score: 0 | 1 | 2 | 3 | 4
  label: string
}

export function getPasswordStrength(value: string): PasswordStrength {
  if (!value) return { score: 0, label: 'Enter a password' }
  let score = 0
  if (value.length >= 8) score++
  if (value.length >= 12) score++
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score++
  if (/\d/.test(value) && /[^A-Za-z0-9]/.test(value)) score++
  else if (/\d|[^A-Za-z0-9]/.test(value)) score += 0.5
  const rounded = Math.min(4, Math.max(1, Math.floor(score))) as PasswordStrength['score']
  const labels = { 1: 'Weak', 2: 'Fair', 3: 'Good', 4: 'Strong' } as const
  return { score: value.length < 8 ? 1 : rounded, label: value.length < 8 ? 'Too short' : labels[rounded as 1 | 2 | 3 | 4] }
}

export function validateNewPassword(value: string): string | undefined {
  if (!value) return 'Create a password.'
  if (value.length < 8) return 'Use at least 8 characters.'
  if (getPasswordStrength(value).score < 2) return 'Add a number, symbol, or mixed case to strengthen it.'
}

export function validateConfirmPassword(password: string, confirm: string): string | undefined {
  if (!confirm) return 'Confirm your password.'
  if (password !== confirm) return "Passwords don't match."
}

/** Focuses the first field (in DOM order) that has an error. */
export function focusFirstError(form: HTMLFormElement | null) {
  form?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
}
