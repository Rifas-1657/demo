// IqraBook — Core TypeScript Types

// ==================== Course Types ====================

export interface Course {
  id: string;
  title: string;
  description: string;
  totalTopics: number;
  roadmap: Topic[];
  githubRepos: string[];
  icon: string;
  color: string;
}

export interface Topic {
  id: string;
  title: string;
  subtopics: string[];
  estimatedMins: number;
  order: number;
}

// ==================== Session Types ====================

export interface UserSession {
  id: string;
  userId: string;
  courseId: string;
  currentTopicIndex: number;
  currentSubtopic: string | null;
  knowledgeState: Record<string, number>;
  totalTimeSpent: number;
  completedTopics: string[];
  lastSessionAt: string;
  isActive: boolean;
}

export interface SessionProgress {
  currentTopicIndex: number;
  currentSubtopic: string | null;
  completedTopics: string[];
  totalTimeSpent: number;
  percentage: number;
}

// ==================== Survey Types ====================

export interface SurveyAnswer {
  skillLevel: 1 | 2 | 3; // 1=beginner, 2=intermediate, 3=advanced
  learningPace: "slow" | "moderate" | "fast";
  goals: string;
  interests: string[];
  preferredExamples: string; // e.g., "movies", "sports", "cooking"
}

// ==================== Book Types ====================

export interface BookPage {
  pageNumber: number;
  content: PageContent;
  isFlipped: boolean;
}

export interface PageContent {
  text: string;
  code?: CodeBlock;
  diagram?: string; // Mermaid syntax
  image?: string; // URL
  type: "lesson" | "code" | "diagram" | "exercise" | "summary";
}

export interface CodeBlock {
  language: "python" | "java" | "html" | "css" | "javascript";
  code: string;
  isStreaming: boolean;
  output?: string;
  error?: string;
}

// ==================== Voice Types ====================

export interface VoiceState {
  isListening: boolean;
  isSpeaking: boolean;
  isPaused: boolean;
  currentWord: number;
  totalWords: number;
}

export interface AudioChunk {
  data: string; // base64
  durationMs: number;
  wordStart: number;
  wordEnd: number;
}

// ==================== WebSocket Message Types ====================

export type WSMessageType =
  | "text"
  | "audio"
  | "code"
  | "diagram"
  | "control"
  | "interrupt"
  | "resume"
  | "error";

export interface WSMessage {
  type: WSMessageType;
  content?: string;
  data?: string; // base64 for audio
  metadata?: Record<string, unknown>;
  timestamp: number;
}

export interface WSTextMessage extends WSMessage {
  type: "text";
  content: string;
  wordIndex?: number;
}

export interface WSAudioMessage extends WSMessage {
  type: "audio";
  data: string; // base64 audio chunk
  durationMs: number;
  wordStart: number;
  wordEnd: number;
}

export interface WSCodeMessage extends WSMessage {
  type: "code";
  content: string; // code string
  language: string;
}

export interface WSDiagramMessage extends WSMessage {
  type: "diagram";
  content: string; // Mermaid syntax
}

export interface WSControlMessage extends WSMessage {
  type: "control";
  action: "pause" | "resume" | "next_topic" | "complete" | "welcome_back";
}

// ==================== RL Types ====================

export interface RLState {
  skillLevel: number;
  attentionScore: number;
  topicDifficulty: number;
}

export interface RLAction {
  type:
    | "increase_detail"
    | "decrease_detail"
    | "add_quiz"
    | "more_diagrams"
    | "add_example"
    | "simplify";
}

// ==================== API Response Types ====================

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface HealthResponse {
  status: "healthy";
  version: string;
  name: "IqraBook";
}
