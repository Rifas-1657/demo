'use client'

import { AnimatePresence, MotionConfig, motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Sparkles, X } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { useCourseSurvey } from '@/components/courses/use-course-survey'
import { BookeyButton } from '@/components/ui-kit/bookey-button'
import { BookeyLogo } from '@/components/ui-kit/bookey-logo'
import type { LearningCourse } from '@/lib/mock/learning'
import { easeOutExpo } from '@/lib/motion'
import { usePersonalization, type Personalization } from '@/lib/stores/personalization'
import { cn } from '@/lib/utils'
import { useBookClient } from '@/lib/book-client/react'
import { BookPreview } from './book-preview'
import { MultiChoice, OptionalChips, SingleChoice, ToggleList } from './choice-controls'
import { PreparationScreen } from './preparation-screen'
import {
  accessibilityChoices,
  draftFromPersonalization,
  finalizeDraft,
  genreChoices,
  getVisibleSteps,
  interestChoices,
  labelFor,
  languageChoices,
  levelChoices,
  paceChoices,
  stepMeta,
  styleChoices,
  validateStep,
  type StepId,
  type SurveyDraft,
} from './survey-config'

export function SurveyWizard({ course }: { course: LearningCourse }) {
  const { personalization, completed, save } = usePersonalization(course.id)
  const { saveSurvey } = useCourseSurvey(course)
  const client = useBookClient()

  const [draft, setDraft] = useState<SurveyDraft>(() => draftFromPersonalization(personalization, completed))
  const [current, setCurrent] = useState<StepId>('level')
  const [direction, setDirection] = useState<1 | -1>(1)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState<Personalization | null>(null)
  const [navigated, setNavigated] = useState(false)

  const formRef = useRef<HTMLFormElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)

  const steps = getVisibleSteps(draft)
  const index = Math.max(0, steps.indexOf(current))
  const meta = stepMeta[current]
  const isLast = index === steps.length - 1
  const large = draft.accessibility.largerText

  useEffect(() => {
    if (navigated) headingRef.current?.focus()
  }, [current, navigated])

  function update(patch: Partial<SurveyDraft>) {
    setDraft((previous) => ({ ...previous, ...patch }))
    setError(null)
  }

  function goTo(step: StepId, dir: 1 | -1) {
    setDirection(dir)
    setError(null)
    setNavigated(true)
    setCurrent(step)
  }

  function handleBack() {
    if (index > 0) goTo(steps[index - 1], -1)
  }

  function handleContinue(event: React.FormEvent) {
    event.preventDefault()
    const message = validateStep(current, draft)
    if (message) {
      setError(message)
      formRef.current?.querySelector<HTMLElement>('[data-first-field]')?.focus()
      return
    }
    if (!isLast) {
      goTo(steps[index + 1], 1)
      return
    }
    const result = finalizeDraft(draft)
    if (!result) return
    save(result)
    saveSurvey(toSurveyAnswers(result))
    client.submitSurvey({ courseId: course.id, answers: toWireAnswers(result) })
    setSubmitted(result)
  }

  return (
    <MotionConfig reducedMotion={draft.accessibility.reducedMotion ? 'always' : 'user'}>
      <div className="flex min-h-dvh flex-col bg-background">
        <SurveyHeader course={course} step={submitted ? null : { index, total: steps.length }} />

        {submitted ? (
          <div className="flex flex-1 px-4 sm:px-6 lg:px-10">
            <PreparationScreen
              courseId={course.id}
              courseTitle={course.title}
              summary={buildSummary(submitted)}
              onEdit={() => {
                setSubmitted(null)
                setDirection(-1)
                setNavigated(true)
                setCurrent('level')
              }}
            />
          </div>
        ) : (
          <form
            ref={formRef}
            onSubmit={handleContinue}
            onKeyDown={(event) => {
              if (event.key !== 'Enter' || event.nativeEvent.isComposing || event.keyCode === 229) return
              if ((event.target as HTMLElement).closest('button, a')) return
              event.preventDefault()
              formRef.current?.requestSubmit()
            }}
            noValidate
            className="flex flex-1 flex-col"
          >
            <div className="grid flex-1 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
              <div className="flex flex-col justify-center px-4 py-8 sm:px-8 lg:px-14 lg:py-12">
                <div className="mx-auto w-full max-w-2xl overflow-x-clip">
                  <AnimatePresence mode="wait" custom={direction} initial={false}>
                    <motion.section
                      key={current}
                      custom={direction}
                      variants={{
                        enter: (dir: number) => ({ opacity: 0, x: dir * 48 }),
                        center: { opacity: 1, x: 0 },
                        exit: (dir: number) => ({ opacity: 0, x: dir * -48 }),
                      }}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      transition={{ duration: 0.45, ease: easeOutExpo }}
                      aria-labelledby="survey-question"
                      className="flex flex-col gap-8"
                    >
                      <div className="flex flex-col gap-3">
                        <p className="flex items-center gap-2 font-mono text-[11px] tracking-[0.18em] text-primary uppercase">
                          <span>
                            {String(index + 1).padStart(2, '0')} / {String(steps.length).padStart(2, '0')}
                          </span>
                          <span aria-hidden="true" className="h-px w-6 bg-primary/40" />
                          <span>{meta.eyebrow}</span>
                          {meta.optional && (
                            <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] tracking-[0.12em] text-secondary-foreground">
                              Optional
                            </span>
                          )}
                        </p>
                        <h1
                          id="survey-question"
                          ref={headingRef}
                          tabIndex={-1}
                          className={cn(
                            'font-display leading-[1.02] font-bold tracking-tight text-balance outline-none',
                            large ? 'text-5xl sm:text-6xl lg:text-7xl' : 'text-4xl sm:text-5xl lg:text-6xl',
                          )}
                        >
                          {meta.question}
                        </h1>
                        <p id="survey-hint" className={cn('text-muted-foreground', large ? 'text-xl' : 'text-lg')}>
                          {meta.hint}
                        </p>
                      </div>

                      <StepBody step={current} draft={draft} update={update} invalid={Boolean(error)} />

                      <p
                        id="survey-error"
                        role="alert"
                        className={cn('min-h-5 text-sm font-medium text-destructive', !error && 'sr-only')}
                      >
                        {error}
                      </p>
                    </motion.section>
                  </AnimatePresence>
                </div>
              </div>

              <aside
                aria-label="Book preview"
                className="relative hidden items-center justify-center overflow-hidden border-l border-border bg-[linear-gradient(160deg,var(--secondary)_0%,var(--background)_70%)] px-10 lg:flex"
              >
                <div className="flex w-full max-w-md flex-col gap-6">
                  <p className="flex items-center gap-2 font-mono text-[11px] tracking-[0.18em] text-muted-foreground uppercase">
                    <Sparkles aria-hidden="true" className="size-3.5 text-primary" />
                    Live preview · demo
                  </p>
                  <BookPreview draft={draft} step={current} courseTitle={course.title} />
                  <p className="text-sm text-muted-foreground">
                    A sketch of how your answers shape the page. Your choices stay on this device.
                  </p>
                </div>
              </aside>
            </div>

            <footer className="sticky bottom-0 z-10 border-t border-border bg-background/90 px-4 py-4 backdrop-blur sm:px-8 lg:px-14">
              <div className="mx-auto flex w-full max-w-2xl items-center justify-between gap-3 lg:mx-0 lg:max-w-none">
                <BookeyButton type="button" variant="ghost" onClick={handleBack} disabled={index === 0}>
                  <ArrowLeft aria-hidden="true" />
                  Back
                </BookeyButton>
                <div className="flex items-center gap-4">
                  <p className="hidden text-xs text-muted-foreground sm:block">
                    Press <kbd className="rounded border border-border bg-card px-1.5 py-0.5 font-mono text-[10px]">Enter</kbd> to continue
                  </p>
                  <BookeyButton type="submit" size="lg">
                    {isLast ? 'Finish' : 'Continue'}
                    <ArrowRight aria-hidden="true" />
                  </BookeyButton>
                </div>
              </div>
            </footer>
          </form>
        )}
      </div>
    </MotionConfig>
  )
}

