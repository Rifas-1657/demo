/**
 * Push-to-talk microphone component.
 *
 * Enabled by NEXT_PUBLIC_BOOKEY_MIC=on.
 * Hidden when the flag is off (default).
 *
 * Features:
 * - getUserMedia + MediaRecorder
 * - Simple voice activity detection (VAD) via AnalyserNode
 * - Permission dialog with clear states
 * - Error handling for permission denied, NotSupported, etc.
 * - Emits audio_in client events via the BookClient
 */
'use client'

import { Mic, MicOff, Loader2 } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

export type MicState = 'idle' | 'requesting' | 'active' | 'processing' | 'denied' | 'unsupported' | 'error'

export interface AudioInPayload {
  sessionId: string | null
  seq: number
  mime: string
  base64: string
  final: boolean
}

export interface PushToTalkProps {
  sessionId: string | null
  disabled?: boolean
  className?: string
  onAudioIn?: (payload: AudioInPayload) => void
}

const MIME_TYPES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4']

function getSupportedMimeType(): string | null {
  if (typeof MediaRecorder === 'undefined') return null
  return MIME_TYPES.find((mime) => MediaRecorder.isTypeSupported(mime)) ?? null
}

function base64Encode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

/** Simple energy-based VAD: true when the RMS level exceeds the threshold. */
function createVAD(stream: MediaStream, onSpeaking: (speaking: boolean) => void) {
  const ctx = new AudioContext()
  const source = ctx.createMediaStreamSource(stream)
  const analyser = ctx.createAnalyser()
  analyser.fftSize = 256
  source.connect(analyser)
  const buf = new Uint8Array(analyser.frequencyBinCount)
  let speaking = false
  let rafHandle = 0

  const tick = () => {
    analyser.getByteFrequencyData(buf)
    const rms = Math.sqrt(buf.reduce((sum, v) => sum + v * v, 0) / buf.length)
    const isSpeaking = rms > 12 // threshold tuned for typical microphones
    if (isSpeaking !== speaking) {
      speaking = isSpeaking
      onSpeaking(speaking)
    }
    rafHandle = requestAnimationFrame(tick)
  }
  rafHandle = requestAnimationFrame(tick)

  return () => {
    cancelAnimationFrame(rafHandle)
    source.disconnect()
    void ctx.close()
  }
}

let seqCounter = 0

export function PushToTalk({ sessionId, disabled, className, onAudioIn }: PushToTalkProps) {
  const [state, setState] = useState<MicState>('idle')
  const [speaking, setSpeaking] = useState(false)
  const streamRef = useRef<MediaStream | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const stopVAD = useRef<(() => void) | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const mimeRef = useRef<string | null>(null)

  const stopRecording = useCallback(async () => {
    const recorder = recorderRef.current
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop()
    }
    stopVAD.current?.()
    stopVAD.current = null
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    recorderRef.current = null
    setState('idle')
    setSpeaking(false)
  }, [])

  const startRecording = useCallback(async () => {
    const mime = getSupportedMimeType()
    if (!mime) {
      setState('unsupported')
      return
    }
    mimeRef.current = mime

    setState('requesting')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      streamRef.current = stream

      const recorder = new MediaRecorder(stream, { mimeType: mime })
      recorderRef.current = recorder
      chunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.onstop = async () => {
        setState('processing')
        const blob = new Blob(chunksRef.current, { type: mime })
        const buffer = await blob.arrayBuffer()
        const base64 = base64Encode(buffer)
        seqCounter += 1
        onAudioIn?.({
          sessionId,
          seq: seqCounter,
          mime,
          base64,
          final: true,
        })
        setState('idle')
        chunksRef.current = []
      }

      recorder.start(250) // collect chunks every 250ms for streaming
      setState('active')

      stopVAD.current = createVAD(stream, setSpeaking)
    } catch (err) {
      const name = (err as DOMException)?.name
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        setState('denied')
      } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        setState('unsupported')
      } else {
        setState('error')
        console.warn('[push-to-talk]', err)
      }
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
  }, [sessionId, onAudioIn])

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.currentTarget.setPointerCapture(e.pointerId)
      void startRecording()
    },
    [startRecording],
  )

  const handlePointerUp = useCallback(() => {
    void stopRecording()
  }, [stopRecording])

  useEffect(() => {
    return () => {
      void stopRecording()
    }
  }, [stopRecording])

  const isActive = state === 'active'
  const isProcessing = state === 'processing' || state === 'requesting'
  const isError = state === 'denied' || state === 'unsupported' || state === 'error'

  const ariaLabel =
    state === 'denied' ? 'Microphone permission denied' :
    state === 'unsupported' ? 'Microphone not supported' :
    state === 'active' ? 'Release to stop recording' :
    state === 'processing' ? 'Processing audio…' :
    'Hold to speak'

  const errorMessage =
    state === 'denied' ? 'Allow microphone access in browser settings.' :
    state === 'unsupported' ? 'Microphone not available in this browser.' :
    state === 'error' ? 'Microphone error. Try again.' :
    null

  return (
    <div className={cn('flex flex-col items-center gap-1', className)}>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-pressed={isActive}
        disabled={disabled || isProcessing}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className={cn(
          'relative flex h-11 w-11 items-center justify-center rounded-full border transition-all select-none',
          'focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
          isActive && 'scale-110 border-rose-400 bg-rose-500 text-white shadow-lg shadow-rose-500/40',
          isActive && speaking && 'animate-pulse',
          isProcessing && 'cursor-wait border-muted-foreground/30 bg-muted text-muted-foreground',
          isError && 'border-destructive/30 bg-destructive/10 text-destructive',
          !isActive && !isProcessing && !isError && 'border-white/20 bg-white/10 text-foreground hover:bg-white/20',
          disabled && 'cursor-not-allowed opacity-40',
        )}
      >
        {isProcessing ? (
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        ) : isError ? (
          <MicOff className="size-4" aria-hidden="true" />
        ) : (
          <Mic className="size-4" aria-hidden="true" />
        )}
        {isActive && (
          <span
            aria-hidden="true"
            className="absolute inset-0 animate-ping rounded-full border-2 border-rose-400 opacity-40"
          />
        )}
      </button>
      {errorMessage && (
        <p role="alert" className="max-w-[12rem] text-center text-[0.65rem] text-destructive">
          {errorMessage}
        </p>
      )}
    </div>
  )
}

/** Returns true when the mic feature is enabled via the env flag. */
export function isMicEnabled(): boolean {
  return process.env.NEXT_PUBLIC_BOOKEY_MIC === 'on'
}
