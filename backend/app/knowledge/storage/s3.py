"""
app/knowledge/storage/s3.py — S3-compatible object storage backend (production).

Works with Supabase Storage, Cloudflare R2, AWS S3, MinIO, etc.
Configure via env vars:
  S3_ENDPOINT_URL   — optional for non-AWS (e.g. https://xxx.r2.cloudflarestorage.com)
  S3_BUCKET         — bucket name
  S3_ACCESS_KEY     — access key id
  S3_SECRET_KEY     — secret access key
  S3_REGION         — region (default "auto" for R2)
"""
from __future__ import annotations

import asyncio
from functools import lru_cache
from typing import Any

from app.knowledge.storage import StorageBackend


class S3StorageBackend(StorageBackend):
    def __init__(
        self,
        bucket: str,
        access_key: str,
        secret_key: str,
        region: str = "auto",
        endpoint_url: str | None = None,
    ) -> None:
        self._bucket = bucket
        self._client_kwargs: dict[str, Any] = {
            "service_name": "s3",
            "aws_access_key_id": access_key,
            "aws_secret_access_key": secret_key,
            "region_name": region,
        }
        if endpoint_url:
            self._client_kwargs["endpoint_url"] = endpoint_url

    def _get_client(self):  # noqa: ANN201
        import boto3
        return boto3.client(**self._client_kwargs)

    async def store(self, key: str, data: bytes) -> None:
        client = self._get_client()
        await asyncio.to_thread(
            client.put_object, Bucket=self._bucket, Key=key, Body=data
        )

    async def retrieve(self, key: str) -> bytes:
        client = self._get_client()
        try:
            resp = await asyncio.to_thread(
                client.get_object, Bucket=self._bucket, Key=key
            )
            return await asyncio.to_thread(resp["Body"].read)
        except Exception as exc:
            if "NoSuchKey" in str(type(exc).__name__):
                raise FileNotFoundError(f"S3 key not found: {key}") from exc
            raise

    async def delete(self, key: str) -> None:
        client = self._get_client()
        await asyncio.to_thread(
            client.delete_object, Bucket=self._bucket, Key=key
        )

    async def exists(self, key: str) -> bool:
        client = self._get_client()
        try:
            await asyncio.to_thread(
                client.head_object, Bucket=self._bucket, Key=key
            )
            return True
        except Exception:
            return False
