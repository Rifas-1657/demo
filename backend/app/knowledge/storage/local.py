"""
app/knowledge/storage/local.py — Local disk storage backend (development).

Files are stored under STORAGE_ROOT/<key>.
Never used in production — set STORAGE_BACKEND=s3 for prod.
"""
from __future__ import annotations

import asyncio
from pathlib import Path

from app.knowledge.storage import StorageBackend


class LocalStorageBackend(StorageBackend):
    def __init__(self, root: str | Path) -> None:
        self._root = Path(root)
        self._root.mkdir(parents=True, exist_ok=True)

    def _path(self, key: str) -> Path:
        # Prevent path traversal: strip leading slashes and dots
        safe = Path(key.lstrip("/").replace("..", "__"))
        return self._root / safe

    async def store(self, key: str, data: bytes) -> None:
        path = self._path(key)
        path.parent.mkdir(parents=True, exist_ok=True)
        await asyncio.to_thread(path.write_bytes, data)

    async def retrieve(self, key: str) -> bytes:
        path = self._path(key)
        if not path.exists():
            raise FileNotFoundError(f"Storage key not found: {key}")
        return await asyncio.to_thread(path.read_bytes)

    async def delete(self, key: str) -> None:
        path = self._path(key)
        await asyncio.to_thread(lambda: path.unlink(missing_ok=True))

    async def exists(self, key: str) -> bool:
        return self._path(key).exists()
