"""Score formulas — mirror the frontend lib/score.ts.

Source of truth for final scoring is here (server side).
"""

from __future__ import annotations


def clamp(n: float, lo: float = 0.0, hi: float = 100.0) -> float:
    return max(lo, min(hi, n))


def pace_score(cpm: float | None) -> float:
    if cpm is None or cpm <= 0:
        return 50.0
    if 280 <= cpm <= 320:
        return 100.0
    if cpm < 280:
        return clamp(100.0 - (280 - cpm) / 2.0)
    return clamp(100.0 - (cpm - 320) / 2.0)


def normalize_filler(per_min: float | None) -> float:
    if not per_min or per_min <= 0:
        return 0.0
    return clamp(per_min * 10.0)


def normalize_empty_phrases(count: int | None) -> float:
    if not count or count <= 0:
        return 0.0
    return clamp(count * 15.0)


def visual_score(m: dict) -> float:
    eye = float(m.get("eye_contact_ratio", 50))
    head = float(m.get("head_stability", 60))
    sway_v = float(m.get("body_sway", 30))
    sway = 100.0 - clamp(sway_v)
    stab = (head + sway) / 2.0
    ges = float(m.get("gesture_usage", 40))
    return clamp(eye * 0.4 + stab * 0.3 + ges * 0.3)


def audio_score(m: dict) -> float:
    filler = 100.0 - normalize_filler(m.get("filler_count_per_min"))
    pace = pace_score(m.get("pace_cpm"))
    pitch = float(m.get("pitch_stability", 60))
    return clamp(filler * 0.4 + pace * 0.3 + pitch * 0.3)


def content_score(m: dict) -> float:
    clarity = float(m.get("core_message_clarity", 60))
    evidence = float(m.get("argument_evidence_balance", 60))
    empty_ded = 100.0 - normalize_empty_phrases(m.get("empty_phrases_count"))
    return clamp(clarity * 0.4 + evidence * 0.3 + empty_ded * 0.3)


def trust_score(m: dict) -> float:
    v = visual_score(m)
    a = audio_score(m)
    c = content_score(m)
    return clamp(v * 0.3 + a * 0.4 + c * 0.3)


def all_scores(m: dict) -> dict:
    return {
        "visual": round(visual_score(m), 2),
        "audio": round(audio_score(m), 2),
        "content": round(content_score(m), 2),
        "trust": round(trust_score(m), 2),
    }
