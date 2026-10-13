"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { useBookStore } from "@/stores/bookStore";
import { useSessionStore } from "@/stores/sessionStore";
import { useCourseStore } from "@/stores/courseStore";
import { useWebSocket } from "@/hooks/useWebSocket";

const Scene = dynamic(() => import("@/components/three/Scene").then((m) => ({ default: m.Scene })), { ssr: false });
const BookControls = dynamic(() => import("@/components/book/BookControls").then((m) => ({ default: m.BookControls })), { ssr: false });
const VoiceAgent = dynamic(() => import("@/components/voice/VoiceAgent").then((m) => ({ default: m.VoiceAgent })), { ssr: false });
const FloatingKeyboard = dynamic(() => import("@/components/voice/FloatingKeyboard").then((m) => ({ default: m.FloatingKeyboard })), { ssr: false });

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
const PAGE_CHAR_LIMIT = 1200;

function pageStorageKey(sessionId: string) {
  return `iqrabook_page_${sessionId}`;
}

function CoursePageInner({ courseId }: { courseId: string }) {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session") || "local";

  const { addPage, setPages, nextSpread, goToSpread } = useBookStore();
  const { decrementTime, setPaused, updateWordProgress, timeRemaining } = useSessionStore();
  const { selectCourse } = useCourseStore();
  const [wsSessionId, setWsSessionId] = useState(sessionId);
  const { sendText, subscribe } = useWebSocket(wsSessionId);

  const [isResuming, setIsResuming] = useState(false);
  const [resumeMsg, setResumeMsg] = useState("");
  const [bootstrapped, setBootstrapped] = useState(false);
  const [sessionDbId, setSessionDbId] = useState<number | null>(null);

  const textBuf = useRef("");
  const codeBuf = useRef("");
  const diagramBuf = useRef("");
  const wordIdx = useRef(0);
  const currentPageRef = useRef(0);
  const sessionDbIdRef = useRef<number | null>(null);
  const restoredRef = useRef(false);
  const storageIdRef = useRef(sessionId);

  const persistPages = () => {
    try {
      const { pages, currentPage } = useBookStore.getState();
      localStorage.setItem(
        pageStorageKey(storageIdRef.current),
        JSON.stringify({
          pages,
          currentPage,
          savedAt: Date.now(),
        })
      );
    } catch {
      /* quota / private mode */
    }
  };

  useEffect(() => {
    selectCourse(courseId);

    const restoreKey = pageStorageKey(sessionId);
    try {
      const raw =
        localStorage.getItem(restoreKey) ||
        localStorage.getItem("iqrabook_page_resume") ||
        localStorage.getItem("iqrabook_page_local");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.pages) && parsed.pages.length > 0) {
          setPages(
            parsed.pages.map((p: { content: string; code?: string; diagram?: string; language?: string; type?: string }) => ({
              content: p.content,
              code: p.code,
              diagram: p.diagram,
              language: p.language,
              type: p.type || "lesson",
            }))
          );
          const spread = typeof parsed.currentPage === "number" ? parsed.currentPage : 0;
          goToSpread(spread);
          currentPageRef.current = spread;
          restoredRef.current = true;
          setIsResuming(true);
          setResumeMsg(`Continuing from page ${spread * 2 + 1}`);
        }
      }
    } catch {
      /* ignore corrupt cache */
    }

    const init = async () => {
      try {
        const res = await fetch(`${BACKEND}/api/sessions/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: "user_1", course_id: parseInt(courseId) }),
          signal: AbortSignal.timeout(5000),
        });
        const data = await res.json();
        setSessionDbId(data.id);
        sessionDbIdRef.current = data.id;
        if (data.id) {
          const realId = String(data.id);
          storageIdRef.current = realId;
          setWsSessionId(realId);
          const migrated = localStorage.getItem(pageStorageKey(sessionId));
          if (migrated && sessionId !== realId) {
            localStorage.setItem(pageStorageKey(realId), migrated);
          }
        }
        if (data.is_resuming) {
          setIsResuming(true);
          const pageLabel = restoredRef.current
            ? `Continuing from page ${currentPageRef.current * 2 + 1}`
            : `Thirumba vandeenga! Topic ${data.current_topic_index + 1} irundhu continue pannalam!`;
          setResumeMsg(pageLabel);
        }
      } catch {
        /* offline — ok */
      }
      setBootstrapped(true);
    };
    init();

    const timerInterval = setInterval(decrementTime, 1000);

    const saveInterval = setInterval(() => {
      persistPages();
      if (sessionDbIdRef.current) {
        fetch(`${BACKEND}/api/sessions/${sessionDbIdRef.current}/progress`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            current_topic_index: currentPageRef.current,
            time_spent_delta: 30,
          }),
        }).catch(() => {});
      }
    }, 30000);

    const startTimer = setTimeout(() => {
      if (!restoredRef.current) {
        sendText("Naama padikka ready! First topic start pannunga.");
      }
    }, 1500);

    return () => {
      clearInterval(timerInterval);
      clearInterval(saveInterval);
      clearTimeout(startTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  useEffect(() => {
    if (timeRemaining <= 0) {
      try {
        localStorage.removeItem(pageStorageKey(storageIdRef.current));
        localStorage.removeItem(pageStorageKey(sessionId));
      } catch {
        /* ignore */
      }
    }
  }, [timeRemaining, sessionId]);

  useEffect(() => {
    const flushPage = (final = false) => {
      if (!textBuf.current.trim() && !codeBuf.current && !diagramBuf.current) return;
      addPage({
        content: textBuf.current,
        code: codeBuf.current || undefined,
        diagram: diagramBuf.current || undefined,
        language: "python",
        type: "lesson",
      });
      textBuf.current = "";
      codeBuf.current = "";
      diagramBuf.current = "";
      wordIdx.current = 0;
      persistPages();
      if (final) nextSpread();
    };

    const unsubText = subscribe("text", (msg: any) => {
      textBuf.current += msg.content || "";
      wordIdx.current = msg.word_index ?? wordIdx.current + 1;
      updateWordProgress(wordIdx.current, msg.total_words ?? 0);

      if (textBuf.current.length >= PAGE_CHAR_LIMIT) {
        flushPage(true);
        currentPageRef.current += 1;
      }
    });

    const unsubCode = subscribe("code", (msg: any) => {
      codeBuf.current = msg.content || "";
    });

    const unsubDiagram = subscribe("diagram", (msg: any) => {
      diagramBuf.current = msg.content || "";
    });

    const unsubControl = subscribe("control", (msg: any) => {
      if (msg.action === "paused") setPaused(true);
      if (msg.action === "resume") {
        setPaused(false);
        flushPage();
      }
      if (msg.action === "lesson_done") flushPage();
      if (msg.action === "topic_complete") flushPage(true);
    });

    return () => {
      unsubText();
      unsubCode();
      unsubDiagram();
      unsubControl();
    };
  }, [subscribe, addPage, nextSpread, setPaused, updateWordProgress]);

  if (!bootstrapped) {
    return (
      <div className="min-h-screen bg-iq-darker flex items-center justify-center flex-col gap-4">
        <div className="w-10 h-10 border-2 border-iq-red border-t-transparent rounded-full animate-spin" />
        <p className="text-white/40 text-sm">Loading IqraBook...</p>
      </div>
    );
  }

  return (
    <div className="relative w-screen h-screen bg-iq-darker overflow-hidden">
      <div className="absolute inset-0">
        <Scene />
      </div>

      <BookControls />
      <VoiceAgent sessionId={wsSessionId} />
      <FloatingKeyboard sessionId={wsSessionId} />

      {isResuming && (
        <div className="absolute top-5 left-1/2 -translate-x-1/2 z-50 max-w-lg w-full px-4">
          <div className="glass border border-book-yellow/30 rounded-xl px-5 py-3 flex items-center justify-between gap-4">
            <p className="text-book-yellow text-sm leading-snug">{resumeMsg}</p>
            <button
              onClick={() => setIsResuming(false)}
              className="shrink-0 text-xs px-3 py-1.5 rounded-lg bg-iq-red/20
                border border-iq-red/40 text-iq-red hover:bg-iq-red/30 transition-all"
            >
              Continue ✓
            </button>
          </div>
        </div>
      )}

      <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-30 pointer-events-none">
        <div className="glass px-4 py-2 rounded-xl flex items-center gap-3">
          <span className="text-white font-semibold text-sm">📖 IqraBook</span>
          <span className="text-white/30 text-xs">·</span>
          <span className="text-white/70 text-xs">Python</span>
          <span className="text-white/20 text-xs">·</span>
          <WsPill />
        </div>
        <SessionTimer />
      </div>
    </div>
  );
}

function WsPill() {
  const wsConnected = useSessionStore((s) => s.wsConnected);
  return (
    <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest">
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          wsConnected ? "bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.8)]" : "bg-white/25"
        }`}
      />
      <span className={wsConnected ? "text-green-400/80" : "text-white/30"}>
        {wsConnected ? "Live" : "Connecting"}
      </span>
    </span>
  );
}

function SessionTimer() {
  const timeRemaining = useSessionStore((s) => s.timeRemaining);
  const mins = Math.floor(timeRemaining / 60);
  const secs = timeRemaining % 60;
  const isLow = timeRemaining < 300;

  return (
    <div
      className={`glass px-3 py-1.5 rounded-xl text-xs font-mono pointer-events-none
        ${isLow ? "text-iq-red border border-iq-red/30" : "text-white/40"}`}
    >
      ⏱ {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
    </div>
  );
}

interface CoursePageProps {
  params: { courseId: string };
}

export default function CoursePage({ params }: CoursePageProps) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-iq-darker flex items-center justify-center flex-col gap-4">
          <div className="w-10 h-10 border-2 border-iq-red border-t-transparent rounded-full animate-spin" />
          <p className="text-white/40 text-sm">Loading IqraBook...</p>
          <p className="bismillah text-sm">بِسْمِ ٱللَّٰهِ</p>
        </div>
      }
    >
      <CoursePageInner courseId={params.courseId} />
    </Suspense>
  );
}
