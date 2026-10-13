import type { Metadata } from 'next'
import { AuthHeading } from '@/components/auth/auth-heading'
import { SignupForm } from '@/components/auth/signup-form'

export const metadata: Metadata = {
  title: 'Sign up',
  description: 'Create your Bookey profile and start learning one interactive page at a time.',
}

export default function SignupPage() {
  return (
    <>
      <AuthHeading eyebrow="Start reading" title="Create your Bookey profile" description="Guided pages, small exercises, and a few minutes a day." />
      <SignupForm />
    </>
  )
}
