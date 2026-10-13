import { ArrowUpRight } from 'lucide-react'
import Link from 'next/link'
import { BookStatic } from '@/components/ui-kit/book-3d/book-static'
import { SectionLabel } from '@/components/ui-kit/section-label'
import { ROUTES, SPOTLIGHT_COURSES } from './data'
import { Reveal } from './reveal'

export function CourseSpotlights() {
  return (
    <section id="courses" aria-labelledby="courses-title" className="scroll-mt-24 bg-secondary/40 py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <SectionLabel index="05">Course spotlights</SectionLabel>
            <h2 id="courses-title" className="mt-5 text-4xl leading-[1.02] font-semibold tracking-tight sm:text-6xl">
              Start with a book on the shelf.
            </h2>
            <p className="mt-4 text-sm text-muted-foreground">Demo courses that show what a Bookey book looks like.</p>
          </div>
          <Link href={ROUTES.courses} className="group inline-flex items-center gap-1.5 font-medium text-primary hover:underline">
            Browse all courses
            <ArrowUpRight aria-hidden="true" className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </div>

        <ul className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {SPOTLIGHT_COURSES.map((course, i) => (
            <Reveal as="li" key={course.slug} delay={i * 0.07}>
              <Link
                href={ROUTES.courses}
                className="group flex h-full flex-col rounded-3xl border border-border bg-card p-5 transition-[transform,box-shadow] duration-500 hover:-translate-y-1.5 hover:shadow-[0_40px_70px_-40px_rgb(159_18_57/0.55)] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <div className="grid aspect-[4/5] place-items-center rounded-2xl bg-[radial-gradient(circle_at_50%_40%,var(--bk-blush),transparent_75%)] [perspective:900px]">
                  <BookStatic
                    title={course.title}
                    author={course.author}
                    cover={course.cover}
                    className="w-full transition-transform duration-700 ease-out group-hover:[transform:rotateY(-14deg)_translateY(-6px)]"
                  />
                </div>
                <div className="mt-5 flex items-center gap-2 text-xs">
                  <span className="rounded-full bg-secondary px-2.5 py-1 font-medium text-secondary-foreground">{course.difficulty}</span>
                  <span className="text-muted-foreground">{course.chapters} chapters</span>
                  <span className="ml-auto rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground">Demo</span>
                </div>
                <h3 className="mt-3 text-xl font-semibold">{course.title}</h3>
                <p className="mt-1.5 flex-1 text-sm leading-relaxed text-muted-foreground">{course.blurb}</p>
                <span className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-primary">
                  Preview course
                  <ArrowUpRight aria-hidden="true" className="size-4" />
                </span>
              </Link>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  )
}
