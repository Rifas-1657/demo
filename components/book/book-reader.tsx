'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'
import { notify } from '@/components/ui-kit/toast'
import { findPageIndex, pageInChapter } from '@/lib/mock/book-pages'
import type { LearningChapter, LearningCourseId } from '@/lib/mock/learning'
import type { LibraryBookmark, LibraryNote, PageRef } from '@/lib/mock/library'
import { samePage, useBookmarks, useNotes } from '@/lib/stores/library'
import { rehydrateReaderPreferences, useReaderPreferences } from '@/lib/stores/reader-preferences'
import { rehydrateReaderSession, useReaderSession } from '@/lib/stores/reader-session'
import { cn } from '@/lib/utils'
import type { BookLessonPage, ReaderViewMode } from '@/types/book'
import { BookSpread, type PageTurn } from './book-spread'
import { BookIntro } from './intro/book-intro'
import { BookMissing, BookSpreadSkeleton } from './book-states'
import { BookTopBar } from './book-top-bar'
import { ChapterRail } from './chapter-rail'
import { ReaderSidePanel, type SidePanelTab } from './reader-side-panel'
import { useArrowKeyNavigation, useFullscreen, useMediaQuery, useOnlineStatus, useSwipe } from './use-reader-hooks'
import { NarrationDevPanel } from './narration-dev-panel'
import { VoiceDock } from './voice-dock'
import type { QueuedQuestion } from './tutor/any-questions-panel'
import { CourseChatPanel } from './tutor/course-chat-panel'
import { useCourseTutor } from './tutor/use-course-tutor'
import { rehydrateCourseChat } from '@/lib/stores/course-chat'
import { usePersonalization } from '@/lib/stores/personalization'
import { deriveCueVisuals } from '@/lib/narration/cues'
import { useNarrationStream } from '@/lib/narration/use-narration-stream'
import type { NarrationCueEvent } from '@/types/book'

export interface BookReaderCourse {
  id: LearningCourseId
  title: string
  chapters: LearningChapter[]
}

interface BookReaderProps {
  course: BookReaderCourse
  pages: BookLessonPage[]
  /** Deep link from `?chapter=&page=`; overrides the saved position. */
  initialChapter?: number
  initialPage?: number
}

const navButton =
  'inline-flex h-11 items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 text-sm font-medium backdrop-blur-md transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-35 sm:px-4'

