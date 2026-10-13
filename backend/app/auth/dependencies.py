"""
app/auth/dependencies.py — FastAPI dependencies for auth.

- get_db: async DB session
- get_current_user: reads Bearer token from Authorization header (or access cookie)
- require_admin: wraps get_current_user and asserts role == "admin"
- optional_current_user: returns None if not authenticated
"""
from __future__ import annotations

import logging
from typing import Optional

import jwt
from fastapi import Cookie, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.service import decode_token
from app.db.database import get_db
from app.db.models import User

log = logging.getLogger(__name__)

# We support both Authorization: Bearer <token> and access_token cookie
_oauth2 = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)


async def _resolve_token(
    bearer: Optional[str] = Depends(_oauth2),
    access_token: Optional[str] = Cookie(default=None),
) -> Optional[str]:
    return bearer or access_token


async def get_current_user(
    token: Optional[str] = Depends(_resolve_token),
    db: AsyncSession = Depends(get_db),
) -> User:
    credentials_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not token:
        raise credentials_exc
    try:
        payload = decode_token(token)
        if payload.get("type") != "access":
            raise credentials_exc
        user_id: str = payload["sub"]
    except jwt.InvalidTokenError:
        raise credentials_exc

    result = await db.execute(
        select(User).where(User.id == user_id, User.is_active == True)  # noqa: E712
    )
    user = result.scalar_one_or_none()
    if user is None:
        raise credentials_exc
    return user


async def optional_current_user(
    token: Optional[str] = Depends(_resolve_token),
    db: AsyncSession = Depends(get_db),
) -> Optional[User]:
    if not token:
        return None
    try:
        payload = decode_token(token)
        if payload.get("type") != "access":
            return None
        user_id: str = payload["sub"]
    except jwt.InvalidTokenError:
        return None
    result = await db.execute(
        select(User).where(User.id == user_id, User.is_active == True)  # noqa: E712
    )
    return result.scalar_one_or_none()


async def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return current_user
