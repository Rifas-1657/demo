"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useSessionStore } from "@/stores/sessionStore";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

interface CodeRunnerProps {
  initialCode?: string;
  language?: "python" | "java" | "html";
  isStreaming?: boolean;
  streamedCode?: string;
}

const MONACO_THEME = {
  base: "vs-dark" as const,
  inherit: true,
  rules: [
    { token: "keyword", foreground: "E63946", fontStyle: "bold" },
    { token: "comment", foreground: "6E7680", fontStyle: "italic" },
    { token: "string", foreground: "FFD166" },
    { token: "number", foreground: "FF9F1C" },
    { token: "type", foreground: "FF6B8A" },
  ],
  colors: {
    "editor.background": "#1A1A2E",
    "editor.foreground": "#FFF8F0",
    "editorLineNumber.foreground": "#3A3A5E",
    "editor.selectionBackground": "#E6394633",
    "editorCursor.foreground": "#E63946",
    "editor.lineHighlightBackground": "#1F1F3E",
  },
};

export function CodeRunner({
  initialCode = "",
  language = "python",
  isStreaming = false,
  streamedCode,
}: CodeRunnerProps) {
  const [code, setCode] = useState(initialCode);
  const [output, setOutput] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [pyodideReady, setPyodideReady] = useState(false);
  const [pyodideLoading, setPyodideLoading] = useState(false);
  const pyodideRef = useRef<any>(null);

  // Update code when streaming
  useEffect(() => {
    if (isStreaming && streamedCode !== undefined) {
      setCode(streamedCode);
    }
  }, [streamedCode, isStreaming]);

  // Load Pyodide lazily on first Python run
  const loadPyodide = async () => {
    if (pyodideReady || pyodideLoading) return;
    setPyodideLoading(true);
    try {
      // Load pyodide from CDN
      if (!(window as any).loadPyodide) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://cdn.jsdelivr.net/pyodide/v0.26.2/full/pyodide.js";
          script.onload = () => resolve();
          script.onerror = reject;
          document.head.appendChild(script);
        });
      }
      pyodideRef.current = await (window as any).loadPyodide({
        indexURL: "https://cdn.jsdelivr.net/pyodide/v0.26.2/full/",
      });
      setPyodideReady(true);
    } catch (e) {
      console.error("Pyodide load failed:", e);
    } finally {
      setPyodideLoading(false);
    }
  };

  const runPython = async () => {
    if (!code.trim()) return;
    setIsRunning(true);
    setOutput("");
    setError(null);

    // Load pyodide if not ready
    if (!pyodideReady) {
      await loadPyodide();
    }

    if (!pyodideRef.current) {
      setError("Python runtime load aagala. Retry pannunga.");
      setIsRunning(false);
      return;
    }

    try {
      // Capture stdout
      pyodideRef.current.runPython(`
import sys
import io
sys.stdout = io.StringIO()
sys.stderr = io.StringIO()
      `);

      await pyodideRef.current.runPythonAsync(code);

      const stdout = pyodideRef.current.runPython("sys.stdout.getvalue()");
      const stderr = pyodideRef.current.runPython("sys.stderr.getvalue()");

      setOutput(stdout || "(No output)");
      if (stderr) setError(stderr);
    } catch (e: any) {
      setError(e.message || "Runtime error");
    } finally {
      setIsRunning(false);
    }
  };

  const handleEditorMount = (editor: any, monaco: any) => {
    monaco.editor.defineTheme("iqrabook-dark", MONACO_THEME);
    monaco.editor.setTheme("iqrabook-dark");
  };

  return (
    <div className={`flex flex-col rounded-xl overflow-hidden border border-white/10 bg-[#1A1A2E] ${isStreaming ? "code-stream-glow" : ""}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#0F0F1A] border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-iq-red" />
          <div className="w-3 h-3 rounded-full bg-book-yellow" />
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span className="text-white/40 text-xs ml-2 font-mono">
            {language === "python" ? "🐍 main.py" : language === "java" ? "☕ Main.java" : "🌐 index.html"}
          </span>
        </div>
        {isStreaming && (
          <span className="text-iq-pink text-xs animate-pulse">● streaming...</span>
        )}
      </div>

      {/* Editor */}
      <div className="h-52">
        <MonacoEditor
          value={code}
          onChange={(v) => !isStreaming && setCode(v || "")}
          language={language}
          theme="iqrabook-dark"
          onMount={handleEditorMount}
          options={{
            fontSize: 13,
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            minimap: { enabled: false },
            lineNumbers: "on",
            scrollBeyondLastLine: false,
            automaticLayout: true,
            readOnly: isStreaming,
            cursorStyle: isStreaming ? "underline" : "line",
            padding: { top: 10 },
            renderWhitespace: "none",
            folding: false,
          }}
        />
      </div>

      {/* Run button */}
      {language === "python" && (
        <div className="px-4 py-2 bg-[#0F0F1A] border-t border-white/10 flex items-center gap-3">
          <button
            onClick={runPython}
            disabled={isRunning || pyodideLoading}
            className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-semibold
              bg-gradient-to-r from-iq-red to-iq-pink text-white
              hover:opacity-90 disabled:opacity-40 transition-all"
          >
            {pyodideLoading ? (
              <>
                <span className="w-3 h-3 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                Loading Python...
              </>
            ) : isRunning ? (
              <>
                <span className="w-3 h-3 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                Running...
              </>
            ) : (
              "▶ Run"
            )}
          </button>
          <span className="text-white/20 text-xs">Browser-based Python (Pyodide)</span>
        </div>
      )}

      {/* Output */}
      {(output || error) && (
        <div className="border-t border-white/10 bg-[#0F0F1A] px-4 py-3 max-h-32 overflow-y-auto">
          {error && (
            <pre className="text-red-400 text-xs font-mono whitespace-pre-wrap mb-2">{error}</pre>
          )}
          {output && (
            <pre className="text-green-400 text-xs font-mono whitespace-pre-wrap">{output}</pre>
          )}
        </div>
      )}
    </div>
  );
}
