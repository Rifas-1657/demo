"use client";

import { useState, useEffect, useCallback } from "react";

declare global {
  interface Window {
    loadPyodide: (config: { indexURL: string }) => Promise<any>;
  }
}

export function usePyodide() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pyodideInstance, setPyodideInstance] = useState<any>(null);

  useEffect(() => {
    let script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/pyodide/v0.26.2/full/pyodide.js";
    script.async = true;
    script.onload = async () => {
      try {
        const pyodide = await window.loadPyodide({
          indexURL: "https://cdn.jsdelivr.net/pyodide/v0.26.2/full/",
        });
        setPyodideInstance(pyodide);
        setIsLoaded(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    };
    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  const runCode = useCallback(async (code: string): Promise<{ output: string; error: string | null }> => {
    if (!pyodideInstance) {
      return { output: "", error: "Pyodide not loaded yet" };
    }

    setIsRunning(true);
    let output = "";
    
    try {
      pyodideInstance.setStdout({ batched: (msg: string) => { output += msg + "\n"; } });
      pyodideInstance.setStderr({ batched: (msg: string) => { output += msg + "\n"; } });
      
      await pyodideInstance.runPythonAsync(code);
      return { output, error: null };
    } catch (err) {
      return { output, error: err instanceof Error ? err.message : String(err) };
    } finally {
      setIsRunning(false);
    }
  }, [pyodideInstance]);

  return { isLoaded, isRunning, error, runCode };
}
