import { BookMissing } from '@/components/book/book-states'

export default function BookNotFound() {
  return (
    <div className="theme-night flex min-h-dvh flex-col bg-night-gradient text-foreground">
      <BookMissing
        title="We couldn’t find that book"
        description="The course link may be mistyped or the book was removed from the demo catalog."
        primary={{ href: '/courses', label: 'Browse courses' }}
        secondary={{ href: '/book/python', label: 'Open the Python book' }}
      />
    </div>
  )
}
