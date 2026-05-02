"""POST /sessions/{id}/live-reaction — 6초마다 심사위원 1명의 LLM 코멘트.

라이브 동안 표정 전환은 즉시 (룰 기반), 텍스트 코멘트는 LLM 으로 덮어쓰기 위해
프론트가 rotation 으로 호출. 한 번 호출 = 1 judge 코멘트.
"""

from __future__ import annotations

import json
from typing import Literal

from fastapi import APIRouter, Body, Depends

from app.deps import get_user_id
from app.routers.sessions import session_state
from app.services.content_analyzer import generate_live_reaction
from pydantic import BaseModel

router = APIRouter()


class LiveReactionReq(BaseModel):
    judge_id: Literal["judge-fact", "judge-connect", "judge-critical"]
    metrics: dict
    transcript_excerpt: str = ""


class LiveReactionRes(BaseModel):
    judge_id: str
    comment: str


@router.post("/sessions/{session_id}/live-reaction", response_model=LiveReactionRes)
async def live_reaction(
    session_id: str,
    body: LiveReactionReq = Body(...),
    user_id: str = Depends(get_user_id),
) -> LiveReactionRes:
    state = session_state(session_id)
    context = state.get("context", {}) or {}
    signals = {
        **body.metrics,
        "transcript_so_far": body.transcript_excerpt[-1500:],
    }
    text = await generate_live_reaction(body.judge_id, signals, context=context)
    return LiveReactionRes(judge_id=body.judge_id, comment=text)
