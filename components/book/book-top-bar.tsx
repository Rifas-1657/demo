'use client'

import {
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  BookOpen,
  Maximize,
  MessagesSquare,
  Minimize,
  PanelLeft,
  Settings2,
  Sparkles,
  StickyNote,
  WifiOff,
} from 'lucide-react'
import Link from 'next/link'
import { BookeyBadge } from '@/components/ui-kit/bookey-badge'
import { Hint } from '@/components/ui-kit/hint'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import type { ReaderViewMode } from '@/types/book'

const glassButton =
  'inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-foreground backdrop-blur-md transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40 aria-pressed:border-primary/50 aria-pressed:bg-primary/20 aria-pressed:text-primary'

interface BookTopBarProps {
  courseId: string
  courseTitle: string
  chapterLabel: string
  pageNumber: number | null
  totalPages: number
  online: boolean
  railOpen: boolean
  onToggleRail: () => void
  bookmarked: boolean
  onToggleBookmark: () => void
  notesOpen: boolean
  onToggleNotes: () => void
  chatOpen: boolean
  onToggleChat: () => void
  viewMode: ReaderViewMode
  onViewModeChange: (mode: ReaderViewMode) => void
  fontScale: number
  onFontScaleChange: (scale: number) => void
  fullscreen: { active: boolean; supported: boolean; toggle: () => void }
  disabled?: boolean
}

const viewModes: { id: ReaderViewMode; label: string; icon: typeof BookOpen }[] = [
  { id: 'full', label: 'Full book', icon: BookOpen },
  { id: 'guided', label: 'Guided', icon: Sparkles },
]

