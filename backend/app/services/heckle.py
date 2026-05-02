"""VC-style heckle generator — short, context-aware interruptions.

Used during the live pitch to inject pressure. Each judge's heckles map to
their persona's pain points: 김팩트 hammers numbers, 이공감 challenges
authenticity / founder-market fit, 박독설 picks at moats, differentiation,
and competitive holes.

The LLM receives both the *static pitch context* (title, script seed, IR
deck text) and the *running transcript* so the jab references something
the speaker actually said or claimed — not a generic VC platitude.

Lines are kept short (10-30 Korean characters) so ElevenLabs synthesis stays
under ~3-4 seconds and doesn't run over the speaker. Falls back to a
hand-crafted pool when the LLM is unavailable.
"""

from __future__ import annotations

import logging
import random
from typing import Optional

from app.core.openai_client import openai_client

logger = logging.getLogger(__name__)


# ─── Scripted heckles for the demo ────────────────────────────────────────
# Hard-coded lines that fire deterministically when the speaker hits certain
# keywords in their pitch — used so the demo always lands the dramatic beat
# (e.g. "거품 낀 숫자 아닙니까?" when 10조 시장 규모 등장). Earlier rules win
# when multiple match. Each rule pins WHICH judge speaks so personas stay
# consistent. Returns None when nothing matches; the endpoint then falls
# back to the LLM-generated path.
# Demo script: only two beats. Each rule fires AT MOST ONCE per session
# (tracked via the `id` field against state["heckle_scripted_used"]).
#
# Two trigger modes per rule:
#   keywords: any single token / phrase appearing in transcript fires the rule.
#   keyword_groups: ALL tokens in at least one group must appear in the
#     window (in any order) — useful for combinations like
#     ["10", "조"] or ["글로벌", "시장"] to catch paraphrases.
#
# Matching is whitespace/punctuation-insensitive after _normalize().
SCRIPTED_HECKLES: list[dict] = [
    # Beat 1 — 박독설 challenges the inflated TAM.
    # Fires on ANY of: 10조 written together, "10 조" / "십 조" with a space,
    # mention of global expansion, or both "조" + a market keyword nearby.
    {
        "id": "inflated_tam",
        "judge_id": "judge-critical",
        "keywords": [
            # numeric/word forms of the trillion-won figure
            "10조",
            "십조",
            "수조",
            "수십조",
            "조원",
            "조 규모",
            "조 단위",
            "조 시장",
            # global expansion language
            "글로벌 진출",
            "글로벌 시장",
            "글로벌 확장",
            "해외 진출",
            "해외 확장",
            "전세계",
            "전 세계",
            "월드와이드",
            "global total market",
            "global market",
        ],
        # Catch loose paraphrases — both tokens anywhere in window.
        "keyword_groups": [
            ["10", "조"],
            ["100", "조"],
            ["글로벌", "시장"],
            ["글로벌", "장악"],
            ["해외", "장악"],
        ],
        "text": (
            "잠깐만요, 발표자님. 국내 피칭 시장 규모만으론 10조는 "
            "지나치게 과장된 숫자 아닌가요? 거품 낀 숫자 아닙니까?"
        ),
    },
    # Beat 2 — 김팩트 concedes the rebuttal after the speaker explains
    # language-agnostic global expansion / multilingual support.
    {
        "id": "global_expansion_validated",
        "judge_id": "judge-fact",
        "keywords": [
            "언어에 종속되지 않",
            "언어 종속",
            "언어 무관",
            "언어 독립",
            "다국어",
            "다 국어",
            "영어, 일어",
            "영어와 일어",
            "영어 일어",
            "텍스트 데이터 해싱",
            "데이터 해싱",
            "해싱 기술",
            "global total market",
            "global market",
            "여러 언어",
            "모든 언어",
        ],
        # Looser semantic combinations.
        "keyword_groups": [
            ["언어", "확장"],
            ["언어", "지원"],
            ["다국어", "모듈"],
            ["글로벌", "포함"],
        ],
        "text": "글로벌 확장성 논리 타당함. 최종 신뢰 지수 15퍼센트 가산.",
    },
]


