'use client'

import { Accessibility, Info, Pencil, Sparkles, UserRound } from 'lucide-react'
import { useId, useState } from 'react'
import { accessibilityChoices, interestChoices, languageChoices, paceChoices, styleChoices } from '@/components/survey/survey-config'
import { BookeyButton } from '@/components/ui-kit/bookey-button'
import { notify } from '@/components/ui-kit/toast'
import { FormSection, SegmentedControl, SettingSwitch } from '@/components/workspace/form-controls'
import type { LearningCourseId } from '@/lib/mock/learning'
import { EMAIL_PATTERN, NAME_MAX, useProfile, type LearnerProfile } from '@/lib/stores/profile'
import { useHydrated } from '@/lib/stores/personalization'
import { cn } from '@/lib/utils'
import { AvatarPicker } from './avatar-picker'
import { RetakeSurvey } from './retake-survey'

type Errors = Partial<Record<'displayName' | 'email', string>>

function validate(draft: LearnerProfile): Errors {
  const errors: Errors = {}
  if (!draft.displayName.trim()) errors.displayName = 'Enter a display name.'
  else if (draft.displayName.trim().length > NAME_MAX) errors.displayName = `Keep it under ${NAME_MAX} characters.`
  if (!EMAIL_PATTERN.test(draft.email.trim())) errors.email = 'Enter an email like name@example.com.'
  return errors
}

const labelOf = <T extends string>(choices: { value: T; label: string }[], value: T) =>
  choices.find((choice) => choice.value === value)?.label ?? value

