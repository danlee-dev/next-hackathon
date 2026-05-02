"""POST /sessions, GET /sessions/{id}/report."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

import asyncio
import logging

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, UploadFile

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
from app.services.web_research import fact_check_pitch

logger = logging.getLogger("trustpitch")

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


async def _prefetch_research(session_id: str, transcript_seed: str, deck_text: str) -> None:
    """배경에서 Tavily 로 사전 시장 검증. 발표 시작 *전*에 김팩트가 이미 알고 있도록.
    실제 VC 가 미팅 전 30분 시장 조사하는 행동 모방.
    """
    try:
        research = await fact_check_pitch(transcript_seed, deck_text)
        s = _SESSION_STATE.get(session_id)
        if s is not None:
            s["pre_research"] = research
            logger.info(
                "pre-research done for %s — %d claims", session_id, len(research.get("claims", []))
            )
    except Exception as e:
        logger.warning("pre-research failed for %s: %s", session_id, e)


@router.post("/sessions", response_model=CreateSessionRes)
async def create_session(
    background_tasks: BackgroundTasks,
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
    else:
        sid = row["id"]
        s = session_state(sid)
        s["context"] = ctx

    # 발표 시작 *전*에 시장·경쟁사 사전 리서치 (Tavily). script 또는 deck 이 있으면.
    seed = (script or "") + "\n" + deck_text
    if seed.strip():
        background_tasks.add_task(_prefetch_research, sid, seed, deck_text)

    started_at = datetime.now(timezone.utc).isoformat()
    if row is not None:
        started_at = row.get("started_at") or started_at
    return CreateSessionRes(session_id=sid, started_at=started_at)


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
    insufficient = bool(result.get("insufficient_input"))

    if insufficient:
        # 정직하게 0 점. 가짜 평가 X.
        scores = {"trust": 0.0, "visual": 0.0, "audio": 0.0, "content": 0.0}
        merged_metrics = {**audio, **visual}
    else:
        merged_metrics = {
            **audio,
            **visual,
            "core_message_clarity": content_eval.get("core_message_clarity", 60),
            "argument_evidence_balance": content_eval.get(
                "argument_evidence_balance", 60
            ),
            "empty_phrases_count": content_eval.get("empty_phrases_count", 0),
            "audience_comprehension": content_eval.get("audience_comprehension", 60),
        }
        scores = all_scores(merged_metrics)

    # judge_reports — full structured payload per judge (score + comment + quote + correction)
    judge_reports: dict = {}
    for jid in ("judge-fact", "judge-connect", "judge-critical"):
        key = jid.replace("-", "_")
        j = result.get(key, {}) or {}
        judge_reports[jid] = {
            "score": int(j.get("score", 60)),
            "comment": j.get("comment", ""),
            "quote_cited": j.get("quote_cited", ""),
            "correction_suggestion": j.get("correction_suggestion", ""),
        }

    judge_summaries = {jid: judge_reports[jid]["comment"] for jid in judge_reports}

    # store the entire pipeline output for /report endpoint
    state["last_finalize"] = {
        "scores": scores,
        "merged_metrics": merged_metrics,
        "judge_reports": judge_reports,
        "content_evaluation": content_eval,
        "strengths": result.get("strengths", []),
        "weaknesses": result.get("weaknesses", []),
        "action_items": result.get("action_items", []),
        "trust_grade": result.get("trust_grade", "B"),
        "grade_reason": result.get("grade_reason", ""),
    }

    llm_feedback = {
        "rationale": content_eval.get("rationale", ""),
        "judge_reports": judge_reports,
        "judge_summaries": judge_summaries,
        "strengths": result.get("strengths", []),
        "weaknesses": result.get("weaknesses", []),
        "action_items": result.get("action_items", []),
        "trust_grade": result.get("trust_grade", "B"),
        "grade_reason": result.get("grade_reason", ""),
        "content_evaluation": content_eval,
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
        trust_grade=result.get("trust_grade", "B"),
        grade_reason=result.get("grade_reason", ""),
        strengths=result.get("strengths", []),
        weaknesses=result.get("weaknesses", []),
        action_items=result.get("action_items", []),
        judge_reports=judge_reports,
        judge_summaries=judge_summaries,
        content_evaluation=content_eval,
    )


@router.get("/sessions/{session_id}/report", response_model=FinalizeRes)
def get_report(session_id: str, user_id: str = Depends(get_user_id)) -> FinalizeRes:
    # 우선 in-memory state 에서 가장 최신 finalize 결과를 먼저 본다.
    state = _SESSION_STATE.get(session_id)
    if state and state.get("last_finalize"):
        f = state["last_finalize"]
        return FinalizeRes(
            session_id=session_id,
            trust_score=f["scores"]["trust"],
            visual_score=f["scores"]["visual"],
            audio_score=f["scores"]["audio"],
            content_score=f["scores"]["content"],
            trust_grade=f.get("trust_grade", "B"),
            grade_reason=f.get("grade_reason", ""),
            strengths=f.get("strengths", []),
            weaknesses=f.get("weaknesses", []),
            action_items=f.get("action_items", []),
            judge_reports=f.get("judge_reports", {}),
            judge_summaries={
                k: v.get("comment", "") for k, v in f.get("judge_reports", {}).items()
            },
            content_evaluation=f.get("content_evaluation", {}),
        )

    row = fetch_session(session_id)
    if row is None:
        raise HTTPException(status_code=404, detail="session not found")
    fb = row.get("llm_feedback") or {}
    judge_reports = fb.get("judge_reports") or {}
    return FinalizeRes(
        session_id=session_id,
        trust_score=row.get("trust_score") or 0.0,
        visual_score=row.get("visual_score") or 0.0,
        audio_score=row.get("audio_score") or 0.0,
        content_score=row.get("content_score") or 0.0,
        trust_grade=fb.get("trust_grade", "B"),
        grade_reason=fb.get("grade_reason", ""),
        strengths=fb.get("strengths", []),
        weaknesses=fb.get("weaknesses", []),
        action_items=fb.get("action_items", []),
        judge_reports=judge_reports,
        judge_summaries=fb.get("judge_summaries", {}),
        content_evaluation=fb.get("content_evaluation", {}),
    )