def _normalize(s: str) -> str:
    """Lowercase + strip whitespace and common Korean punctuation so loose
    paraphrases still match (e.g. '10 조원' vs '10조원', '글로벌, 진출' vs
    '글로벌 진출')."""
    if not s:
        return ""
    s = s.lower()
    # Drop characters that don't carry matching signal. Keep Korean syllables,
    # ascii alnum, and join everything tightly.
    out: list[str] = []
    for ch in s:
        if ch.isalnum() or "가" <= ch <= "힣":
            out.append(ch)
    return "".join(out)


def find_scripted_heckle(
    transcript: str,
    recent_judges: Optional[list[str]] = None,
    used_ids: Optional[set[str]] = None,
) -> Optional[tuple[str, str, str]]:
    """Match the most recent ~600 chars of transcript against SCRIPTED_HECKLES.

    Returns (judge_id, text, rule_id) on first match, else None. Skips
    rules whose `id` is already in `used_ids` so each scripted beat fires
    at most once per session.

    Matching is normalized: lowercase, whitespace and punctuation stripped,
    so '10 조' matches '10조', '글로벌, 진출' matches '글로벌 진출', etc.
    """
    if not transcript:
        return None
    window_raw = transcript[-600:]
    window = _normalize(window_raw)
    used = used_ids or set()
    for rule in SCRIPTED_HECKLES:
        if rule["id"] in used:
            continue
        # Single-token / phrase keywords.
        for kw in rule.get("keywords", []):
            if kw and _normalize(kw) in window:
                return rule["judge_id"], rule["text"], rule["id"]
        # Combination groups — ALL tokens in a group must appear in window.
        for group in rule.get("keyword_groups", []):
            if all(_normalize(t) in window for t in group if t):
                return rule["judge_id"], rule["text"], rule["id"]
    return None


# Hand-crafted fallback heckles per judge — used when the LLM call fails
# or the OpenAI key is missing. These are real VC questions paraphrased
# down to a single sharp line.
FALLBACK_HECKLES: dict[str, list[str]] = {
    "judge-fact": [
        "시장 규모 정확한 숫자가 어떻게 되죠?",
        "유저당 매출이 얼마나 됩니까?",
        "CAC 대비 LTV는 몇 배예요?",
        "그래서 작년 매출이 얼마였죠?",
        "TAM이 너무 부풀려진 거 아닌가요?",
        "Burn rate가 월 얼마예요?",
        "Gross margin은 몇 퍼센트입니까?",
        "지금까지 traction 수치 보여주세요.",
        "월 활성 사용자가 정확히 몇 명이죠?",
        "다음 마일스톤까지 runway 몇 개월입니까?",
    ],
    "judge-connect": [
        "왜 지금 이걸 해야 합니까?",
        "왜 당신이 이걸 해야 하죠?",
        "공동창업자 두 분은 얼마나 일하셨어요?",
        "이 문제 직접 겪어보신 적 있나요?",
        "유저 목소리 직접 들어보셨어요?",
        "왜 기존 솔루션으로는 안 되는 거죠?",
        "포기 안 하실 자신 있으세요?",
        "팀에 도메인 전문가가 있나요?",
        "고객들이 진짜로 돈을 낼까요?",
        "지금까지 만나본 고객 중 가장 격렬한 반응은요?",
    ],
    "judge-critical": [
        "차별점이 뭐죠? 다 똑같은데.",
        "경쟁사가 내일 따라하면 어떡하실 건가요?",
        "moat가 어디 있는 겁니까?",
        "그건 feature지 product가 아니지 않나요?",
        "진입 장벽이라고 부를 만한 게 있긴 합니까?",
        "이미 그거 하는 회사가 세 개는 있는데요.",
        "당신 회사만의 unfair advantage가 뭐죠?",
        "구글이 들어오면 어떻게 살아남나요?",
        "10x 더 좋은가요? 10퍼센트 더 좋은 건 안 됩니다.",
        "확장성에 한계가 있어 보이는데요.",
    ],
}


