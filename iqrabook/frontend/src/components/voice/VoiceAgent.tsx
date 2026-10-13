"use client";

import { useEffect, useState, useCallback } from "react";
import { useVoice } from "@/hooks/useVoice";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useSessionStore } from "@/stores/sessionStore";

interface VoiceAgentProps {
  sessionId: string;
}

export function VoiceAgent({ sessionId }: VoiceAgentProps) {
  const { isRecording, isPlaying, startRecording, stopRecording, playAudioChunk } = useVoice();
  const { sendInterrupt, sendAudio, subscribe } = useWebSocket(sessionId);
  const isPaused = useSessionStore((s) => s.voice.isPaused);
  const setPaused = useSessionStore((s) => s.setPaused);

  const [status, setStatus] = useState<string>("🎙️ Tap to ask");
  const [currentWord, setCurrentWord] = useState("");

  useEffect(() => {
    if (isRecording) setStatus("🔴 Pesunga...");
    else if (isPaused) setStatus("⏸️ Waiting for answer...");
    else if (isPlaying) setStatus("🔊 AI pesudu...");
    else setStatus("🎙️ Tap to ask");
  }, [isRecording, isPlaying, isPaused]);

  useEffect(() => {
    const unsub = subscribe("audio", (msg: any) => {
      if (msg.data) {
        playAudioChunk(msg.data);
      }
    });
    const unsubText = subscribe("text", (msg: any) => {
      const word = String(msg.content || "").trim();
      if (word) setCurrentWord(word);
    });
    const unsubControl = subscribe("control", (msg: any) => {
      if (msg.action === "paused") setPaused(true);
      if (msg.action === "resume") setPaused(false);
      if (msg.action === "lesson_done") setCurrentWord("");
    });
    return () => {
      unsub();
      unsubText();
      unsubControl();
    };
  }, [subscribe, playAudioChunk, setPaused]);

  const handlePointerDown = useCallback(async () => {
    sendInterrupt();
    await startRecording();
  }, [sendInterrupt, startRecording]);

  const handlePointerUp = useCallback(async () => {
    const base64Audio = await stopRecording();
    if (base64Audio) {
      sendAudio(base64Audio);
    }
  }, [stopRecording, sendAudio]);

  const barsActive = isRecording || isPlaying;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      {currentWord && isPlaying && (
        <div className="absolute -top-11 left-1/2 -translate-x-1/2">
          <div className="px-3 py-1 rounded-full glass border border-book-yellow/30 text-book-yellow text-xs font-medium whitespace-nowrap will-change-transform">
            {currentWord}
          </div>
        </div>
      )}

      <div className="glass border border-white/10 rounded-2xl px-6 py-3 flex items-center gap-5 shadow-xl shadow-black/30">
        <button
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl
            transition-all duration-200 select-none will-change-transform
            ${isPlaying ? "mic-ripple" : ""}
            ${isRecording
              ? "bg-iq-pink/20 border-2 border-iq-pink mic-active scale-110"
              : "bg-white/5 border-2 border-white/20 hover:border-iq-red/50 hover:scale-105"
            }`}
          style={{ userSelect: "none", WebkitUserSelect: "none" }}
        >
          {isRecording ? "🔴" : "🎤"}
        </button>

        <div className="flex flex-col gap-1.5">
          <span className="text-white/80 text-sm font-medium min-w-[160px]">
            {status}
          </span>
          <div className="flex gap-1 items-end h-6">
            {[18, 24, 28, 22, 16].map((h, i) => (
              <div
                key={i}
                className={`viz-bar ${barsActive ? "active" : ""}`}
                style={{ height: `${h}px` }}
              />
            ))}
          </div>
        </div>

        <div className="flex flex-col items-center gap-1">
          <div
            className={`w-2 h-2 rounded-full ${
              isPlaying || isRecording ? "bg-green-400 animate-pulse" : "bg-white/20"
            }`}
          />
          <span className="text-white/20 text-[10px]">live</span>
        </div>
      </div>
    </div>
  );
}
