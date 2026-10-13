"""
app/middleware/rate_limit.py — Per-IP and per-user rate limiting via slowapi.

Limits (per minute):
  - Default: 60 requests / IP
  - Auth endpoints (/auth/*): 10 requests / IP (stricter to slow brute force)
  - WS ticket: 20 / user

Uses in-memory storage (suitable for single-process dev/tests). In production
with multiple workers, swap to Redis storage via limits[redis] + SlowAPIRedis.
"""
from __future__ import annotations

from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
