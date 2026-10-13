# IqraBook — Project Progress Tracker
# اقْرَأْ — Read in the name of your Lord!

## IMPORTANT NOTE — Server running
# Terminal 1 → cd iqrabook/backend && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
# Terminal 2 → cd iqrabook/frontend && npm run dev
# Open: http://localhost:3000  |  API: http://localhost:8000/docs

---

## Status
- **Project:** IqraBook (اقرأ) — 3D AI Interactive Course Platform
- **Phase:** Phase 3 (Integration, UI Polish & Deploy) — core complete
- **Overall:** 85% complete
- **Last Updated:** 2026-10-04 14:10 IST

## Architecture
- STT: Groq Whisper (85ms) → Gemini Audio fallback
- LLM: Groq Llama 4 Scout (QA/classify, max_tokens=200) + Gemini 2.0 Flash (teach/RAG, max_tokens=400)
- TTS: Gemini 2.5 Flash TTS, Kore voice, ~2-sentence batches, always Tanglish
- Frontend: Next.js 14 + React Three Fiber + Zustand + Tailwind
- Backend: FastAPI + LangGraph 6-node + ChromaDB + SQLite
- RL: Q-Learning 9-state × 6-action, Bellman update, zero API cost
- Deployment: Vercel + Render (both free)

## Colors — EXACT spec
- UI: iq-red #E63946 | iq-pink #FF6B8A | iq-white #FFFFFF | iq-dark #1A1A2E | iq-darker #0F0F1A
- Book: book-yellow #FFD166 | book-white #FFF8F0 | book-orange #FF9F1C

## Backend Files
- app/main.py                    ✅ 7 routers + CORS for local + Vercel
- app/core/config.py             ✅
- app/core/gemini_client.py      ✅ SSE stream (`alt=sse`) + Kore TTS
- app/core/groq_client.py        ✅ Llama 4 Scout, max_tokens=200
- app/core/stt.py                ✅ Groq primary → Gemini fallback
- app/db/database.py             ✅
- app/models/*                   ✅
- app/rag/vectorstore.py         ✅ ChromaDB top_k=3
- app/rl/q_learning.py           ✅
- app/agents/orchestrator.py     ✅ Q&A answer kept + resume Tanglish
- app/api/routes/streaming.py    ✅ Interrupt-cancellable turns, karaoke + TTS parallel
- app/api/routes/ingest.py       ✅ PDF/DOCX/URL
- app/api/routes/roadmap.py      ✅
- render.yaml + Procfile         ✅ Task 7

## Frontend Files
- app/layout.tsx                 ✅ Amiri + Merriweather + noindex
- app/page.tsx                   ✅ Mesh/particles, 3D tilt cards, LIVE badge, Bismillah
- app/admin/page.tsx             ✅ HttpOnly env-password gate, upload, roadmap, RAG status
- app/api/admin/*                ✅ Server-side password validation + session status
- app/course/[courseId]/page.tsx ✅ Resume localStorage 30s, WS session id, HUD
- stores/*                       ✅ spread API + setPages restore
- components/three/Scene.tsx     ✅ Book3D inside Canvas (no dynamic-child hole)
- components/book/*              ✅ Cover texture, page Html, Mermaid SSR-safe
- components/voice/*             ✅ CSS viz bars, ripple, keyboard backdrop
- next.config.js                 ✅ X-Frame-Options + nosniff (prod)
- vercel.json                    ✅ Task 7

## Phase 3 — Task checklist
- [x] Task 1: `npm run dev` startup (Next 14 ready, FastAPI /health 200)
- [x] Task 2a–2f: Landing / scene / book / page / voice / keyboard polish
- [x] Task 3: Owner admin panel
- [x] Task 4: Session resume + 30s localStorage + clear on 1hr
- [x] Task 5: Mermaid dynamic ssr:false + error boundary
- [x] Task 6: WS streaming + interrupt cancel + last-3-exchanges window
- [x] Task 7: vercel.json, render.yaml, Procfile
- [x] Task 8: Security headers + noindex + HttpOnly admin session
- [x] Task 9: CSS keyframe bars, will-change, spring 140/18
- [x] Task 10: PROGRESS.md → 85%

## Remaining (15%)
- [ ] Full voice E2E with live Gemini/Groq keys in a quiet session
- [ ] Vercel + Render production push
- [x] Production build / type-check smoke test
- [ ] webpack-obfuscator production build smoke test (activate only for the deployment environment)
- [ ] 4 concurrent user / multi-session load check

## API Endpoints (localhost:8000)
- GET  /health
- GET  /api/courses
- POST /api/sessions/
- POST /api/survey
- POST /api/ingest/upload
- GET  /api/ingest/status/{course_id}
- POST /api/roadmap/generate
- POST /api/rl/feedback
- GET  /api/rl/action/{session_id}
- WS   /ws/chat/{session_id}

## Run Commands
# Backend (from iqrabook/backend):
# uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Frontend (from iqrabook/frontend):
# npm run dev