function TextField({
  label,
  value,
  onChange,
  error,
  type = 'text',
  readOnly,
  autoComplete,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  error?: string
  type?: string
  readOnly: boolean
  autoComplete: string
}) {
  const id = useId()
  return (
    <div className="flex flex-col gap-1.5 py-3">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        readOnly={readOnly}
        autoComplete={autoComplete}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={(event) => onChange(event.target.value)}
        className={cn(
          'h-11 rounded-2xl border bg-background px-3 text-sm outline-none focus-visible:ring-4 focus-visible:ring-ring/30 read-only:bg-muted/50 read-only:text-muted-foreground',
          error ? 'border-destructive' : 'border-input',
        )}
      />
      {error && (
        <p id={`${id}-error`} className="text-xs font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}

export function ProfileForm({ initialCourse }: { initialCourse?: LearningCourseId }) {
  const hydrated = useHydrated()
  const { profile, save } = useProfile()
  const [draft, setDraft] = useState<LearnerProfile | null>(null)
  const [errors, setErrors] = useState<Errors>({})
  const editing = draft !== null
  const current = draft ?? profile

  const patch = (next: Partial<LearnerProfile>) => setDraft((d) => (d ? { ...d, ...next } : d))

  const startEdit = () => {
    setErrors({})
    setDraft({ ...profile, interests: [...profile.interests], accessibility: { ...profile.accessibility } })
  }

  const cancel = () => {
    setDraft(null)
    setErrors({})
  }

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!draft) return
    const nextErrors = validate(draft)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      notify.error('Check the highlighted fields')
      return
    }
    if (save({ ...draft, displayName: draft.displayName.trim(), email: draft.email.trim() })) {
      setDraft(null)
      notify.demo('Profile saved')
    } else {
      notify.error('Could not save', 'Browser storage is unavailable or full.')
    }
  }

  const toggleInterest = (value: (typeof interestChoices)[number]['value']) =>
    patch({
      interests: current.interests.includes(value) ? current.interests.filter((i) => i !== value) : [...current.interests, value],
    })

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-6" aria-busy={!hydrated}>
      <FormSection id="identity" title="Account" description="How you appear across Bookey." icon={<UserRound />}>
        <div className="py-3">
          <AvatarPicker name={current.displayName} value={current.avatar} editing={editing} onChange={(avatar) => patch({ avatar })} />
        </div>
        <div className="grid gap-x-4 sm:grid-cols-2 [&>*]:border-0">
          <TextField
            label="Display name"
            value={current.displayName}
            readOnly={!editing}
            autoComplete="nickname"
            error={errors.displayName}
            onChange={(displayName) => patch({ displayName })}
          />
          <TextField
            label="Email"
            type="email"
            value={current.email}
            readOnly={!editing}
            autoComplete="email"
            error={errors.email}
            onChange={(email) => patch({ email })}
          />
        </div>
      </FormSection>

      <FormSection id="learning" title="Learning preferences" description="Used to shape explanations in every book." icon={<Sparkles />}>
        {editing ? (
          <>
            <SegmentedControl
              label="Preferred language"
              name="language"
              value={current.language}
              onChange={(language) => patch({ language })}
              options={languageChoices}
            />
            <fieldset className="py-3">
              <legend className="px-1 font-medium">Interests</legend>
              <p className="px-1 text-sm text-muted-foreground">Pick any. Examples will borrow from these.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {interestChoices.map((choice) => {
                  const checked = current.interests.includes(choice.value)
                  return (
                    <label
                      key={choice.value}
                      className={cn(
                        'cursor-pointer rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-ring/30',
                        checked ? 'border-primary bg-primary text-primary-foreground' : 'border-border hover:bg-muted',
                      )}
                    >
                      <input type="checkbox" className="sr-only" checked={checked} onChange={() => toggleInterest(choice.value)} />
                      {choice.label}
                    </label>
                  )
                })}
              </div>
            </fieldset>
            <SegmentedControl label="Explanation style" name="style" value={current.style} onChange={(style) => patch({ style })} options={styleChoices} />
            <SegmentedControl
              label="Session pace"
              name="pace"
              value={current.pace}
              onChange={(pace) => patch({ pace })}
              options={paceChoices.map((c) => ({ value: c.value, label: c.label.replace(' and detailed', '') }))}
            />
          </>
        ) : (
          <dl className="grid gap-x-6 sm:grid-cols-2 [&>div]:py-3">
            <div>
              <dt className="text-sm text-muted-foreground">Preferred language</dt>
              <dd className="font-medium">{labelOf(languageChoices, current.language)}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Interests</dt>
              <dd className="font-medium">
                {current.interests.length > 0 ? current.interests.map((i) => labelOf(interestChoices, i)).join(', ') : 'None picked'}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Explanation style</dt>
              <dd className="font-medium">{labelOf(styleChoices, current.style)}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Session pace</dt>
              <dd className="font-medium">{labelOf(paceChoices, current.pace)}</dd>
            </div>
          </dl>
        )}
        <RetakeSurvey initialCourse={initialCourse} />
      </FormSection>

      <FormSection id="access" title="Accessibility" description="Comfort options carried into the reader." icon={<Accessibility />}>
        {accessibilityChoices.map((choice) =>
          editing ? (
            <SettingSwitch
              key={choice.key}
              label={choice.label}
              description={choice.description}
              checked={current.accessibility[choice.key]}
              onCheckedChange={(checked) => patch({ accessibility: { ...current.accessibility, [choice.key]: checked } })}
            />
          ) : (
            <div key={choice.key} className="flex items-center justify-between gap-4 px-1 py-3">
              <span className="font-medium">{choice.label}</span>
              <span className="text-sm text-muted-foreground">{current.accessibility[choice.key] ? 'On' : 'Off'}</span>
            </div>
          ),
        )}
      </FormSection>

      <div className="sticky bottom-24 z-10 flex flex-col gap-3 rounded-3xl border border-border bg-card/95 p-4 shadow-lg backdrop-blur sm:flex-row sm:items-center sm:justify-between lg:bottom-4">
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Info aria-hidden="true" className="size-4 shrink-0" />
          Profile changes are stored in this browser demo.
        </p>
        <div className="flex gap-2">
          {editing ? (
            <>
              <BookeyButton type="button" variant="ghost" onClick={cancel}>
                Cancel
              </BookeyButton>
              <BookeyButton type="submit">Save changes</BookeyButton>
            </>
          ) : (
            <BookeyButton type="button" onClick={startEdit} disabled={!hydrated}>
              <Pencil aria-hidden="true" />
              Edit profile
            </BookeyButton>
          )}
        </div>
      </div>
    </form>
  )
}
