"""POST /sessions/{id}/audio-chunk."""

from __future__ import annotations

from fastapi import APIRouter, Depends, File, Form, UploadFile

from app.core.supabase import insert_event, upsert_timeline
from app.deps import get_user_id
from app.models.schemas import AudioChunkRes, FillerEvent
from app.routers.sessions import session_state
from app.services.audio_features import extract_audio_features
from app.services.filler_detector import detect_fillers
from app.services.scoring import all_scores
from app.services.transcription import transcribe_chunk

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
    text = await transcribe_chunk(audio_bytes)
    feat = extract_audio_features(audio_bytes)

    fillers = detect_fillers(text)
    state = session_state(session_id)
    state["transcript"] = (state.get("transcript", "") + " " + text).strip()
    state["filler_total"] = state.get("filler_total", 0) + len(fillers)
    chunk_seconds = max(feat.get("duration_s", 5.0), 0.5)
    state["audio_chunks_chars"] = state.get("audio_chunks_chars", 0) + len(text)
    state["audio_chunks_seconds"] = state.get("audio_chunks_seconds", 0.0) + chunk_seconds

    total_seconds = max(state["audio_chunks_seconds"], 1.0)
    pace_cpm = (state["audio_chunks_chars"] / total_seconds) * 60.0
    filler_per_min = (state["filler_total"] / total_seconds) * 60.0

    state["audio_metrics_running"].update(
        {
            "pace_cpm": round(pace_cpm, 1),
            "pitch_stability": feat["pitch_stability"],
            "volume_consistency": feat["volume_consistency"],
            "filler_count_per_min": round(filler_per_min, 2),
        }
    )

    scores = all_scores(state["audio_metrics_running"] | state.get("visual_last", {}))

    # filler events to DB
    for f in fillers:
        insert_event(
            session_id,
            chunk_start_ms + 0,
            "filler_word",
            {"word": f["word"], "context": text},
        )
    upsert_timeline(session_id, chunk_start_ms, scores, state["audio_metrics_running"])

    filler_payload = [
        FillerEvent(word=f["word"], ts_ms=chunk_start_ms) for f in fillers
    ]
    return AudioChunkRes(
        chunk_index=chunk_index,
        transcript_partial=text,
        filler_count_delta=len(fillers),
        filler_words_found=filler_payload,
        pace_cpm=round(pace_cpm, 1),
        pitch_stability=feat["pitch_stability"],
        volume_consistency=feat["volume_consistency"],
        audio_score=scores["audio"],
    )
