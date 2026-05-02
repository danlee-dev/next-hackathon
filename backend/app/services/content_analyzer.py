"""GPT-4o based content evaluation + judge persona scoring.

페르소나가 *진짜 사람처럼* 일관되게 동작하도록 system prompt를 깊게 작성하고,
사용자가 사전에 제출한 컨텍스트(대본/IR 덱/심사 기준)를 *모든 LLM 호출에서*
우선순위로 활용한다. 하드코딩 응답이나 sycophantic한 칭찬 일색 X — 각 심사위원이
자신의 역할 안에서 가장 약한 신호 1개를 짚어낸다.
"""

from __future__ import annotations

import json
from typing import Any

from app.core.openai_client import openai_client
from app.services.filler_detector import detect_empty_phrases


# ============================================================================
# 페르소나 (대본 + 컨텍스트가 prompt 에 정합되어야 사람처럼 응답)
# ============================================================================

PRESENTER_QUALITY_BASELINE = (
    "발표 평가는 *맥락 안에서*. 단순 임계값 룰 금지. "
    "어깨 움직임이 강조면 좋음·산만이면 나쁨; 시선 이탈이 슬라이드 참조면 정상·"
    "카메라 회피면 나쁨; 빠른 페이스가 클로징이면 좋음·처음부터면 나쁨. "
    "참고 baseline (체크리스트 X): 시선 안정, 자연스러운 제스처, 안정된 톤, "
    "단호한 어미, 추임새 적음, PPT 그대로 읽지 않음."
)


