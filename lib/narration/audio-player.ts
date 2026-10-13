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
  let currentRequestId = 0

  return {
    kind: 'tts',
    producesSound: true,
    speak(segment: NarrationSegment) {
      state = 'speaking'
      const text = segment.text.trim()
      if (!text) return

      const thisRequestId = ++currentRequestId

      // Stop previous playback
      if (currentAudio) {
        currentAudio.pause()
        currentAudio = null
      }

      // Check cache first
      const cachedUrl = urlCache.get(text)
      if (cachedUrl) {
        const audio = new Audio(cachedUrl)
        currentAudio = audio
        audio.playbackRate = currentRate
        audio.muted = currentMuted
        if (state === 'speaking') {
          audio.play().catch(() => {})
        }
        return
      }

      // Dynamically fetch from backend TTS API
      import('@/lib/api/client')
        .then(({ synthesizeSpeech }) => synthesizeSpeech(text, undefined, currentRate))
        .then((blob) => {
          if (thisRequestId !== currentRequestId) return
          const objectUrl = URL.createObjectURL(blob)
          urlCache.set(text, objectUrl)
          const audio = new Audio(objectUrl)
          currentAudio = audio
          audio.playbackRate = currentRate
          audio.muted = currentMuted
          if (state === 'speaking') {
            audio.play().catch(() => {})
          }
        })
        .catch((err) => {
          console.warn('[tts-player] speech synthesis failed:', err)
        })
    },
    pause() {
      state = 'paused'
      if (currentAudio) {
        currentAudio.pause()
      }
    },
    resume() {
      state = 'speaking'
      if (currentAudio) {
        currentAudio.play().catch(() => {})
      }
    },
    stop() {
      state = 'stopped'
      currentRequestId++
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
      currentRequestId++
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

