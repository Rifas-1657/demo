'use client'

import { useEffect, useState } from 'react'
import type { NarrationStream } from '@/lib/narration/use-narration-stream'
import type { NarrationCueEvent } from '@/types/book'

/** Development-only inspector, toggled with Alt+Shift+N. Never rendered in production builds. */
export function NarrationDevPanel({ stream, cueLog }: { stream: NarrationStream; cueLog: NarrationCueEvent[] }) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.altKey && event.shiftKey && event.code === 'KeyN') setOpen((value) => !value)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  if (!open) return null
  const last = stream.words.length - 1

  return (
    <aside
      aria-label="Narration debug"
      className="fixed bottom-3 left-3 z-50 w-72 rounded-2xl border border-white/15 bg-black/80 p-3 font-mono text-[11px] text-white/90 backdrop-blur"
    >
      <p className="font-semibold">narration debug</p>
      <p>
        status={stream.status} word={stream.wordIndex}/{stream.words.length} pass={stream.pass}
      </p>
      <p>player={stream.player.kind} sound={String(stream.player.producesSound)}</p>
      <div className="mt-2 flex flex-wrap gap-1">
        {[
          ['start', () => stream.restart()],
          ['near end', () => stream.seekToWord(Math.max(0, last - 2))],
          ['finish', () => stream.seekToWord(stream.words.length)],
        ].map(([label, action]) => (
          <button
            key={label as string}
            type="button"
            onClick={action as () => void}
            className="rounded border border-white/20 px-2 py-0.5 hover:bg-white/10"
          >
            {label as string}
          </button>
        ))}
      </div>
      <p className="mt-2 text-white/60">cues fired ({cueLog.length})</p>
      <ol className="max-h-32 overflow-y-auto">
        {cueLog.map((cue, index) => (
          <li key={`${cue.id}-${index}`}>
            @{cue.atWord} {cue.action} → {cue.targetId}
          </li>
        ))}
      </ol>
    </aside>
  )
}
