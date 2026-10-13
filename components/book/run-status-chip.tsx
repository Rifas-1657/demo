import { cn } from '@/lib/utils'
import type { LabStatus } from './use-code-lab'

const chip: Record<LabStatus | 'revealing', { label: string; className: string; dot: string }> = {
  ready: { label: 'Ready', className: 'bg-white/8 text-[#e9d9b5]', dot: 'bg-[#a8956f]' },
  revealing: { label: 'Revealing', className: 'bg-book-marker/15 text-book-marker', dot: 'bg-book-marker animate-pulse' },
  running: { label: 'Running', className: 'bg-book-orange/20 text-[#fdba74]', dot: 'bg-book-orange animate-pulse' },
  'awaiting-input': { label: 'Running · input', className: 'bg-book-orange/20 text-[#fdba74]', dot: 'bg-book-marker' },
  done: { label: 'Done', className: 'bg-[#c5e1a5]/15 text-[#c5e1a5]', dot: 'bg-[#c5e1a5]' },
  error: { label: 'Error', className: 'bg-[#fca5a5]/15 text-[#fca5a5]', dot: 'bg-[#fca5a5]' },
}

export function RunStatusChip({ status, streaming = false }: { status: LabStatus; streaming?: boolean }) {
  const { label, className, dot } = chip[streaming ? 'revealing' : status]
  return (
    <span
      role="status"
      className={cn('inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[0.6875rem] font-medium', className)}
    >
      <span aria-hidden="true" className={cn('size-1.5 rounded-full motion-reduce:animate-none', dot)} />
      {label}
    </span>
  )
}
