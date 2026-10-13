import type { Metadata } from 'next'
import { AuthHeading } from '@/components/auth/auth-heading'
import { LoginForm } from '@/components/auth/login-form'

export const metadata: Metadata = {
  title: 'Log in',
  description: 'Log in to Bookey and pick up your course where you left the page.',
}

export default function LoginPage() {
  return (
    <>
      <AuthHeading eyebrow="Welcome back" title="Log in to Bookey" description="Pick up your course right where you left the page." />
      <LoginForm />
    </>
  )
}
