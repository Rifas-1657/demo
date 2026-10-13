import { Loader2 } from 'lucide-react'
import { BookeyButton } from '@/components/ui-kit/bookey-button'

interface AuthSubmitProps {
  pending: boolean
  label: string
  pendingLabel: string
}

export function AuthSubmit({ pending, label, pendingLabel }: AuthSubmitProps) {
  return (
    <BookeyButton type="submit" size="lg" disabled={pending} aria-disabled={pending} className="w-full">
      {pending && <Loader2 aria-hidden="true" className="animate-spin motion-reduce:animate-none" />}
      <span>{pending ? pendingLabel : label}</span>
    </BookeyButton>
  )
}

export function AuthSwitch({ children }: { children: React.ReactNode }) {
  return <p className="mt-8 text-center text-sm text-ink-muted">{children}</p>
}

export const authLinkClass =
  'rounded font-medium text-primary underline-offset-4 outline-none hover:underline focus-visible:underline focus-visible:ring-4 focus-visible:ring-ring/20'
