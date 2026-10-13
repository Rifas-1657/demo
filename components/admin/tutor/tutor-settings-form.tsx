'use client'

import { AudioLines, Captions, Gauge, Languages, Save, Sparkles, Volume2 } from 'lucide-react'
import { useState } from 'react'
import { BookeyButton } from '@/components/ui-kit/bookey-button'
import { notify } from '@/components/ui-kit/toast'
import { FormSection, SegmentedControl, SettingSwitch } from '@/components/workspace/form-controls'
import type { AnimationPreference, ExplanationStyle, SampleVoice, TutorSettings } from '@/lib/admin/types'
import { useAdminDemo } from '@/lib/stores/admin-demo'
import { useReaderPreferences } from '@/lib/stores/reader-preferences'
import { NARRATION_RATES, type NarrationRate } from '@/types/book'
import { cn } from '@/lib/utils'
import { AdminPageHeader, DemoNotice, inputClass } from '../admin-ui'

const NARRATION_LANGUAGES = [
  { value: 'en-US', label: 'English (US)' },
  { value: 'en-GB', label: 'English (UK)' },
  { value: 'es-ES', label: 'Spanish' },
  { value: 'fr-FR', label: 'French' },
  { value: 'de-DE', label: 'German' },
  { value: 'hi-IN', label: 'Hindi' },
  { value: 'ja-JP', label: 'Japanese' },
]

const VOICES: { value: SampleVoice; label: string; description: string }[] = [
  { value: 'ember', label: 'Ember', description: 'Warm and encouraging' },
  { value: 'sage', label: 'Sage', description: 'Calm and measured' },
  { value: 'atlas', label: 'Atlas', description: 'Clear and energetic' },
]

