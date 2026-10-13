import { GrainOverlay } from '@/components/ui-kit/grain-overlay'
import { MagneticButton } from '@/components/ui-kit/magnetic-button'
import { RevealText } from '@/components/ui-kit/reveal-text'
import { SectionLabel } from '@/components/ui-kit/section-label'
import { BookStatic } from '@/components/ui-kit/book-3d/book-static'
import { learningCourses } from '@/lib/mock/learning'
import { ScrollScene } from './scroll-scene'

const PRINCIPLES = [
  { title: 'Guide, don’t decorate', body: 'Motion points to the next action. Most elements never move.' },
  { title: 'Reduced motion first', body: 'Every effect degrades to a static, fully readable layout.' },
  { title: 'Desktop-only flourishes', body: 'Magnetic and scroll scenes switch off for touch and coarse pointers.' },
]

export function MotionSection() {
  const fallbackCourse = learningCourses[1]
  return (
    <section
      id="motion"
      aria-labelledby="motion-heading"
      className="theme-night relative isolate scroll-mt-20 overflow-hidden bg-night-gradient py-20 sm:py-28"
    >
      <div aria-hidden="true" className="bloom-pink absolute inset-0 -z-10" />
      <GrainOverlay opacity={0.08} className="mix-blend-overlay" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionLabel index="06">Motion</SectionLabel>
        <h2 id="motion-heading" className="mt-4 max-w-3xl text-4xl font-bold sm:text-5xl">
          <RevealText text="Cinematic when it counts, calm everywhere else." />
        </h2>

        <ScrollScene>
          {PRINCIPLES.map((p) => (
            <li key={p.title} data-scene-item className="rounded-3xl border bg-card/60 p-6 backdrop-blur-sm">
              <h3 className="text-lg font-semibold">{p.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.body}</p>
            </li>
          ))}
        </ScrollScene>

        <div className="mt-12 grid items-center gap-8 md:grid-cols-2">
          <div className="space-y-4">
            <h3 className="text-xl font-semibold">Static book fallback</h3>
            <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
              The 3D book in the hero lazy-loads WebGL only when visible and pauses off-screen. This CSS version is what
              reduced-motion users, no-WebGL devices, and the server render see.
            </p>
            <MagneticButton variant="primary">Magnetic on desktop</MagneticButton>
          </div>
          <BookStatic
            title={fallbackCourse.title}
            author={fallbackCourse.author}
            cover={fallbackCourse.cover}
            className="aspect-[4/3] w-full"
          />
        </div>
      </div>
    </section>
  )
}
