import type { Metadata } from 'next'
import { LegalDocument, type LegalSection } from '@/components/site/legal-document'

export const metadata: Metadata = {
  title: 'Privacy (draft)',
  description: 'Prototype draft of the Bookey privacy policy. This draft will be replaced with reviewed legal copy before launch.',
}

const SECTIONS: LegalSection[] = [
  {
    id: 'summary',
    title: 'Summary',
    body: (
      <p>
        <strong>In this prototype, Bookey does not collect personal data on a server.</strong> The demo book is bundled with the
        app, and anything you create while using it stays in your browser.
      </p>
    ),
  },
  {
    id: 'what-we-store',
    title: 'What the demo stores',
    body: (
      <>
        <p>The demo may save the following in your browser’s local storage so you can pick up where you left off:</p>
        <ul>
          <li>Reading progress and the last page you opened</li>
          <li>Notes and bookmarks you create</li>
          <li>Display preferences such as narration speed</li>
        </ul>
        <p>You can remove this data at any time by clearing site data in your browser settings.</p>
      </>
    ),
  },
  {
    id: 'uploads',
    title: 'Uploads and sources',
    body: <p>The prototype does not upload files to a server. Generating books from your own sources is not available yet.</p>,
  },
  {
    id: 'future-accounts',
    title: 'Future accounts',
    body: (
      <p>
        When accounts and generation are introduced, this section will describe what account data is collected, why, how long it
        is kept, and how you can export or delete it.
      </p>
    ),
  },
  {
    id: 'third-parties',
    title: 'Third-party services',
    body: (
      <p>
        Hosting providers may process standard technical request data, such as IP address and browser type, to deliver the site.
        Any analytics or processing partners will be listed here before public launch.
      </p>
    ),
  },
  {
    id: 'your-rights',
    title: 'Your rights',
    body: (
      <p>
        Depending on where you live, you may have rights to access, correct, or delete personal data. The reviewed policy will
        explain how to exercise them.
      </p>
    ),
  },
  {
    id: 'changes',
    title: 'Changes and contact',
    body: <p>This draft will be replaced. A contact address for privacy questions will be added in the reviewed version.</p>,
  },
]

export default function PrivacyPage() {
  return (
    <LegalDocument
      eyebrow="Privacy"
      title="Privacy policy"
      lead="How the Bookey prototype handles your information, in plain language."
      updated="October 2026"
      sections={SECTIONS}
    />
  )
}
