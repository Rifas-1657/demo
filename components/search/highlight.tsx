import { Fragment } from 'react'

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Wraps matching terms in <mark> using React text nodes only — never raw HTML. */
export function Highlight({ text, terms }: { text: string; terms: string[] }) {
  const usable = terms.filter(Boolean).sort((a, b) => b.length - a.length)
  if (usable.length === 0) return <>{text}</>

  const pattern = new RegExp(`(${usable.map(escapeRegExp).join('|')})`, 'gi')
  const lowerTerms = new Set(usable.map((term) => term.toLowerCase()))

  return (
    <>
      {text.split(pattern).map((part, index) =>
        lowerTerms.has(part.toLowerCase()) ? (
          <mark key={index} className="rounded-sm bg-primary/20 px-0.5 font-semibold text-foreground">
            {part}
          </mark>
        ) : (
          <Fragment key={index}>{part}</Fragment>
        ),
      )}
    </>
  )
}
