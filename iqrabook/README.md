# 📖 IqraBook — اقْرَأْ

### AI-Powered 3D Interactive Learning Platform

> بِسْمِ ٱللَّٰهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
> "Read in the name of your Lord who created" — Surah Al-Alaq (96:1)

## 🌟 What is IqraBook?

IqraBook is a revolutionary learning platform where an **AI voice agent teaches programming courses** using an **interactive 3D book interface**. The agent speaks in **Tanglish** (Tamil + English), creating a natural and engaging learning experience.

## 🎯 Features

- 📖 **3D Interactive Book** — Full 3D book with page flip animations
- 🎙️ **Voice AI Tutor** — Tanglish-speaking AI teacher
- 💻 **Live Code Runner** — Python (Pyodide), Java, HTML in-browser
- 🧠 **RL Personalization** — Adaptive teaching via Q-Learning
- 📊 **RAG Knowledge** — Learns from PDFs, research papers, GitHub repos
- 🔄 **Session Resume** — Pick up where you left off
- 🎨 **Beautiful UI** — Red/Pink/White theme with glassmorphism

## 📚 Available Courses

| Course | Status |
|--------|--------|
| 🐍 Python | Building |
| ☕ Java | Planned |
| 🧠 Machine Learning | Planned |
| 🌐 HTML & Web Dev | Planned |

## 🛠️ Tech Stack

### Frontend
- Next.js 15 + React 19
- React Three Fiber + Three.js
- Zustand + Tailwind CSS + Framer Motion

### Backend
- FastAPI + LangGraph
- SQLite + ChromaDB
- Groq (STT + Fast Q&A) + Gemini (Teaching + TTS)

### AI Models
| Task | Provider | Model |
|------|----------|-------|
| STT | Groq | Whisper Large v3 Turbo |
| Fast Q&A | Groq | Llama 4 Scout 17B |
| Teaching | Gemini | 3.8 Flash |
| Voice | Gemini | 3.8 Flash TTS |
| Embeddings | Gemini | Embedding model |

## 🚀 Getting Started

```bash
# Frontend
cd frontend
npm install
npm run dev

# Backend
cd backend
pip install -r requirements.txt
cp .env.example .env  # Fill in your API keys
uvicorn app.main:app --reload
```

## 📊 Project Status

See [PROGRESS.md](./PROGRESS.md) for detailed tracking.

## 🤲 License

Private project — built with barakah, InSha'Allah.
