"""ElevenLabs TTS — 페르소나별 음성 합성."""

from __future__ import annotations

import base64
import logging
import os
from typing import Optional

import httpx

logger = logging.getLogger(__name__)


# Per-judge voice ids. Each can be overridden by its own env var, or by a
# single ELEVENLABS_VOICE_ID fallback if the user only configured one voice.
# The hardcoded defaults are public ElevenLabs voices; they may not be
# accessible from every account, which is the most common reason audio comes
# back empty — set the env var to a voice id from your own account.
_DEFAULT_VOICES: dict[str, str] = {
    "judge-fact": "CxErO97xpQgQXYmapDKX",
    "judge-connect": "jB1Cifc2UQbq1gR3wnb0",
    "judge-critical": "F7wT70V3u09d2rY9pNa6",
}


def _voice_for(judge_id: str) -> str:
    per_judge_env = {
        "judge-fact": "JUDGE_FACT_VOICE_ID",
        "judge-connect": "JUDGE_CONNECT_VOICE_ID",
        "judge-critical": "JUDGE_CRITICAL_VOICE_ID",
    }.get(judge_id)
    return (
        (os.getenv(per_judge_env) if per_judge_env else None)
        or os.getenv("ELEVENLABS_VOICE_ID")
        or _DEFAULT_VOICES.get(judge_id, _DEFAULT_VOICES["judge-fact"])
    )


async def synthesize(text: str, judge_id: str) -> Optional[str]:
    """텍스트 → ElevenLabs 음성 mp3 base64. 실패 사유는 logger 로 출력."""
    api_key = os.getenv("ELEVENLABS_API_KEY", "")
    if not api_key:
        logger.warning("[elevenlabs] ELEVENLABS_API_KEY missing — skipping TTS")
        return None
    voice_id = _voice_for(judge_id)
    if not voice_id:
        logger.warning("[elevenlabs] no voice id resolved for %s", judge_id)
        return None
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
    payload = {
        "text": text,
        "model_id": "eleven_multilingual_v2",
        "voice_settings": {
            "stability": 0.55,
            "similarity_boost": 0.78,
            "style": 0.4,
            "use_speaker_boost": True,
        },
    }
    headers = {
        "xi-api-key": api_key,
        "Content-Type": "application/json",
        "Accept": "audio/mpeg",
    }
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            r = await client.post(url, headers=headers, json=payload)
            if r.status_code != 200:
                logger.error(
                    "[elevenlabs] %d for judge=%s voice=%s body=%s",
                    r.status_code,
                    judge_id,
                    voice_id,
                    r.text[:300],
                )
                return None
            if not r.content:
                logger.error("[elevenlabs] empty body for judge=%s voice=%s", judge_id, voice_id)
                return None
            return base64.b64encode(r.content).decode("ascii")
    except Exception:
        logger.exception(
            "[elevenlabs] request failed for judge=%s voice=%s", judge_id, voice_id
        )
        return None
