"""POST /sessions, GET /sessions/{id}/report."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from app.agents.graph import run_analysis
from app.core.supabase import (
    fetch_session,
    insert_session,
    update_session_final,
)
from app.deps import get_user_id
from app.models.schemas import (
    CreateSessionRes,
    FinalizeReq,
    FinalizeRes,
)
from app.services.pdf_extract import extract_pdf_text
from app.services.scoring import all_scores

router = APIRouter()

# In-memory per-session aggregator (audio + visual rolling state).
_SESSION_STATE: dict[str, dict] = {}


def session_state(session_id: str) -> dict:
    s = _SESSION_STATE.setdefault(
        session_id,
        {
            "transcript": "",
            "filler_total": 0,
            "audio_metrics_running": {
                "pace_cpm": 0.0,
                "pitch_stability": 60.0,
                "volume_consistency": 60.0,
                "filler_count_per_min": 0.0,
            },
            "visual_last": {},
            "audio_chunks_chars": 0,
            "audio_chunks_seconds": 0.0,
            "context": {
                "title": "",
                "script": "",
                "deck_text": "",
            },
        },
    )
    return s


@router.post("/sessions", response_model=CreateSessionRes)
async def create_session(
    title: str = Form("제목 없는 피칭"),
    script: Optional[str] = Form(None),
    judging_criteria: Optional[str] = Form(None),
    deck: Optional[UploadFile] = File(None),
    user_id: str = Depends(get_user_id),
) -> CreateSessionRes:
    deck_text = ""
    if deck is not None:
        try:
            data = await deck.read()
            deck_text = extract_pdf_text(data)
        except Exception:
            deck_text = ""

    ctx = {
        "title": title,
        "script": (script or "")[:6000],
        "deck_text": deck_text,
        "judging_criteria": (judging_criteria or "")[:2000],
    }

    row = insert_session(user_id=user_id, title=title)
    if row is None:
        from uuid import uuid4

        sid = str(uuid4())
        s = session_state(sid)
        s["context"] = ctx
        return CreateSessionRes(
            session_id=sid,
            started_at=datetime.now(timezone.utc).isoformat(),
        )
    sid = row["id"]
    s = session_state(sid)
    s["context"] = ctx
    return CreateSessionRes(
        session_id=sid,
        started_at=row.get("started_at") or datetime.now(timezone.utc).isoformat(),
    )


@router.post("/sessions/{session_id}/finalize", response_model=FinalizeRes)
async def finalize(
    session_id: str,
    req: FinalizeReq,
    user_id: str = Depends(get_user_id),
) -> FinalizeRes:
    state = session_state(session_id)
    transcript = req.transcript or state.get("transcript", "")
    audio = state.get("audio_metrics_running", {})
    visual = state.get("visual_last", {})
    context = state.get("context", {}) or {}

    result = await run_analysis(transcript, audio, visual, context)
    content_eval = result.get("content_evaluation", {})

    merged_metrics = {
        **audio,
        **visual,
        "core_message_clarity": content_eval.get("core_message_clarity", 60),
        "argument_evidence_balance": content_eval.get("argument_evidence_balance", 60),
        "empty_phrases_count": content_eval.get("empty_phrases_count", 0),
        "audience_comprehension": content_eval.get("audience_comprehension", 60),
    }
    scores = all_scores(merged_metrics)

    judge_summaries = {
        "judge-fact": (result.get("judge_fact", {}) or {}).get("comment", ""),
        "judge-connect": (result.get("judge_connect", {}) or {}).get("comment", ""),
        "judge-critical": (result.get("judge_critical", {}) or {}).get("comment", ""),
    }

    llm_feedback = {
        "rationale": content_eval.get("rationale", ""),
        "judge_summaries": judge_summaries,
        "strengths": result.get("strengths", []),
        "weaknesses": result.get("weaknesses", []),
        "action_items": result.get("action_items", []),
    }

    metrics_for_db = {**merged_metrics, "filler_count_total": state.get("filler_total", 0)}
    update_session_final(
        session_id,
        transcript=transcript,
        duration_seconds=req.duration_seconds,
        scores=scores,
        metrics=metrics_for_db,
        llm_feedback=llm_feedback,
    )

    return FinalizeRes(
        session_id=session_id,
        trust_score=scores["trust"],
        visual_score=scores["visual"],
        audio_score=scores["audio"],
        content_score=scores["content"],
        strengths=result.get("strengths", []),
        weaknesses=result.get("weaknesses", []),
        action_items=result.get("action_items", []),
        judge_summaries=judge_summaries,
    )


@router.get("/sessions/{session_id}/report", response_model=FinalizeRes)
def get_report(session_id: str, user_id: str = Depends(get_user_id)) -> FinalizeRes:
    row = fetch_session(session_id)
    if row is None:
        raise HTTPException(status_code=404, detail="session not found")
    fb = row.get("llm_feedback") or {}
    return FinalizeRes(
        session_id=session_id,
        trust_score=row.get("trust_score") or 0.0,
        visual_score=row.get("visual_score") or 0.0,
        audio_score=row.get("audio_score") or 0.0,
        content_score=row.get("content_score") or 0.0,
        strengths=fb.get("strengths", []),
        weaknesses=fb.get("weaknesses", []),
        action_items=fb.get("action_items", []),
        judge_summaries=fb.get("judge_summaries", {}),
    )
