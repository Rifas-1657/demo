export type FaqCategory = 'books' | 'narration' | 'content' | 'privacy' | 'accessibility' | 'future'

export const FAQ_CATEGORIES: [FaqCategory, string][] = [
  ['books', 'Videos to books'],
  ['narration', 'Narration'],
  ['content', 'Learning content'],
  ['privacy', 'Privacy in this demo'],
  ['accessibility', 'Accessibility'],
  ['future', 'Future capabilities'],
]

export const FAQ_ITEMS: { category: FaqCategory; q: string; a: string }[] = [
  {
    category: 'books',
    q: 'What does “turning a video into a book” actually mean?',
    a: 'The source is transcribed and reorganized into chapters and short pages, each focused on one idea. Diagrams, narration, and practice are added where they help. You get the substance of the original in a form you can skim, search, and revisit.',
  },
  {
    category: 'books',
    q: 'Does Bookey summarize away important detail?',
    a: 'The goal is restructuring, not shortening. Key reasoning and examples are kept, and every page links back to the moment in the source it came from, so you can always check the original.',
  },
  {
    category: 'books',
    q: 'How long should a source be?',
    a: 'Bookey is designed for long-form material, roughly 20 minutes and up: lectures, workshops, podcasts, and recorded conversations. Short clips work but gain less from being structured.',
  },
  {
    category: 'narration',
    q: 'Can I listen instead of reading?',
    a: 'Yes. Every page can be narrated, with each word highlighted as it is spoken. You can pause, change speed, and pick up where you left off.',
  },
  {
    category: 'narration',
    q: 'Is the narration the original speaker’s voice?',
    a: 'No. In the demo, narration uses a synthesized reading voice. Using an original speaker’s voice would require their explicit permission.',
  },
  {
    category: 'content',
    q: 'What kinds of learning content work best?',
    a: 'Explanatory material with a clear thread: technical tutorials, university lectures, professional training, and interviews with experts. Highly visual content such as live demonstrations translates less directly.',
  },
  {
    category: 'content',
    q: 'Which languages are supported for code practice?',
    a: 'The demo includes Python examples you can edit and run in the browser. Support for more languages is on the roadmap.',
  },
  {
    category: 'privacy',
    q: 'Does this demo upload my files to a server?',
    a: 'No. This prototype does not upload files to a server. The demo book ships with the app, and nothing you type or select is sent to Bookey.',
  },
  {
    category: 'privacy',
    q: 'Where are my notes and progress stored?',
    a: 'In the demo, notes, bookmarks, and reading progress are kept in your browser only. Clearing site data removes them. There is no server-side account data in this prototype.',
  },
  {
    category: 'privacy',
    q: 'Do you track what I read?',
    a: 'The prototype does not send reading activity anywhere. If analytics are added later, they will be described in the privacy policy before launch.',
  },
  {
    category: 'accessibility',
    q: 'Can I use Bookey with a keyboard or screen reader?',
    a: 'Yes. Navigation, the reader, and interactive elements are keyboard accessible and labelled for screen readers. Narration includes a synced transcript.',
  },
  {
    category: 'accessibility',
    q: 'What if animations make me uncomfortable?',
    a: 'Bookey follows your system’s reduced-motion setting. Diagrams appear complete instead of drawing, and decorative motion is turned off.',
  },
  {
    category: 'future',
    q: 'When can I generate books from my own videos?',
    a: 'That requires a backend for processing sources, which does not exist yet. It is the next major milestone; the How it works page shows the planned flow as a simulation.',
  },
  {
    category: 'future',
    q: 'Will there be accounts and synced progress?',
    a: 'Yes, accounts with progress synced across devices are planned alongside generation. Until then, the demo runs entirely in your browser.',
  },
  {
    category: 'future',
    q: 'Can educators publish books for their learners?',
    a: 'A Creator plan for publishing and sharing books is planned. It is shown on the pricing page as an example tier and is not available yet.',
  },
]
