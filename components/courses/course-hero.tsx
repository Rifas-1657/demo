import { BookOpen, Clock, Code2, Layers, Signal } from 'lucide-react'
import { Book3D } from '@/components/ui-kit/book-3d/book-3d'
import { formatMinutes, getCoursePosition, getTotalMinutes, type LearningCourse } from '@/lib/mock/learning'
import { getCourseStatus } from './course-meta'
import { CourseStartButton } from './course-start-button'

export function CourseHero({ course }: { course: LearningCourse }) {
  const { totalPages } = getCoursePosition(course)
  const status = getCourseStatus(course)

  const facts = [
    { icon: Code2, label: 'Language', value: course.language },
    { icon: Signal, label: 'Level', value: course.level },
    { icon: Layers, label: 'Chapters', value: `${course.chapters.length} chapters` },
    { icon: BookOpen, label: 'Pages', value: `${totalPages} pages` },
    { icon: Clock, label: 'Study time', value: `About ${formatMinutes(getTotalMinutes(course))}` },
  ]

  return (
    <section
      aria-labelledby="course-title"
      className="relative isolate overflow-hidden rounded-3xl bg-[image:var(--bk-night-gradient)] text-[#FFF1F3]"
    >
      <div
        aria-hidden="true"
        className="absolute -top-32 right-0 -z-10 size-[28rem] rounded-full opacity-60 blur-3xl"
        style={{ background: `radial-gradient(circle, ${course.cover.base}, transparent 70%)` }}
      />
      <div className="grid items-center gap-6 p-6 sm:p-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:gap-10">
        <div className="order-2 space-y-6 lg:order-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[#FB7185] px-3 py-1 font-mono text-[11px] font-semibold tracking-[0.14em] text-[#12040A] uppercase">
              {course.language}
            </span>
            <span className="rounded-full border border-white/20 px-3 py-1 text-xs font-medium">{course.category}</span>
            <span className="rounded-full border border-white/20 px-3 py-1 text-xs font-medium">{status.label}</span>
          </div>

          <div className="space-y-3">
            <h1 id="course-title" className="font-display text-4xl font-bold tracking-tight text-balance sm:text-5xl">
              {course.title}
            </h1>
            <p className="max-w-xl text-base leading-relaxed text-pretty text-[#E4B6BF] sm:text-lg">{course.description}</p>
          </div>

          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
            {facts.map(({ icon: Icon, label, value }) => (
              <div key={label} className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <dt className="flex items-center gap-1.5 text-[11px] tracking-wide text-[#E4B6BF] uppercase">
                  <Icon aria-hidden="true" className="size-3.5 text-[#FB7185]" />
                  {label}
                </dt>
                <dd className="mt-1 text-sm font-semibold">{value}</dd>
              </div>
            ))}
          </dl>

          <CourseStartButton course={course} />
        </div>

        <div className="order-1 mx-auto w-full max-w-72 lg:order-2 lg:max-w-none">
          <Book3D title={course.title} author={course.author} cover={course.cover} />
        </div>
      </div>
    </section>
  )
}
