/**
 * Audio player implementation for Bookey narration.
 * Backed by the Bookey backend /api/voice/tts endpoint with:
 * - Module-scoped persistent URL and in-flight request cache
 * - Smooth pause/resume without re-fetching or re-synthesizing
 * - Rate limit (429) backoff cooldown
 * - Browser Web Speech API fallback when backend is unavailable
 */
export interface NarrationSegment {
  text: string
  rate: number
}

export interface AudioPlayer {
  readonly kind: 'mock' | 'tts' | 'prebuilt'
  /** False for the mock: the UI must not imply real audio is playing. */
  readonly producesSound: boolean
  speak(segment: NarrationSegment): void
  pause(): void
  resume(): void
  stop(): void
  seek?(fraction: number): void
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

/** AudioPlayer for prebuilt static audio assets (e.g. /audio/python-demo/page-01.mp3). */
export function createPrebuiltAudioPlayer(audioUrl: string): AudioPlayer {
  let audio: HTMLAudioElement | null = null
  let currentRate = 1.0
  let currentMuted = false
  let state: 'stopped' | 'speaking' | 'paused' = 'stopped'

  function getAudio(): HTMLAudioElement | null {
    if (typeof window === 'undefined') return null
    if (!audio) {
      audio = new Audio(audioUrl)
      audio.preload = 'auto'
      audio.playbackRate = currentRate
      audio.muted = currentMuted
      audio.onended = () => {
        state = 'stopped'
      }
    }
    return audio
  }

  return {
    kind: 'prebuilt',
    producesSound: true,
    speak(_segment: NarrationSegment) {
      state = 'speaking'
      const a = getAudio()
      if (!a) return
      a.playbackRate = currentRate
      a.muted = currentMuted
      if (a.paused) {
        a.play().catch((err) => {
          console.warn('[prebuilt-audio] Playback failed:', err)
        })
      }
    },
    pause() {
      state = 'paused'
      if (audio && !audio.paused) {
        audio.pause()
      }
    },
    resume() {
      state = 'speaking'
      const a = getAudio()
      if (a && a.paused) {
        a.playbackRate = currentRate
        a.muted = currentMuted
        a.play().catch((err) => {
          console.warn('[prebuilt-audio] Resume failed:', err)
        })
      }
    },
    stop() {
      state = 'stopped'
      if (audio) {
        audio.pause()
        audio.currentTime = 0
      }
    },
    seek(fraction: number) {
      if (audio && Number.isFinite(audio.duration) && audio.duration > 0) {
        audio.currentTime = Math.max(0, Math.min(audio.duration, audio.duration * fraction))
      }
    },
    setRate(rate: number) {
      currentRate = rate
      if (audio) {
        audio.playbackRate = rate
      }
    },
    setMuted(muted: boolean) {
      currentMuted = muted
      if (audio) {
        audio.muted = muted
      }
    },
    dispose() {
      state = 'stopped'
      if (audio) {
        audio.pause()
        audio.currentTime = 0
        audio = null
      }
    },
  }
}

// Module-level caches survive player recreation and component remounts
const GLOBAL_URL_CACHE = new Map<string, string>()
const GLOBAL_IN_FLIGHT = new Map<string, Promise<string>>()
let rateLimitCooldownUntil = 0

function fallbackBrowserSpeak(text: string, rate: number, muted: boolean) {
  if (muted || typeof window === 'undefined' || !('speechSynthesis' in window)) return
  try {
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = Math.max(0.7, Math.min(1.5, rate))
    utterance.lang = 'ta-IN'
    window.speechSynthesis.speak(utterance)
  } catch (e) {
    console.warn('[tts-player] Web Speech fallback failed:', e)
  }
}

/** Real TTS AudioPlayer backed by the Bookey backend /api/voice/tts endpoint. */
export function createTtsAudioPlayer(): AudioPlayer {
  let currentAudio: HTMLAudioElement | null = null
  let currentRate = 1.0
  let currentMuted = false
  let state: 'stopped' | 'speaking' | 'paused' = 'stopped'

  function fetchAudio(text: string): Promise<string> {
    const trimmed = text.trim()
    if (!trimmed) return Promise.reject(new Error('Empty text'))

    const cached = GLOBAL_URL_CACHE.get(trimmed)
    if (cached) return Promise.resolve(cached)

    const inFlight = GLOBAL_IN_FLIGHT.get(trimmed)
    if (inFlight) return inFlight

    if (Date.now() < rateLimitCooldownUntil) {
      return Promise.reject(new Error('TTS rate limited, waiting for cooldown'))
    }

    const promise = import('@/lib/api/client')
      .then(({ synthesizeSpeech }) => synthesizeSpeech(trimmed, undefined, currentRate))
      .then((blob) => {
        GLOBAL_IN_FLIGHT.delete(trimmed)
        const objectUrl = URL.createObjectURL(blob)
        GLOBAL_URL_CACHE.set(trimmed, objectUrl)
        return objectUrl
      })
      .catch((err) => {
        GLOBAL_IN_FLIGHT.delete(trimmed)
        const msg = String(err?.message || err)
        if (msg.includes('429') || msg.toLowerCase().includes('rate limit')) {
          rateLimitCooldownUntil = Date.now() + 5000 // 5s backoff
        }
        console.warn('[tts-player] speech synthesis failed:', err)
        throw err
      })

    GLOBAL_IN_FLIGHT.set(trimmed, promise)
    return promise
  }

  return {
    kind: 'tts',
    producesSound: true,
    speak(segment: NarrationSegment) {
      state = 'speaking'
      const text = segment.text.trim()
      if (!text) return

      // If current audio is already for this exact text:
      if (currentAudio && (currentAudio as unknown as { _text?: string })._text === text) {
        if (currentAudio.paused) {
          currentAudio.playbackRate = currentRate
          currentAudio.muted = currentMuted
          currentAudio.play().catch((err) => {
            console.warn('[tts-player] Resume playback failed:', err)
          })
        }
        return
      }

      // Stop previous playback if different text
      if (currentAudio) {
        currentAudio.pause()
        currentAudio = null
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel()
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
        .catch(() => {
          // Graceful fallback to browser speech synthesis
          if (state === 'speaking') {
            fallbackBrowserSpeak(text, currentRate, currentMuted)
          }
        })
    },
    pause() {
      state = 'paused'
      if (currentAudio) {
        currentAudio.pause()
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.pause()
      }
    },
    resume() {
      state = 'speaking'
      if (currentAudio && currentAudio.paused) {
        currentAudio.play().catch((err) => {
          console.warn('[tts-player] Resume playback failed:', err)
        })
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis.paused) {
        window.speechSynthesis.resume()
      }
    },
    stop() {
      state = 'stopped'
      if (currentAudio) {
        currentAudio.pause()
        currentAudio.currentTime = 0
        currentAudio = null
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel()
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
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel()
      }
    },
  }
}
