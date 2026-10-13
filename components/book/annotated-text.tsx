import { Fragment } from 'react'

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Marks key terms with the yellow annotation style using text nodes only. */
export function AnnotatedText({ text, terms = [] }: { text: string; terms?: string[] }) {
  const usable = terms.filter(Boolean).sort((a, b) => b.length - a.length)
  if (usable.length === 0) return <>{text}</>

  // Lookarounds keep terms like "int" from matching inside "point" or "string".
  const pattern = new RegExp(`(?<!\\w)(${usable.map(escapeRegExp).join('|')})(?!\\w)`, 'gi')
  const lower = new Set(usable.map((term) => term.toLowerCase()))

  return (
    <>
      {text.split(pattern).map((part, index) =>
        lower.has(part.toLowerCase()) ? (
          <mark key={index} className="marker-highlight bg-transparent px-0.5 font-semibold text-foreground">
            {part}
          </mark>
        ) : (
          <Fragment key={index}>{part}</Fragment>
        ),
      )}
    </>
  )
}
