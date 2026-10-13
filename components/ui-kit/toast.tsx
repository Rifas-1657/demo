'use client'

import { toast } from 'sonner'
import { Toaster } from '@/components/ui/sonner'

export function BookeyToaster() {
  return <Toaster theme="light" position="top-center" richColors={false} closeButton />
}

export const notify = {
  success: (message: string, description?: string) => toast.success(message, { description }),
  error: (message: string, description?: string) => toast.error(message, { description }),
  info: (message: string, description?: string) => toast.info(message, { description }),
  /** For fake/mock actions — always make clear nothing reached a server. */
  demo: (message: string, description = 'Demo only — saved in this browser, not on a server.') =>
    toast(message, { description }),
}
