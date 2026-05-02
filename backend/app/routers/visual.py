"""POST /sessions/{id}/visual-tick — 1Hz visual metric ingestion."""

from __future__ import annotations

from fastapi import APIRouter, Depends

from app.core.supabase import upsert_timeline
from app.deps import get_user_id
from app.models.schemas import OkRes, VisualTickReq
from app.routers.sessions import session_state
from app.services.scoring import all_scores

router = APIRouter()


@router.post("/sessions/{session_id}/visual-tick", response_model=OkRes)
def visual_tick(
    session_id: str,
    req: VisualTickReq,
    user_id: str = Depends(get_user_id),
) -> OkRes:
    state = session_state(session_id)
    visual = {
        "eye_contact_ratio": req.eye_contact_ratio,
        "head_stability": req.head_stability,
        "body_sway": req.body_sway,
        "gesture_usage": req.gesture_usage,
        "smile_naturalness": req.smile_naturalness,
    }
    state["visual_last"] = visual
    scores = all_scores(visual | state.get("audio_metrics_running", {}))
    upsert_timeline(session_id, req.ts_ms, scores, visual | state.get("audio_metrics_running", {}))
    return OkRes()
