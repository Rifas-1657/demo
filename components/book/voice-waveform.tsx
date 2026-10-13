import { cn } from '@/lib/utils'
import type { NarrationStatus } from '@/types/book'

export const WAVEFORM_BARS = 40

/** Deterministic pseudo-random level in [0,1); seeded so every render of a word looks the same. */
function noise(bar: number, seed: number) {
  const x = Math.sin(bar * 12.9898 + seed * 78.233) * 43758.5453
  return x - Math.floor(x)
}

export function fakeLevel(bar: number, seed: number) {
  const envelope = 0.5 + 0.5 * Math.sin((bar / (WAVEFORM_BARS - 1)) * Math.PI)
  return 0.18 + 0.82 * noise(bar, seed) * envelope
}

interface VoiceWaveformProps {
  status: NarrationStatus
  /** Changes per spoken word; drives the fake levels. */
  seed: number
  className?: string
}

/** Decorative 40-bar meter driven by fake levels — it does not analyse any audio. */
export function VoiceWaveform({ status, seed, className }: VoiceWaveformProps) {
  const looping = status === 'listening' || status === 'thinking'

  return (
    <div aria-hidden="true" className={cn('flex h-7 items-center gap-px sm:gap-[2px]', className)}>
      {Array.from({ length: WAVEFORM_BARS }, (_, bar) => {
        const scale =
          status === 'speaking'
            ? fakeLevel(bar, seed)
            : status === 'paused'
              ? fakeLevel(bar, seed) * 0.35 + 0.06
              : looping
                ? 1
                : 0.12
        return (
          <span
            key={bar}
            className={cn(
              'h-full w-px shrink-0 origin-center rounded-full transition-transform duration-200 ease-out sm:w-[2px]',
              status === 'speaking' || looping
                ? 'bg-gradient-to-t from-book-orange to-book-marker'
                : 'bg-book-amber/45',
              looping && 'motion-safe:animate-[landing-wave_1.1s_ease-in-out_infinite]',
              looping && status === 'thinking' && 'opacity-70',
            )}
            style={{
              transform: looping ? undefined : `scaleY(${scale.toFixed(3)})`,
              animationDelay: looping ? `${((bar * (status === 'thinking' ? 45 : 97)) % 1100) - 1100}ms` : undefined,
            }}
          />
        )
      })}
    </div>
  )
}