export function BookReader({ course, pages, initialChapter, initialPage }: BookReaderProps) {
  const deepLinkIndex = initialChapter ? findPageIndex(pages, initialChapter, initialPage ?? 1) : -1
  const deepLinkMissing = initialChapter !== undefined && deepLinkIndex === -1

  const hydrated = useReaderSession((s) => s.hydrated)
  const savedPageId = useReaderSession((s) => s.lastPage[course.id])
  const visited = useReaderSession((s) => s.visited[course.id]) ?? []
  const storedViewMode = useReaderSession((s) => s.viewMode)
  const viewModeChosen = useReaderSession((s) => s.viewModeChosen)
  const railOpen = useReaderSession((s) => s.railOpen)
  const { setLastPage, setViewMode, setRailOpen } = useReaderSession.getState()
  const fontScale = useReaderPreferences((s) => s.fontScale)
  const setFontScale = useReaderPreferences((s) => s.setFontScale)

  const [chosenIndex, setChosenIndex] = useState<number | null>(deepLinkIndex >= 0 ? deepLinkIndex : null)
  const [panelOpen, setPanelOpen] = useState(false)
  const [panelTab, setPanelTab] = useState<SidePanelTab>('notes')
  const [railDrawerOpen, setRailDrawerOpen] = useState(false)

  const isDesktop = useMediaQuery('(min-width: 1024px)')
  const isWide = useMediaQuery('(min-width: 1280px)')
  const online = useOnlineStatus()
  const fullscreen = useFullscreen<HTMLDivElement>()
  const bookmarksApi = useBookmarks()
  const notesApi = useNotes()

  useEffect(() => {
    rehydrateReaderSession()
    rehydrateReaderPreferences()
    rehydrateCourseChat()
  }, [])

  const [chatOpen, setChatOpen] = useState(false)
  const [queueState, setQueueState] = useState<{ pageId: string; items: QueuedQuestion[] }>({ pageId: '', items: [] })
  const { personalization, completed: surveyCompleted } = usePersonalization(course.id)
  const viewMode: ReaderViewMode = viewModeChosen ? storedViewMode : surveyCompleted ? 'guided' : 'full'

  const savedIndex = pages.findIndex((entry) => entry.id === savedPageId)
  const index = chosenIndex ?? (hydrated ? Math.max(savedIndex, 0) : null)
  const page = index !== null ? pages[index] : undefined

  useEffect(() => {
    if (hydrated && page) setLastPage(course.id, page.id)
  }, [hydrated, page, course.id, setLastPage])

  const [introDone, setIntroDone] = useState(false)
  const finishIntro = useCallback(() => setIntroDone(true), [])

  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  const [turn, setTurn] = useState<PageTurn | null>(null)
  const turningRef = useRef(false)
  const turnIdRef = useRef(0)
  const surfaceRef = useRef<HTMLDivElement>(null)
  const restoreFocusRef = useRef(false)

  const endTurn = useCallback(() => {
    turningRef.current = false
    setTurn(null)
  }, [])

  useEffect(() => {
    endTurn()
  }, [course.id, endTurn])

  useEffect(() => {
    if (!turn) return
    const safety = window.setTimeout(endTurn, 1200)
    return () => window.clearTimeout(safety)
  }, [turn, endTurn])

  const goTo = useCallback(
    (next: number, options?: { animate?: boolean }) => {
      if (next < 0 || next >= pages.length || next === index) return
      const animate = options?.animate ?? false
      if (animate && turningRef.current) return
      if (surfaceRef.current?.contains(document.activeElement)) restoreFocusRef.current = true
      if (animate && !reducedMotion && index !== null) {
        turningRef.current = true
        turnIdRef.current += 1
        setTurn({ id: turnIdRef.current, pageId: pages[next].id, direction: next > index ? 'next' : 'prev' })
      } else {
        endTurn()
      }
      setChosenIndex(next)
    },
    [pages, index, reducedMotion, endTurn],
  )
  const goPrevious = useCallback(() => index !== null && goTo(index - 1, { animate: true }), [index, goTo])
  const goNext = useCallback(() => index !== null && goTo(index + 1, { animate: true }), [index, goTo])

  useEffect(() => {
    if (!restoreFocusRef.current) return
    restoreFocusRef.current = false
    const active = document.activeElement
    if (!active || active === document.body || !active.isConnected) surfaceRef.current?.focus({ preventScroll: true })
  }, [index])

  const narrationRate = useReaderPreferences((s) => s.narrationRate)
  const narrationMuted = useReaderPreferences((s) => s.narrationMuted)
  const setNarrationRate = useReaderPreferences((s) => s.setNarrationRate)
  const setNarrationMuted = useReaderPreferences((s) => s.setNarrationMuted)
  const streamingEnabled = viewMode === 'guided'
  const [cueLog, setCueLog] = useState<NarrationCueEvent[]>([])
  const stream = useNarrationStream({
    courseId: course.id,
    page,
    enabled: streamingEnabled,
    rate: narrationRate,
    muted: narrationMuted,
    onCue:
      process.env.NODE_ENV === 'development' ? (cue) => setCueLog((log) => [...log, cue].slice(-30)) : undefined,
  })
  const cueVisuals = streamingEnabled ? deriveCueVisuals(stream.reachedCues, page) : undefined

  const tutor = useCourseTutor({
    courseId: course.id,
    courseTitle: course.title,
    page,
    pageIndex: index ?? 0,
    language: personalization.language,
    reducedMotion,
  })
  const queue = page && queueState.pageId === page.id ? queueState.items : []

  const queueQuestion = useCallback(
    (kind: 'ask' | 'mic') => {
      if (!page) return
      const sentence = stream.currentSentence?.text ?? page.title
      const excerpt = sentence.length > 48 ? `${sentence.slice(0, 47).trimEnd()}…` : sentence
      const prompt =
        kind === 'mic' ? `(Demo voice) Innoru example la sollunga: "${excerpt}"` : `Explain this part again: "${excerpt}"`
      setQueueState((prev) => {
        const items = prev.pageId === page.id ? prev.items : []
        return { pageId: page.id, items: [...items, { id: `${Date.now()}-${items.length}`, kind, excerpt, prompt }].slice(-5) }
      })
      toast('I’ll queue that question for the end of this section', {
        description: kind === 'mic' ? 'Demo voice — your microphone is not used.' : 'Narration keeps playing.',
      })
    },
    [page, stream.currentSentence],
  )

  const askQueued = useCallback(
    (item: QueuedQuestion) => {
      if (!tutor.ask(item.prompt)) return
      setQueueState((prev) => ({ ...prev, items: prev.items.filter((entry) => entry.id !== item.id) }))
    },
    [tutor],
  )

  const overlayOpen = railDrawerOpen || ((panelOpen || chatOpen) && !isWide)
  useArrowKeyNavigation(goPrevious, goNext, Boolean(page) && !overlayOpen && introDone)
  const swipeHandlers = useSwipe(goPrevious, goNext)

  if (pages.length === 0) {
    return (
      <ReaderFrame>
        <BookMissing
          title="This book isn’t in the demo yet"
          description={`${course.title} doesn’t have seeded reader pages. The Python book is fully readable in this demo.`}
          primary={{ href: '/book/python', label: 'Open the Python book' }}
          secondary={{ href: `/courses/${course.id}`, label: 'Back to course' }}
        />
      </ReaderFrame>
    )
  }

  const chapter = page ? course.chapters.find((entry) => entry.number === page.chapterNumber) : undefined
  const chapterLabel = chapter ? `Chapter ${chapter.number} · ${chapter.title}` : 'Loading…'
  const currentRef: PageRef | null = page
    ? { courseId: course.id, chapter: page.chapterNumber, page: pageInChapter(pages, page) }
    : null
  const bookmarked = currentRef ? bookmarksApi.bookmarks.some((item) => samePage(item, currentRef)) : false
  const showMissing = deepLinkMissing && chosenIndex === null

  function toggleRail() {
    if (isDesktop) setRailOpen(!railOpen)
    else setRailDrawerOpen((open) => !open)
  }

  function openPanel(tab: SidePanelTab) {
    if (panelOpen && panelTab === tab) {
      setPanelOpen(false)
      return
    }
    setPanelTab(tab)
    setPanelOpen(true)
    setChatOpen(false)
  }

  function openChat() {
    setChatOpen(true)
    setPanelOpen(false)
  }

  function openSourcePage(pageIndex: number) {
    goTo(pageIndex)
    if (!isWide) setChatOpen(false)
  }

  function toggleBookmark() {
    if (!page || !currentRef) return
    bookmarksApi.toggle(currentRef, page.paragraphs[0] ?? page.title)
    notify.success(bookmarked ? 'Bookmark removed' : 'Page bookmarked', 'Saved in this browser only.')
  }

  function selectPage(next: number) {
    goTo(next)
    setRailDrawerOpen(false)
  }

  function jumpTo(ref: PageRef) {
    if (ref.courseId !== course.id) return false
    const target = findPageIndex(pages, ref.chapter, ref.page)
    if (target === -1) return false
    goTo(target)
    if (!isWide) setPanelOpen(false)
    return true
  }

  function removeNote(note: LibraryNote) {
    const position = notesApi.notes.findIndex((item) => item.id === note.id)
    notesApi.remove(note.id)
    toast('Note deleted', { action: { label: 'Undo', onClick: () => notesApi.restore(note, position) } })
  }

  function removeBookmark(bookmark: LibraryBookmark) {
    const position = bookmarksApi.bookmarks.findIndex((item) => item.id === bookmark.id)
    bookmarksApi.remove(bookmark.id)
    toast('Bookmark removed', { action: { label: 'Undo', onClick: () => bookmarksApi.restore(bookmark, position) } })
  }

  const rail = (
    <ChapterRail
      chapters={course.chapters}
      pages={pages}
      currentIndex={index ?? -1}
      visited={visited}
      onSelectPage={selectPage}
    />
  )

  const sidePanel = currentRef && page && (
    <ReaderSidePanel
      tab={panelTab}
      onTabChange={setPanelTab}
      currentRef={currentRef}
      currentTitle={page.title}
      notes={notesApi.notes}
      bookmarks={bookmarksApi.bookmarks}
      maxNoteLength={notesApi.maxLength}
      onAddNote={(text) => notesApi.add(currentRef, text)}
      onEditNote={notesApi.edit}
      onRemoveNote={removeNote}
      onRemoveBookmark={removeBookmark}
      onJump={jumpTo}
    />
  )

  const firstChapter = course.chapters[0]
  const introSubtitle = `${course.chapters.length} chapters${firstChapter ? ` · begins with ${firstChapter.title}` : ''}`

  return (
    <>
    <ReaderFrame frameRef={fullscreen.ref} inert={!introDone}>
      <BookTopBar
        courseId={course.id}
        courseTitle={course.title}
        chapterLabel={chapterLabel}
        pageNumber={index !== null ? index + 1 : null}
        totalPages={pages.length}
        online={online}
        railOpen={isDesktop ? railOpen : railDrawerOpen}
        onToggleRail={toggleRail}
        bookmarked={bookmarked}
        onToggleBookmark={toggleBookmark}
        notesOpen={panelOpen}
        onToggleNotes={() => openPanel('notes')}
        chatOpen={chatOpen}
        onToggleChat={() => (chatOpen ? setChatOpen(false) : openChat())}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        fontScale={fontScale}
        onFontScaleChange={setFontScale}
        fullscreen={fullscreen}
        disabled={!page}
      />

      <div className="relative z-10 flex min-h-0 flex-1">
        {isDesktop && railOpen && (
          <aside
            aria-label="Chapter navigation"
            className="w-64 shrink-0 overflow-y-auto border-r border-white/10 bg-black/15 p-3 backdrop-blur-md"
          >
            <p className="px-3 pt-1 pb-3 text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
              Contents
            </p>
            {rail}
          </aside>
        )}

        <main className="flex min-w-0 flex-1 flex-col gap-3 px-3 pt-4 pb-3 sm:px-6 lg:px-8 lg:pt-6">
          <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col">
            {showMissing ? (
              <BookMissing
                title="That page isn’t in the demo yet"
                description={`Chapter ${initialChapter}${initialPage ? `, page ${initialPage}` : ''} hasn’t been written for this demo. You can keep reading from the seeded pages.`}
                primary={{ href: `/book/${course.id}`, label: 'Continue reading' }}
                secondary={{ href: `/courses/${course.id}`, label: 'Back to course' }}
              />
            ) : page ? (
              <div ref={surfaceRef} tabIndex={-1} aria-label="Book pages" className="flex min-h-0 flex-1 flex-col outline-none">
              <BookSpread
                courseId={course.id}
                turn={turn}
                onTurnEnd={endTurn}
                page={page}
                pageLabel={`Page ${(index ?? 0) + 1} of ${pages.length}`}
                chapterTitle={chapterLabel}
                viewMode={viewMode}
                fontScale={fontScale}
                interests={personalization.interests}
                swipeHandlers={swipeHandlers}
                narration={{
                  words: stream.words,
                  activeIndex: stream.wordIndex,
                  streaming: streamingEnabled && stream.wordIndex >= 0,
                }}
                cueVisuals={cueVisuals}
                diagramProgress={streamingEnabled && stream.wordIndex >= 0 ? stream.progress : null}
              />
              </div>
            ) : (
              <BookSpreadSkeleton />
            )}
          </div>

          <nav
            aria-label="Page navigation"
            className="mx-auto flex w-full max-w-6xl flex-wrap items-end justify-between gap-x-3 gap-y-2 sm:flex-nowrap"
          >
            <button
              type="button"
              className={cn(navButton, 'sm:mb-0.5')}
              onClick={goPrevious}
              disabled={!page || index === 0 || showMissing}
            >
              <ChevronLeft className="size-4" aria-hidden="true" />
              <span className="hidden sm:inline">Previous</span>
              <span className="sr-only sm:hidden">Previous page</span>
            </button>

            <div className="order-first flex min-w-0 basis-full justify-center sm:order-none sm:flex-1 sm:basis-auto">
              {page && !showMissing ? (
                <VoiceDock
                  key={page.id}
                  page={page}
                  streamingEnabled={streamingEnabled}
                  stream={stream}
                  rate={narrationRate}
                  onRateChange={setNarrationRate}
                  muted={narrationMuted}
                  onMutedChange={setNarrationMuted}
                  onEnableGuided={() => setViewMode('guided')}
                  hasNextPage={index !== null && index < pages.length - 1}
                  onNextPage={() => {
                    stream.queueAutoplay()
                    goNext()
                  }}
                  queue={queue}
                  onQueueQuestion={queueQuestion}
                  tutorBusy={tutor.busy}
                  onAskTutor={tutor.ask}
                  onAskQueued={askQueued}
                  onOpenChat={openChat}
                />
              ) : (
                <div className="h-12" aria-hidden="true" />
              )}
            </div>

            <button
              type="button"
              className={cn(navButton, 'sm:mb-0.5')}
              onClick={goNext}
              disabled={!page || index === pages.length - 1 || showMissing}
            >
              <span className="hidden sm:inline">Next</span>
              <span className="sr-only sm:hidden">Next page</span>
              <ChevronRight className="size-4" aria-hidden="true" />
            </button>
          </nav>

          <p className="sr-only" aria-live="polite">
            {page && !showMissing ? `Page ${(index ?? 0) + 1} of ${pages.length}: ${page.title}` : ''}
          </p>
        </main>

        {isWide && panelOpen && (
          <aside
            aria-label="Notes and bookmarks"
            className="w-80 shrink-0 border-l border-white/10 bg-black/15 p-4 backdrop-blur-md"
          >
            {sidePanel}
          </aside>
        )}

        {isWide && chatOpen && (
          <aside
            aria-label="Course chat"
            className="flex w-96 shrink-0 flex-col border-l border-white/10 bg-black/15 p-4 backdrop-blur-md animate-in fade-in slide-in-from-right-4 duration-200"
          >
            <CourseChatPanel
              courseTitle={course.title}
              pageTitle={page?.title}
              tutor={tutor}
              onOpenSource={openSourcePage}
              onClose={() => setChatOpen(false)}
            />
          </aside>
        )}
      </div>

      {process.env.NODE_ENV === 'development' && <NarrationDevPanel stream={stream} cueLog={cueLog} />}

      {!isDesktop && (
        <Drawer open={railDrawerOpen} onOpenChange={setRailDrawerOpen} swipeDirection="left">
          <DrawerContent className="theme-night">
            <DrawerHeader>
              <DrawerTitle className="font-display text-lg">Contents</DrawerTitle>
            </DrawerHeader>
            <div className="overflow-y-auto px-3 pb-6">{rail}</div>
          </DrawerContent>
        </Drawer>
      )}

      {!isWide && (
        <Drawer open={panelOpen} onOpenChange={setPanelOpen} swipeDirection="right">
          <DrawerContent className="theme-night">
            <DrawerHeader>
              <DrawerTitle className="font-display text-lg">Notes &amp; bookmarks</DrawerTitle>
            </DrawerHeader>
            <div className="flex min-h-0 flex-1 flex-col px-4 pb-6">{sidePanel}</div>
          </DrawerContent>
        </Drawer>
      )}

      {!isWide && (
        <Drawer open={chatOpen} onOpenChange={setChatOpen} swipeDirection="right">
          <DrawerContent className="theme-night w-full sm:w-[26rem]">
            <DrawerHeader>
              <DrawerTitle className="font-display text-lg">Course chat</DrawerTitle>
            </DrawerHeader>
            <div className="flex min-h-0 flex-1 flex-col px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
              <CourseChatPanel
                courseTitle={course.title}
                pageTitle={page?.title}
                tutor={tutor}
                onOpenSource={openSourcePage}
                onClose={() => setChatOpen(false)}
                showTitle={false}
              />
            </div>
          </DrawerContent>
        </Drawer>
      )}
    </ReaderFrame>
    {!introDone && (
      <BookIntro courseId={course.id} title={course.title} subtitle={introSubtitle} onFinish={finishIntro} />
    )}
    </>
  )
}

function ReaderFrame({
  children,
  frameRef,
  inert,
}: {
  children: React.ReactNode
  frameRef?: React.Ref<HTMLDivElement>
  inert?: boolean
}) {
  return (
    <div
      ref={frameRef}
      inert={inert}
      className={cn('theme-night relative flex h-dvh flex-col overflow-hidden bg-night-gradient text-foreground')}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_45%,rgb(250_204_21/0.08),transparent_70%),radial-gradient(40%_40%_at_10%_0%,rgb(244_114_182/0.10),transparent_70%)]"
      />
      {children}
    </div>
  )
}