function SurveyHeader({ course, step }: { course: LearningCourse; step: { index: number; total: number } | null }) {
  const total = step?.total ?? 1
  const done = step ? step.index : total

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur">
      <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-8 lg:px-14">
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/dashboard" className="rounded-xl outline-none focus-visible:ring-4 focus-visible:ring-ring/30">
            <BookeyLogo markOnly />
          </Link>
          <div className="flex min-w-0 flex-col">
            <span className="font-mono text-[10px] tracking-[0.18em] text-muted-foreground uppercase">Personalize</span>
            <span className="truncate text-sm font-semibold">{course.title}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {step && (
            <span className="text-sm font-medium text-muted-foreground tabular-nums">
              Step {step.index + 1} of {step.total}
            </span>
          )}
          <BookeyButton
            variant="outline"
            size="icon"
            nativeButton={false}
            render={<Link href={`/courses/${course.id}`} />}
            aria-label={`Exit and return to ${course.title}`}
          >
            <X aria-hidden="true" />
          </BookeyButton>
        </div>
      </div>
      <div
        role="progressbar"
        aria-label="Survey progress"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={step ? step.index + 1 : total}
        aria-valuetext={step ? `Step ${step.index + 1} of ${step.total}` : 'Survey complete'}
        className="flex gap-1 px-4 pb-3 sm:px-8 lg:px-14"
      >
        {Array.from({ length: total }, (_, i) => (
          <span key={i} className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
            <span
              className={cn(
                'block h-full rounded-full bg-primary transition-[width] duration-500 ease-out motion-reduce:transition-none',
                i < done ? 'w-full' : i === done ? 'w-1/2' : 'w-0',
              )}
            />
          </span>
        ))}
      </div>
    </header>
  )
}

