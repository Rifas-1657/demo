import type { Metadata } from 'next'
import { NotificationCenter } from '@/components/notifications/notification-center'
import { WorkspacePage } from '@/components/workspace/workspace-page'

export const metadata: Metadata = { title: 'Notifications' }

export default function NotificationsPage() {
  return (
    <WorkspacePage title="Notifications" description="Learning nudges, book updates, and system messages. Stored in this browser demo.">
      <NotificationCenter />
    </WorkspacePage>
  )
}
