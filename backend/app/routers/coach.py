"""POST /sessions/{id}/coach-snapshot — 10초 코칭 메시지."""

from __future__ import annotations

import json

from fastapi import APIRouter, Depends, File, Form, UploadFile

from app.deps import get_user_id
from app.models.schemas import CoachSnapshotRes
from app.services.content_analyzer import generate_coach_message

router = APIRouter()


@router.post("/sessions/{session_id}/coach-snapshot", response_model=CoachSnapshotRes)
async def coach_snapshot(
    session_id: str,
    frame: UploadFile = File(...),
    metrics_window: str = Form("{}"),
    user_id: str = Depends(get_user_id),
) -> CoachSnapshotRes:
    try:
        m = json.loads(metrics_window or "{}")
    except json.JSONDecodeError:
        m = {}
    text = await generate_coach_message(m)
    judge_id = None
    eye = m.get("eye_contact_ratio", 100)
    fpm = m.get("filler_count_per_min", 0)
    if eye < 50:
        judge_id = "judge-connect"
    elif fpm >= 8:
        judge_id = "judge-critical"
    else:
        judge_id = "judge-fact"
    return CoachSnapshotRes(coaching=text, judge_id_addressed=judge_id)
