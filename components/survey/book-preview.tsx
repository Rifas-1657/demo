import type { Interest, PreferredLanguage } from '@/lib/stores/personalization'
import { interestChoices, labelFor, levelChoices, paceChoices, type StepId, type SurveyDraft } from './survey-config'
import { cn } from '@/lib/utils'

const languageSamples: Record<PreferredLanguage, string> = {
  tanglish: 'Variable-na oru labelled box maari — adhula oru value-a safe-a vechikalam.',
  tamil: 'மாறி என்பது பெயரிடப்பட்ட ஒரு பெட்டி போல — அதில் ஒரு மதிப்பைச் சேமிக்கலாம்.',
  english: 'A variable is like a labelled box — you can keep one value safely inside it.',
}

const interestExamples: Record<Interest, string> = {
  movies: 'seats_left = 42 at the ticket counter',
  cricket: 'runs = 186 on the scoreboard',
  games: 'player_health = 100 at the start',
  music: 'volume = 7 on your playlist',
  cooking: 'cups_of_rice = 2 for the biryani',
  cars: 'fuel_level = 0.75 before the drive',
  anime: 'episode = 24 in the season',
  business: 'monthly_sales = 12500 this quarter',
  science: 'temperature = 36.6 in the lab log',
}

interface BookPreviewProps {
  draft: SurveyDraft
  step: StepId
  courseTitle: string
}

/** Decorative, warm book-theme page that mirrors the learner's answers as they go. */
export function BookPreview({ draft, step, courseTitle }: BookPreviewProps) {
  const firstInterest = draft.interests[0]
  const example = firstInterest ? interestExamples[firstInterest] : 'score = 10 in your first program'
  const pace = labelFor(paceChoices, draft.pace) ?? 'Balanced'
  const large = draft.accessibility.largerText

  return (
    <div aria-hidden="true" className="relative mx-auto w-full max-w-md select-none">
      <div className="absolute -inset-6 rounded-[2.5rem] bg-[radial-gradient(60%_60%_at_50%_40%,rgb(251_113_133/0.28),transparent_70%)]" />
      <div
        data-theme="book"
        className="relative flex rotate-[-2deg] overflow-hidden rounded-[1.75rem] border border-border shadow-[0_40px_80px_-40px_rgb(59_10_20/0.55)]"
      >
        <div className="w-3 shrink-0 bg-gradient-to-r from-book-amber/40 to-transparent" />
        <div className="flex flex-1 flex-col gap-4 p-6 sm:p-7">
          <div className="flex items-center justify-between font-mono text-[10px] tracking-[0.18em] text-muted-foreground uppercase">
            <span>{courseTitle}</span>
            <span>Ch. 1</span>
          </div>

          <p className="font-display text-xl leading-snug font-semibold text-balance">
            <span className="marker-highlight">Variables</span>, explained your way
          </p>

          <p className={cn('leading-relaxed transition-[font-size] duration-300', large ? 'text-base' : 'text-sm', highlight(step, 'language'))}>
            {languageSamples[draft.language]}
          </p>

          <StyleBlock draft={draft} step={step} example={example} />

          <div className={cn('flex flex-wrap gap-1.5', highlight(step, 'interests'))}>
            {(draft.interests.length > 0 ? draft.interests : (['movies', 'cricket'] as Interest[])).slice(0, 4).map((interest) => (
              <span
                key={interest}
                className={cn(
                  'rounded-full border border-border px-2.5 py-0.5 text-[11px] font-medium',
                  draft.interests.length > 0 ? 'bg-secondary text-secondary-foreground' : 'bg-card text-muted-foreground',
                )}
              >
                {labelFor(interestChoices, interest)}
              </span>
            ))}
          </div>

          <div className="flex items-center justify-between border-t border-border pt-3 text-[11px] text-muted-foreground">
            <span className={highlight(step, 'level')}>{labelFor(levelChoices, draft.level) ?? 'Your level'}</span>
            <span className={cn('flex items-center gap-1.5', highlight(step, 'pace'))}>
              <PaceDots pace={draft.pace} />
              {pace}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

function highlight(step: StepId, target: StepId) {
  return cn('rounded-md transition-[background-color,box-shadow] duration-300', step === target && 'bg-accent/70 shadow-[0_0_0_4px_var(--accent)]')
}

function StyleBlock({ draft, step, example }: { draft: SurveyDraft; step: StepId; example: string }) {
  const style = draft.style ?? 'example'
  const wrapper = cn('rounded-2xl border border-border bg-card p-3.5', highlight(step, 'style'))

  if (style === 'diagram') {
    const [name, value] = example.split(' = ')
    return (
      <div className={cn(wrapper, 'flex items-center justify-center gap-3')}>
        <span className="rounded-lg border-2 border-book-orange bg-secondary px-2.5 py-1 font-mono text-xs">{name}</span>
        <span className="h-0.5 w-8 bg-book-deep" />
        <span className="rounded-lg bg-book-marker px-2.5 py-1 font-mono text-xs font-semibold">{value?.split(' ')[0]}</span>
      </div>
    )
  }

  if (style === 'code') {
    return (
      <pre className={cn(wrapper, 'overflow-hidden bg-book-ink font-mono text-xs leading-relaxed text-book-paper')}>
        <code>
          <span className="text-book-marker">{example.split(' ')[0]}</span>
          {' = '}
          {example.split(' = ')[1]?.split(' ')[0]}
          {'\n'}
          <span className="text-book-amber">print</span>({example.split(' ')[0]})
        </code>
      </pre>
    )
  }

  return (
    <div className={cn(wrapper, 'text-xs leading-relaxed')}>
      <span className="font-semibold text-primary">Example · </span>
      Think of <span className="font-mono">{example}</span>.
    </div>
  )
}

function PaceDots({ pace }: { pace: SurveyDraft['pace'] }) {
  const count = pace === 'calm' ? 1 : pace === 'fast' ? 3 : 2
  return (
    <span className="flex gap-0.5">
      {[0, 1, 2].map((index) => (
        <span key={index} className={cn('size-1.5 rounded-full', index < count ? 'bg-book-deep' : 'bg-border')} />
      ))}
    </span>
  )
}
