import type { Metadata } from 'next'
import { TutorSettingsForm } from '@/components/admin/tutor/tutor-settings-form'

export const metadata: Metadata = { title: 'Tutor settings' }

export default function AdminTutorSettingsPage() {
  return <TutorSettingsForm />
}
  