"""POST /sessions/{id}/audio-chunk — librosa acoustic analysis only.

Transcription was moved to the OpenAI Realtime API (see realtime.py). This
endpoint now owns just the acoustic side: pitch stability, volume
consistency, chunk duration accumulation. Filler / pace / empty-phrase
analysis happens in /transcript-delta on the canonical transcript.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, File, Form, UploadFile

from app.core.supabase import upsert_timeline
from app.deps import get_user_id
from app.models.schemas import AudioChunkRes
from app.routers.sessions import session_state
from app.services.audio_features import extract_audio_features
from app.services.scoring import all_scores

router = APIRouter()


@router.post("/sessions/{session_id}/audio-chunk", response_model=AudioChunkRes)
async def audio_chunk(
    session_id: str,
    audio: UploadFile = File(...),
    chunk_index: int = Form(...),
    chunk_start_ms: int = Form(...),
    user_id: str = Depends(get_user_id),
) -> AudioChunkRes:
    audio_bytes = await audio.read()
    feat = extract_audio_features(audio_bytes)

    state = session_state(session_id)
    chunk_seconds = max(feat.get("duration_s", 5.0), 0.5)
    state["audio_chunks_seconds"] = state.get("audio_chunks_seconds", 0.0) + chunk_seconds

    state["audio_metrics_running"].update(
        {
            "pitch_stability": feat["pitch_stability"],
            "volume_consistency": feat["volume_consistency"],
        }
    )

    scores = all_scores(state["audio_metrics_running"] | state.get("visual_last", {}))
    upsert_timeline(session_id, chunk_start_ms, scores, state["audio_metrics_running"])

    metrics = state["audio_metrics_running"]
    return AudioChunkRes(
        chunk_index=chunk_index,
        transcript_partial="",
        filler_count_delta=0,
        filler_words_found=[],
        pace_cpm=metrics.get("pace_cpm", 0.0),
        pitch_stability=feat["pitch_stability"],
        volume_consistency=feat["volume_consistency"],
        audio_score=scores["audio"],
    )
