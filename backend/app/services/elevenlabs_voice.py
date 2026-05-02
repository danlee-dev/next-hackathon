"""ElevenLabs TTS — 페르소나별 음성 합성."""

from __future__ import annotations

import base64
import os
from typing import Optional

import httpx

from app.config import settings


VOICE_BY_JUDGE: dict[str, str] = {
    "judge-fact": os.getenv("JUDGE_FACT_VOICE_ID", "CxErO97xpQgQXYmapDKX"),
    "judge-connect": os.getenv("JUDGE_CONNECT_VOICE_ID", "jB1Cifc2UQbq1gR3wnb0"),
    "judge-critical": os.getenv("JUDGE_CRITICAL_VOICE_ID", "F7wT70V3u09d2rY9pNa6"),
}


async def synthesize(text: str, judge_id: str) -> Optional[str]:
    """텍스트 → ElevenLabs 음성 mp3 base64. 키 없으면 None."""
    api_key = os.getenv("ELEVENLABS_API_KEY", "")
    if not api_key:
        return None
    voice_id = VOICE_BY_JUDGE.get(judge_id, VOICE_BY_JUDGE["judge-fact"])
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
                return None
            return base64.b64encode(r.content).decode("ascii")
    except Exception:
        return None
