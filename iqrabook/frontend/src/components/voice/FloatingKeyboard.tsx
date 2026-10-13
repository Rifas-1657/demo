"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useWebSocket } from "@/hooks/useWebSocket";

interface FloatingKeyboardProps {
  sessionId: string;
  onClose?: () => void;
}

/**
 * Floating 3D-perspective keyboard/text input for IqraBook.
 * Appears when user wants to type a question instead of voice.
 */
export function FloatingKeyboard({ sessionId, onClose }: FloatingKeyboardProps) {
  const [text, setText] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const { sendText, sendInterrupt } = useWebSocket(sessionId);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const open = useCallback(() => {
    setIsOpen(true);
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setText("");
    onClose?.();
  }, [onClose]);

  const submit = useCallback(() => {
    if (!text.trim()) return;
    sendInterrupt();
    sendText(text.trim());
    setText("");
    close();
  }, [text, sendText, sendInterrupt, close]);

  const handleKey = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        submit();
      }
      if (e.key === "Escape") close();
    },
    [submit, close]
  );

  return (
    <>
      <button
        onClick={open}
        className={`fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full
          glass border border-white/20 text-xl flex items-center justify-center
          hover:border-iq-pink/50 transition-all duration-200 will-change-transform
          ${isOpen ? "opacity-0 pointer-events-none" : "opacity-100"}`}
        title="Type a question"
      >
        ⌨️
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              key="kb-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="keyboard-backdrop"
              onClick={close}
            />
            <motion.div
              key="kb-panel"
              initial={{ opacity: 0, y: 40, rotateX: 15 }}
              animate={{ opacity: 1, y: 0, rotateX: 0 }}
              exit={{ opacity: 0, y: 30, rotateX: 10 }}
              transition={{ type: "spring", stiffness: 300, damping: 28 }}
              style={{ perspective: "1000px", transformOrigin: "bottom center" }}
              className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 w-full max-w-xl px-4 will-change-transform"
            >
              <div className="floating-input p-4 rounded-2xl">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-white/50 text-xs uppercase tracking-widest">
                    Type your question
                  </span>
                  <button
                    onClick={close}
                    className="text-white/30 hover:text-white/70 text-sm transition-colors"
                  >
                    ✕ Close
                  </button>
                </div>

                <textarea
                  ref={inputRef}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={handleKey}
                  placeholder="Enna doubt iruku? Type pannunga... (Python related only!)"
                  className="w-full h-24 bg-transparent text-white placeholder-white/25
                    text-sm resize-none focus:outline-none leading-relaxed"
                />

                <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/10">
                  <span className="text-white/25 text-xs">
                    {text.length > 0 ? `${text.length} chars` : "Enter to send • Esc to close"}
                  </span>
                  <button
                    onClick={submit}
                    disabled={!text.trim()}
                    className="px-5 py-2 rounded-xl text-sm font-semibold text-white
                      bg-gradient-to-r from-iq-red to-iq-pink
                      hover:opacity-90 disabled:opacity-30 transition-all
                      disabled:cursor-not-allowed"
                  >
                    Ask →
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
