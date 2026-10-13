import { Bookmark, Flame } from 'lucide-react'
import { SectionLabel } from '@/components/ui-kit/section-label'
import { Reveal } from './reveal'

function ReadingView() {
  return (
    <div data-theme="book" className="flex h-full flex-col rounded-3xl border border-border !bg-book-page p-6 sm:p-8">
      <div className="flex items-center justify-between">
        <p className="font-mono text-xs tracking-[0.18em] text-book-deep uppercase">Reading view</p>
        <Bookmark aria-hidden="true" className="size-4 fill-book-orange text-book-orange" />
      </div>
      <h3 className="mt-6 font-display text-3xl leading-tight font-semibold sm:text-4xl">Functions are recipes you can reuse.</h3>
      <p className="mt-4 max-w-md leading-relaxed text-book-ink/80">
        Give a set of steps a name, and you can run all of them again with a <span className="marker-highlight">single line</span>. Inputs go in,
        a result comes out.
      </p>
      <aside className="mt-auto rounded-2xl border border-border bg-book-paper p-4 text-sm">
        <p className="font-mono text-[11px] tracking-[0.18em] text-book-muted uppercase">Your margin note</p>
        <p className="mt-1.5 font-display text-lg italic">Like a cooking recipe: name it once, use it often.</p>
      </aside>
    </div>
  )
}

function DiagramTile() {
  return (
    <div className="h-full rounded-3xl border border-border bg-card p-6">
      <p className="font-mono text-xs tracking-[0.18em] text-primary uppercase">Live diagram</p>
      <svg viewBox="0 0 320 120" className="mt-4 w-full" role="img" aria-label="Diagram: input flows into a function, which returns an output">
        <rect x="6" y="40" width="74" height="40" rx="12" fill="var(--bk-pink-soft)" />
        <text x="43" y="65" textAnchor="middle" className="fill-ink font-mono text-[12px]">input</text>
        <path d="M84 60h46" stroke="var(--bk-primary)" strokeWidth="2.5" strokeDasharray="5 4" />
        <rect x="134" y="26" width="92" height="68" rx="16" fill="var(--bk-primary)" />
        <text x="180" y="65" textAnchor="middle" className="fill-white font-mono text-[12px]">make_tea()</text>
        <path d="M230 60h40" stroke="var(--bk-primary)" strokeWidth="2.5" />
        <path d="M264 53l8 7-8 7" stroke="var(--bk-primary)" strokeWidth="2.5" fill="none" />
        <circle cx="296" cy="60" r="18" fill="var(--book-marker)" />
        <text x="296" y="64" textAnchor="middle" className="fill-ink font-mono text-[10px]">out</text>
      </svg>
    </div>
  )
}

function CodingTile() {
  return (
    <div className="flex h-full flex-col rounded-3xl bg-book-ink p-6 font-mono text-sm text-book-paper">
      <p className="text-xs tracking-[0.18em] text-brand-pink uppercase">Coding</p>
      <pre className="mt-4 leading-6">
        <span className="text-brand-pink">def</span> <span className="text-book-marker">make_tea</span>(cups):
        {'\n'}    <span className="text-brand-pink">return</span> cups * 2
      </pre>
      <p className="mt-auto pt-4 text-xs text-book-paper/50">{'>'} make_tea(3) → 6</p>
    </div>
  )
}

function ProgressTile() {
  const r = 34
  const c = 2 * Math.PI * r
  return (
    <div className="flex h-full flex-col rounded-3xl border border-border bg-secondary p-6">
      <p className="font-mono text-xs tracking-[0.18em] text-secondary-foreground uppercase">Progress</p>
      <div className="mt-4 flex items-center gap-4">
        <svg viewBox="0 0 80 80" className="size-20 -rotate-90" role="img" aria-label="Example progress: 62 percent of the book complete">
          <circle cx="40" cy="40" r={r} fill="none" stroke="var(--background)" strokeWidth="8" />
          <circle cx="40" cy="40" r={r} fill="none" stroke="var(--bk-primary)" strokeWidth="8" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * 0.38} />
        </svg>
        <div>
          <p className="font-display text-3xl font-semibold">62%</p>
          <p className="flex items-center gap-1 text-sm text-muted-foreground">
            <Flame aria-hidden="true" className="size-4 text-book-orange" /> 5-day streak
          </p>
        </div>
      </div>
      <p className="mt-auto pt-3 text-xs text-muted-foreground">Example data</p>
    </div>
  )
}

export function BentoShowcase() {
  return (
    <section aria-labelledby="bento-title" className="bg-background py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="max-w-2xl">
          <SectionLabel index="06">Inside a book</SectionLabel>
          <h2 id="bento-title" className="mt-5 text-4xl leading-[1.02] font-semibold tracking-tight sm:text-6xl">
            Read, see, code, and keep going.
          </h2>
        </div>
        <div className="mt-14 grid gap-4 md:grid-cols-4 md:grid-rows-2">
          <Reveal className="md:col-span-2 md:row-span-2">
            <ReadingView />
          </Reveal>
          <Reveal className="md:col-span-2" delay={0.06}>
            <DiagramTile />
          </Reveal>
          <Reveal delay={0.12}>
            <CodingTile />
          </Reveal>
          <Reveal delay={0.18}>
            <ProgressTile />
          </Reveal>
        </div>
      </div>
    </section>
  )
}
