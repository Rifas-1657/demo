import { DemoNotice } from './demo-notice'
import { PageHero } from './page-hero'

export interface LegalSection {
  id: string
  title: string
  body: React.ReactNode
}

interface LegalDocumentProps {
  eyebrow: string
  title: string
  lead: string
  updated: string
  sections: LegalSection[]
}

/** Shared layout for draft legal pages: hero, draft warning, sticky contents, and numbered sections. */
export function LegalDocument({ eyebrow, title, lead, updated, sections }: LegalDocumentProps) {
  return (
    <>
      <PageHero size="compact" eyebrow={eyebrow} title={title} lead={lead}>
        <p className="font-mono text-xs tracking-[0.14em] text-[#FFF1F3]/55 uppercase">Draft version · {updated}</p>
      </PageHero>

      <div className="mx-auto grid max-w-6xl gap-12 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[15rem_1fr] lg:gap-20">
        <nav aria-label="Contents" className="lg:sticky lg:top-28 lg:self-start">
          <p className="mb-4 font-mono text-[11px] tracking-[0.16em] text-muted-foreground uppercase">Contents</p>
          <ol className="space-y-1 border-l border-border text-sm">
            {sections.map((s, i) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className="-ml-px flex gap-3 border-l border-transparent py-1.5 pl-4 text-muted-foreground transition-colors hover:border-primary hover:text-foreground focus-visible:border-primary focus-visible:text-foreground focus-visible:outline-none"
                >
                  <span className="font-mono text-xs text-primary tabular-nums">{String(i + 1).padStart(2, '0')}</span>
                  {s.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <article className="min-w-0">
          <DemoNotice title="Prototype draft — replace with reviewed legal text before public launch.">
            This page is a structural draft written in plain language. It is not legal advice and has not been reviewed by a
            lawyer.
          </DemoNotice>
          <div className="mt-12 space-y-14">
            {sections.map((s, i) => (
              <section key={s.id} id={s.id} aria-labelledby={`${s.id}-title`} className="scroll-mt-28">
                <h2 id={`${s.id}-title`} className="flex items-baseline gap-4 text-2xl font-semibold tracking-tight sm:text-3xl">
                  <span className="font-mono text-sm text-primary tabular-nums">{String(i + 1).padStart(2, '0')}</span>
                  {s.title}
                </h2>
                <div className="mt-4 max-w-[68ch] space-y-4 leading-relaxed text-muted-foreground [&_li]:pl-1 [&_strong]:text-foreground [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5">
                  {s.body}
                </div>
              </section>
            ))}
          </div>
        </article>
      </div>
    </>
  )
}
