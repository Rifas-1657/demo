import { create } from "zustand";
import type { UserSession, VoiceState, SurveyAnswer } from "@/types";

interface SessionState {
  // Session
  session: UserSession | null;
  isActive: boolean;
  timeRemaining: number; // seconds (max 3600 = 1 hour)

  // Voice
  voice: VoiceState;

  // Survey
  surveyCompleted: boolean;
  surveyAnswers: SurveyAnswer | null;

  // Connection
  wsConnected: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions - Session
  setSession: (session: UserSession) => void;
  clearSession: () => void;
  updateProgress: (topicIndex: number, subtopic: string | null) => void;
  decrementTime: () => void;

  // Actions - Voice
  setListening: (listening: boolean) => void;
  setSpeaking: (speaking: boolean) => void;
  setPaused: (paused: boolean) => void;
  updateWordProgress: (current: number, total: number) => void;

  // Actions - Survey
  setSurveyCompleted: (answers: SurveyAnswer) => void;

  // Actions - Connection
  setWsConnected: (connected: boolean) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  // Initial State
  session: null,
  isActive: false,
  timeRemaining: 3600, // 1 hour

  voice: {
    isListening: false,
    isSpeaking: false,
    isPaused: false,
    currentWord: 0,
    totalWords: 0,
  },

  surveyCompleted: false,
  surveyAnswers: null,

  wsConnected: false,
  isLoading: false,
  error: null,

  // Session Actions
  setSession: (session) =>
    set({ session, isActive: true, timeRemaining: 3600 }),

  clearSession: () =>
    set({ session: null, isActive: false, timeRemaining: 3600 }),

  updateProgress: (topicIndex, subtopic) => {
    const { session } = get();
    if (session) {
      set({
        session: {
          ...session,
          currentTopicIndex: topicIndex,
          currentSubtopic: subtopic,
        },
      });
    }
  },

  decrementTime: () => {
    const { timeRemaining } = get();
    if (timeRemaining > 0) {
      set({ timeRemaining: timeRemaining - 1 });
    } else {
      set({ isActive: false });
    }
  },

  // Voice Actions
  setListening: (listening) =>
    set((s) => ({ voice: { ...s.voice, isListening: listening } })),

  setSpeaking: (speaking) =>
    set((s) => ({ voice: { ...s.voice, isSpeaking: speaking } })),

  setPaused: (paused) =>
    set((s) => ({ voice: { ...s.voice, isPaused: paused } })),

  updateWordProgress: (current, total) =>
    set((s) => ({
      voice: { ...s.voice, currentWord: current, totalWords: total },
    })),

  // Survey Actions
  setSurveyCompleted: (answers) =>
    set({ surveyCompleted: true, surveyAnswers: answers }),

  // Connection Actions
  setWsConnected: (connected) => set({ wsConnected: connected }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
}));
