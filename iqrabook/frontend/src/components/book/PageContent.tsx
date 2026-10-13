"use client";

import dynamic from "next/dynamic";
import { CodeRunner } from "@/components/code/CodeRunner";

const MermaidDiagram = dynamic(
  () => import("@/components/book/MermaidDiagram"),
  { ssr: false }
);

interface PageContentProps {
  text: string;
  code?: string;
  language?: string;
  diagram?: string;
  wordIndex?: number;
  isCodeStreaming?: boolean;
}

/**
 * Renders book page content:
 * LEFT (60%): streaming lesson text with word-level highlighting
 * RIGHT (40%): CodeRunner OR Mermaid diagram
 */
export function PageContent({
  text,
  code,
  language = "python",
  diagram,
  wordIndex = -1,
  isCodeStreaming = false,
}: PageContentProps) {
  const words = text.split(/(\s+)/);
  const hasRight = !!(code || diagram);
  let visibleWordIndex = 0;

  return (
    <div className={`flex gap-2 h-full p-2.5 ${hasRight ? "" : "justify-center"}`}>
      <div
        className={`${hasRight ? "w-[58%]" : "w-full max-w-xl"} overflow-y-auto`}
        style={{ scrollbarWidth: "thin" }}
      >
        <div
          className="book-text font-serif text-[10px]"
          style={{ lineHeight: 1.58, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}
        >
          {words.map((word, i) => {
            const isWord = word.trim() !== "";
            const isHighlighted = isWord && visibleWordIndex === wordIndex;
            if (isWord) visibleWordIndex += 1;
            return (
              <span key={i} className={isHighlighted ? "word-highlight" : ""}>
                {word}
              </span>
            );
          })}
          {wordIndex >= 0 && wordIndex < words.filter((w) => w.trim()).length && (
            <span className="inline-block w-0.5 h-3 bg-iq-red ml-0.5 animate-pulse" />
          )}
        </div>
      </div>

      {hasRight && (
        <div className="w-[42%] overflow-y-auto flex flex-col gap-3">
          {diagram && (
            <div className="rounded-xl overflow-hidden border border-white/10 bg-[#0F0F1A] p-3">
              <div className="text-white/30 text-[10px] uppercase tracking-widest mb-2">
                📊 Diagram
              </div>
              <MermaidDiagram chart={diagram} />
            </div>
          )}
          {code && (
            <div className={isCodeStreaming ? "code-stream-glow rounded-xl" : ""}>
              <CodeRunner
                initialCode={code}
                language={language as "python" | "java" | "html"}
                isStreaming={isCodeStreaming}
                streamedCode={isCodeStreaming ? code : undefined}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
