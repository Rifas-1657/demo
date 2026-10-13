import { SectionLabel } from '@/components/ui-kit/section-label'
import { Reveal } from './reveal'

function UploadArt() {
  return (
    <svg viewBox="0 0 200 140" className="w-full" aria-hidden="true">
      <rect x="30" y="22" width="140" height="84" rx="14" fill="var(--bk-surface)" stroke="var(--border)" strokeWidth="2" />
      <rect x="44" y="36" width="112" height="56" rx="8" fill="var(--bk-night)" />
      <path d="M94 54v20l16-10z" fill="var(--bk-pink)" />
      <path d="M100 128v-30m0 0-10 10m10-10 10 10" stroke="var(--bk-primary)" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="156" cy="30" r="12" fill="var(--book-marker)" />
      <path d="M151 30h10M156 25v10" stroke="var(--book-ink)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function PersonalizeArt() {
  return (
    <svg viewBox="0 0 200 140" className="w-full" aria-hidden="true">
      {[38, 70, 102].map((y, i) => (
        <g key={y}>
          <rect x="34" y={y - 2} width="132" height="4" rx="2" fill="var(--border)" />
          <rect x="34" y={y - 2} width={[96, 52, 118][i]} height="4" rx="2" fill="var(--bk-primary)" />
          <circle cx={34 + [96, 52, 118][i]} cy={y} r="9" fill="var(--bk-surface)" stroke="var(--bk-primary)" strokeWidth="3" />
        </g>
      ))}
      <rect x="58" y="116" width="40" height="16" rx="8" fill="var(--bk-pink-soft)" />
      <rect x="104" y="116" width="40" height="16" rx="8" fill="var(--bk-primary)" />
    </svg>
  )
}

function OpenBookArt() {
  return (
    <svg viewBox="0 0 200 140" className="w-full" aria-hidden="true">
      <ellipse cx="100" cy="122" rx="74" ry="8" fill="var(--bk-ink)" opacity="0.08" />
      <path d="M100 40c-20-14-46-16-70-10v80c24-6 50-4 70 10z" fill="var(--book-paper)" stroke="var(--book-amber)" strokeWidth="2" />
      <path d="M100 40c20-14 46-16 70-10v80c-24-6-50-4-70 10z" fill="var(--book-page)" stroke="var(--book-amber)" strokeWidth="2" />
      <path d="M100 40v80" stroke="var(--book-deep)" strokeWidth="2" />
      {[56, 68, 80].map((y) => (
        <path key={y} d={`M42 ${y}c16-3 34-2 46 4`} stroke="var(--book-ink)" strokeOpacity="0.25" strokeWidth="3" fill="none" strokeLinecap="round" />
      ))}
      <path d="M116 62h36M116 76h26" stroke="var(--book-orange)" strokeWidth="3" strokeLinecap="round" />
      <circle cx="100" cy="24" r="14" fill="var(--book-marker)" opacity="0.5" />
      <circle cx="100" cy="24" r="6" fill="var(--book-amber)" />
    </svg>
  )
}

function LearnArt() {
  return (
    <svg viewBox="0 0 200 140" className="w-full" aria-hidden="true">
      <rect x="22" y="26" width="96" height="70" rx="12" fill="var(--book-ink)" />
      <path d="M36 46h30M36 60h48M36 74h22" stroke="var(--book-paper)" strokeOpacity="0.7" strokeWidth="4" strokeLinecap="round" />
      <path d="M36 46h8" stroke="var(--bk-pink)" strokeWidth="4" strokeLinecap="round" />
      <rect x="96" y="58" width="84" height="54" rx="14" fill="var(--bk-surface)" stroke="var(--border)" strokeWidth="2" />
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <rect key={i} x={110 + i * 9} y={85 - [6, 12, 18, 10, 16, 8, 4][i]} width="4" height={[6, 12, 18, 10, 16, 8, 4][i] * 2} rx="2" fill="var(--bk-primary)" />
      ))}
      <circle cx="170" cy="40" r="10" fill="var(--bk-primary)" />
      <path d="M166 40l3 3 6-6" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

const STEPS = [
  { title: 'Choose a source', body: 'Upload a lecture, a long tutorial, or a recorded conversation — or pick a ready-made course.', Art: UploadArt, tint: 'bg-card' },
  { title: 'Make it yours', body: 'Set your level, pace, and goals so the book explains at the depth you need.', Art: PersonalizeArt, tint: 'bg-secondary/60' },
  { title: 'Open your book', body: 'The source becomes chapters and short pages, with the key moments kept and the filler cut.', Art: OpenBookArt, tint: 'bg-book-paper' },
  { title: 'Learn by doing', body: 'Listen, ask, watch diagrams draw, and run code until each idea actually clicks.', Art: LearnArt, tint: 'bg-card' },
]

export function HowItWorks() {
  return (
    <section id="how-it-works" aria-labelledby="how-title" className="scroll-mt-24 bg-background py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <SectionLabel index="02">How it works</SectionLabel>
            <h2 id="how-title" className="mt-5 text-4xl leading-[1.02] font-semibold tracking-tight sm:text-6xl">
              One source. A whole learning experience.
            </h2>
          </div>
          <p className="max-w-sm text-muted-foreground">Four steps from something you would have skimmed to something you actually understand.</p>
        </div>

        <ol className="relative mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div aria-hidden="true" className="absolute top-[5.5rem] right-[12%] left-[12%] hidden border-t-2 border-dashed border-primary/25 lg:block" />
          {STEPS.map(({ title, body, Art, tint }, i) => (
            <Reveal as="li" key={title} delay={i * 0.08} className="relative">
              <div className={`flex h-full flex-col rounded-3xl border border-border p-5 ${tint}`}>
                <div className="relative overflow-hidden rounded-2xl bg-background/60 p-3">
                  <Art />
                </div>
                <p className="mt-6 font-mono text-xs tracking-[0.18em] text-primary">STEP {String(i + 1).padStart(2, '0')}</p>
                <h3 className="mt-2 text-2xl font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
              </div>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  )
}
