export interface NarrationWord {
  index: number
  text: string
  sentence: number
}

export interface NarrationSentence {
  index: number
  /** Index of the first word in this sentence. */
  start: number
  /** Exclusive end word index. */
  end: number
  text: string
}

export interface NarrationScript {
  words: NarrationWord[]
  sentences: NarrationSentence[]
}

const SENTENCE_END = /[.!?]["')\]]?$/

export function tokenizeNarration(text: string): NarrationScript {
  const tokens = text.split(/\s+/).filter(Boolean)
  const words: NarrationWord[] = []
  const sentences: NarrationSentence[] = []
  let sentenceStart = 0

  tokens.forEach((token, index) => {
    words.push({ index, text: token, sentence: sentences.length })
    const isLast = index === tokens.length - 1
    if (SENTENCE_END.test(token) || isLast) {
      sentences.push({
        index: sentences.length,
        start: sentenceStart,
        end: index + 1,
        text: tokens.slice(sentenceStart, index + 1).join(' '),
      })
      sentenceStart = index + 1
    }
  })

  return { words, sentences }
}

/** Deterministic per-word dwell time so the simulation is predictable and testable. */
export function wordDelayMs(word: string, rate: number) {
  const base = 210 + Math.min(word.length, 12) * 22
  const pause = SENTENCE_END.test(word) ? 340 : /[,;:]$/.test(word) ? 150 : 0
  return Math.round((base + pause) / rate)
}
