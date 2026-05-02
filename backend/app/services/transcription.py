"""한국어 STT — gpt-4o-mini-transcribe."""

from __future__ import annotations

import logging

from app.core.openai_client import openai_client

logger = logging.getLogger(__name__)


async def transcribe_chunk(audio_bytes: bytes, lang: str = "ko") -> str:
    client = openai_client()
    if not client:
        logger.warning("[transcribe_chunk] OPENAI_API_KEY missing — returning empty")
        return ""
    try:
        result = await client.audio.transcriptions.create(
            model="gpt-4o-mini-transcribe",
            file=("chunk.webm", audio_bytes, "audio/webm"),
            language=lang,
            response_format="json",
        )
    except Exception:
        logger.exception("[transcribe_chunk] Whisper call failed (bytes=%d)", len(audio_bytes))
        return ""
    text = getattr(result, "text", "")
    if not text:
        logger.info("[transcribe_chunk] empty result (bytes=%d)", len(audio_bytes))
    return text or ""
