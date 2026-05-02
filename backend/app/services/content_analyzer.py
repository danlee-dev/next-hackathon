"""GPT-4o based content evaluation + judge persona scoring."""

from __future__ import annotations

import json
from typing import Any

from app.core.openai_client import openai_client
from app.services.filler_detector import detect_empty_phrases


CONTENT_RUBRIC = """당신은 한국어 IR 발표 평가자입니다. 발표 전사문을 받아 4가지 항목을 0-100 점수로 평가합니다.

평가 항목:
- core_message_clarity: 발표의 핵심 메시지를 한 문장으로 요약 가능한가
- argument_evidence_balance: 주장에 대해 근거(숫자, 사례, 출처)가 따라붙는가
- empty_phrases_count: '혁신적인', '최고의', '절대적' 같은 공허한 수식어 횟수 (정수)
- audience_comprehension: 처음 듣는 투자자가 1분 안에 이해할 수 있는가

JSON으로만 응답:
{
  "core_message_clarity": int,
  "argument_evidence_balance": int,
  "empty_phrases_count": int,
  "audience_comprehension": int,
  "rationale": "한 문장 평가"
}
"""


JUDGE_PROMPTS: dict[str, str] = {
    "judge-fact": (
        "당신은 김팩트, 데이터 기반 냉철한 한국 VC 투자자입니다. "
        "전사를 보고 '데이터·근거·논리' 관점에서만 한 줄로 코멘트하세요. "
        "차갑고 짧게. 30자 이내. JSON: {\"comment\": \"...\"}"
    ),
    "judge-connect": (
        "당신은 이공감, 창업가 출신의 한국 액셀러레이터 파트너입니다. "
        "발표자의 태도와 진정성을 한 줄로 평가하세요. 따뜻하지만 솔직하게. "
        "30자 이내. JSON: {\"comment\": \"...\"}"
    ),
    "judge-critical": (
        "당신은 박독설, 디테일에 강한 한국 VC 시니어 파트너입니다. "
        "전사에서 가장 약한 디테일 한 가지를 짧게 지적하세요. 직설적으로. "
        "30자 이내. JSON: {\"comment\": \"...\"}"
    ),
}


def _format_context(context: dict | None) -> str:
    """발표 사전 컨텍스트 (제목/대본/덱/심사기준)를 prompt 에 박을 문자열로."""
    if not context:
        return ""
    title = (context.get("title") or "").strip()
    script = (context.get("script") or "").strip()
    deck = (context.get("deck_text") or "").strip()
    criteria = (context.get("judging_criteria") or "").strip()
    parts: list[str] = []
    if title:
        parts.append(f"세션 제목: {title}")
    if script:
        parts.append(f"발표자가 미리 제출한 대본:\n{script[:3000]}")
    if deck:
        parts.append(f"IR 피치 덱 텍스트 추출:\n{deck[:3000]}")
    if criteria:
        parts.append(f"심사 기준 (이 기준을 우선해서 평가하세요):\n{criteria[:1500]}")
    if not parts:
        return ""
    return "\n\n=== 사전 컨텍스트 ===\n" + "\n\n".join(parts) + "\n=== 사전 컨텍스트 끝 ===\n"


async def analyze_content(transcript: str, context: dict | None = None) -> dict:
    """Returns content rubric scores + empty_phrases_count."""
    fallback_empty = len(detect_empty_phrases(transcript))
    client = openai_client()
    if not client or not transcript.strip():
        return _content_fallback(transcript, fallback_empty)
    ctx_str = _format_context(context)
    try:
        res = await client.chat.completions.create(
            model="gpt-4o-mini",
            response_format={"type": "json_object"},
            temperature=0.3,
            messages=[
                {"role": "system", "content": CONTENT_RUBRIC + ctx_str},
                {"role": "user", "content": transcript[:4000]},
            ],
        )
        raw = res.choices[0].message.content or "{}"
        data = json.loads(raw)
        # 안전 보정
        for key in ("core_message_clarity", "argument_evidence_balance", "audience_comprehension"):
            v = float(data.get(key, 60))
            data[key] = max(0.0, min(100.0, v))
        ec = int(data.get("empty_phrases_count", fallback_empty))
        data["empty_phrases_count"] = max(ec, fallback_empty)
        if "rationale" not in data:
            data["rationale"] = ""
        return data
    except Exception:
        return _content_fallback(transcript, fallback_empty)


async def evaluate_judge(
    judge_id: str,
    transcript: str,
    metrics: dict,
    context: dict | None = None,
) -> dict:
    client = openai_client()
    if not client or not transcript.strip():
        return {"comment": _judge_fallback(judge_id, metrics)}
    ctx_str = _format_context(context)
    try:
        res = await client.chat.completions.create(
            model="gpt-4o-mini",
            response_format={"type": "json_object"},
            temperature=0.6,
            messages=[
                {"role": "system", "content": JUDGE_PROMPTS[judge_id] + ctx_str},
                {
                    "role": "user",
                    "content": (
                        f"전사:\n{transcript[:3000]}\n\n핵심 지표:\n"
                        + json.dumps(metrics, ensure_ascii=False)
                    ),
                },
            ],
        )
        raw = res.choices[0].message.content or "{}"
        data = json.loads(raw)
        return {"comment": data.get("comment", _judge_fallback(judge_id, metrics))[:80]}
    except Exception:
        return {"comment": _judge_fallback(judge_id, metrics)}


