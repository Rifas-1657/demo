# ─────────────────────────────────────────────────────────
#  Stage 1: Builder — install Python deps
# ─────────────────────────────────────────────────────────
FROM python:3.11-slim AS builder

WORKDIR /build

# System deps for building wheels (psycopg2, faster-whisper, etc.)
RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential \
        libpq-dev \
        ffmpeg \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --upgrade pip \
 && pip wheel --no-cache-dir --wheel-dir /wheels -r requirements.txt


# ─────────────────────────────────────────────────────────
#  Stage 2: Runtime — minimal non-root image
# ─────────────────────────────────────────────────────────
FROM python:3.11-slim AS runtime

# Security: run as non-root
RUN groupadd -r bookey && useradd -r -g bookey -d /app bookey

WORKDIR /app

# Runtime system deps only
RUN apt-get update && apt-get install -y --no-install-recommends \
        libpq5 \
        ffmpeg \
        curl \
    && rm -rf /var/lib/apt/lists/*

# Copy pre-built wheels and install
COPY --from=builder /wheels /wheels
RUN pip install --no-cache-dir --no-index --find-links=/wheels /wheels/* \
 && rm -rf /wheels

# Copy application code
COPY --chown=bookey:bookey . .

# Directories that need to be writable (override with volume mounts in prod)
RUN mkdir -p /app/uploads /app/audio_cache /app/chroma_db \
 && chown -R bookey:bookey /app/uploads /app/audio_cache /app/chroma_db

USER bookey

EXPOSE 8000

# Liveness probe support
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Graceful shutdown: uvicorn handles SIGTERM with --timeout-graceful-shutdown
CMD ["uvicorn", "app.main:app", \
     "--host", "0.0.0.0", \
     "--port", "8000", \
     "--workers", "1", \
     "--timeout-graceful-shutdown", "10", \
     "--log-level", "info"]
