import { DsSection } from './ds-section'

const SCALE = [
  { token: 'Display / 72', className: 'text-5xl sm:text-7xl font-extrabold leading-[0.95]', sample: 'Read deeper.' },
  { token: 'H1 / 48', className: 'text-4xl sm:text-5xl font-bold', sample: 'Ten minutes a day' },
  { token: 'H2 / 36', className: 'text-3xl sm:text-4xl font-bold', sample: 'Chapter two: Feedback loops' },
  { token: 'H3 / 24', className: 'text-2xl font-semibold', sample: 'Reinforcing vs. balancing' },
]

export function TypographySection() {
  return (
    <DsSection
      id="typography"
      index="01"
      label="Typography"
      title="Editorial headings, quiet body."
      description="Bricolage Grotesque carries display moments, Inter handles reading, JetBrains Mono labels data. Body copy stays under 70 characters per line."
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <ul className="divide-y divide-border rounded-3xl border bg-card">
          {SCALE.map((row) => (
            <li key={row.token} className="flex flex-col gap-2 p-6 sm:flex-row sm:items-baseline sm:gap-8">
              <span className="w-28 shrink-0 font-mono text-xs text-muted-foreground">{row.token}</span>
              <span className={`font-display text-balance ${row.className}`}>{row.sample}</span>
            </li>
          ))}
        </ul>
        <div className="flex flex-col gap-6">
          <div className="rounded-3xl border bg-card p-6">
            <p className="mb-3 font-mono text-xs text-muted-foreground">Body / Inter 16–18</p>
            <p className="text-lg leading-relaxed">
              A stock changes only through its inflows and outflows. Most surprises in a system come from forgetting
              that a flow exists at all.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Secondary copy uses the muted ink token and never drops below 14px.
            </p>
          </div>
          <div className="rounded-3xl border bg-card p-6">
            <p className="mb-3 font-mono text-xs text-muted-foreground">Mono / JetBrains</p>
            <code className="font-mono text-sm">page_systems_1_1 · 5 min · reading</code>
          </div>
        </div>
      </div>
    </DsSection>
  )
}
