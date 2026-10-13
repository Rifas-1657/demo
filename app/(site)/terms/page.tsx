import type { Metadata } from 'next'
import { LegalDocument, type LegalSection } from '@/components/site/legal-document'

export const metadata: Metadata = {
  title: 'Terms (draft)',
  description: 'Prototype draft of the Bookey terms of use. This draft will be replaced with reviewed legal copy before launch.',
}

const SECTIONS: LegalSection[] = [
  {
    id: 'about-these-terms',
    title: 'About these terms',
    body: (
      <p>
        These draft terms describe how the Bookey prototype is intended to be used. They will be replaced by reviewed terms
        before any public launch.
      </p>
    ),
  },
  {
    id: 'prototype-status',
    title: 'Prototype status',
    body: (
      <>
        <p>Bookey is currently a demonstration. In particular:</p>
        <ul>
          <li>Book generation from your own sources is simulated</li>
          <li>Pricing is illustrative and checkout is not connected</li>
          <li>Features may change, break, or be removed without notice</li>
        </ul>
      </>
    ),
  },
  {
    id: 'acceptable-use',
    title: 'Acceptable use',
    body: (
      <p>
        Use the demo for personal evaluation. Do not attempt to disrupt the service, access it in ways it was not designed for, or
        use it to infringe others’ rights.
      </p>
    ),
  },
  {
    id: 'content',
    title: 'Content and ownership',
    body: (
      <p>
        The demo book is sample material provided for illustration. When uploads are supported, you will need the rights to any
        source you turn into a book, and the reviewed terms will explain who owns generated content.
      </p>
    ),
  },
  {
    id: 'no-warranty',
    title: 'No warranty',
    body: (
      <p>
        The prototype is provided as is, without guarantees of availability or accuracy. Do not rely on it for important
        decisions.
      </p>
    ),
  },
  {
    id: 'changes',
    title: 'Changes and contact',
    body: <p>These terms will change before launch. A contact address will be included in the reviewed version.</p>,
  },
]

export default function TermsPage() {
  return (
    <LegalDocument
      eyebrow="Terms"
      title="Terms of use"
      lead="The ground rules for using the Bookey prototype, in plain language."
      updated="October 2026"
      sections={SECTIONS}
    />
  )
}
