"""Cached OpenAI / Anthropic clients."""

from __future__ import annotations

from functools import lru_cache
from typing import Optional

from app.config import settings


@lru_cache(maxsize=1)
def openai_client():
    from openai import AsyncOpenAI

    if not settings.OPENAI_API_KEY:
        return None
    return AsyncOpenAI(api_key=settings.OPENAI_API_KEY)


@lru_cache(maxsize=1)
def anthropic_client():
    from anthropic import AsyncAnthropic

    if not settings.ANTHROPIC_API_KEY:
        return None
    return AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
