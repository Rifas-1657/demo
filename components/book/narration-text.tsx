import { Fragment } from 'react'
import type { NarrationWord } from '@/lib/narration/tokenize'
import { cn } from '@/lib/utils'

export interface NarrationTextState {
  words: NarrationWord[]
  /** Active word index; -1 = not started, >= words.length = finished. */
  activeIndex: number
  streaming: boolean
}

/** Word-by-word narration: spoken words in ink, the current word highlighted, upcoming words muted. */
export function NarrationText({ text, narration }: { text: string; narration?: NarrationTextState }) {
  if (!narration?.streaming) return <>{text}</>
  const { words, activeIndex } = narration

  return (
    <>
      {words.map((word, index) => (
        <Fragment key={index}>
          {index > 0 && ' '}
          <span
            className={cn(
              'rounded-[0.2em] transition-[color,background-color] duration-200',
              index === activeIndex &&
                'bg-book-marker/60 box-decoration-clone px-[0.12em] -mx-[0.12em] text-book-ink shadow-[0_0_0_1px_rgb(249_115_22/0.25)]',
              index > activeIndex && 'text-book-ink/25',
            )}
            aria-current={index === activeIndex ? 'true' : undefined}
          >
            {word.text}
          </span>
        </Fragment>
      ))}
    </>
  )
}
