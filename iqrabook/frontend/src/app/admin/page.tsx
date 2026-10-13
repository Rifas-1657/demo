"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");

  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const [uploadMsg, setUploadMsg] = useState("");
  const [uploading, setUploading] = useState(false);

  const [roadmapJson, setRoadmapJson] = useState("");
  const [roadmapLoading, setRoadmapLoading] = useState(false);

  const [ragStatus, setRagStatus] = useState<any>(null);
  const [ragLoading, setRagLoading] = useState(false);

  useEffect(() => {
    fetch("/api/admin/status")
      .then((res) => res.json())
      .then((data) => setAuthed(Boolean(data.authenticated)))
      .catch(() => setAuthed(false));
  }, []);

  useEffect(() => {
    if (authed) loadRag();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed]);

  const login = async (e: FormEvent) => {
    e.preventDefault();
    setAuthError("");
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) throw new Error("Invalid password");
      setAuthed(true);
      setPassword("");
    } catch {
      setAuthError("Password wrong — try again.");
    }
  };

  const onDrop = useCallback((incoming: FileList | File[]) => {
    const list = Array.from(incoming).filter((f) =>
      /\.(pdf|docx?|txt|md)$/i.test(f.name)
    );
    setFiles((prev) => [...prev, ...list]);
  }, []);

  const upload = async () => {
    if (!files.length) return;
    setUploading(true);
    setUploadMsg("");
    try {
      for (const file of files) {
        const form = new FormData();
        form.append("course_id", "1");
        form.append("file", file);
        const res = await fetch(`${BACKEND}/api/ingest/upload`, {
          method: "POST",
          body: form,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Upload failed");
        setUploadMsg((prev) =>
          prev ? `${prev}\n${data.message}` : data.message
        );
      }
      setFiles([]);
    } catch (err: any) {
      setUploadMsg(err.message || "Upload fail aagiuchu.");
    } finally {
      setUploading(false);
    }
  };

  const generateRoadmap = async () => {
    setRoadmapLoading(true);
    setRoadmapJson("");
    try {
      const res = await fetch(`${BACKEND}/api/roadmap/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          course_id: 1,
          course_title: "Python",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Roadmap failed");
      setRoadmapJson(JSON.stringify(data, null, 2));
    } catch (err: any) {
      setRoadmapJson(JSON.stringify({ error: err.message }, null, 2));
    } finally {
      setRoadmapLoading(false);
    }
  };

  const loadRag = async () => {
    setRagLoading(true);
    try {
      const res = await fetch(`${BACKEND}/api/ingest/status/1`);
      const data = await res.json();
      setRagStatus(data);
    } catch (err: any) {
      setRagStatus({ error: err.message });
    } finally {
      setRagLoading(false);
    }
  };

  if (!authed) {
    return (
      <main className="min-h-screen bg-iq-darker flex items-center justify-center p-6">
        <form
          onSubmit={login}
          className="glass max-w-sm w-full p-8 rounded-2xl border border-white/10"
        >
          <p className="bismillah text-lg mb-3">اقْرَأْ</p>
          <h1 className="text-2xl font-bold text-iq-white mb-1">Owner Admin</h1>
          <p className="text-white/40 text-sm mb-6">Password enter pannunga.</p>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full mb-3 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-iq-red"
            placeholder="Admin password"
          />
          {authError && <p className="text-iq-red text-xs mb-3">{authError}</p>}
          <button
            type="submit"
            className="w-full py-3 rounded-xl font-semibold bg-gradient-to-r from-iq-red to-iq-pink"
          >
            Unlock
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-iq-darker px-6 py-10">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-iq-white">IqraBook Admin</h1>
            <p className="text-white/40 text-sm">Course materials • Roadmap • RAG</p>
          </div>
          <a href="/" className="text-sm text-white/40 hover:text-iq-pink">
            ← Home
          </a>
        </header>

        <section className="glass p-6 border border-white/10">
          <h2 className="text-lg font-semibold mb-4 text-iq-white">1. Upload Materials</h2>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              if (e.dataTransfer.files) onDrop(e.dataTransfer.files);
            }}
            className={`rounded-xl border-2 border-dashed p-10 text-center transition-colors
              ${dragging ? "border-iq-red bg-iq-red/10" : "border-white/15 bg-white/5"}`}
          >
            <p className="text-white/70 mb-2">PDF / DOCX / TXT drag-drop pannunga</p>
            <input
              type="file"
              accept=".pdf,.doc,.docx,.txt,.md"
              multiple
              className="text-sm text-white/50"
              onChange={(e) => e.target.files && onDrop(e.target.files)}
            />
          </div>
          {files.length > 0 && (
            <ul className="mt-4 text-sm text-white/60 space-y-1">
              {files.map((f) => (
                <li key={f.name}>📄 {f.name}</li>
              ))}
            </ul>
          )}
          <button
            onClick={upload}
            disabled={uploading || !files.length}
            className="mt-4 px-5 py-2.5 rounded-xl font-semibold bg-gradient-to-r from-iq-red to-iq-pink disabled:opacity-40"
          >
            {uploading ? "Uploading..." : "Upload → POST /api/ingest/upload"}
          </button>
          {uploadMsg && (
            <pre className="mt-3 text-xs text-book-yellow whitespace-pre-wrap">{uploadMsg}</pre>
          )}
        </section>

        <section className="glass p-6 border border-white/10">
          <h2 className="text-lg font-semibold mb-4 text-iq-white">2. Generate Roadmap</h2>
          <button
            onClick={generateRoadmap}
            disabled={roadmapLoading}
            className="px-5 py-2.5 rounded-xl font-semibold bg-gradient-to-r from-iq-red to-iq-pink disabled:opacity-40"
          >
            {roadmapLoading ? "Generating..." : "Generate → POST /api/roadmap/generate"}
          </button>
          {roadmapJson && (
            <pre className="mt-4 max-h-80 overflow-auto text-xs text-white/80 bg-black/30 p-4 rounded-xl">
              {roadmapJson}
            </pre>
          )}
        </section>

        <section className="glass p-6 border border-white/10">
          <h2 className="text-lg font-semibold mb-4 text-iq-white">3. RAG Status</h2>
          <button
            onClick={loadRag}
            disabled={ragLoading}
            className="px-5 py-2.5 rounded-xl font-semibold border border-iq-red/50 text-iq-red hover:bg-iq-red/10 disabled:opacity-40"
          >
            {ragLoading ? "Loading..." : "Refresh → GET /api/ingest/status/1"}
          </button>
          {ragStatus && (
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-white/5 p-4">
                <p className="text-white/40 text-xs uppercase">Documents</p>
                <p className="text-2xl font-bold text-iq-white">
                  {ragStatus.document_count ?? "—"}
                </p>
              </div>
              <div className="rounded-xl bg-white/5 p-4">
                <p className="text-white/40 text-xs uppercase">Ready</p>
                <p className="text-2xl font-bold text-book-yellow">
                  {ragStatus.ready ? "Yes" : "No"}
                </p>
              </div>
              <pre className="col-span-2 text-xs text-white/70 bg-black/30 p-4 rounded-xl overflow-auto">
                {JSON.stringify(ragStatus, null, 2)}
              </pre>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
