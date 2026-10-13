"""
app/observability.py

B6-2: Structured logging, /health, /ready, provider metrics, optional Langfuse/Sentry.

Env flags:
  LANGFUSE_PUBLIC_KEY + LANGFUSE_SECRET_KEY  → enable Langfuse tracing
  ARIZE_API_KEY                              → enable Arize Phoenix
  SENTRY_DSN                                 → enable Sentry error hook
  LOG_LEVEL                                  → default INFO
  LOG_FORMAT                                 → json | text (default text in dev)
"""
from __future__ import annotations

import logging
import os
import time
import uuid
from contextvars import ContextVar
from typing import Callable

from fastapi import FastAPI, Request, Response
from fastapi.responses import JSONResponse

# ---------------------------------------------------------------------------
# Request-id context var
# ---------------------------------------------------------------------------
_request_id_var: ContextVar[str] = ContextVar("request_id", default="")


def get_request_id() -> str:
    return _request_id_var.get()


# ---------------------------------------------------------------------------
# Provider call metrics (in-memory ring buffer, last 1000 calls)
# ---------------------------------------------------------------------------

import collections

_ProviderMetric = dict  # {provider, model, latency_ms, success, tokens, ts}
_provider_metrics: collections.deque[_ProviderMetric] = collections.deque(maxlen=1000)


def record_provider_call(
    provider: str,
    model: str,
    latency_ms: float,
    success: bool,
    tokens: int = 0,
    error: str = "",
) -> None:
    _provider_metrics.append({
        "provider": provider,
        "model": model,
        "latency_ms": round(latency_ms, 1),
        "success": success,
        "tokens": tokens,
        "error": error,
        "ts": time.time(),
    })


def get_provider_metrics(last_n: int = 100) -> list[_ProviderMetric]:
    data = list(_provider_metrics)
    return data[-last_n:]


def provider_summary() -> dict:
    data = list(_provider_metrics)
    if not data:
        return {}
    by_provider: dict[str, list] = {}
    for m in data:
        by_provider.setdefault(m["provider"], []).append(m)
    result = {}
    for prov, calls in by_provider.items():
        latencies = [c["latency_ms"] for c in calls]
        errors = sum(1 for c in calls if not c["success"])
        result[prov] = {
            "total_calls": len(calls),
            "error_count": errors,
            "error_rate": round(errors / len(calls), 3),
            "p50_latency_ms": round(sorted(latencies)[len(latencies) // 2], 1),
            "p95_latency_ms": round(sorted(latencies)[int(len(latencies) * 0.95)], 1),
            "total_tokens": sum(c["tokens"] for c in calls),
        }
    return result


# ---------------------------------------------------------------------------
# Middleware: attach request-id, log every request
# ---------------------------------------------------------------------------

log = logging.getLogger("bookey.http")


async def request_id_middleware(request: Request, call_next: Callable) -> Response:
    rid = request.headers.get("X-Request-ID") or str(uuid.uuid4())[:16]
    _request_id_var.set(rid)
    t0 = time.monotonic()
    response = await call_next(request)
    latency = int((time.monotonic() - t0) * 1000)
    log.info(
        "%s %s %d %dms req_id=%s",
        request.method, request.url.path,
        response.status_code, latency, rid,
    )
    response.headers["X-Request-ID"] = rid
    response.headers["X-Response-Time-Ms"] = str(latency)
    return response


# ---------------------------------------------------------------------------
# /health and /ready endpoints
# ---------------------------------------------------------------------------

async def health_handler(request: Request) -> JSONResponse:
    """Liveness probe — always 200 if the process is up."""
    return JSONResponse({"status": "ok", "service": "bookey-backend"})


async def ready_handler(request: Request) -> JSONResponse:
    """Readiness probe — checks DB, vector store, and primary LLM provider."""
    checks: dict[str, dict] = {}
    ok = True

    # --- DB ---
    try:
        from app.db.database import AsyncSessionLocal
        from sqlalchemy import text
        async with AsyncSessionLocal() as db:
            await db.execute(text("SELECT 1"))
        checks["database"] = {"status": "ok"}
    except Exception as exc:
        checks["database"] = {"status": "error", "detail": str(exc)[:100]}
        ok = False

    # --- Vector store (ChromaDB) ---
    try:
        from app.knowledge.vector_store import get_collection
        col = await get_collection("__health__")
        checks["vector_store"] = {"status": "ok"}
    except Exception as exc:
        checks["vector_store"] = {"status": "degraded", "detail": str(exc)[:80]}
        # degraded — not fatal for readiness

    # --- Primary LLM provider ---
    try:
        from app.llm.router import get_llm_router
        router = get_llm_router()
        checks["llm_router"] = {
            "status": "ok",
            "providers": [p.name for p in router._providers],
        }
    except Exception as exc:
        checks["llm_router"] = {"status": "error", "detail": str(exc)[:100]}
        ok = False

    status_code = 200 if ok else 503
    return JSONResponse(
        {"status": "ok" if ok else "degraded", "checks": checks},
        status_code=status_code,
    )


# ---------------------------------------------------------------------------
# Optional Sentry integration
# ---------------------------------------------------------------------------

def init_sentry(dsn: str) -> None:
    try:
        import sentry_sdk
        from sentry_sdk.integrations.fastapi import FastApiIntegration
        from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration
        sentry_sdk.init(
            dsn=dsn,
            integrations=[FastApiIntegration(), SqlalchemyIntegration()],
            traces_sample_rate=0.1,
            environment=os.getenv("ENVIRONMENT", "development"),
        )
        logging.getLogger("bookey").info("Sentry initialized")
    except ImportError:
        logging.getLogger("bookey").warning("sentry-sdk not installed; SENTRY_DSN ignored")


# ---------------------------------------------------------------------------
# Optional Langfuse tracing
# ---------------------------------------------------------------------------

_langfuse_client = None


def get_langfuse():
    global _langfuse_client
    if _langfuse_client is not None:
        return _langfuse_client
    pk = os.getenv("LANGFUSE_PUBLIC_KEY")
    sk = os.getenv("LANGFUSE_SECRET_KEY")
    if pk and sk:
        try:
            from langfuse import Langfuse
            _langfuse_client = Langfuse(public_key=pk, secret_key=sk)
        except ImportError:
            pass
    return _langfuse_client


def trace_llm_call(
    name: str,
    prompt: str,
    response: str,
    model: str,
    latency_ms: float,
    tokens: int,
) -> None:
    lf = get_langfuse()
    if lf is None:
        return
    try:
        trace = lf.trace(name=name)
        trace.generation(
            name=name,
            model=model,
            prompt=prompt,
            completion=response,
            usage={"total_tokens": tokens},
            metadata={"latency_ms": latency_ms, "request_id": get_request_id()},
        )
    except Exception:
        pass  # tracing is best-effort


# ---------------------------------------------------------------------------
# Register everything onto a FastAPI app
# ---------------------------------------------------------------------------

def register_observability(app: FastAPI) -> None:
    from starlette.middleware.base import BaseHTTPMiddleware
    app.add_middleware(BaseHTTPMiddleware, dispatch=request_id_middleware)
    app.add_route("/health", health_handler, methods=["GET"])
    app.add_route("/ready", ready_handler, methods=["GET"])

    # Sentry
    dsn = os.getenv("SENTRY_DSN")
    if dsn:
        init_sentry(dsn)