export function BookTopBar(props: BookTopBarProps) {
  const { pageNumber, totalPages, disabled } = props
  const progress = pageNumber ? (pageNumber / totalPages) * 100 : 0

  return (
    <header className="relative z-20 shrink-0 border-b border-white/10 bg-black/20 backdrop-blur-xl">
      <div className="flex h-16 items-center gap-2 px-3 sm:gap-3 sm:px-5">
        <Hint label="Back to course" side="bottom">
          <Link href={`/courses/${props.courseId}`} className={glassButton} aria-label="Back to course">
            <ArrowLeft className="size-4" aria-hidden="true" />
          </Link>
        </Hint>

        <Hint label={props.railOpen ? 'Hide chapters' : 'Show chapters'} side="bottom">
          <button
            type="button"
            className={glassButton}
            aria-pressed={props.railOpen}
            aria-label="Chapters"
            onClick={props.onToggleRail}
            disabled={disabled}
          >
            <PanelLeft className="size-4" aria-hidden="true" />
          </button>
        </Hint>

        <div className="min-w-0 flex-1 px-1">
          <p className="truncate text-sm font-semibold">{props.courseTitle}</p>
          <p className="truncate text-xs text-muted-foreground">{props.chapterLabel}</p>
        </div>

        <div className="hidden items-center gap-2 md:flex">
          {pageNumber && (
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 font-mono text-xs tabular-nums">
              Page {pageNumber} of {totalPages}
            </span>
          )}
          {props.online ? (
            <BookeyBadge tone="soft" className="border-white/10">
              Demo
            </BookeyBadge>
          ) : (
            <BookeyBadge tone="warning" icon={<WifiOff aria-hidden="true" />}>
              Offline
            </BookeyBadge>
          )}
        </div>

        <div
          role="radiogroup"
          aria-label="Reading mode"
          className="hidden items-center rounded-full border border-white/10 bg-white/5 p-0.5 sm:flex"
        >
          {viewModes.map(({ id, label, icon: Icon }) => {
            const active = props.viewMode === id
            return (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={active}
                tabIndex={active ? 0 : -1}
                onClick={() => props.onViewModeChange(id)}
                onKeyDown={(event) => {
                  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
                    event.preventDefault()
                    props.onViewModeChange(id === 'full' ? 'guided' : 'full')
                  }
                }}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                  active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Icon className="size-3.5" aria-hidden="true" />
                <span className="hidden lg:inline">{label}</span>
                <span className="sr-only lg:hidden">{label}</span>
              </button>
            )
          })}
        </div>

        <div className="flex items-center gap-1.5">
          <Hint label={props.bookmarked ? 'Remove bookmark' : 'Bookmark this page'} side="bottom">
            <button
              type="button"
              className={glassButton}
              aria-pressed={props.bookmarked}
              aria-label="Bookmark this page"
              onClick={props.onToggleBookmark}
              disabled={disabled}
            >
              {props.bookmarked ? (
                <BookmarkCheck className="size-4" aria-hidden="true" />
              ) : (
                <Bookmark className="size-4" aria-hidden="true" />
              )}
            </button>
          </Hint>

          <Hint label={props.notesOpen ? 'Close notes' : 'Notes & bookmarks'} side="bottom">
            <button
              type="button"
              className={glassButton}
              aria-pressed={props.notesOpen}
              aria-label="Notes and bookmarks"
              onClick={props.onToggleNotes}
              disabled={disabled}
            >
              <StickyNote className="size-4" aria-hidden="true" />
            </button>
          </Hint>

          <Hint label={props.chatOpen ? 'Close course chat' : 'Course chat'} side="bottom">
            <button
              type="button"
              className={glassButton}
              aria-pressed={props.chatOpen}
              aria-label="Course chat"
              onClick={props.onToggleChat}
              disabled={disabled}
            >
              <MessagesSquare className="size-4" aria-hidden="true" />
            </button>
          </Hint>

          <DropdownMenu>
            <DropdownMenuTrigger className={glassButton} aria-label="Reader settings">
              <Settings2 className="size-4" aria-hidden="true" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="theme-night w-56">
              <DropdownMenuGroup className="sm:hidden">
                <DropdownMenuLabel>Reading mode</DropdownMenuLabel>
                {viewModes.map(({ id, label, icon: Icon }) => (
                  <DropdownMenuItem key={id} onClick={() => props.onViewModeChange(id)}>
                    <Icon aria-hidden="true" />
                    {label}
                    {props.viewMode === id && <span className="ml-auto text-xs text-primary">On</span>}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
              <DropdownMenuSeparator className="sm:hidden" />
              <DropdownMenuGroup>
                <DropdownMenuLabel>
                  Text size · <span className="font-mono">{Math.round(props.fontScale * 100)}%</span>
                </DropdownMenuLabel>
                <DropdownMenuItem closeOnClick={false} onClick={() => props.onFontScaleChange(props.fontScale + 0.05)}>
                  Larger text
                </DropdownMenuItem>
                <DropdownMenuItem closeOnClick={false} onClick={() => props.onFontScaleChange(props.fontScale - 0.05)}>
                  Smaller text
                </DropdownMenuItem>
                <DropdownMenuItem closeOnClick={false} onClick={() => props.onFontScaleChange(1)}>
                  Reset size
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          {props.fullscreen.supported && (
            <Hint label={props.fullscreen.active ? 'Exit fullscreen' : 'Fullscreen'} side="bottom">
              <button
                type="button"
                className={cn(glassButton, 'hidden sm:inline-flex')}
                aria-pressed={props.fullscreen.active}
                aria-label="Fullscreen"
                onClick={props.fullscreen.toggle}
              >
                {props.fullscreen.active ? (
                  <Minimize className="size-4" aria-hidden="true" />
                ) : (
                  <Maximize className="size-4" aria-hidden="true" />
                )}
              </button>
            </Hint>
          )}
        </div>
      </div>

      <div
        role="progressbar"
        aria-label="Book progress"
        aria-valuemin={0}
        aria-valuemax={totalPages}
        aria-valuenow={pageNumber ?? 0}
        className="h-0.5 w-full bg-white/5"
      >
        <div className="h-full bg-primary transition-[width] duration-500 ease-out" style={{ width: `${progress}%` }} />
      </div>
    </header>
  )
}
