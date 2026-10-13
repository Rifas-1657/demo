import { DsSection } from './ds-section'

interface Swatch {
  name: string
  token: string
  hex: string
  dark?: boolean
}

const APP: Swatch[] = [
  { name: 'Blush', token: '--bk-blush', hex: '#FFF7F8' },
  { name: 'Surface', token: '--bk-surface', hex: '#FFFFFF' },
  { name: 'Primary', token: '--bk-primary', hex: '#E11D48', dark: true },
  { name: 'Deep primary', token: '--bk-primary-deep', hex: '#9F1239', dark: true },
  { name: 'Pink', token: '--bk-pink', hex: '#FB7185' },
  { name: 'Soft pink', token: '--bk-pink-soft', hex: '#FFE4E6' },
  { name: 'Ink', token: '--bk-ink', hex: '#1F0A10', dark: true },
  { name: 'Muted', token: '--bk-muted', hex: '#7A5560', dark: true },
]

const BOOK: Swatch[] = [
  { name: 'Paper', token: '--book-paper', hex: '#FFFBEB' },
  { name: 'Page', token: '--book-page', hex: '#FFFFFF' },
  { name: 'Marker', token: '--book-marker', hex: '#FACC15' },
  { name: 'Amber', token: '--book-amber', hex: '#F59E0B' },
  { name: 'Orange', token: '--book-orange', hex: '#F97316' },
  { name: 'Deep orange', token: '--book-deep', hex: '#C2410C', dark: true },
  { name: 'Book ink', token: '--book-ink', hex: '#292013', dark: true },
]

function SwatchGrid({ swatches }: { swatches: Swatch[] }) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {swatches.map((swatch) => (
        <li key={swatch.token} className="overflow-hidden rounded-2xl border bg-card">
          <div
            className="flex h-20 items-end p-3 font-mono text-[11px]"
            style={{ background: `var(${swatch.token})`, color: swatch.dark ? '#ffffff' : '#1F0A10' }}
          >
            {swatch.hex}
          </div>
          <div className="p-3">
            <p className="text-sm font-medium">{swatch.name}</p>
            <p className="truncate font-mono text-[11px] text-muted-foreground">{swatch.token}</p>
          </div>
        </li>
      ))}
    </ul>
  )
}

export function ColorsSection() {
  return (
    <DsSection
      id="colors"
      index="02"
      label="Color"
      title="Two themes, never mixed."
      description="The rose app theme is the default everywhere. The warm book theme activates only inside an element with data-theme=&quot;book&quot; — the reader canvas."
    >
      <div className="space-y-10">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">App theme</h3>
          <SwatchGrid swatches={APP} />
        </div>

        <div className="theme-night relative isolate overflow-hidden rounded-3xl bg-night-gradient p-6 sm:p-10">
          <div aria-hidden="true" className="bloom-pink absolute inset-0 -z-10" />
          <p className="font-mono text-xs text-muted-foreground">.theme-night · #3B0A14 → #12040A</p>
          <p className="mt-3 max-w-lg font-display text-2xl font-semibold text-balance sm:text-3xl">
            Deep burgundy sections keep the pink bloom restrained and the type bright.
          </p>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Book reader theme</h3>
          <SwatchGrid swatches={BOOK} />
          <div data-theme="book" className="rounded-3xl border p-6 sm:p-8">
            <p className="font-mono text-xs text-muted-foreground">data-theme=&quot;book&quot; scope</p>
            <p className="mt-3 max-w-2xl font-serif text-lg leading-relaxed">
              Every context switch leaves{' '}
              <mark className="marker-highlight bg-transparent text-inherit">attention residue</mark>: part of your mind
              stays with the previous task for minutes after you move on.
            </p>
          </div>
        </div>
      </div>
    </DsSection>
  )
}
