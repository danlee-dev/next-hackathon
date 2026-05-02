"""한국어 STT — gpt-4o-mini-transcribe."""

from __future__ import annotations

from app.core.openai_client import openai_client


async def transcribe_chunk(audio_bytes: bytes, lang: str = "ko") -> str:
    client = openai_client()
    if not client:
        return ""
    try:
        result = await client.audio.transcriptions.create(
            model="gpt-4o-mini-transcribe",
            file=("chunk.webm", audio_bytes, "audio/webm"),
            language=lang,
            response_format="json",
        )
    except Exception:
        return ""
    text = getattr(result, "text", "")
    return text or ""
