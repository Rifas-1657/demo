import { Check } from 'lucide-react'
import { Reveal } from '@/components/landing/reveal'
import { BookeyBadge } from '@/components/ui-kit/bookey-badge'
import { SectionLabel } from '@/components/ui-kit/section-label'
import { cn } from '@/lib/utils'

export interface FeatureChapterProps {
  id: string
  index: string
  label: string
  title: string
  body: string
  points: string[]
  visual: React.ReactNode
  flip?: boolean
  status?: string
}

export function FeatureChapter({ id, index, label, title, body, points, visual, flip, status }: FeatureChapterProps) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-24 py-16 sm:py-24">
      <div className="mx-auto grid max-w-7xl items-center gap-10 px-5 sm:px-8 lg:grid-cols-2 lg:gap-20">
        <Reveal className={cn(flip && 'lg:order-2')}>
          <div className="flex flex-wrap items-center gap-3">
            <SectionLabel index={index}>{label}</SectionLabel>
            {status && <BookeyBadge tone="book">{status}</BookeyBadge>}
          </div>
          <h2 id={`${id}-title`} className="mt-5 text-4xl leading-[1.02] font-semibold tracking-tight text-balance sm:text-5xl">
            {title}
          </h2>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground">{body}</p>
          <ul className="mt-7 space-y-3">
            {points.map((point) => (
              <li key={point} className="flex gap-3">
                <span aria-hidden="true" className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-secondary text-primary">
                  <Check className="size-3" />
                </span>
                <span className="leading-relaxed">{point}</span>
              </li>
            ))}
          </ul>
        </Reveal>
        <Reveal delay={0.1} className={cn(flip && 'lg:order-1')}>
          {visual}
        </Reveal>
      </div>
    </section>
  )
}
