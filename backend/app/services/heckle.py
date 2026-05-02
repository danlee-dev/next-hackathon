"""VC-style heckle generator — short interrupting jabs from the three judges.

Used during the live pitch to inject pressure. Each judge's heckles map to
their persona's pain points: 김팩트 hammers numbers, 이공감 challenges
authenticity / founder-market fit, 박독설 picks at moats, differentiation,
and competitive holes.

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
        "지금까지 trasction 수치 보여주세요.",
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
        "발표 중간에 끼어들어 '시장 규모, 매출, CAC/LTV, 단위경제, traction 수치, "
        "burn rate, gross margin' 중 하나를 사정없이 묻는다. "
        "주관 X, 숫자만."
    ),
    "judge-connect": (
        "당신은 창업가 출신 한국 VC '이공감'이다. "
        "발표 중간에 끼어들어 '왜 지금, 왜 당신, 왜 이 시장, 팀 결속, "
        "파운더-마켓 fit, 진짜 고객의 고통' 중 하나를 진정성으로 추궁한다."
    ),
    "judge-critical": (
        "당신은 디테일에 강한 독설가 한국 VC '박독설'이다. "
        "발표 중간에 끼어들어 '차별점, moat, 경쟁사, feature vs product, "
        "진입 장벽, 카피 위협, unfair advantage' 중 약점을 골라 찌른다."
    ),
}


async def generate_heckle(
    judge_id: str,
    transcript_excerpt: str,
    metrics: Optional[dict] = None,
) -> str:
    """LLM-generated VC-style jab; falls back to hand-crafted pool on failure.

    Returns ONE line, 10-30 Korean characters, ending with a question mark or
    a sharp full stop.
    """
    fallback_pool = FALLBACK_HECKLES.get(judge_id) or FALLBACK_HECKLES["judge-fact"]
    fallback_line = random.choice(fallback_pool)

    client = openai_client()
    if not client:
        return fallback_line

    persona = PERSONA_PROMPT.get(judge_id, PERSONA_PROMPT["judge-fact"])
    excerpt = (transcript_excerpt or "").strip()[-1200:]
    if not excerpt:
        # Without transcript, an LLM call would invent context; just return fallback.
        return fallback_line

    system = (
        f"{persona}\n\n"
        "규칙:\n"
        "- 한국어로 한 문장만.\n"
        "- 10~30자. 너무 길면 안 됨.\n"
        "- 발표자가 *지금 막 한 말*에 대한 직접 반응이어야 함.\n"
        "- 격식 차리지 말고 짧고 날카롭게. VC가 회의실에서 끊고 들어오는 톤.\n"
        "- 일반적 격려 X. '좋네요' / '잘하시네요' 절대 X.\n"
        "- 막연한 칭찬·동의 X. 반드시 *질문 또는 도발*.\n"
        "- 출력은 그 한 문장만. 따옴표·prefix·explanation X."
    )
    user = f"발표자 최근 발화:\n\n{excerpt}\n\n태클 한 줄:"

    try:
        resp = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            temperature=0.85,
            max_tokens=80,
        )
        text = (resp.choices[0].message.content or "").strip()
        # Strip wrapping quotes if the model added any.
        text = text.strip().strip("\"'`")
        # Defensive: if model output is too long, truncate to last sentence.
        if len(text) > 60:
            for sep in ("?", ".", "!"):
                idx = text.find(sep)
                if 8 <= idx <= 60:
                    text = text[: idx + 1]
                    break
            else:
                text = text[:60]
        if len(text) < 6:
            return fallback_line
        return text
    except Exception:
        logger.exception("[generate_heckle] LLM call failed for %s", judge_id)
        return fallback_line
