import type { Metadata } from 'next'
import { SettingsForm } from '@/components/settings/settings-form'
import { WorkspacePage } from '@/components/workspace/workspace-page'

export const metadata: Metadata = { title: 'Settings' }

export default function SettingsPage() {
  return (
    <WorkspacePage title="Settings" description="Appearance, reading defaults, and your local demo data.">
      <SettingsForm />
    </WorkspacePage>
  )
}
