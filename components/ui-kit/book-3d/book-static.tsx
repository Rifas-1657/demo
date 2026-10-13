import { cn } from '@/lib/utils'
import type { Book3DProps } from './types'

/** CSS-only book used on the server, for reduced motion, and when WebGL is unavailable. */
export function BookStatic({ title, author, cover, className }: Pick<Book3DProps, 'title' | 'author' | 'cover' | 'className'>) {
  return (
    <div className={cn('grid place-items-center [perspective:1200px]', className)}>
      <div
        className="relative aspect-[3/4] w-[58%] max-w-64 [transform:rotateY(-18deg)_rotateX(4deg)] [transform-style:preserve-3d]"
        role="img"
        aria-label={`Book cover: ${title} by ${author}`}
      >
        <div
          aria-hidden="true"
          className="absolute inset-y-[2%] -right-[5%] w-[8%] rounded-r-sm"
          style={{ background: 'repeating-linear-gradient(90deg,#fff 0 2px,#f3e9dd 2px 3px)' }}
        />
        <div
          className="@container absolute inset-0 flex flex-col justify-between overflow-hidden rounded-r-md rounded-l-sm p-[10%] shadow-[0_30px_60px_-20px_rgb(31_10_16/0.55)]"
          style={{ background: cover.base, color: cover.text }}
        >
          <div aria-hidden="true" className="absolute inset-y-0 left-0 w-[7%]" style={{ background: cover.spine }} />
          <div aria-hidden="true" className="absolute -top-1/4 -right-1/4 size-3/4 rounded-full opacity-40 blur-2xl" style={{ background: cover.accent }} />
          <span aria-hidden="true" className="relative font-mono text-[10px] tracking-[0.2em] uppercase opacity-80">
            Bookey
          </span>
          <span aria-hidden="true" className="relative">
            <span className="block font-display text-[clamp(0.8rem,11.5cqi,1.25rem)] leading-tight font-bold text-balance">{title}</span>
            <span className="mt-2 block text-xs opacity-80">{author}</span>
          </span>
        </div>
      </div>
    </div>
  )
}
