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
