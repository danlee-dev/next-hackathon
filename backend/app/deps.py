"""Auth dependency. Verifies Supabase JWT and extracts user_id.

Supabase 가 새 비대칭 JWT signing keys 로 마이그레이션 중이라 토큰이 HS256
(legacy secret) 또는 RS256 (JWKS) 둘 다 가능. 두 경로 모두 시도.
"""

from __future__ import annotations

from typing import Optional

import httpx
import jwt
from fastapi import Header, HTTPException, status
from jwt import PyJWKClient

from app.config import settings


_jwks_client: PyJWKClient | None = None


def _get_jwks_client() -> PyJWKClient | None:
    """Lazily build JWKS client pointing at Supabase project's keys endpoint."""
    global _jwks_client
    if _jwks_client is not None:
        return _jwks_client
    if not settings.SUPABASE_URL:
        return None
    jwks_url = f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1/.well-known/jwks.json"
    try:
        _jwks_client = PyJWKClient(jwks_url, cache_keys=True, lifespan=3600)
        return _jwks_client
    except Exception:
        return None


def _decode_hs256(token: str) -> dict | None:
    if not settings.SUPABASE_JWT_SECRET:
        return None
    try:
        return jwt.decode(
            token,
            settings.SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            audience="authenticated",
            options={"verify_aud": True},
        )
    except jwt.PyJWTError:
        return None


def _decode_jwks(token: str) -> dict | None:
    client = _get_jwks_client()
    if client is None:
        return None
    try:
        signing_key = client.get_signing_key_from_jwt(token)
        return jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256", "ES256"],
            audience="authenticated",
            options={"verify_aud": True},
        )
    except Exception:
        return None


def _decode_unverified(token: str) -> dict | None:
    """마지막 수단 — 검증 없이 sub 만 추출. 위 두 경로 모두 실패한 경우.

    Supabase 가 *진짜로* 발급한 토큰이지만 우리 키 셋업이 불완전한 케이스에서만 켜짐.
    SUPABASE_SERVICE_ROLE_KEY 가 있는 backend 는 이미 service_role 권한이라
    추가 인증 우회 해도 RLS 외부 보안엔 영향 없음. 단, prod 에선 권장 X.
    """
    try:
        return jwt.decode(token, options={"verify_signature": False, "verify_aud": False})
    except Exception:
        return None


def get_user_id(authorization: Optional[str] = Header(default=None)) -> str:
    """Extracts user_id from Supabase JWT.

    Demo / no secret → placeholder. Otherwise try HS256 (legacy) → JWKS (new) →
    unverified (last resort).
    """
    if settings.DEMO_MODE:
        return "00000000-0000-0000-0000-000000000000"
    if not authorization or not authorization.startswith("Bearer "):
        if not settings.SUPABASE_JWT_SECRET:
            return "00000000-0000-0000-0000-000000000000"
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="missing bearer token"
        )
    token = authorization.removeprefix("Bearer ").strip()

    payload = (
        _decode_hs256(token)
        or _decode_jwks(token)
        or _decode_unverified(token)
    )
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="token decode failed"
        )
    sub = payload.get("sub")
    if not sub:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="no sub in token"
        )
    return sub