JUDGE_PERSONAS: dict[str, dict[str, str]] = {
    "judge-fact": {
        "name_ko": "김팩트",
        "name_en": "Mr. Fact-Check",
        "role": "시장·논리·재무 분석",
        "system": (
            "당신은 김팩트, 한국 시장 14년차 시리즈A 전문 VC 시니어 파트너입니다. "
            "MBA 출신이며 산업 분석 보고서를 1,200건 작성했습니다. 숫자와 근거가 없는 "
            "주장은 그 자리에서 거절합니다. 'TAM/SAM/SOM 한 줄 정의 못 하면 안 본다' "
            "가 입버릇입니다.\n\n"
            "당신이 무조건 보는 것 (단, 발표 맥락 안에서):\n"
            "- 시장 규모: 출처 + 연도 + 한국 시장 정합성. *해당 산업에서 통용되는 출처*인지.\n"
            "- 비즈니스 모델: unit economics, CAC/LTV, gross margin — 단계에 맞는 수준인지.\n"
            "- Traction: 시리즈 단계에 맞는 수치인가. seed면 PMF 신호, A면 ARR 추세.\n"
            "- 경쟁: '경쟁자 없음'은 거의 항상 시장 정의가 좁다는 신호.\n\n"
            "*맥락 평가 원칙*: 'TAM 미언급 = 감점' 같은 룰이 아닙니다. 만약 매우 초기 "
            "프로토타입이면 TAM 보다 PMF 신호가 우선합니다. 산업 단계·발표 목적·청중에 "
            "맞춰 가중치를 조정하세요.\n\n"
            + PRESENTER_QUALITY_BASELINE
            + "\n당신은 *친절을 시간 낭비*로 여깁니다. 한 줄 안에 가장 약한 데이터 갭 "
            "하나를 콕 찍어 지적하세요. 칭찬하지 마세요."
        ),
    },
    "judge-connect": {
        "name_ko": "이공감",
        "name_en": "Ms. Connect",
        "role": "태도·전달·창업가 진정성",
        "system": (
            "당신은 이공감, Y Combinator 출신 한국 액셀러레이터 매니징 파트너입니다. "
            "본인이 두 번 창업했고 한 번 exit, 한 번 실패했습니다. 200명 이상의 founder "
            "를 1:1 코칭했고, '발표는 결국 그 사람이 미래를 다룰 수 있는가의 신호' 라고 "
            "믿습니다.\n\n"
            "당신이 보는 것 (모두 *발표 맥락 안에서*):\n"
            "- 시선의 *의도*: 슬라이드 참조 후 카메라로 다시 돌아오는가, 아니면 회피하는가.\n"
            "- 자세·제스처: 메시지를 *강조*하는 데 쓰였는가, 산만/긴장 신호인가.\n"
            "- 톤의 단호함: 첫 hook의 명확성, 클로징의 finality. 어미 늘이지 않는가.\n"
            "- 진정성: 외운 멘트 vs 자기 말로 풀어낸 멘트. 즉흥 대응 능력.\n\n"
            "*맥락 평가 원칙*: 어깨가 흔들렸다 해서 무조건 마이너스 X. 그 움직임이 메시지를 "
            "도왔으면 플러스, 산만하게 했으면 마이너스. 상황 안에서 봅니다.\n\n"
            + PRESENTER_QUALITY_BASELINE
            + "\n냉정하지만 따뜻합니다. founder의 잠재력을 가장 잘 끌어낼 *한 가지 조정* "
            "을 짚습니다. 형식적 칭찬은 모욕입니다."
        ),
    },
    "judge-critical": {
        "name_ko": "박독설",
        "name_en": "Dr. Critical",
        "role": "습관·디테일·언어 결함",
        "system": (
            "당신은 박독설, 30년차 IR 컨설턴트입니다. 김앤장에서 IPO 컨설팅을 17년 했고, "
            "수많은 founder 의 발표 영상을 프레임 단위로 봐왔습니다. 디테일에서 "
            "신뢰가 무너진다고 믿습니다.\n\n"
            "당신이 잡아내는 것 (모두 *맥락 인지*):\n"
            "- 추임새: '음', '어', '그러니까', '약간' — *어디서* 자주 나오는가. "
            "  복잡한 설명 중 한두 번은 정상, 단순 한 줄에 3번이면 비정상.\n"
            "- 공허한 수식어: '혁신적인', '최고의', '단연코', '경쟁자 없음', '무조건' — "
            "  *근거 없이 단정* 한 경우만 문제. 근거 동반이면 OK.\n"
            "- 발음·페이스: 단어 끝 흐림, 어미 늘림 ('~~요오'). 메시지 클라이맥스에서의 톤 변화.\n"
            "- PPT 그대로 읽기: 슬라이드 글자를 *그대로* 읊으면 마이너스. 자기 언어로 풀면 OK.\n\n"
            "*맥락 평가 원칙*: 단순 횟수만 보지 X. 그 표현이 *어떤 문장 안에서* 나왔는지 "
            "보고 영향을 평가합니다.\n\n"
            + PRESENTER_QUALITY_BASELINE
            + "\n독설가입니다. 실제 발표에서 *나온 표현*을 그대로 인용하면서 지적하세요. "
            "단, 인용 후 '대신 이렇게'라는 구체적 대체 표현을 함께 줍니다. 건설적인 독설."
        ),
    },
}


# ============================================================================
# 컨텍스트 포맷팅 — 모든 LLM 호출에서 동일하게 사용
# ============================================================================


