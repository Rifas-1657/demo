'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { isApiConfigured, transcribeAudio } from '@/lib/api/client'

export type VoiceRecorderState = 'idle' | 'recording' | 'transcribing' | 'error'

const SUPPORTED_MIME_TYPES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/ogg;codecs=opus',
  'audio/mp4',
  'audio/wav',
]

function getSupportedMimeType(): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined
  return SUPPORTED_MIME_TYPES.find((mime) => MediaRecorder.isTypeSupported(mime))
}

export function useVoiceRecorder() {
  const [state, setState] = useState<VoiceRecorderState>('idle')
  const [duration, setDuration] = useState(0)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const streamRef = useRef<MediaStream | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const cleanupTracks = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    recorderRef.current = null
    chunksRef.current = []
  }, [])

  useEffect(() => {
    return () => {
      cleanupTracks()
    }
  }, [cleanupTracks])

  const startRecording = useCallback(async () => {
    setErrorMessage(null)

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setErrorMessage('Microphone not supported in this browser')
      setState('error')
      return false
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const mimeType = getSupportedMimeType()
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)
      recorderRef.current = recorder
      chunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data)
        }
      }

      recorder.start(250)
      setState('recording')
      setDuration(0)

      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1)
      }, 1000)

      return true
    } catch (err: unknown) {
      cleanupTracks()
      const domError = err as DOMException
      if (domError.name === 'NotAllowedError' || domError.name === 'PermissionDeniedError') {
        setErrorMessage('Microphone permission was denied')
      } else if (domError.name === 'NotFoundError') {
        setErrorMessage('No microphone device found')
      } else {
        setErrorMessage('Failed to start microphone recording')
      }
      setState('error')
      return false
    }
  }, [cleanupTracks])

  const stopAndTranscribe = useCallback(
    async (onSuccess: (transcript: string) => void) => {
      const recorder = recorderRef.current
      if (!recorder || state !== 'recording') return

      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }

      setState('transcribing')

      await new Promise<void>((resolve) => {
        recorder.onstop = () => resolve()
        recorder.stop()
      })

      // Collect audio blob
      const mime = recorder.mimeType || 'audio/webm'
      const audioBlob = new Blob(chunksRef.current, { type: mime })

      cleanupTracks()

      if (audioBlob.size === 0) {
        setErrorMessage('No audio recorded')
        setState('error')
        return
      }

      try {
        const res = await transcribeAudio(audioBlob)
        if (res.transcript) {
          onSuccess(res.transcript)
        }
        setState('idle')
      } catch (err: unknown) {
        setErrorMessage((err as Error)?.message || 'Speech transcription failed')
        setState('error')
      }
    },
    [cleanupTracks, state]
  )

  const cancelRecording = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop()
    }
    cleanupTracks()
    setState('idle')
    setDuration(0)
    setErrorMessage(null)
  }, [cleanupTracks])

  return {
    state,
    duration,
    errorMessage,
    startRecording,
    stopAndTranscribe,
    cancelRecording,
    isApiConfigured: isApiConfigured(),
  }
}
