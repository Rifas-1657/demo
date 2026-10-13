"use client";

import { useState, useRef, useCallback } from "react";

export function useVoice() {
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<BlobPart[]>([]);
  const audioContext = useRef<AudioContext | null>(null);
  const nextPlayTime = useRef<number>(0);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      audioChunks.current = [];

      mediaRecorder.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunks.current.push(e.data);
        }
      };

      mediaRecorder.current.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Microphone access denied", err);
    }
  }, []);

  const stopRecording = useCallback((): Promise<string> => {
    return new Promise((resolve) => {
      if (!mediaRecorder.current) return resolve("");

      mediaRecorder.current.onstop = () => {
        const audioBlob = new Blob(audioChunks.current, { type: "audio/webm" });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64data = reader.result as string;
          resolve(base64data.split(",")[1]);
        };
        setIsRecording(false);
      };

      mediaRecorder.current.stop();
    });
  }, []);

  const playAudioChunk = useCallback(async (base64: string) => {
    if (!audioContext.current) {
      audioContext.current = new window.AudioContext();
    }
    const ctx = audioContext.current;

    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    try {
      const audioBuffer = await ctx.decodeAudioData(bytes.buffer);
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);

      if (nextPlayTime.current < ctx.currentTime) {
        nextPlayTime.current = ctx.currentTime;
      }

      source.start(nextPlayTime.current);
      nextPlayTime.current += audioBuffer.duration;
      setIsPlaying(true);
      
      source.onended = () => {
        if (ctx.currentTime >= nextPlayTime.current) {
          setIsPlaying(false);
        }
      };
    } catch (e) {
      console.error("Error decoding audio data", e);
    }
  }, []);

  const pauseAudio = useCallback(() => {
    if (audioContext.current?.state === "running") {
      audioContext.current.suspend();
      setIsPlaying(false);
    }
  }, []);

  const resumeAudio = useCallback(() => {
    if (audioContext.current?.state === "suspended") {
      audioContext.current.resume();
      setIsPlaying(true);
    }
  }, []);

  return {
    isRecording,
    isPlaying,
    startRecording,
    stopRecording,
    playAudioChunk,
    pauseAudio,
    resumeAudio,
  };
}
