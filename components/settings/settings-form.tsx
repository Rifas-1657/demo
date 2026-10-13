'use client'

import { Headphones, Palette, ShieldCheck, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { BookeyButton } from '@/components/ui-kit/bookey-button'
import { ModalDialog } from '@/components/ui-kit/overlays'
import { notify } from '@/components/ui-kit/toast'
import { FormSection, SegmentedControl, SettingSwitch } from '@/components/workspace/form-controls'
import { clearAppStorage } from '@/lib/storage'
import { defaultAppSettings, useAppSettings, type AppSettings } from '@/lib/stores/app-settings'
import { useHydrated } from '@/lib/stores/personalization'
import { NARRATION_RATES } from '@/types/book'

const sameSettings = (a: AppSettings, b: AppSettings) => JSON.stringify(a) === JSON.stringify(b)

export function SettingsForm() {
  const hydrated = useHydrated()
  const { settings, save } = useAppSettings()
  const [draft, setDraft] = useState<AppSettings | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const current = draft ?? settings
  const dirty = draft !== null && !sameSettings(draft, settings)
  const atDefaults = sameSettings(current, defaultAppSettings)

  const patch = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => setDraft({ ...current, [key]: value })

  const handleSave = () => {
    if (save(current)) {
      setDraft(null)
      notify.demo('Settings saved')
    } else notify.error('Could not save', 'Browser storage is unavailable or full.')
  }

  const handleReset = () => {
    if (save(defaultAppSettings)) {
      setDraft(null)
      notify.demo('Settings reset to defaults')
    }
  }

  const handleClear = () => {
    const removed = clearAppStorage()
    setConfirmOpen(false)
    setDraft(null)
    notify.demo('Demo data cleared', `${removed} Bookey ${removed === 1 ? 'entry' : 'entries'} removed from this browser.`)
    window.setTimeout(() => window.location.reload(), 900)
  }

  return (
    <div className="flex flex-col gap-6" aria-busy={!hydrated}>
      <FormSection id="appearance" title="Appearance" description="How the workspace looks and moves." icon={<Palette />}>
        <SegmentedControl
          label="Theme"
          description="Auto follows your device setting."
          name="theme"
          value={current.theme}
          onChange={(theme) => patch('theme', theme)}
          options={[
            { value: 'light', label: 'Light' },
            { value: 'dark', label: 'Dark' },
            { value: 'auto', label: 'Auto' },
          ]}
        />
        <SettingSwitch
          label="Reduce motion"
          description="Turns off page transitions and decorative animation."
          checked={current.reduceMotion}
          onCheckedChange={(value) => patch('reduceMotion', value)}
        />
        <SegmentedControl
          label="Text size"
          name="text-size"
          value={current.textSize}
          onChange={(value) => patch('textSize', value)}
          options={[
            { value: 'sm', label: 'Small' },
            { value: 'md', label: 'Default' },
            { value: 'lg', label: 'Large' },
          ]}
        />
        <SegmentedControl
          label="Density"
          description="Compact tightens spacing between panels."
          name="density"
          value={current.density}
          onChange={(value) => patch('density', value)}
          options={[
            { value: 'comfortable', label: 'Comfortable' },
            { value: 'compact', label: 'Compact' },
          ]}
        />
      </FormSection>

      <FormSection id="reading" title="Reading and narration" description="Defaults for every book you open." icon={<Headphones />}>
        <SegmentedControl
          label="Default narration speed"
          name="narration-rate"
          value={String(current.narrationRate)}
          onChange={(value) => patch('narrationRate', Number(value) as AppSettings['narrationRate'])}
          options={NARRATION_RATES.map((rate) => ({ value: String(rate), label: `${rate}×` }))}
        />
        <SettingSwitch
          label="Captions"
          description="Show the narrated sentence while audio plays."
          checked={current.captions}
          onCheckedChange={(value) => patch('captions', value)}
        />
        <SettingSwitch
          label="Auto-advance"
          description="Move to the next page when narration finishes."
          checked={current.autoAdvance}
          onCheckedChange={(value) => patch('autoAdvance', value)}
        />
        <SegmentedControl
          label="Page turn"
          name="page-turn"
          value={current.pageTurn}
          onChange={(value) => patch('pageTurn', value)}
          options={[
            { value: 'animated', label: 'Animated' },
            { value: 'instant', label: 'Instant' },
          ]}
        />
      </FormSection>

      <FormSection id="privacy" title="Privacy and demo data" description="Everything Bookey stores lives in this browser." icon={<ShieldCheck />}>
        <div className="flex flex-col gap-3 px-1 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-medium">Clear local demo data</p>
            <p className="text-sm text-muted-foreground">
              Removes saved progress, profile, settings, notes and notifications. Other sites&apos; data is never touched.
            </p>
          </div>
          <ModalDialog
            open={confirmOpen}
            onOpenChange={setConfirmOpen}
            title="Clear all Bookey demo data?"
            description="This resets the demo to its starting state. Only keys created by Bookey are removed, and it cannot be undone."
            trigger={
              <BookeyButton variant="outline" className="shrink-0 text-destructive">
                <Trash2 aria-hidden="true" />
                Clear data
              </BookeyButton>
            }
            footer={
              <>
                <BookeyButton variant="ghost" onClick={() => setConfirmOpen(false)}>
                  Cancel
                </BookeyButton>
                <BookeyButton className="bg-destructive text-white hover:bg-destructive/90" onClick={handleClear}>
                  Clear demo data
                </BookeyButton>
              </>
            }
          />
        </div>
      </FormSection>

      <div className="sticky bottom-24 z-10 flex flex-col gap-3 rounded-3xl border border-border bg-card/95 p-4 shadow-lg backdrop-blur sm:flex-row sm:items-center sm:justify-between lg:bottom-4">
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {dirty ? 'You have unsaved changes.' : 'Settings are saved in this browser.'}
        </p>
        <div className="flex flex-wrap gap-2">
          <BookeyButton variant="ghost" onClick={handleReset} disabled={!hydrated || (atDefaults && !dirty)}>
            Reset to defaults
          </BookeyButton>
          {dirty && (
            <BookeyButton variant="outline" onClick={() => setDraft(null)}>
              Discard
            </BookeyButton>
          )}
          <BookeyButton onClick={handleSave} disabled={!dirty}>
            Save settings
          </BookeyButton>
        </div>
      </div>
    </div>
  )
}
