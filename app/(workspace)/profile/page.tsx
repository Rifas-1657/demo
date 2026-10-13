import type { Metadata } from 'next'
import { ProfileForm } from '@/components/profile/profile-form'
import { WorkspacePage } from '@/components/workspace/workspace-page'
import { getLearningCourse } from '@/lib/mock/learning'

export const metadata: Metadata = { title: 'Profile' }

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ course?: string }> }) {
  const { course } = await searchParams
  const initialCourse = course ? getLearningCourse(course)?.id : undefined

  return (
    <WorkspacePage title="Profile" description="Your name, avatar, and how you like to learn.">
      <ProfileForm initialCourse={initialCourse} />
    </WorkspacePage>
  )
}
