"""
app/knowledge/storage/__init__.py

StorageBackend interface (Strategy pattern).

Implementations:
  - LocalStorageBackend — dev: writes to STORAGE_ROOT dir
  - S3StorageBackend    — prod: Supabase Storage / Cloudflare R2 via boto3

Selection: settings.storage_backend = "local" | "s3"
"""
from __future__ import annotations

from abc import ABC, abstractmethod


class StorageBackend(ABC):
    """Abstract file storage. All methods are async-safe (run in thread pool)."""

    @abstractmethod
    async def store(self, key: str, data: bytes) -> None:
        """Persist *data* at *key*. Overwrites if key exists."""

    @abstractmethod
    async def retrieve(self, key: str) -> bytes:
        """Return bytes stored at *key*. Raises FileNotFoundError if missing."""

    @abstractmethod
    async def delete(self, key: str) -> None:
        """Delete *key*. No-op if not found."""

    @abstractmethod
    async def exists(self, key: str) -> bool:
        """Return True if *key* exists."""
