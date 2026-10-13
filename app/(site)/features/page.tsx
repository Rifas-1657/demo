import { BookOpen } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { ROUTES } from '@/components/landing/data'
import { FeatureIndex } from '@/components/features/feature-index'
import { FeatureChapter } from '@/components/features/feature-chapter'
import {
  DiagramMock,
  NarrationMock,
  NotesMock,
  PersonalizeMock,
  PracticeMock,
  ProgressMock,
  QuestionsMock,
  ReaderMock,
} from '@/components/features/feature-mocks'
import { CtaBand } from '@/components/site/cta-band'
import { PageHero } from '@/components/site/page-hero'
import { Book3D } from '@/components/ui-kit/book-3d/book-3d'
import { MagneticButton } from '@/components/ui-kit/magnetic-button'

export const metadata: Metadata = {
  title: 'Features',
  description:
    'Interactive books, voice narration, animated diagrams, runnable code, a tutor that cites your source, and progress that remembers where you left off.',
}

const FEATURES = [
  {
    id: 'interactive-books',
    label: 'Interactive books',
    title: 'Long videos, rebuilt as books you can move through.',
    body: 'Bookey restructures a lecture or conversation into chapters and short pages, so you can skim, jump, and come back without scrubbing a timeline.',
    points: ['Chapters and pages generated from the source structure', 'Highlight any passage as you read', 'Jump to the exact moment in the original'],
    visual: <ReaderMock />,
  },
  {
    id: 'voice-narration',
    label: 'Voice narration',
    title: 'Listen while you read, word by word.',
    body: 'Every page can be narrated aloud with the transcript lighting up in sync, so you can follow along, slow down, or switch to listening on the go.',
    points: ['Word-level highlighting during playback', 'Adjustable speed from 0.8× to 1.5×', 'Pick up narration where you paused'],
    visual: <NarrationMock />,
  },
  {
    id: 'animated-diagrams',
    label: 'Animated diagrams',
    title: 'Diagrams that draw as the idea unfolds.',
    body: 'Instead of a static figure, concepts are sketched step by step alongside the narration, so the shape of an idea builds in the order it is explained.',
    points: ['Flowcharts, timelines, and concept maps', 'Steps appear in sync with narration', 'Replay any figure on its own'],
    visual: <DiagramMock />,
  },
  {
    id: 'code-practice',
    label: 'Code practice',
    title: 'Edit the example. Run it. See what changes.',
    body: 'Technical books include practice snippets you can modify and run right on the page. No local setup, no copy-pasting into another tool.',
    points: ['Runs in the browser, nothing to install', 'Reset to the original example anytime', 'Output shown inline under the code'],
    visual: <PracticeMock />,
    status: 'Python demo',
  },
  {
    id: 'ask-questions',
    label: 'Ask questions',
    title: 'A tutor that answers from your source first.',
    body: 'Ask by voice or text. Answers point back to where they came from in the original material, and the tutor says so when it goes beyond it.',
    points: ['Every answer links to a source moment', 'Clearly flags anything outside the source', 'Follow-up questions keep context'],
    visual: <QuestionsMock />,
  },
  {
    id: 'personalized-learning',
    label: 'Personalized learning',
    title: 'Set the depth, the pace, and the style.',
    body: 'Tell Bookey how you like to learn. Explanations, examples, and practice adjust to your level and the time you have each day.',
    points: ['Choose depth from foundations to advanced', 'Set a daily pace that fits your schedule', 'Prefer analogies, diagrams, or code first'],
    visual: <PersonalizeMock />,
    status: 'Planned',
  },
  {
    id: 'notes-bookmarks',
    label: 'Notes & bookmarks',
    title: 'Leave yourself a trail through the book.',
    body: 'Bookmark pages, pin notes to passages or figures, and find everything again in one place when you come back to review.',
    points: ['Notes anchored to pages and figures', 'Bookmarks you can browse by chapter', 'Export notes as plain text'],
    visual: <NotesMock />,
  },
  {
    id: 'progress-tracking',
    label: 'Progress tracking',
    title: 'Always know where you are, and what is next.',
    body: 'Your place is saved on every page. See completion by chapter, keep a gentle streak, and resume exactly where you stopped.',
    points: ['Resume on the exact page', 'Completion by chapter and course', 'Streaks that motivate, not punish'],
    visual: <ProgressMock />,
  },
]

export default function FeaturesPage() {
  return (
    <>
      <PageHero
        eyebrow="Features"
        title={
          <>
            Everything a book can do, <span className="text-brand-pink">and a few things it never could.</span>
          </>
        }
        lead="Bookey turns long-form learning into interactive books. Here is every part of the experience, chapter by chapter."
        aside={
          <div className="mx-auto aspect-square w-full max-w-sm">
            <Book3D
              title="Python from Zero"
              author="Bookey demo"
              cover={{ base: '#E11D48', spine: '#9F1239', accent: '#FFE4E6', text: '#FFFFFF' }}
              className="size-full"
            />
          </div>
        }
      >
        <MagneticButton size="lg" nativeButton={false} render={<Link href={ROUTES.demoCourse} />}>
          <BookOpen aria-hidden="true" />
          Open demo course
        </MagneticButton>
      </PageHero>

      <FeatureIndex items={FEATURES.map(({ id, label }) => ({ id, label }))} />

      <div className="divide-y divide-border">
        {FEATURES.map((feature, i) => (
          <FeatureChapter key={feature.id} index={String(i + 1).padStart(2, '0')} flip={i % 2 === 1} {...feature} />
        ))}
      </div>

      <CtaBand />
    </>
  )
}
