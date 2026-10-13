import Link from 'next/link'
import { BookeyButton } from '@/components/ui-kit/bookey-button'
import { EmptyState } from '@/components/ui-kit/empty-state'

interface LibraryEmptyProps {
  icon: React.ReactNode
  title: string
  description: string
  /** Optional extra action shown before the courses link. */
  extra?: React.ReactNode
}

export function LibraryEmpty({ icon, title, description, extra }: LibraryEmptyProps) {
  return (
    <EmptyState
      icon={icon}
      title={title}
      description={description}
      action={
        <div className="flex flex-wrap items-center justify-center gap-2">
          {extra}
          <BookeyButton size="sm" nativeButton={false} render={<Link href="/courses" />}>
            Browse courses
          </BookeyButton>
        </div>
      }
    />
  )
}
