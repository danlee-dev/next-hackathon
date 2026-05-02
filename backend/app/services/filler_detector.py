"""한국어 필러워드 탐지."""

from __future__ import annotations

import re
from typing import List

KOREAN_FILLERS: dict[str, list[str]] = {
    "primary": ["음", "어", "아", "그"],
    "extended": ["그러니까", "약간", "뭐", "이제", "근데", "사실", "막"],
    "phrase": ["그게 이제", "뭐랄까", "그니까", "어 그", "음 그"],
}

EMPTY_PHRASES = ["혁신적인", "최고의", "절대적", "무조건", "단연코", "완벽한", "엄청난"]


def detect_fillers(text: str) -> list[dict]:
    """Returns list of {word, position} for filler matches.

    For 1-character primary fillers we use Hangul boundary lookbehind/ahead so
    common words ('음악', '어머니' etc.) aren't false-positive.
    """
    if not text:
        return []
    found: list[dict] = []
    seen: list[tuple[int, int]] = []  # (start, end) to dedupe overlap
    # 길이 내림차순 — "그러니까"(4)가 "음 그"(3)보다 우선해서 잡혀야 함.
    candidates = sorted(
        KOREAN_FILLERS["phrase"]
        + KOREAN_FILLERS["extended"]
        + KOREAN_FILLERS["primary"],
        key=len,
        reverse=True,
    )
    for word in candidates:
        if len(word) == 1:
            pattern = rf"(?<![가-힣]){re.escape(word)}(?![가-힣])"
        else:
            pattern = re.escape(word)
        for m in re.finditer(pattern, text):
            s, e = m.start(), m.end()
            if any(not (e <= a or s >= b) for a, b in seen):
                continue
            seen.append((s, e))
            found.append({"word": word, "position": s})
    found.sort(key=lambda d: d["position"])
    return found


def detect_empty_phrases(text: str) -> list[dict]:
    if not text:
        return []
    out: list[dict] = []
    for ph in EMPTY_PHRASES:
        for m in re.finditer(re.escape(ph), text):
            out.append({"phrase": ph, "position": m.start()})
    return out
