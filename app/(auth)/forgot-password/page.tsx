import type { Metadata } from 'next'
import { AuthHeading } from '@/components/auth/auth-heading'
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form'

export const metadata: Metadata = {
  title: 'Forgot password',
  description: 'Request a Bookey password reset link.',
}

export default function ForgotPasswordPage() {
  return (
    <>
      <AuthHeading
        eyebrow="Account help"
        title="Reset your password"
        description="Enter the email you use for Bookey and we'll walk you through the next step."
      />
      <ForgotPasswordForm />
    </>
  )
}