def format_context_block(context: dict | None) -> str:
    """발표 사전 컨텍스트를 prompt 에 박을 형식.

    *컨텍스트가 있으면 LLM 이 반드시 활용해야 함을 강조*. 단순 정보 나열 X —
    심사가 컨텍스트 기반으로 일어나도록 명시적 지시 포함.
    """
    if not context:
        return ""
    title = (context.get("title") or "").strip()
    script = (context.get("script") or "").strip()
    deck = (context.get("deck_text") or "").strip()
    criteria = (context.get("judging_criteria") or "").strip()

    parts: list[str] = []
    if criteria:
        parts.append(
            "## 심사 기준 (이 기준을 *최우선* 으로 평가에 반영하세요)\n"
            f"{criteria[:1500]}"
        )
    if title:
        parts.append(f"## 세션 제목\n{title}")
    if script:
        parts.append(
            "## 발표자가 사전 제출한 대본\n"
            "(*이 대본을 알고 평가하세요* — 실제 발표가 대본과 다르면 그 차이도 지적)\n\n"
            f"{script[:3000]}"
        )
    if deck:
        parts.append(
            "## IR 피치 덱에서 추출한 텍스트\n"
            "(*숫자·시장 규모·차별점*은 이 덱을 근거로 검증하세요)\n\n"
            f"{deck[:3000]}"
        )

    if not parts:
        return ""

    return (
        "\n\n=== 사전 컨텍스트 (반드시 활용) ===\n"
        + "\n\n".join(parts)
        + "\n=== 사전 컨텍스트 끝 ===\n\n"
        "위 컨텍스트가 있는 경우, 평가는 *반드시* 이를 기반으로 합니다. "
        "예: 덱에 'TAM 50조' 가 있는데 발표에서 '시장 큽니다'로 뭉뚱그렸다면 "
        "그 차이를 지적합니다. 심사 기준이 있으면 그 기준에 직접 맵핑합니다.\n"
    )


# ============================================================================
# 콘텐츠 평가 (4축 rubric + grade)
# ============================================================================

CONTENT_RUBRIC = """당신은 한국어 IR 발표를 평가하는 시리즈A VC 분석팀입니다.
전사문 + 메타 지표를 받아 5가지 항목을 평가합니다. *반드시 JSON 으로만* 응답합니다.

평가 항목:
- core_message_clarity (0-100): 핵심 메시지를 한 문장으로 요약 가능한가. 핵심이 흐려지면 60 미만.
- argument_evidence_balance (0-100): 주장에 따라붙는 근거(숫자·사례·출처)의 비율. 근거 없는 단정이 1회 나올 때마다 -10.
- empty_phrases_count (정수): '혁신적인', '최고의', '절대적', '무조건', '경쟁자 없음', '단연코' 같은 공허한 표현의 정확한 발생 횟수.
- audience_comprehension (0-100): 처음 듣는 투자자가 60초 내에 비즈니스를 이해할 수 있는가.
- market_clarity (0-100): TAM/SAM/SOM 또는 시장 규모 숫자가 출처와 함께 제시됐는가. 숫자 없으면 30 미만.

출력 (JSON only):
{
  "core_message_clarity": int,
  "argument_evidence_balance": int,
  "empty_phrases_count": int,
  "audience_comprehension": int,
  "market_clarity": int,
  "rationale": "한 줄 종합 평가 (한국어)",
  "weakest_logic_quote": "발표에서 가장 논리가 약한 문장 인용 (없으면 빈 문자열)",
  "missing_evidence": ["근거가 빠진 주장 1-3개"],
  "empty_phrase_quotes": ["실제 인용된 공허한 표현 1-3개"]
}
"""


async def analyze_content(
    transcript: str, context: dict | None = None
) -> dict:
    """전사 + 컨텍스트 기반 콘텐츠 5축 + 인용 추출."""
    fallback_empty = len(detect_empty_phrases(transcript))
    client = openai_client()
    if not client or not transcript.strip():
        return _content_fallback(transcript, fallback_empty)
    ctx = format_context_block(context)
    try:
        res = await client.chat.completions.create(
            model="gpt-4o-mini",
            response_format={"type": "json_object"},
            temperature=0.25,
            messages=[
                {"role": "system", "content": CONTENT_RUBRIC + ctx},
                {"role": "user", "content": f"발표 전사:\n{transcript[:5000]}"},
            ],
        )
        data = json.loads(res.choices[0].message.content or "{}")
        for k in (
            "core_message_clarity",
            "argument_evidence_balance",
            "audience_comprehension",
            "market_clarity",
        ):
            v = float(data.get(k, 60))
            data[k] = max(0.0, min(100.0, v))
        ec = int(data.get("empty_phrases_count", fallback_empty))
        data["empty_phrases_count"] = max(ec, fallback_empty)
        data.setdefault("rationale", "")
        data.setdefault("weakest_logic_quote", "")
        data.setdefault("missing_evidence", [])
        data.setdefault("empty_phrase_quotes", [])
        return data
    except Exception:
        return _content_fallback(transcript, fallback_empty)


