# Bookey Production Deploy Guide

## Overview

Bookey requires three durable backing services — relational DB, vector store, and object storage.
A free host's local filesystem is **ephemeral** (erased on restart, redeploy, and spin-down).
SQLite and a local ChromaDB directory are development-only; never use them in production.

---

## Service Map

| Service | Dev | Production |
|---|---|---|
| Relational DB + pgvector | SQLite (aiosqlite) | Managed PostgreSQL >= 14 with pgvector extension |
| Vector store | ChromaDB (local disk) | pgvector table in same PostgreSQL instance |
| Object storage (uploads, audio) | Local disk `/uploads` | S3-compatible (Supabase Storage, Cloudflare R2, AWS S3) |
| Backend | uvicorn process | Docker container, single worker (WebSockets need sticky sessions) |
| Frontend | Next.js dev server | Vercel / Railway / Render |
| Code runner (B3) | In-process sandbox | Isolated container (no network, no filesystem write) |

---

## Recommended Free-Tier Stack

### Supabase (PostgreSQL + pgvector + Storage)
- Database: 500 MB on free tier, 8 GB on Pro ($25/mo)
- pgvector: built-in extension, enable with `create extension vector;`
- Storage: 1 GB on free tier, 100 GB on Pro
- Pauses after 1 week inactivity on free tier — use Pro or set a daily query cron

### Railway (Backend container)
- Free tier: 512 MB RAM, 1 vCPU, 5 GB disk (ephemeral — use Supabase for DB/storage)
- 500 hours/month on free tier (~20 days/month); upgrade to Hobby ($5/mo) for always-on
- WebSockets supported; sticky sessions not required with single worker
- Cold start: ~3-5 s on first request after idle

### Vercel (Frontend)
- Free tier: 100 GB bandwidth
- Analytics auto-injected on Vercel — remove manual Analytics if using a custom provider

---

## Environment Variables

Copy `backend/.env.example` to `backend/.env`. Never commit `.env` to git.

| Variable | Required | Description |
|---|---|---|
| DATABASE_URL | YES | `postgresql+asyncpg://user:pass@host/db` |
| SECRET_KEY | YES | 64-char random hex for JWT signing |
| GEMINI_API_KEY | YES | Google Gemini API key (primary LLM) |
| GROQ_API_KEY | no | Groq fallback LLM |
| NVIDIA_NIM_API_KEY | no | NVIDIA NIM fallback LLM |
| OPENROUTER_API_KEY | no | OpenRouter fallback LLM |
| GROQ_WHISPER_MODEL | no | Groq STT model (default: whisper-large-v3) |
| S3_ENDPOINT_URL | prod | S3-compatible endpoint URL |
| S3_ACCESS_KEY | prod | S3 access key |
| S3_SECRET_KEY | prod | S3 secret key |
| S3_BUCKET_UPLOADS | prod | Bucket for uploaded documents |
| S3_BUCKET_AUDIO | prod | Bucket for TTS audio cache |
| CORS_ORIGINS | prod | Comma-separated allowed origins |
| SENTRY_DSN | no | Enable Sentry error tracking |
| LANGFUSE_PUBLIC_KEY | no | Enable Langfuse LLM tracing |
| LANGFUSE_SECRET_KEY | no | Langfuse secret key |
| LOG_LEVEL | no | INFO (default) or DEBUG |
| APP_ENV | no | development (default) or production |
| GEMINI_MODEL | no | Default: gemini-1.5-pro (read from config, never hardcoded) |
| GROQ_MODEL | no | Default: llama-3.3-70b-versatile |

---

## Cold Start and WebSocket Idle Limits

### Cold Start
- Railway free tier spins down after ~15 min of inactivity. Cold start: 3-5 s.
- Mitigation: UptimeRobot free monitor (5-min pings to /health) keeps it warm.
- Frontend shows "Connecting..." during cold start and retries WS automatically.

### WebSocket Idle Limits
- Railway: no hard idle limit per WS connection (TCP keepalive)
- Cloudflare: 100 s idle timeout on proxied WS. Use Cloudflare Argo or direct TCP.
- Client heartbeat: send a ping frame every 30 s from frontend; backend echoes pong.
- Resume: on reconnect, client resends start_page with resumeFrom: lastSeenSeq so narration
  continues without duplicating cues.

---

## Deployment Steps

### 1. Provision PostgreSQL (Supabase)
```sql
-- In Supabase SQL editor:
create extension if not exists vector;
```
Set DATABASE_URL in your environment.

### 2. Build and push Docker image
```bash
cd backend
docker build --target runtime -t ghcr.io/your-org/bookey-backend:latest .
docker push ghcr.io/your-org/bookey-backend:latest
```

### 3. Deploy to Railway
- Create a new service from Docker image
- Set all env vars from the table above
- Set PORT=8000
- Enable health check: /health

### 4. Deploy frontend to Vercel
```bash
vercel deploy --prod
```
Set NEXT_PUBLIC_BOOKEY_API_URL and NEXT_PUBLIC_BOOKEY_CLIENT=ws.

### 5. First deploy: tables are auto-created via Base.metadata.create_all on startup.
For production, migrate with Alembic instead.

---

## DB Backup Script

```bash
#!/bin/bash
# Run daily via cron or Railway cron job
set -e
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
pg_dump "$DATABASE_URL" --no-acl --no-owner \
  | gzip \
  | aws s3 cp - "s3://$BACKUP_BUCKET/bookey-db-${TIMESTAMP}.sql.gz"
echo "Backup complete: bookey-db-${TIMESTAMP}.sql.gz"
```

---

## Security Checklist

- [ ] SECRET_KEY is 64 random hex chars
- [ ] CORS_ORIGINS is set to exact frontend domain (no wildcard in production)
- [ ] APP_ENV=production disables OpenAPI docs
- [ ] Upload quarantine: files virus-scanned before indexing
- [ ] pip-audit passes with no known CVEs: `pip-audit -r requirements.txt`
- [ ] No secrets in git history: `git log --all --full-diff -p -- .env`
- [ ] Rate limits enforced: 60 req/min per IP, 10 questions/min per user
- [ ] Non-root Docker user (bookey:bookey in Dockerfile)