async def generate_action_items(state: dict[str, Any]) -> dict:
    """Final synthesis — strengths, weaknesses, action items (3개)."""
    client = openai_client()
    if not client:
        return _action_fallback(state)
    prompt = (
        "당신은 한국 IR 코치입니다. 발표 전사와 지표를 보고 다음을 JSON으로 반환하세요:\n"
        "- strengths: 강점 2-3개 (한국어, 짧고 구체적)\n"
        "- weaknesses: 약점 2-3개 (수치 동반)\n"
        "- actions: 다음 발표를 위한 구체적 액션 3개 (실행 가능한 동사로 시작)\n"
        "JSON: {\"strengths\": [...], \"weaknesses\": [...], \"actions\": [...]}"
    )
    ctx = state.get("context") or {}
    payload = {
        "transcript": (state.get("transcript") or "")[:3000],
        "audio_metrics": state.get("audio_metrics") or {},
        "visual_metrics": state.get("visual_metrics") or {},
        "content_evaluation": state.get("content_evaluation") or {},
        "session_title": ctx.get("title", ""),
        "submitted_script": (ctx.get("script") or "")[:1500],
        "deck_text": (ctx.get("deck_text") or "")[:1500],
        "judging_criteria": (ctx.get("judging_criteria") or "")[:1000],
    }
    try:
        res = await client.chat.completions.create(
            model="gpt-4o-mini",
            response_format={"type": "json_object"},
            temperature=0.5,
            messages=[
                {"role": "system", "content": prompt},
                {"role": "user", "content": json.dumps(payload, ensure_ascii=False)},
            ],
        )
        data = json.loads(res.choices[0].message.content or "{}")
        return {
            "strengths": _ensure_list(data.get("strengths"), _action_fallback(state)["strengths"]),
            "weaknesses": _ensure_list(data.get("weaknesses"), _action_fallback(state)["weaknesses"]),
            "actions": _ensure_list(data.get("actions"), _action_fallback(state)["actions"])[:3],
        }
    except Exception:
        return _action_fallback(state)


async def generate_coach_message(metrics: dict) -> str:
    client = openai_client()
    fallback = _coach_fallback(metrics)
    if not client:
        return fallback
    try:
        res = await client.chat.completions.create(
            model="gpt-4o-mini",
            temperature=0.7,
            max_tokens=80,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "당신은 한국어 IR 발표 코치입니다. 현재 지표를 보고 가장 시급한 개선점 "
                        "한 가지를 1-2문장으로 알려주세요. 친근하고 구체적으로."
                    ),
                },
                {"role": "user", "content": json.dumps(metrics, ensure_ascii=False)},
            ],
        )
        return (res.choices[0].message.content or fallback).strip()
    except Exception:
        return fallback


def _content_fallback(transcript: str, empty_count: int) -> dict:
    if not transcript.strip():
        return {
            "core_message_clarity": 50,
            "argument_evidence_balance": 50,
            "empty_phrases_count": empty_count,
            "audience_comprehension": 50,
            "rationale": "transcript 부재",
        }
    length = len(transcript)
    base = min(80, max(40, int(length / 30)))
    return {
        "core_message_clarity": base,
        "argument_evidence_balance": max(40, base - 10),
        "empty_phrases_count": empty_count,
        "audience_comprehension": base,
        "rationale": "휴리스틱 평가",
    }


def _judge_fallback(judge_id: str, m: dict) -> str:
    if judge_id == "judge-fact":
        return "근거가 더 필요합니다."
    if judge_id == "judge-connect":
        return "진정성은 느껴졌습니다."
    return f"필러워드 분당 {int(m.get('filler_count_per_min', 0))}회는 줄여야 합니다."


def _action_fallback(state: dict) -> dict:
    a = state.get("audio_metrics") or {}
    v = state.get("visual_metrics") or {}
    return {
        "strengths": [
            "발표를 끝까지 이어갔습니다.",
            "음성 안정성이 평균 이상입니다." if a.get("pitch_stability", 0) > 60 else "메시지 흐름이 명확합니다.",
        ],
        "weaknesses": [
            f"필러워드 분당 {int(a.get('filler_count_per_min', 0))}회",
            f"시선 응시 {int(v.get('eye_contact_ratio', 0))}%",
        ],
        "actions": [
            "'그러니까', '약간'을 의도적인 1초 침묵으로 대체하기",
            "슬라이드 전환 직후 2초간 카메라 응시하기",
            "핵심 숫자 3개를 자료 없이 암기 후 말하기",
        ],
    }


def _coach_fallback(m: dict) -> str:
    eye = m.get("eye_contact_ratio", 60)
    filler = m.get("filler_count_per_min", 0)
    if eye < 50:
        return "지금 시선이 회피되고 있어요. 카메라를 정면으로 보세요."
    if filler >= 8:
        return "추임새가 많습니다. 다음 문장 시작 전 1초만 멈춰보세요."
    return "흐름이 좋아요. 핵심 숫자를 또박또박 강조해주세요."


def _ensure_list(v, fallback: list[str]) -> list[str]:
    if isinstance(v, list) and all(isinstance(x, str) for x in v) and v:
        return v
    return fallback