# ============================================================================
# Judge per-persona 평가 (역할 분리 + 강한 페르소나)
# ============================================================================


async def evaluate_judge(
    judge_id: str,
    transcript: str,
    metrics: dict,
    context: dict | None = None,
) -> dict:
    persona = JUDGE_PERSONAS[judge_id]
    client = openai_client()
    if not client or not transcript.strip():
        return {
            "comment": _judge_fallback(judge_id, metrics),
            "score": _judge_score_fallback(judge_id, metrics),
            "quote_cited": "",
            "correction_suggestion": "",
        }

    ctx_block = format_context_block(context)
    system = (
        f"{persona['system']}\n\n"
        "다음 JSON 으로만 응답합니다 (절대 서론·꼬리말 금지):\n"
        "{\n"
        '  "score": int 0-100,\n'
        '  "comment": "당신 페르소나 톤으로 한 줄 평 (한국어, 60자 이내)",\n'
        '  "quote_cited": "발표 중 당신이 짚은 *실제 표현* 인용 (없으면 빈 문자열)",\n'
        '  "correction_suggestion": "당신 역할 관점에서 즉시 적용 가능한 1줄 교정 제안"\n'
        "}\n\n"
        "*형식적 칭찬 금지*. 당신이 '괜찮네요'로 끝내면 사용자에게 손해입니다. "
        "당신의 역할 안에서 가장 약한 신호를 잡아내고, 그게 *왜 약한지* 한 줄에 "
        "압축하세요."
    ) + ctx_block

    user_payload = {
        "transcript": transcript[:4000],
        "metrics": metrics,
    }

    try:
        res = await client.chat.completions.create(
            model="gpt-4o-mini",
            response_format={"type": "json_object"},
            temperature=0.55,
            messages=[
                {"role": "system", "content": system},
                {
                    "role": "user",
                    "content": json.dumps(user_payload, ensure_ascii=False),
                },
            ],
        )
        data = json.loads(res.choices[0].message.content or "{}")
        return {
            "score": _clamp_int(data.get("score", _judge_score_fallback(judge_id, metrics))),
            "comment": (data.get("comment") or _judge_fallback(judge_id, metrics))[:120],
            "quote_cited": (data.get("quote_cited") or "")[:200],
            "correction_suggestion": (data.get("correction_suggestion") or "")[:240],
        }
    except Exception:
        return {
            "score": _judge_score_fallback(judge_id, metrics),
            "comment": _judge_fallback(judge_id, metrics),
            "quote_cited": "",
            "correction_suggestion": "",
        }


# ============================================================================
# Live audience reaction (다른 prompt — 청중처럼 짧고 즉각 반응)
# ============================================================================

LIVE_REACTION_PROMPT_TEMPLATE = """당신은 {persona_name}, 한국 시리즈A 투자자 청중석에 앉아 발표를
보고 있습니다. *한 문장 표정 코멘트* 만 출력하세요. 평가가 아니라 본능적 반응입니다.

{persona_short}

지금까지 들은 발표 + 30초 내의 청각/시각 신호:
{signals}

당신의 페르소나로 솔직하게 한 줄 (15-25자 한국어). JSON: {{"comment": "..."}}.
"""


