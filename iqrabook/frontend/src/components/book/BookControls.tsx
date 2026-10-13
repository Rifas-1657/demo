"use client";

import { useEffect, useCallback } from "react";
import { useBookStore } from "@/stores/bookStore";

export function BookControls() {
  const { currentPage, totalSpreads, nextSpread, prevSpread } = useBookStore();

  // Mouse wheel navigation with 350ms debounce
  const handleWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault();
      if (e.deltaY > 0) nextSpread();
      else prevSpread();
    },
    [nextSpread, prevSpread]
  );

  useEffect(() => {
    let lastWheel = 0;
    const throttled = (e: WheelEvent) => {
      const now = Date.now();
      if (now - lastWheel < 700) return; // 700ms throttle = 1 flip per 700ms
      lastWheel = now;
      handleWheel(e);
    };
    window.addEventListener("wheel", throttled, { passive: false });
    return () => window.removeEventListener("wheel", throttled);
  }, [handleWheel]);

  // Keyboard arrow navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") nextSpread();
      if (e.key === "ArrowLeft") prevSpread();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [nextSpread, prevSpread]);

  if (totalSpreads === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-20">
      {/* Left button */}
      <button
        onClick={prevSpread}
        disabled={currentPage === 0}
        className="pointer-events-auto absolute left-4 top-1/2 -translate-y-1/2
          w-12 h-12 rounded-full glass border border-white/20 text-white text-lg
          flex items-center justify-center
          hover:border-iq-red/60 hover:text-iq-red hover:scale-110
          disabled:opacity-20 disabled:cursor-not-allowed
          transition-all duration-200 shadow-lg will-change-transform"
        aria-label="Previous page"
      >
        ‹
      </button>

      {/* Right button */}
      <button
        onClick={nextSpread}
        disabled={currentPage >= totalSpreads - 1}
        className="pointer-events-auto absolute right-4 top-1/2 -translate-y-1/2
          w-12 h-12 rounded-full glass border border-white/20 text-white text-lg
          flex items-center justify-center
          hover:border-iq-red/60 hover:text-iq-red hover:scale-110
          disabled:opacity-20 disabled:cursor-not-allowed
          transition-all duration-200 shadow-lg will-change-transform"
        aria-label="Next page"
      >
        ›
      </button>

      {/* Page counter — bottom center */}
      <div
        className="pointer-events-none absolute bottom-28 left-1/2 -translate-x-1/2
          flex items-center gap-2"
      >
        {/* Dot indicators (up to 8 dots) */}
        <div className="flex gap-1.5 items-center">
          {Array.from({ length: Math.min(totalSpreads, 8) }).map((_, i) => (
            <div
              key={i}
              className={`rounded-full transition-all duration-300 ${
                i === currentPage
                  ? "w-4 h-1.5 bg-iq-red"
                  : "w-1.5 h-1.5 bg-white/20"
              }`}
            />
          ))}
          {totalSpreads > 8 && (
            <span className="text-white/30 text-xs ml-1">
              {currentPage + 1}/{totalSpreads}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
