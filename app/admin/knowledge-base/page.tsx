import type { Metadata } from 'next'
import { KnowledgeBase } from '@/components/admin/knowledge-base/knowledge-base'

export const metadata: Metadata = { title: 'Knowledge base' }

export default function AdminKnowledgeBasePage() {
  return <KnowledgeBase />
}