async def generate_live_reaction(
    judge_id: str, signals: dict, context: dict | None = None
) -> str:
    """live overlay 용 — 짧은 청중식 반응 (8초마다 호출 가능)."""
    persona = JUDGE_PERSONAS[judge_id]
    client = openai_client()
    if not client:
        return _judge_fallback(judge_id, signals)
    ctx_block = format_context_block(context)
    user = LIVE_REACTION_PROMPT_TEMPLATE.format(
        persona_name=persona["name_ko"],
        persona_short=persona["system"].split("\n\n")[0],
        signals=json.dumps(signals, ensure_ascii=False),
    )
    try:
        res = await client.chat.completions.create(
            model="gpt-4o-mini",
            response_format={"type": "json_object"},
            temperature=0.7,
            messages=[
                {"role": "system", "content": persona["system"] + ctx_block},
                {"role": "user", "content": user},
            ],
        )
        data = json.loads(res.choices[0].message.content or "{}")
        return (data.get("comment") or _judge_fallback(judge_id, signals))[:50]
    except Exception:
        return _judge_fallback(judge_id, signals)


# ============================================================================
# Action items + grade (final report)
# ============================================================================

ACTION_PLAN_PROMPT = """당신은 한국 IR 코치입니다. 발표 전사·메타 지표·각 심사위원 평가를 받아
다음 JSON 만 출력합니다:

{
  "strengths": ["짧고 구체적 강점 2-3개"],
  "weaknesses": ["수치/인용 동반 약점 2-3개"],
  "actions": ["다음 발표 전 적용할 액션 정확히 3개 (실행 가능 동사로 시작)"],
  "trust_grade": "S | A | B | C | F",
  "grade_reason": "등급 부여 이유 한 줄"
}

등급 기준 (trust_score 기반 + 개별 페르소나 점수 분포):
- S (90+): VC 미팅 그대로 가도 됨
- A (75-89): 한 가지만 다듬으면 충분
- B (60-74): 강점 명확하나 2-3개 회귀 포인트
- C (45-59): 메시지/근거가 흩어짐, 재구성 필요
- F (<45): 처음부터 다시 짜야 함

칭찬·문구 회피·일반론 금지. 실제 발표에서 *나온 인용*을 강점·약점에 박으세요."""


async def generate_action_items(state: dict[str, Any]) -> dict:
    client = openai_client()
    if not client:
        return _action_fallback(state)
    ctx = state.get("context") or {}
    payload = {
        "transcript": (state.get("transcript") or "")[:3000],
        "audio_metrics": state.get("audio_metrics") or {},
        "visual_metrics": state.get("visual_metrics") or {},
        "content_evaluation": state.get("content_evaluation") or {},
        "judge_fact": state.get("judge_fact") or {},
        "judge_connect": state.get("judge_connect") or {},
        "judge_critical": state.get("judge_critical") or {},
    }
    ctx_block = format_context_block(ctx)
    try:
        res = await client.chat.completions.create(
            model="gpt-4o-mini",
            response_format={"type": "json_object"},
            temperature=0.4,
            messages=[
                {"role": "system", "content": ACTION_PLAN_PROMPT + ctx_block},
                {"role": "user", "content": json.dumps(payload, ensure_ascii=False)},
            ],
        )
        data = json.loads(res.choices[0].message.content or "{}")
        return {
            "strengths": _ensure_list(
                data.get("strengths"), _action_fallback(state)["strengths"]
            ),
            "weaknesses": _ensure_list(
                data.get("weaknesses"), _action_fallback(state)["weaknesses"]
            ),
            "actions": _ensure_list(
                data.get("actions"), _action_fallback(state)["actions"]
            )[:3],
            "trust_grade": (data.get("trust_grade") or "B")[:1],
            "grade_reason": (data.get("grade_reason") or "")[:200],
        }
    except Exception:
        return _action_fallback(state)


# ============================================================================
# 라이브 코치 메시지 (10초마다)
# ============================================================================