export function TutorSettingsForm() {
  const saved = useAdminDemo((s) => s.tutor)
  const saveTutor = useAdminDemo((s) => s.saveTutor)
  const courses = useAdminDemo((s) => s.courses)
  const setNarrationRate = useReaderPreferences((s) => s.setNarrationRate)
  const [draft, setDraft] = useState<TutorSettings>(saved)
  const [scopeError, setScopeError] = useState('')
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved)
  const set = <K extends keyof TutorSettings>(key: K, value: TutorSettings[K]) => setDraft((d) => ({ ...d, [key]: value }))

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!draft.applyToAllCourses && draft.scopedCourseIds.length === 0) {
      setScopeError('Choose at least one course, or apply settings to all courses.')
      document.getElementById('scope-courses')?.focus()
      return
    }
    setScopeError('')
    saveTutor(draft)
    setNarrationRate(draft.speakingSpeed)
    notify.demo('Tutor settings saved', 'Speaking speed now applies to the reader in this browser.')
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <AdminPageHeader
        title="Tutor settings"
        description="Defaults for how the AI tutor narrates and explains course content."
        actions={
          <>
            <BookeyButton type="button" variant="outline" disabled={!dirty} onClick={() => setDraft(saved)}>
              Discard
            </BookeyButton>
            <BookeyButton type="submit" disabled={!dirty}>
              <Save aria-hidden="true" />
              Save settings
            </BookeyButton>
          </>
        }
      />
      <DemoNotice>
        These are preview controls. Real text-to-speech and model-backed explanations would be connected later through
        server-side services — no API keys are needed or requested here.
      </DemoNotice>

      <div className="grid gap-6 lg:grid-cols-2">
        <FormSection id="tutor-narration" title="Narration" icon={<AudioLines aria-hidden="true" />}>
          <div className="space-y-5">
            <div className="space-y-1.5">
              <label htmlFor="narration-language" className="flex items-center gap-2 text-sm font-medium">
                <Languages aria-hidden="true" className="size-4 text-muted-foreground" />
                Narration language
              </label>
              <select
                id="narration-language"
                value={draft.narrationLanguage}
                onChange={(e) => set('narrationLanguage', e.target.value)}
                className={inputClass}
              >
                {NARRATION_LANGUAGES.map((l) => (
                  <option key={l.value} value={l.value}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>
            <SegmentedControl<string>
              label="Speaking speed"
              description="Also updates the reader’s narration speed in this browser."
              name="speaking-speed"
              value={String(draft.speakingSpeed)}
              onChange={(v) => set('speakingSpeed', Number(v) as NarrationRate)}
              options={NARRATION_RATES.map((rate) => ({ value: String(rate), label: `${rate}×`, icon: <Gauge aria-hidden="true" /> }))}
            />
            <SettingSwitch
              label="Captions"
              description="Show live captions while the tutor speaks."
              checked={draft.captions}
              onCheckedChange={(v) => set('captions', v)}
            />
          </div>
        </FormSection>

        <FormSection id="tutor-explanations" title="Explanations" icon={<Sparkles aria-hidden="true" />}>
          <div className="space-y-5">
            <SegmentedControl<ExplanationStyle>
              label="Explanation style"
              name="explanation-style"
              value={draft.explanationStyle}
              onChange={(v) => set('explanationStyle', v)}
              options={[
                { value: 'concise', label: 'Concise' },
                { value: 'balanced', label: 'Balanced' },
                { value: 'detailed', label: 'Detailed' },
              ]}
            />
            <SegmentedControl<AnimationPreference>
              label="Animation"
              description="Motion used when the tutor highlights code."
              name="tutor-animation"
              value={draft.animation}
              onChange={(v) => set('animation', v)}
              options={[
                { value: 'full', label: 'Full' },
                { value: 'reduced', label: 'Reduced' },
                { value: 'off', label: 'Off' },
              ]}
            />
          </div>
        </FormSection>

        <FormSection id="tutor-voice" title="Sample voice" icon={<Volume2 aria-hidden="true" />}>
          <fieldset>
            <legend className="sr-only">Sample voice</legend>
            <div className="space-y-2">
              {VOICES.map((voice) => {
                const selected = draft.voice === voice.value
                return (
                  <div
                    key={voice.value}
                    className={cn(
                      'flex items-center gap-3 rounded-xl border p-3 transition-colors has-focus-visible:ring-4 has-focus-visible:ring-ring/30',
                      selected ? 'border-primary bg-secondary' : 'border-border',
                    )}
                  >
                    <label className="flex flex-1 cursor-pointer items-center gap-3">
                      <input
                        type="radio"
                        name="sample-voice"
                        value={voice.value}
                        checked={selected}
                        onChange={() => set('voice', voice.value)}
                        className="size-4 accent-primary"
                      />
                      <span>
                        <span className="block text-sm font-medium">{voice.label}</span>
                        <span className="block text-xs text-muted-foreground">{voice.description}</span>
                      </span>
                    </label>
                    <BookeyButton
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => notify.info(`${voice.label} preview unavailable`, 'Sample voices will play once text-to-speech is connected.')}
                    >
                      Preview<span className="sr-only"> {voice.label}</span>
                    </BookeyButton>
                  </div>
                )
              })}
            </div>
          </fieldset>
        </FormSection>

        <FormSection id="tutor-scope" title="Course scope" icon={<Captions aria-hidden="true" />}>
          <div className="space-y-4">
            <SettingSwitch
              label="Apply to all courses"
              description="Turn off to choose specific courses."
              checked={draft.applyToAllCourses}
              onCheckedChange={(v) => {
                set('applyToAllCourses', v)
                setScopeError('')
              }}
            />
            {!draft.applyToAllCourses && (
              <fieldset
                id="scope-courses"
                tabIndex={-1}
                aria-describedby={scopeError ? 'scope-error' : undefined}
                className="space-y-2 outline-none"
              >
                <legend className="text-sm font-medium">Courses using these settings</legend>
                {scopeError && (
                  <p id="scope-error" role="alert" className="text-xs font-medium text-destructive">
                    {scopeError}
                  </p>
                )}
                <div className="max-h-56 space-y-1 overflow-y-auto rounded-xl border border-border p-2">
                  {courses.map((course) => {
                    const checked = draft.scopedCourseIds.includes(course.id)
                    return (
                      <label key={course.id} className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 text-sm hover:bg-muted">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            set(
                              'scopedCourseIds',
                              checked ? draft.scopedCourseIds.filter((id) => id !== course.id) : [...draft.scopedCourseIds, course.id],
                            )
                          }
                          className="size-4 accent-primary"
                        />
                        {course.title}
                      </label>
                    )
                  })}
                </div>
              </fieldset>
            )}
          </div>
        </FormSection>
      </div>
    </form>
  )
}
