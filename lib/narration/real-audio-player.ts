/**
 * Real Web Audio API player for narration segments.
 *
 * Enabled when NEXT_PUBLIC_BOOKEY_AUDIO=on.
 * Falls back silently to the mock when:
 *   - Web Audio API is unavailable
 *   - The flag is off (default)
 *
 * Features:
 * - Queue by seq so audio_chunk frames from the WebSocket play in order
 * - Word highlight sync via currentTimeMs callback
 * - Autoplay unlock on first user gesture
 * - Mute/speed/pause/flush controls
 */

import { createMockAudioPlayer, type AudioPlayer, type NarrationSegment } from './audio-player'

export type { AudioPlayer, NarrationSegment }

export interface AudioChunk {
  segmentId: string
  mime: string
  base64: string
  seq: number
  final: boolean
}

export interface RealAudioPlayerOptions {
  onCurrentTimeMs?: (ms: number) => void
  onChunkEnded?: (segmentId: string) => void
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

class WebAudioPlayer implements AudioPlayer {
  readonly kind = 'tts' as const
  readonly producesSound = true

  private ctx: AudioContext
  private gainNode: GainNode
  private rate = 1
  private muted = false
  private disposed = false

  // Pending chunks keyed by segmentId+seq
  private queue: { segmentId: string; buffer: AudioBuffer; seq: number }[] = []
  private currentSource: AudioBufferSourceNode | null = null
  private currentSegmentId: string | null = null
  private startTime = 0
  private pausedAt = 0
  private playing = false

  private onCurrentTimeMs?: (ms: number) => void
  private onChunkEnded?: (segmentId: string) => void
  private rafHandle: number | null = null

  constructor(options: RealAudioPlayerOptions = {}) {
    this.onCurrentTimeMs = options.onCurrentTimeMs
    this.onChunkEnded = options.onChunkEnded
    this.ctx = new AudioContext()
    this.gainNode = this.ctx.createGain()
    this.gainNode.connect(this.ctx.destination)
  }

  async enqueueChunk(chunk: AudioChunk): Promise<void> {
    if (this.disposed) return
    try {
      const raw = base64ToArrayBuffer(chunk.base64)
      const buffer = await this.ctx.decodeAudioData(raw)
      // Insert in seq order
      const item = { segmentId: chunk.segmentId, buffer, seq: chunk.seq }
      const insertAt = this.queue.findIndex((q) => q.seq > chunk.seq)
      if (insertAt === -1) this.queue.push(item)
      else this.queue.splice(insertAt, 0, item)
      if (this.playing && !this.currentSource) this.playNext()
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[web-audio-player] decode error:', err)
      }
    }
  }

  speak(_segment: NarrationSegment): void {
    // For the real player, audio arrives via enqueueChunk from audio_chunk frames.
    // This method is a no-op for compatibility with the AudioPlayer interface.
    this.playing = true
    this.startTimeTracking()
    this.playNext()
  }

  pause(): void {
    this.playing = false
    this.stopTimeTracking()
    if (this.currentSource) {
      this.pausedAt = this.ctx.currentTime - this.startTime
      this.currentSource.stop()
      this.currentSource = null
    }
  }

  resume(): void {
    if (this.playing) return
    this.playing = true
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume()
    }
    this.startTimeTracking()
    this.playNext()
  }

  stop(): void {
    this.playing = false
    this.queue = []
    this.pausedAt = 0
    this.stopTimeTracking()
    if (this.currentSource) {
      this.currentSource.stop()
      this.currentSource = null
    }
  }

  setRate(rate: number): void {
    this.rate = rate
    if (this.currentSource) this.currentSource.playbackRate.value = rate
  }

  setMuted(muted: boolean): void {
    this.muted = muted
    this.gainNode.gain.value = muted ? 0 : 1
  }

  dispose(): void {
    this.disposed = true
    this.stop()
    void this.ctx.close()
  }

  private playNext() {
    if (!this.playing || this.currentSource || this.queue.length === 0) return

    const item = this.queue.shift()!
    this.currentSegmentId = item.segmentId

    const source = this.ctx.createBufferSource()
    source.buffer = item.buffer
    source.playbackRate.value = this.rate
    source.connect(this.gainNode)
    this.gainNode.gain.value = this.muted ? 0 : 1

    const offset = this.pausedAt
    this.pausedAt = 0
    this.startTime = this.ctx.currentTime - offset

    source.start(0, offset)
    this.currentSource = source

    source.onended = () => {
      this.currentSource = null
      const segId = this.currentSegmentId
      if (segId && this.onChunkEnded) this.onChunkEnded(segId)
      this.currentSegmentId = null
      if (this.playing) this.playNext()
    }
  }

  private startTimeTracking() {
    if (this.rafHandle !== null || !this.onCurrentTimeMs) return
    const tick = () => {
      if (!this.disposed && this.playing && this.currentSource) {
        const ms = (this.ctx.currentTime - this.startTime) * 1000
        this.onCurrentTimeMs!(Math.max(0, ms))
      }
      this.rafHandle = requestAnimationFrame(tick)
    }
    this.rafHandle = requestAnimationFrame(tick)
  }

  private stopTimeTracking() {
    if (this.rafHandle !== null) {
      cancelAnimationFrame(this.rafHandle)
      this.rafHandle = null
    }
  }
}

/** Creates the appropriate audio player based on env flags and browser support. */
export function createAudioPlayer(options?: RealAudioPlayerOptions): AudioPlayer {
  const isEnabled = process.env.NEXT_PUBLIC_BOOKEY_AUDIO === 'on'
  const hasWebAudio = typeof AudioContext !== 'undefined' || typeof (window as unknown as { webkitAudioContext?: unknown }).webkitAudioContext !== 'undefined'

  if (isEnabled && hasWebAudio) {
    try {
      return new WebAudioPlayer(options)
    } catch {
      // Fall through to mock
    }
  }
  return createMockAudioPlayer()
}

export function isAudioEnabled(): boolean {
  return process.env.NEXT_PUBLIC_BOOKEY_AUDIO === 'on'
}
