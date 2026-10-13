/**
 * Seam for a future text-to-speech engine. The narration stream drives this
 * interface; today only the silent mock exists, so nothing is ever played.
 */
export interface NarrationSegment {
  text: string
  rate: number
}

export interface AudioPlayer {
  readonly kind: 'mock' | 'tts'
  /** False for the mock: the UI must not imply real audio is playing. */
  readonly producesSound: boolean
  speak(segment: NarrationSegment): void
  pause(): void
  resume(): void
  stop(): void
  setRate(rate: number): void
  setMuted(muted: boolean): void
  dispose(): void
}

/** Silent stand-in that only tracks state, so a real TTS player can be swapped in later. */
export function createMockAudioPlayer(): AudioPlayer {
  let state: 'stopped' | 'speaking' | 'paused' = 'stopped'
  return {
    kind: 'mock',
    producesSound: false,
    speak() {
      state = 'speaking'
    },
    pause() {
      if (state === 'speaking') state = 'paused'
    },
    resume() {
      if (state === 'paused') state = 'speaking'
    },
    stop() {
      state = 'stopped'
    },
    setRate() {},
    setMuted() {},
    dispose() {
      state = 'stopped'
    },
  }
}

/** Real TTS AudioPlayer backed by the Bookey backend /api/voice/tts endpoint. */
export function createTtsAudioPlayer(): AudioPlayer {
  let currentAudio: HTMLAudioElement | null = null
  let currentRate = 1.0
  let currentMuted = false
  let state: 'stopped' | 'speaking' | 'paused' = 'stopped'
  const urlCache = new Map<string, string>()
  const inFlight = new Set<string>()

  function fetchAudio(text: string): Promise<string> {
    const trimmed = text.trim()
    if (!trimmed) return Promise.reject(new Error('Empty text'))
    const cached = urlCache.get(trimmed)
    if (cached) return Promise.resolve(cached)

    if (inFlight.has(trimmed)) {
      return new Promise((resolve, reject) => {
        let attempts = 0
        const check = setInterval(() => {
          attempts++
          const c = urlCache.get(trimmed)
          if (c) {
            clearInterval(check)
            resolve(c)
          } else if (!inFlight.has(trimmed) || attempts > 100) {
            clearInterval(check)
            reject(new Error('Fetch timed out or failed'))
          }
        }, 100)
      })
    }

    inFlight.add(trimmed)
    return import('@/lib/api/client')
      .then(({ synthesizeSpeech }) => synthesizeSpeech(trimmed, undefined, currentRate))
      .then((blob) => {
        inFlight.delete(trimmed)
        const objectUrl = URL.createObjectURL(blob)
        urlCache.set(trimmed, objectUrl)
        return objectUrl
      })
      .catch((err) => {
        inFlight.delete(trimmed)
        console.warn('[tts-player] speech synthesis failed:', err)
        throw err
      })
  }

  return {
    kind: 'tts',
    producesSound: true,
    speak(segment: NarrationSegment) {
      state = 'speaking'
      const text = segment.text.trim()
      if (!text) return

      // If current audio is already playing this exact text, keep playing
      if (currentAudio && !currentAudio.paused && (currentAudio as unknown as { _text?: string })._text === text) {
        return
      }

      // Stop previous playback if different text
      if (currentAudio) {
        currentAudio.pause()
        currentAudio = null
      }

      fetchAudio(text)
        .then((objectUrl) => {
          if (state !== 'speaking') return
          // If another audio has already started and is playing, don't clobber it
          if (currentAudio && !currentAudio.paused) return

          const audio = new Audio(objectUrl)
          ;(audio as unknown as { _text?: string })._text = text
          currentAudio = audio
          audio.playbackRate = currentRate
          audio.muted = currentMuted
          audio.onended = () => {
            if (currentAudio === audio) {
              currentAudio = null
            }
          }
          audio.play().catch((err) => {
            console.warn('[tts-player] Playback failed (browser policy or decode error):', err)
          })
        })
        .catch(() => {})
    },
    pause() {
      state = 'paused'
      if (currentAudio) {
        currentAudio.pause()
      }
    },
    resume() {
      state = 'speaking'
      if (currentAudio && currentAudio.paused) {
        currentAudio.play().catch((err) => {
          console.warn('[tts-player] Resume playback failed:', err)
        })
      }
    },
    stop() {
      state = 'stopped'
      if (currentAudio) {
        currentAudio.pause()
        currentAudio.currentTime = 0
        currentAudio = null
      }
    },
    setRate(rate: number) {
      currentRate = rate
      if (currentAudio) {
        currentAudio.playbackRate = rate
      }
    },
    setMuted(muted: boolean) {
      currentMuted = muted
      if (currentAudio) {
        currentAudio.muted = muted
      }
    },
    dispose() {
      state = 'stopped'
      if (currentAudio) {
        currentAudio.pause()
        currentAudio = null
      }
      for (const url of urlCache.values()) {
        try {
          URL.revokeObjectURL(url)
        } catch {}
      }
      urlCache.clear()
    },
  }
}

