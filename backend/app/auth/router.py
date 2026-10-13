"""
app/auth/router.py — Auth REST endpoints.

POST /auth/signup    — sign up with invite token
POST /auth/login     — email + password → access + refresh cookies
POST /auth/logout    — clear cookies
POST /auth/refresh   — rotate refresh token → new access token
POST /auth/password-reset/request  — request reset (token printed in dev, emailed in prod)
POST /auth/password-reset/confirm  — confirm reset with token + new password

Cookie strategy:
  - access_token:  httpOnly, SameSite=Lax (Strict in prod), 15 min
  - refresh_token: httpOnly, SameSite=Lax (Strict in prod), 7 days
  - Also returns tokens in body for clients that prefer Authorization header.

CSRF: SameSite=Lax prevents CSRF for same-site requests. In cross-origin (prod),
use HTTPS + SameSite=None;Secure with a same-site proxy (Next.js rewrites).
"""
from __future__ import annotations

import logging

import jwt
from fastapi import APIRouter, Cookie, Depends, HTTPException, Request, Response, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import service
from app.auth.dependencies import get_current_user
from app.auth.service import (
    can_add_learner,
    consume_invite,
    consume_password_reset_token,
    count_admin_seats,
    create_access_token,
    create_invite,
    create_password_reset_token,
    create_refresh_token,
    decode_token,
    hash_password,
    mark_invite_used,
    mark_reset_token_used,
    needs_rehash,
    verify_password,
)
from app.config import get_settings
from app.db.database import get_db
from app.db.models import Notification, User

log = logging.getLogger(__name__)
settings = get_settings()
router = APIRouter(prefix="/auth", tags=["auth"])

_COOKIE_KWARGS = dict(
    httponly=True,
    samesite="lax",
    secure=settings.app_env == "production",
)


# ---------------------------------------------------------------------------
# Request/response schemas
# ---------------------------------------------------------------------------

class SignupRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    display_name: str = Field(min_length=1, max_length=120)
    invite_token: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    role: str
    display_name: str


class PasswordResetRequest(BaseModel):
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str = Field(min_length=8)


class MessageResponse(BaseModel):
    message: str


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _set_auth_cookies(response: Response, access_token: str, refresh_token: str) -> None:
    response.set_cookie(
        "access_token", access_token,
        max_age=settings.access_token_expire_minutes * 60,
        **_COOKIE_KWARGS,
    )
    response.set_cookie(
        "refresh_token", refresh_token,
        max_age=settings.refresh_token_expire_days * 86400,
        **_COOKIE_KWARGS,
    )


def _clear_auth_cookies(response: Response) -> None:
    response.delete_cookie("access_token")
    response.delete_cookie("refresh_token")


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/signup", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def signup(
    body: SignupRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> AuthResponse:
    # 1. Validate invite token
    invite = await consume_invite(db, body.invite_token)
    if invite is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid or expired invite token",
        )

    # 2. Check seat limit for learners
    role = invite.role
    if role == "learner":
        if not await can_add_learner(db):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Platform seat limit reached (max {service.MAX_LEARNER_SEATS} learners)",
            )
    elif role == "admin":
        if await count_admin_seats(db) >= 1:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin seat already taken",
            )

    # 3. Check email uniqueness
    existing = await db.execute(select(User).where(User.email == body.email))
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )

    # 4. Create user
    user = User(
        email=body.email,
        display_name=body.display_name,
        role=role,
        password_hash=hash_password(body.password),
    )
    db.add(user)
    await db.flush()  # get user.id

    # 5. Mark invite used
    await mark_invite_used(db, invite, user.id)
    await db.commit()

    # 6. Issue tokens
    access_token = create_access_token(user.id, user.role)
    refresh_token = create_refresh_token(user.id)
    _set_auth_cookies(response, access_token, refresh_token)

    log.info("User signed up: %s role=%s", user.email, user.role)
    return AuthResponse(
        access_token=access_token,
        user_id=user.id,
        role=user.role,
        display_name=user.display_name,
    )


@router.post("/login", response_model=AuthResponse)
async def login(
    body: LoginRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> AuthResponse:
    result = await db.execute(
        select(User).where(User.email == body.email, User.is_active == True)  # noqa: E712
    )
    user = result.scalar_one_or_none()

    if user is None or not verify_password(body.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    # Rehash if params changed
    if needs_rehash(user.password_hash):
        user.password_hash = hash_password(body.password)
        await db.commit()

    access_token = create_access_token(user.id, user.role)
    refresh_token = create_refresh_token(user.id)
    _set_auth_cookies(response, access_token, refresh_token)

    log.info("User logged in: %s", user.email)
    return AuthResponse(
        access_token=access_token,
        user_id=user.id,
        role=user.role,
        display_name=user.display_name,
    )


@router.post("/logout", response_model=MessageResponse)
async def logout(response: Response) -> MessageResponse:
    _clear_auth_cookies(response)
    return MessageResponse(message="Logged out")


@router.post("/refresh", response_model=AuthResponse)
async def refresh(
    response: Response,
    refresh_token: str | None = Cookie(default=None),
    db: AsyncSession = Depends(get_db),
) -> AuthResponse:
    if not refresh_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="No refresh token")
    try:
        payload = decode_token(refresh_token)
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token type")
        user_id: str = payload["sub"]
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

    result = await db.execute(
        select(User).where(User.id == user_id, User.is_active == True)  # noqa: E712
    )
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    new_access = create_access_token(user.id, user.role)
    new_refresh = create_refresh_token(user.id)
    _set_auth_cookies(response, new_access, new_refresh)

    return AuthResponse(
        access_token=new_access,
        user_id=user.id,
        role=user.role,
        display_name=user.display_name,
    )


@router.post("/password-reset/request", response_model=MessageResponse)
async def request_password_reset(
    body: PasswordResetRequest,
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()

    # Always return 200 to avoid email enumeration
    if user is None:
        return MessageResponse(message="If that email exists, a reset link was sent.")

    raw_token = await create_password_reset_token(db, user.id)

    if settings.app_env == "production" and settings.smtp_host:
        # TODO: send actual email via SMTP
        log.info("Password reset email would be sent to %s", user.email)
    else:
        # Dev mode: print token to log (safe — no real email needed)
        log.warning(
            "DEV PASSWORD RESET TOKEN for %s: %s (expires 2h)", user.email, raw_token
        )

    return MessageResponse(message="If that email exists, a reset link was sent.")


@router.post("/password-reset/confirm", response_model=MessageResponse)
async def confirm_password_reset(
    body: PasswordResetConfirm,
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    record = await consume_password_reset_token(db, body.token)
    if record is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token",
        )

    result = await db.execute(select(User).where(User.id == record.user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    user.password_hash = hash_password(body.new_password)
    await mark_reset_token_used(db, record)
    await db.commit()

    log.info("Password reset completed for %s", user.email)
    return MessageResponse(message="Password updated successfully")
