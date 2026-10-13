import type { Metadata } from 'next'
import { AdminOverview } from '@/components/admin/overview/admin-overview'

export const metadata: Metadata = { title: 'Overview' }

export default function AdminPage() {
  return <AdminOverview />
}
