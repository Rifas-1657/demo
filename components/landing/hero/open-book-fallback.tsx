import { cn } from '@/lib/utils'

function PageLines({ count, className }: { count: number; className?: string }) {
  return (
    <div aria-hidden="true" className={cn('flex flex-col gap-[0.55em]', className)}>
      {Array.from({ length: count }, (_, i) => (
        <span key={i} className="block h-[0.32em] rounded-full bg-book-ink/20" style={{ width: `${i % 4 === 3 ? 58 : 92}%` }} />
      ))}
    </div>
  )
}

/** Pure-CSS open book used without WebGL, under reduced motion, and before the 3D scene loads. */
export function OpenBookFallback({ className }: { className?: string }) {
  return (
    <div className={cn('grid place-items-center [perspective:1600px]', className)} role="img" aria-label="An open Bookey book glowing softly">
      <div className="relative aspect-[1.5/1] w-[min(82%,560px)] [transform:rotateX(50deg)_rotateZ(-12deg)] [transform-style:preserve-3d] text-[clamp(8px,1.1vw,14px)]">
        <div aria-hidden="true" className="absolute -inset-[4%] rounded-[1.2em] bg-[#5B0F1F] shadow-[0_60px_80px_-20px_rgb(0_0_0/0.7)] [transform:translateZ(-14px)]" />
        <div aria-hidden="true" className="absolute -inset-[1%] rounded-[0.8em] bg-[#F3E6C8] [transform:translateZ(-6px)]" />
        <div className="absolute inset-y-0 left-0 w-1/2 origin-right rounded-l-[0.6em] bg-[linear-gradient(90deg,#FFF8E4_0%,#FFFBEB_80%,#EADBB8_100%)] p-[9%] [transform:rotateY(10deg)]">
          <p className="font-mono text-[0.75em] tracking-[0.2em] text-book-deep uppercase">Chapter 03</p>
          <p className="mt-[0.6em] font-display text-[1.7em] leading-[1.05] font-bold text-book-ink">Loops that repeat for you</p>
          <PageLines count={6} className="mt-[1.4em]" />
        </div>
        <div className="absolute inset-y-0 right-0 w-1/2 origin-left rounded-r-[0.6em] bg-[linear-gradient(90deg,#EADBB8_0%,#FFFBEB_20%,#FFF8E4_100%)] p-[9%] [transform:rotateY(-10deg)]">
          <p className="font-mono text-[0.75em] tracking-[0.2em] text-book-deep uppercase">Try it</p>
          <div className="mt-[0.8em] rounded-[0.6em] bg-book-ink p-[0.9em] font-mono text-[0.85em] leading-relaxed text-book-paper">
            <span className="text-brand-pink">for</span> item <span className="text-brand-pink">in</span>{' '}
            <span className="text-book-marker">items</span>:
            <br />
            {'  '}print(item)
          </div>
          <PageLines count={4} className="mt-[1.2em]" />
        </div>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-1/2 size-[70%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgb(253_186_116/0.55),transparent_65%)] mix-blend-screen blur-xl [transform:translateZ(40px)]"
        />
      </div>
    </div>
  )
}