PERSONA_PROMPT: dict[str, str] = {
    "judge-fact": (
        "당신은 데이터·숫자에 집착하는 한국 VC '김팩트'다. "
        "'시장 규모, 매출, CAC/LTV, 단위경제, traction 수치, "
        "burn rate, gross margin' 중 하나를 사정없이 묻는다. "
        "주관 X, 숫자만."
    ),
    "judge-connect": (
        "당신은 창업가 출신 한국 VC '이공감'이다. "
        "'왜 지금, 왜 당신, 왜 이 시장, 팀 결속, "
        "파운더-마켓 fit, 진짜 고객의 고통' 중 하나를 진정성으로 추궁한다."
    ),
    "judge-critical": (
        "당신은 디테일에 강한 독설가 한국 VC '박독설'이다. "
        "'차별점, moat, 경쟁사, feature vs product, "
        "진입 장벽, 카피 위협, unfair advantage' 중 약점을 골라 찌른다."
    ),
}


def _format_research(research: Optional[dict]) -> str:
    """Best-effort render of pre_research dict (from Tavily) into prompt text."""
    if not research:
        return ""
    parts: list[str] = []
    claims = research.get("claims") if isinstance(research, dict) else None
    if claims:
        for c in list(claims)[:3]:
            if isinstance(c, dict):
                txt = c.get("claim") or c.get("text") or ""
                verdict = c.get("verdict") or c.get("status") or ""
                if txt:
                    parts.append(
                        f"- {str(txt)[:120]}" + (f" (검증: {verdict})" if verdict else "")
                    )
            elif isinstance(c, str):
                parts.append(f"- {c[:120]}")
    market = research.get("market") if isinstance(research, dict) else None
    if isinstance(market, dict):
        size = market.get("size") or market.get("tam")
        if size:
            parts.append(f"- 알려진 시장 규모: {str(size)[:120]}")
    competitors = research.get("competitors") if isinstance(research, dict) else None
    if isinstance(competitors, list) and competitors:
        names = [str(c.get("name") if isinstance(c, dict) else c)[:30] for c in competitors[:5]]
        if names:
            parts.append("- 알려진 경쟁사: " + ", ".join(n for n in names if n))
    return "\n".join(parts).strip()


