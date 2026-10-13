import type { Metadata } from 'next'
import { AdminMembers } from '@/components/admin/members/admin-members'

export const metadata: Metadata = { title: 'Members' }

export default function AdminMembersPage() {
  return <AdminMembers />
}
