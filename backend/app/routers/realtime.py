"""OpenAI Realtime API — ephemeral session token + transcript delta intake.

Frontend connects to OpenAI Realtime WebSocket directly with a short-lived
client_secret minted here. Audio (24 kHz PCM16 base64) flows browser ->
OpenAI; transcription deltas come back to the browser, which forwards the
text to /transcript-delta so the backend can run filler / pace / judge
analysis on the canonical transcript.
"""

from __future__ import annotations

import logging
import time
from typing import Any

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.config import settings
from app.deps import get_user_id
from app.routers.sessions import session_state
from app.services.filler_detector import detect_empty_phrases, detect_fillers
from app.services.scoring import all_scores

logger = logging.getLogger(__name__)

router = APIRouter()


class EphemeralSessionRes(BaseModel):
    client_secret: str
    expires_at: int
    model: str
    sample_rate: int = 24000


@router.post("/realtime/session", response_model=EphemeralSessionRes)
async def create_realtime_session(user_id: str = Depends(get_user_id)) -> EphemeralSessionRes:
    """Mint a short-lived OpenAI Realtime client_secret for transcription.

    Browser uses this token (not the long-lived API key) to connect to
    wss://api.openai.com/v1/realtime as a WebSocket subprotocol.
    """
    if not settings.OPENAI_API_KEY:
        raise HTTPException(503, "OPENAI_API_KEY missing on server")

    payload: dict[str, Any] = {
        "session": {
            "type": "transcription",
            "audio": {
                "input": {
                    "format": {"type": "audio/pcm", "rate": 24000},
                    "transcription": {
                        "model": "gpt-4o-mini-transcribe",
                        "language": "ko",
                    },
                    "turn_detection": {
                        "type": "server_vad",
                        "threshold": 0.5,
                        "prefix_padding_ms": 300,
                        "silence_duration_ms": 500,
                    },
                }
            },
        }
    }

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                "https://api.openai.com/v1/realtime/client_secrets",
                headers={
                    "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
                    "Content-Type": "application/json",
                },
                json=payload,
            )
    except httpx.HTTPError as e:
        logger.exception("[realtime/session] OpenAI request failed")
        raise HTTPException(502, f"realtime mint failed: {e}") from e

    if resp.status_code >= 400:
        logger.error("[realtime/session] %d %s", resp.status_code, resp.text)
        raise HTTPException(resp.status_code, f"realtime mint failed: {resp.text[:200]}")

    data = resp.json()
    secret = data.get("value") or data.get("client_secret", {}).get("value")
    expires = (
        data.get("expires_at")
        or data.get("client_secret", {}).get("expires_at")
        or int(time.time()) + 60
    )
    if not secret:
        logger.error("[realtime/session] missing client_secret in response: %s", data)
        raise HTTPException(502, "realtime mint: response missing client_secret")

    return EphemeralSessionRes(
        client_secret=secret,
        expires_at=int(expires),
        model="gpt-4o-mini-transcribe",
        sample_rate=24000,
    )


class TranscriptDeltaReq(BaseModel):
    delta: str = Field(min_length=1)
    ts_ms: int = 0
    is_final: bool = False


class TranscriptDeltaRes(BaseModel):
    transcript: str
    filler_count_delta: int
    filler_words_found: list[dict[str, Any]] = Field(default_factory=list)
    empty_phrases_delta: int = 0
    pace_cpm: float
    filler_count_per_min: float
    audio_score: float


@router.post("/sessions/{session_id}/transcript-delta", response_model=TranscriptDeltaRes)
async def transcript_delta(
    session_id: str,
    req: TranscriptDeltaReq,
    user_id: str = Depends(get_user_id),
) -> TranscriptDeltaRes:
    """Append a Realtime transcript fragment, run filler/pace/empty analysis.

    pitch_stability and volume_consistency stay where they are (set by
    /audio-chunk via librosa). This endpoint only owns the text-derived
    metrics: filler count, pace_cpm, empty phrase count.
    """
    state = session_state(session_id)
    delta = req.delta.strip()
    if not delta:
        return _build_delta_res(state)

    prev_transcript = state.get("transcript", "")
    new_transcript = (prev_transcript + " " + delta).strip() if prev_transcript else delta
    state["transcript"] = new_transcript

    fillers = detect_fillers(delta)
    empties = detect_empty_phrases(delta)
    state["filler_total"] = state.get("filler_total", 0) + len(fillers)
    state["empty_phrase_total"] = state.get("empty_phrase_total", 0) + len(empties)
    state["audio_chunks_chars"] = state.get("audio_chunks_chars", 0) + len(delta)

    # Use elapsed wall time from chunk_seconds aggregator if available, else
    # fall back to ts_ms divided by 1000.
    seconds_basis = state.get("audio_chunks_seconds", 0.0)
    if seconds_basis < 1.0 and req.ts_ms > 0:
        seconds_basis = max(req.ts_ms / 1000.0, 1.0)
    seconds_basis = max(seconds_basis, 1.0)

    pace_cpm = (state["audio_chunks_chars"] / seconds_basis) * 60.0
    filler_per_min = (state["filler_total"] / seconds_basis) * 60.0

    state["audio_metrics_running"].update(
        {
            "pace_cpm": round(pace_cpm, 1),
            "filler_count_per_min": round(filler_per_min, 2),
        }
    )

    scores = all_scores(state["audio_metrics_running"] | state.get("visual_last", {}))

    return TranscriptDeltaRes(
        transcript=new_transcript,
        filler_count_delta=len(fillers),
        filler_words_found=[{"word": f["word"], "ts_ms": req.ts_ms} for f in fillers],
        empty_phrases_delta=len(empties),
        pace_cpm=round(pace_cpm, 1),
        filler_count_per_min=round(filler_per_min, 2),
        audio_score=scores.get("audio", 0.0),
    )


def _build_delta_res(state: dict) -> TranscriptDeltaRes:
    metrics = state.get("audio_metrics_running", {})
    scores = all_scores(metrics | state.get("visual_last", {}))
    return TranscriptDeltaRes(
        transcript=state.get("transcript", ""),
        filler_count_delta=0,
        filler_words_found=[],
        empty_phrases_delta=0,
        pace_cpm=metrics.get("pace_cpm", 0.0),
        filler_count_per_min=metrics.get("filler_count_per_min", 0.0),
        audio_score=scores.get("audio", 0.0),
    )
