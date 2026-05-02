"""POST /sessions/{id}/qna/start, /qna/turn — 발표 종료 후 음성 Q&A."""

from __future__ import annotations

from fastapi import APIRouter, Depends, File, Form, UploadFile

from app.deps import get_user_id
from app.models.schemas import (
    QnaQuestion,
    QnaTurnReq,
    QnaTurnRes,
)
from app.routers.sessions import session_state
from app.services.elevenlabs_voice import synthesize
from app.services.qna import (
    JUDGE_ORDER,
    craft_question,
    evaluate_answer,
)
from app.services.transcription import transcribe_chunk

router = APIRouter()


def _judge_name(judge_id: str) -> str:
    return {
        "judge-fact": "김팩트",
        "judge-connect": "이공감",
        "judge-critical": "박독설",
    }.get(judge_id, "심사위원")


@router.post("/sessions/{session_id}/qna/start", response_model=QnaQuestion)
async def qna_start(session_id: str, user_id: str = Depends(get_user_id)) -> QnaQuestion:
    state = session_state(session_id)
    state["qna"] = {
        "history": [],
        "current_judge_idx": 0,
        "active_question": "",
    }
    transcript = state.get("transcript", "")
    context = state.get("context", {}) or {}
    judge_id = JUDGE_ORDER[0]
    q = await craft_question(judge_id, transcript, context, history=[])
    state["qna"]["active_question"] = q["question"]
    state["qna"]["history"].append(
        {"judge_id": judge_id, "question": q["question"], "intent": q["intent"]}
    )
    voice_b64 = await synthesize(q["question"], judge_id)
    return QnaQuestion(
        judge_id=judge_id,
        judge_name=_judge_name(judge_id),
        text=q["question"],
        voice_b64=voice_b64,
    )


@router.post("/sessions/{session_id}/qna/answer", response_model=QnaTurnRes)
async def qna_answer(
    session_id: str,
    audio: UploadFile = File(...),
    user_id: str = Depends(get_user_id),
) -> QnaTurnRes:
    """발표자 답변 음성 → STT → judge 평가 → follow-up or 다음 judge."""
    state = session_state(session_id)
    qna = state.get("qna")
    if not qna:
        return QnaTurnRes(finished=True)

    audio_bytes = await audio.read()
    answer_text = await transcribe_chunk(audio_bytes)
    qna["history"][-1]["user_answer"] = answer_text

    transcript = state.get("transcript", "")
    context = state.get("context", {}) or {}
    current_idx = qna["current_judge_idx"]
    judge_id = JUDGE_ORDER[current_idx]
    active_q = qna.get("active_question", "")

    decision = await evaluate_answer(
        judge_id, transcript, active_q, answer_text, context=context
    )
    qna["history"][-1]["follow_up_decision"] = decision

    if decision.get("follow_up"):
        # 같은 judge의 follow-up
        followup_text = decision["follow_up"]
        qna["active_question"] = followup_text
        qna["history"].append(
            {
                "judge_id": judge_id,
                "question": followup_text,
                "intent": "follow-up",
            }
        )
        voice_b64 = await synthesize(followup_text, judge_id)
        return QnaTurnRes(
            judge_followup=QnaQuestion(
                judge_id=judge_id,
                judge_name=_judge_name(judge_id),
                text=followup_text,
                voice_b64=voice_b64,
            ),
            next_judge_id=judge_id,
        )

    # 다음 judge 로 이동 (없으면 종료)
    next_idx = current_idx + 1
    if next_idx >= len(JUDGE_ORDER):
        qna["finished"] = True
        return QnaTurnRes(finished=True)
    qna["current_judge_idx"] = next_idx
    next_judge = JUDGE_ORDER[next_idx]
    q = await craft_question(
        next_judge, transcript, context, history=qna["history"]
    )
    qna["active_question"] = q["question"]
    qna["history"].append(
        {"judge_id": next_judge, "question": q["question"], "intent": q["intent"]}
    )
    voice_b64 = await synthesize(q["question"], next_judge)
    return QnaTurnRes(
        judge_followup=QnaQuestion(
            judge_id=next_judge,
            judge_name=_judge_name(next_judge),
            text=q["question"],
            voice_b64=voice_b64,
        ),
        next_judge_id=next_judge,
    )


@router.post("/sessions/{session_id}/qna/text-answer", response_model=QnaTurnRes)
async def qna_text_answer(
    session_id: str,
    body: QnaTurnReq,
    user_id: str = Depends(get_user_id),
) -> QnaTurnRes:
    """텍스트로 답변 — 음성 fallback (mic 권한 거부 또는 데모 모드)."""
    state = session_state(session_id)
    qna = state.get("qna")
    if not qna:
        return QnaTurnRes(finished=True)
    transcript = state.get("transcript", "")
    context = state.get("context", {}) or {}
    current_idx = qna["current_judge_idx"]
    judge_id = JUDGE_ORDER[current_idx]
    active_q = qna.get("active_question", "")
    decision = await evaluate_answer(
        judge_id, transcript, active_q, body.user_answer_transcript, context=context
    )
    qna["history"][-1]["user_answer"] = body.user_answer_transcript
    qna["history"][-1]["follow_up_decision"] = decision

    if decision.get("follow_up"):
        followup_text = decision["follow_up"]
        qna["active_question"] = followup_text
        qna["history"].append(
            {"judge_id": judge_id, "question": followup_text, "intent": "follow-up"}
        )
        voice_b64 = await synthesize(followup_text, judge_id)
        return QnaTurnRes(
            judge_followup=QnaQuestion(
                judge_id=judge_id,
                judge_name=_judge_name(judge_id),
                text=followup_text,
                voice_b64=voice_b64,
            ),
            next_judge_id=judge_id,
        )

    next_idx = current_idx + 1
    if next_idx >= len(JUDGE_ORDER):
        qna["finished"] = True
        return QnaTurnRes(finished=True)
    qna["current_judge_idx"] = next_idx
    next_judge = JUDGE_ORDER[next_idx]
    q = await craft_question(
        next_judge, transcript, context, history=qna["history"]
    )
    qna["active_question"] = q["question"]
    qna["history"].append(
        {"judge_id": next_judge, "question": q["question"], "intent": q["intent"]}
    )
    voice_b64 = await synthesize(q["question"], next_judge)
    return QnaTurnRes(
        judge_followup=QnaQuestion(
            judge_id=next_judge,
            judge_name=_judge_name(next_judge),
            text=q["question"],
            voice_b64=voice_b64,
        ),
        next_judge_id=next_judge,
    )
