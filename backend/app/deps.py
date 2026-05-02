"""Auth dependency. Verifies Supabase JWT and extracts user_id."""

from __future__ import annotations

from typing import Optional

import jwt
from fastapi import Header, HTTPException, status

from app.config import settings


def get_user_id(authorization: Optional[str] = Header(default=None)) -> str:
    """Extracts user_id from Supabase JWT.

    In DEMO_MODE or if SUPABASE_JWT_SECRET is unset, returns 'demo-user'.
    Allows the frontend to function without a configured Supabase project
    during the hackathon.
    """
    if settings.DEMO_MODE or not settings.SUPABASE_JWT_SECRET:
        return "00000000-0000-0000-0000-000000000000"
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="missing bearer token")
    token = authorization.removeprefix("Bearer ").strip()
    try:
        payload = jwt.decode(
            token,
            settings.SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            audience="authenticated",
            options={"verify_aud": True},
        )
    except jwt.PyJWTError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e)) from e
    sub = payload.get("sub")
    if not sub:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="no sub in token")
    return sub
