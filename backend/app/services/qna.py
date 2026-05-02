"""Q&A 라운드 — 발표 종료 후 심사위원이 발표자에게 질문하는 흐름.

각 심사위원이 자기 역할 안에서 1-2개 질문을 던진다. 사용자는 음성으로 답변
하고, 그 답변을 다시 평가해 follow-up 또는 다음 심사위원으로 넘어간다.
"""

from __future__ import annotations

import json
from typing import Any

from app.core.openai_client import openai_client
from app.services.content_analyzer import (
    JUDGE_PERSONAS,
    format_context_block,
)


# Q&A 흐름 순서
JUDGE_ORDER = ["judge-fact", "judge-connect", "judge-critical"]


QUESTION_PROMPT_TEMPLATE = """당신은 {name_ko} ({role}) 입니다.

방금 발표를 들은 후 *당신의 역할 안에서* 가장 궁금한 한 가지 질문을 던집니다.
- 단순 fact 확인이 아니라 발표자의 *대응력*을 보는 질문
- 한국어 1-2문장 (50자 이내)
- 발표 내용을 *구체적으로 인용*하면서 묻는다 (예: "방금 TAM 50조라 하셨는데, 출처는?")

이전 대화가 있으면 이어가되 새 각도로 물으세요.

JSON 으로만 응답: {{"question": "...", "intent": "지금 이 질문으로 보려는 신호 1줄"}}.
"""


FOLLOWUP_PROMPT = """당신은 {name_ko} ({role}). 발표자의 답변을 듣고 어떻게 반응할지 결정하세요.

답변이 만족스럽지 않거나 추가로 파고들 가치가 있으면 follow-up 1개를 던집니다 (50자 이내).
충분하면 다음 심사위원에게 마이크를 넘깁니다 (follow-up 없음).

JSON: {{"follow_up": "..." 또는 null, "rationale": "follow-up/넘김 결정 이유 한 줄"}}.
"""


async def craft_question(
    judge_id: str,
    transcript: str,
    context: dict | None = None,
    history: list[dict] | None = None,
) -> dict[str, str]:
    persona = JUDGE_PERSONAS[judge_id]
    client = openai_client()
    if not client:
        return {
            "question": _fallback_question(judge_id),
            "intent": "fallback (LLM 미연결)",
        }
    ctx_block = format_context_block(context)
    sys = (
        persona["system"]
        + "\n\n"
        + QUESTION_PROMPT_TEMPLATE.format(
            name_ko=persona["name_ko"], role=persona["role"]
        )
        + ctx_block
    )
    payload: dict[str, Any] = {
        "transcript": transcript[:3500],
        "history": history or [],
    }
    try:
        res = await client.chat.completions.create(
            model="gpt-4o-mini",
            response_format={"type": "json_object"},
            temperature=0.65,
            messages=[
                {"role": "system", "content": sys},
                {"role": "user", "content": json.dumps(payload, ensure_ascii=False)},
            ],
        )
        data = json.loads(res.choices[0].message.content or "{}")
        return {
            "question": (data.get("question") or _fallback_question(judge_id))[:120],
            "intent": (data.get("intent") or "")[:160],
        }
    except Exception:
        return {
            "question": _fallback_question(judge_id),
            "intent": "fallback (LLM 오류)",
        }


async def evaluate_answer(
    judge_id: str,
    transcript: str,
    question: str,
    answer: str,
    context: dict | None = None,
) -> dict[str, Any]:
    """발표자 답변을 듣고 follow-up 할지 결정."""
    persona = JUDGE_PERSONAS[judge_id]
    client = openai_client()
    if not client:
        return {"follow_up": None, "rationale": "fallback"}
    ctx_block = format_context_block(context)
    sys = (
        persona["system"]
        + "\n\n"
        + FOLLOWUP_PROMPT.format(name_ko=persona["name_ko"], role=persona["role"])
        + ctx_block
    )
    payload = {
        "transcript_excerpt": transcript[:2500],
        "your_question": question,
        "founder_answer": answer[:2000],
    }
    try:
        res = await client.chat.completions.create(
            model="gpt-4o-mini",
            response_format={"type": "json_object"},
            temperature=0.5,
            messages=[
                {"role": "system", "content": sys},
                {"role": "user", "content": json.dumps(payload, ensure_ascii=False)},
            ],
        )
        data = json.loads(res.choices[0].message.content or "{}")
        fu = data.get("follow_up")
        # 여러 형태로 LLM 이 반환 가능 — null / "" / "..." / "null"
        if fu in (None, "", "null", "None"):
            fu = None
        else:
            fu = str(fu)[:120]
        return {
            "follow_up": fu,
            "rationale": (data.get("rationale") or "")[:200],
        }
    except Exception:
        return {"follow_up": None, "rationale": "fallback (LLM 오류)"}


def _fallback_question(judge_id: str) -> str:
    return {
        "judge-fact": "방금 말씀하신 시장 규모, 출처와 연도가 어떻게 됩니까?",
        "judge-connect": "이 사업을 6개월 동안 매주 80시간씩 끌고 갈 동기가 무엇인가요?",
        "judge-critical": "발표 중에 수치를 단정하셨는데, 가장 자신없는 숫자 하나를 짚어보세요.",
    }.get(judge_id, "한 줄로 핵심 메시지를 다시 말씀해 보세요.")