interface StepBodyProps {
  step: StepId
  draft: SurveyDraft
  update: (patch: Partial<SurveyDraft>) => void
  invalid: boolean
}

function StepBody({ step, draft, update, invalid }: StepBodyProps) {
  const shared = { labelledBy: 'survey-question', describedBy: invalid ? 'survey-hint survey-error' : 'survey-hint', invalid }

  switch (step) {
    case 'level':
      return <SingleChoice {...shared} name="level" choices={levelChoices} value={draft.level} onChange={(level) => update({ level })} />
    case 'interests':
      return (
        <MultiChoice
          {...shared}
          name="interests"
          choices={interestChoices}
          values={draft.interests}
          onChange={(interests) =>
            update({ interests, movieGenre: interests.includes('movies') ? draft.movieGenre : null })
          }
        />
      )
    case 'genre':
      return (
        <OptionalChips {...shared} name="genre" choices={genreChoices} value={draft.movieGenre} onChange={(movieGenre) => update({ movieGenre })} />
      )
    case 'style':
      return <SingleChoice {...shared} name="style" choices={styleChoices} value={draft.style} onChange={(style) => update({ style })} columns={3} />
    case 'language':
      return (
        <SingleChoice {...shared} name="language" choices={languageChoices} value={draft.language} onChange={(language) => update({ language })} columns={3} />
      )
    case 'pace':
      return <SingleChoice {...shared} name="pace" choices={paceChoices} value={draft.pace} onChange={(pace) => update({ pace })} />
    case 'accessibility':
      return (
        <ToggleList
          labelledBy="survey-question"
          items={accessibilityChoices}
          values={draft.accessibility}
          onChange={(key, checked) => update({ accessibility: { ...draft.accessibility, [key]: checked } })}
        />
      )
  }
}

function buildSummary(result: Personalization) {
  const comfort = accessibilityChoices.filter((item) => result.accessibility[item.key]).map((item) => item.label)
  const summary = [
    { label: 'Level', value: labelFor(levelChoices, result.level) ?? '' },
    { label: 'Interests', value: result.interests.map((value) => labelFor(interestChoices, value)).join(', ') },
    { label: 'Style', value: labelFor(styleChoices, result.style) ?? '' },
    { label: 'Language', value: labelFor(languageChoices, result.language) ?? '' },
    { label: 'Pace', value: labelFor(paceChoices, result.pace) ?? '' },
    { label: 'Comfort', value: comfort.length > 0 ? comfort.join(', ') : 'Default' },
  ]
  if (result.movieGenre) {
    summary.splice(2, 0, { label: 'Favourite genre', value: labelFor(genreChoices, result.movieGenre) ?? '' })
  }
  return summary
}

function toSurveyAnswers(result: Personalization): Record<string, string> {
  return {
    level: result.level,
    interests: result.interests.join(','),
    movieGenre: result.movieGenre ?? '',
    style: result.style,
    language: result.language,
    pace: result.pace,
  }
}

/** Flattens the saved personalization into the `submit_survey` string map. */
function toWireAnswers(result: Personalization): Record<string, string> {
  return Object.fromEntries(
    Object.entries(result).map(([key, value]) => [key, typeof value === 'string' ? value : JSON.stringify(value)]),
  )
}