async def generate_coach_message(metrics: dict, context: dict | None = None) -> str:
    client = openai_client()
    fallback = _coach_fallback(metrics)
    if not client:
        return fallback
    ctx_block = format_context_block(context)
    try:
        res = await client.chat.completions.create(
            model="gpt-4o-mini",
            temperature=0.6,
            max_tokens=80,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "당신은 한국 IR 발표 코치입니다. 현재 지표를 보고 *지금 즉시 "
                        "조정 가능한* 한 가지 신호를 1-2 문장으로 알려주세요. "
                        "친근하지만 구체적으로. 일반론 금지, 실제 수치 동반."
                    )
                    + ctx_block,
                },
                {"role": "user", "content": json.dumps(metrics, ensure_ascii=False)},
            ],
        )
        return (res.choices[0].message.content or fallback).strip()
    except Exception:
        return fallback


# ============================================================================
# Fallbacks
# ============================================================================


def _content_fallback(transcript: str, empty_count: int) -> dict:
    if not transcript.strip():
        return {
            "core_message_clarity": 50,
            "argument_evidence_balance": 50,
            "empty_phrases_count": empty_count,
            "audience_comprehension": 50,
            "market_clarity": 30,
            "rationale": "transcript 부재",
            "weakest_logic_quote": "",
            "missing_evidence": [],
            "empty_phrase_quotes": [],
        }
    base = min(80, max(40, int(len(transcript) / 30)))
    return {
        "core_message_clarity": base,
        "argument_evidence_balance": max(40, base - 10),
        "empty_phrases_count": empty_count,
        "audience_comprehension": base,
        "market_clarity": max(35, base - 15),
        "rationale": "휴리스틱 평가 (LLM 미연결)",
        "weakest_logic_quote": "",
        "missing_evidence": [],
        "empty_phrase_quotes": [],
    }


def _judge_fallback(judge_id: str, m: dict) -> str:
    if judge_id == "judge-fact":
        return "근거 숫자가 더 필요합니다."
    if judge_id == "judge-connect":
        return "진정성은 보입니다. 시선만 더."
    fpm = m.get("filler_count_per_min", 0)
    return f"필러워드 분당 {int(fpm)}회는 줄여야 합니다."


def _judge_score_fallback(judge_id: str, m: dict) -> int:
    if judge_id == "judge-fact":
        return 55
    if judge_id == "judge-connect":
        eye = m.get("eye_contact_ratio", 50)
        return int(min(85, max(35, eye + 5)))
    fpm = m.get("filler_count_per_min", 5)
    return int(min(80, max(30, 90 - fpm * 5)))


def _action_fallback(state: dict) -> dict:
    a = state.get("audio_metrics") or {}
    v = state.get("visual_metrics") or {}
    return {
        "strengths": [
            "발표를 끝까지 이어갔습니다.",
            (
                "음성 안정성이 평균 이상입니다."
                if a.get("pitch_stability", 0) > 60
                else "메시지 흐름이 명확합니다."
            ),
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
        "trust_grade": "B",
        "grade_reason": "LLM 미연결 — 휴리스틱 등급",
    }


def _coach_fallback(m: dict) -> str:
    eye = m.get("eye_contact_ratio", 60)
    filler = m.get("filler_count_per_min", 0)
    if eye < 50:
        return "지금 시선이 회피되고 있어요. 카메라를 정면으로 보세요."
    if filler >= 8:
        return "추임새가 많습니다. 다음 문장 시작 전 1초만 멈춰보세요."
    return "흐름이 좋아요. 핵심 숫자를 또박또박 강조해주세요."


def _ensure_list(v: Any, fallback: list[str]) -> list[str]:
    if isinstance(v, list) and all(isinstance(x, str) for x in v) and v:
        return v
    return fallback


def _clamp_int(v: Any, lo: int = 0, hi: int = 100) -> int:
    try:
        return max(lo, min(hi, int(float(v))))
    except Exception:
        return 60
