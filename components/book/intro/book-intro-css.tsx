'use client'

interface BookIntroCssProps {
  title: string
  subtitle?: string
  /** When false the book idles closed (used while the 3D scene loads). */
  playing?: boolean
  onComplete?: () => void
}

const FAN_PAGES = [0, 1, 2, 3]

/** Lightweight CSS 3D book used on mobile, low-power devices, and whenever WebGL is unavailable. */
export function BookIntroCss({ title, subtitle, playing = true, onComplete }: BookIntroCssProps) {
  return (
    <div className="intro-stage" data-playing={playing} aria-hidden="true">
      <div className="intro-book">
        <div className="intro-back" />
        <div className="intro-block" />
        {FAN_PAGES.map((i) => (
          <div key={i} className="intro-page" style={{ '--i': i } as React.CSSProperties} />
        ))}
        <div className="intro-cover">
          <div className="intro-cover-front">
            <span className="font-display text-[0.6rem] font-semibold tracking-[0.4em] text-[#7c2d12]/80">BOOKEY</span>
            <span className="intro-emboss font-display text-xl leading-tight font-extrabold text-balance sm:text-2xl">
              {title}
            </span>
            {subtitle ? <span className="text-xs font-medium text-[#7c2d12]/75">{subtitle}</span> : <span />}
            <span className="intro-sweep" />
          </div>
          <div className="intro-cover-back" />
        </div>
      </div>
      <div className="intro-burst" onAnimationEnd={(event) => event.target === event.currentTarget && onComplete?.()} />
    </div>
  )
}
