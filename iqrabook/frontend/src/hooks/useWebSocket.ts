"use client";

import { useEffect, useRef, useCallback } from "react";
import { useSessionStore } from "@/stores/sessionStore";
import type { WSMessage } from "@/types";

type MessageHandler = (msg: WSMessage) => void;

const BACKEND_WS_URL =
  process.env.NEXT_PUBLIC_BACKEND_WS_URL || "ws://localhost:8000";

class WSManager {
  private ws: WebSocket | null = null;
  private sessionId: string;
  private handlers: Map<string, Set<MessageHandler>> = new Map();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private shouldReconnect = true;
  private reconnectDelay = 1000;
  private connectionHandlers = new Set<(connected: boolean) => void>();

  constructor(sessionId: string) {
    this.sessionId = sessionId;
  }

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) return;
    const url = `${BACKEND_WS_URL}/ws/chat/${this.sessionId}`;
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      console.log("🔗 IqraBook WS connected");
      this.reconnectDelay = 1000;
      this.connectionHandlers.forEach((handler) => handler(true));
    };

    this.ws.onmessage = (event) => {
      try {
        const msg: WSMessage = JSON.parse(event.data);
        // Fire type-specific handlers
        this.handlers.get(msg.type)?.forEach((h) => h(msg));
        // Fire "all" handlers
        this.handlers.get("all")?.forEach((h) => h(msg));
      } catch (e) {
        console.error("WS parse error:", e);
      }
    };

    this.ws.onerror = () => {};

    this.ws.onclose = () => {
      this.connectionHandlers.forEach((handler) => handler(false));
      if (this.shouldReconnect) {
        this.reconnectTimer = setTimeout(() => {
          this.reconnectDelay = Math.min(this.reconnectDelay * 2, 8000);
          this.connect();
        }, this.reconnectDelay);
      }
    };
  }

  send(msg: Record<string, unknown>): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ ...msg, timestamp: Date.now() }));
    }
  }

  on(type: string, handler: MessageHandler): () => void {
    if (!this.handlers.has(type)) this.handlers.set(type, new Set());
    this.handlers.get(type)!.add(handler);
    return () => this.handlers.get(type)?.delete(handler);
  }

  onConnectionChange(handler: (connected: boolean) => void): () => void {
    this.connectionHandlers.add(handler);
    handler(this.isConnected);
    return () => this.connectionHandlers.delete(handler);
  }

  disconnect(): void {
    this.shouldReconnect = false;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.ws?.close();
    this.ws = null;
    this.connectionHandlers.forEach((handler) => handler(false));
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

// One manager per session
const managers = new Map<string, WSManager>();

function getManager(sessionId: string): WSManager {
  if (!managers.has(sessionId)) {
    managers.set(sessionId, new WSManager(sessionId));
  }
  return managers.get(sessionId)!;
}

/** Hook: WebSocket connection for a session */
export function useWebSocket(sessionId: string | null) {
  const managerRef = useRef<WSManager | null>(null);
  const setWsConnected = useSessionStore((s) => s.setWsConnected);

  useEffect(() => {
    if (!sessionId) return;
    const manager = getManager(sessionId);
    managerRef.current = manager;
    manager.connect();
    const unsubscribe = manager.onConnectionChange(setWsConnected);
    return () => {
      unsubscribe();
      setWsConnected(false);
    };
  }, [sessionId, setWsConnected]);

  const sendText = useCallback(
    (text: string) => {
      if (!sessionId) return;
      getManager(sessionId).send({ type: "text", content: text });
    },
    [sessionId]
  );

  const sendAudio = useCallback(
    (audioBase64: string) => {
      if (!sessionId) return;
      getManager(sessionId).send({ type: "audio", data: audioBase64 });
    },
    [sessionId]
  );

  const sendInterrupt = useCallback(() => {
    if (!sessionId) return;
    getManager(sessionId).send({ type: "interrupt" });
  }, [sessionId]);

  const sendControl = useCallback(
    (action: string, payload?: Record<string, unknown>) => {
      if (!sessionId) return;
      getManager(sessionId).send({ type: "control", action, ...payload });
    },
    [sessionId]
  );

  const subscribe = useCallback(
    (type: string, handler: MessageHandler): (() => void) => {
      if (!sessionId) return () => {};
      return getManager(sessionId).on(type, handler);
    },
    [sessionId]
  );

  return {
    sendText,
    sendAudio,
    sendInterrupt,
    sendControl,
    subscribe,
    isConnected: managerRef.current?.isConnected ?? false,
  };
}