async def generate_heckle(
    judge_id: str,
    transcript_excerpt: str,
    context: Optional[dict] = None,
    research: Optional[dict] = None,
    asked_questions: Optional[list[str]] = None,
    last_seen_pos: int = 0,
) -> tuple[str, bool]:
    """LLM-generated VC-style jab grounded in the actual pitch context.

    Returns (text, is_silent).
      - is_silent = True  → judge chooses NOT to speak (because the speaker
        already addressed prior questions, or there's nothing new since the
        last fire). Frontend should NOT play audio nor render a chip.
      - is_silent = False → speak `text` aloud.

    Constraints enforced via the prompt:
      1. 반드시 한국어 존댓말 (-습니다 / -하세요 / -신가요). 반말 금지.
      2. 직전 ~30초 발화에 직접 반응. 한참 지난 내용 재질문 금지.
      3. 발표자가 이미 답한 / 해소된 의문은 다시 묻지 않음.
      4. asked_questions 에 있는 질문과 겹치지 않음.
      5. 새 정보가 없으면 silent 선택 가능.
    """
    fallback_pool = FALLBACK_HECKLES.get(judge_id) or FALLBACK_HECKLES["judge-fact"]
    fallback_line = random.choice(fallback_pool)

    client = openai_client()
    if not client:
        return fallback_line, False

    persona = PERSONA_PROMPT.get(judge_id, PERSONA_PROMPT["judge-fact"])

    full_excerpt = (transcript_excerpt or "").strip()
    # The "recent" window the judge should react to — last ~600 chars
    # (~30s of spoken Korean). Earlier transcript is background only.
    recent_window = full_excerpt[-600:]
    earlier_window = full_excerpt[max(0, len(full_excerpt) - 4000) : -600]

    # Anything since the last time this judge spoke — true new ground.
    new_since_last = full_excerpt[last_seen_pos:] if last_seen_pos else recent_window

    ctx = context or {}
    title = (ctx.get("title") or "").strip()[:120]
    script_seed = (ctx.get("script") or "").strip()[:1500]
    deck_text = (ctx.get("deck_text") or "").strip()[:1500]
    research_block = _format_research(research)

    if not full_excerpt and not script_seed and not deck_text:
        return fallback_line, False

    pitch_block_parts: list[str] = []
    if title:
        pitch_block_parts.append(f"[발표 제목] {title}")
    if script_seed:
        pitch_block_parts.append(f"[발표자 스크립트 시드]\n{script_seed}")
    if deck_text:
        pitch_block_parts.append(f"[IR 덱 텍스트 발췌]\n{deck_text}")
    if research_block:
        pitch_block_parts.append(f"[사전 시장 리서치]\n{research_block}")
    pitch_block = "\n\n".join(pitch_block_parts) or "(컨텍스트 없음)"

    asked_block = (
        "\n".join(f"- {q}" for q in (asked_questions or [])[-8:])
        or "(아직 한 질문 없음)"
    )

    system = (
        f"{persona}\n\n"
        "규칙 (반드시 지킬 것):\n"
        "1. 반드시 한국어 *존댓말* 로 말한다. '-습니다 / -하세요 / -신가요 / -이신가요' 류.\n"
        "   '-야 / -지 / -해 / -잖아' 같은 반말 절대 금지.\n"
        "2. 직전 ~30초 발화 (RECENT WINDOW) 에 직접 반응한다. 한참 전 한 말을 \n"
        "   다시 꺼내거나 일반 VC 질문 던지는 거 금지.\n"
        "3. 발표자가 *이미 답했거나 해소된 의문* 은 다시 묻지 않는다.\n"
        "4. 내가 이전에 한 질문 (ASKED) 과 의미가 겹치는 질문은 던지지 않는다.\n"
        "5. RECENT WINDOW 에 새로 짚을 만한 게 *없거나*, 발표자가 직전에 \n"
        "   질문에 충분히 답해서 더 캐물을 게 없으면 'SILENT' 한 단어만 출력한다.\n"
        "6. 그 외에는 한 문장. 10~40자. 발표 안에 실제 등장한 단어·수치·주장을 짚는다.\n"
        "   추상적 일반론 X. 따옴표·prefix·설명 X. 그 한 줄만.\n"
        "7. 칭찬·동의·격려는 출력 금지. 반드시 *질문 또는 도발*.\n"
    )

    user = (
        "## 회사·제품 컨텍스트 (정적)\n"
        f"{pitch_block}\n\n"
        "## 내가 (이 심사위원) 이미 던진 질문 (중복 금지)\n"
        f"{asked_block}\n\n"
        "## 발표 흐름 (배경 — 직접 반응할 필요 X)\n"
        f"{earlier_window or '(없음)'}\n\n"
        "## RECENT WINDOW — 직전 ~30초 발화 (이 부분에 반응)\n"
        f"{recent_window or '(없음)'}\n\n"
        "## 위 RECENT WINDOW 에서 새로 등장한 발화 (last_seen_pos 이후)\n"
        f"{new_since_last or '(없음)'}\n\n"
        "위 정보로:\n"
        "- 새로 짚을 만한 구체적 요소가 있고 ASKED 와 겹치지 않으면 → 한 줄 도발\n"
        "- 없거나 발표자가 직전에 답을 잘 했으면 → 'SILENT'\n"
    )

    try:
        resp = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            temperature=0.8,
            max_tokens=120,
        )
        text = (resp.choices[0].message.content or "").strip()
        text = text.strip().strip("\"'`")

        if text.upper().startswith("SILENT"):
            return "", True

        if len(text) > 80:
            for sep in ("?", ".", "!"):
                idx = text.find(sep)
                if 8 <= idx <= 80:
                    text = text[: idx + 1]
                    break
            else:
                text = text[:80]
        if len(text) < 6:
            return fallback_line, False
        return text, False
    except Exception:
        logger.exception("[generate_heckle] LLM call failed for %s", judge_id)
        return fallback_line, False
