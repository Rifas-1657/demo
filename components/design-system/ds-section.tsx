import { SectionLabel } from '@/components/ui-kit/section-label'
import { cn } from '@/lib/utils'

interface DsSectionProps {
  id: string
  index: string
  label: string
  title: string
  description?: string
  children: React.ReactNode
  className?: string
}

export function DsSection({ id, index, label, title, description, children, className }: DsSectionProps) {
  const headingId = `${id}-heading`
  return (
    <section id={id} aria-labelledby={headingId} className={cn('scroll-mt-20 py-16 sm:py-24', className)}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] md:items-end">
          <div className="space-y-4">
            <SectionLabel index={index}>{label}</SectionLabel>
            <h2 id={headingId} className="text-3xl font-bold sm:text-4xl">
              {title}
            </h2>
          </div>
          {description && <p className="max-w-xl leading-relaxed text-muted-foreground md:justify-self-end">{description}</p>}
        </div>
        {children}
      </div>
    </section>
  )
}
