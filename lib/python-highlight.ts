export type PythonTokenKind = 'plain' | 'keyword' | 'builtin' | 'string' | 'number' | 'comment'

export interface PythonToken {
  kind: PythonTokenKind
  text: string
}

const TOKEN_PATTERN =
  /(#.*$)|("(?:[^"\\]|\\.)*"?|'(?:[^'\\]|\\.)*'?)|\b(and|as|break|class|continue|def|elif|else|for|from|if|import|in|is|lambda|not|or|pass|return|while|with|True|False|None)\b|\b(print|input|int|float|str|bool|list|type|len|range)\b|\b(\d+(?:\.\d+)?)\b/g

/** Tiny single-line Python tokenizer for display only (streaming view and plain editor). */
export function tokenizePythonLine(line: string): PythonToken[] {
  const tokens: PythonToken[] = []
  let cursor = 0
  for (const match of line.matchAll(TOKEN_PATTERN)) {
    const start = match.index ?? 0
    if (start > cursor) tokens.push({ kind: 'plain', text: line.slice(cursor, start) })
    const kind: PythonTokenKind = match[1]
      ? 'comment'
      : match[2]
        ? 'string'
        : match[3]
          ? 'keyword'
          : match[4]
            ? 'builtin'
            : 'number'
    tokens.push({ kind, text: match[0] })
    cursor = start + match[0].length
  }
  if (cursor < line.length) tokens.push({ kind: 'plain', text: line.slice(cursor) })
  return tokens
}

/** Shared with the Monaco theme so both editors read the same. */
export const codePalette = {
  background: '#1d160c',
  surface: '#271d10',
  foreground: '#fdf6e3',
  gutter: '#8a7756',
  activeLine: '#3a2b14',
  selection: '#5c4520',
  keyword: '#fb923c',
  builtin: '#fcd34d',
  string: '#c5e1a5',
  number: '#f9b4a0',
  comment: '#a8956f',
} as const

export const tokenClass: Record<PythonTokenKind, string> = {
  plain: 'text-[#fdf6e3]',
  keyword: 'text-[#fb923c] font-semibold',
  builtin: 'text-[#fcd34d]',
  string: 'text-[#c5e1a5]',
  number: 'text-[#f9b4a0]',
  comment: 'text-[#a8956f] italic',
}
