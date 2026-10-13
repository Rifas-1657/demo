"""
app/middleware/logging.py — Structured request logging with request IDs.

Each request gets a unique `request_id` (uuid4 short) that appears in:
  - The X-Request-ID response header
  - Every log line during that request (via structlog context vars)

Log format: JSON in production, colored console in development.
"""
from __future__ import annotations

import logging
import time
import uuid

import structlog
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

from app.config import get_settings

_settings = get_settings()

# Configure structlog once
_processors = [
    structlog.contextvars.merge_contextvars,
    structlog.processors.add_log_level,
    structlog.processors.TimeStamper(fmt="iso"),
]

if _settings.app_env == "production":
    _processors.append(structlog.processors.JSONRenderer())
else:
    _processors.extend([
        structlog.dev.ConsoleRenderer(colors=True),
    ])

structlog.configure(
    processors=_processors,  # type: ignore[arg-type]
    wrapper_class=structlog.make_filtering_bound_logger(logging.INFO),
    logger_factory=structlog.PrintLoggerFactory(),
)

log = structlog.get_logger()


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Attaches a request_id and logs request/response pairs."""

    async def dispatch(self, request: Request, call_next) -> Response:
        request_id = uuid.uuid4().hex[:12]
        structlog.contextvars.clear_contextvars()
        structlog.contextvars.bind_contextvars(request_id=request_id)

        start = time.perf_counter()
        response = None
        try:
            response = await call_next(request)
        except Exception:
            log.exception("Unhandled request error", path=request.url.path)
            raise
        finally:
            duration_ms = round((time.perf_counter() - start) * 1000, 1)
            # Don't log health checks to reduce noise
            if request.url.path != "/health":
                log.info(
                    "request",
                    method=request.method,
                    path=request.url.path,
                    status=response.status_code if response is not None else 500,
                    duration_ms=duration_ms,
                )

        response.headers["X-Request-ID"] = request_id
        return response
