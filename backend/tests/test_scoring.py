from app.services.scoring import (
    audio_score,
    content_score,
    pace_score,
    trust_score,
    visual_score,
)


def test_pace_sweet_spot():
    assert pace_score(300) == 100
    assert pace_score(280) == 100
    assert pace_score(320) == 100


def test_pace_far_drops_to_zero_floor():
    assert pace_score(100) >= 0
    assert pace_score(800) >= 0


def test_visual_score_bounds():
    s = visual_score(
        {
            "eye_contact_ratio": 80,
            "head_stability": 90,
            "body_sway": 10,
            "gesture_usage": 70,
        }
    )
    assert 0 <= s <= 100
    assert s > 75


def test_audio_score_drops_with_fillers():
    high = audio_score(
        {"filler_count_per_min": 0, "pace_cpm": 300, "pitch_stability": 80}
    )
    low = audio_score(
        {"filler_count_per_min": 12, "pace_cpm": 300, "pitch_stability": 80}
    )
    assert high > low


def test_content_score_penalizes_empty_phrases():
    a = content_score(
        {
            "core_message_clarity": 80,
            "argument_evidence_balance": 75,
            "empty_phrases_count": 0,
        }
    )
    b = content_score(
        {
            "core_message_clarity": 80,
            "argument_evidence_balance": 75,
            "empty_phrases_count": 5,
        }
    )
    assert a > b


def test_trust_score_in_range():
    s = trust_score(
        {
            "eye_contact_ratio": 70,
            "head_stability": 70,
            "body_sway": 30,
            "gesture_usage": 50,
            "filler_count_per_min": 4,
            "pace_cpm": 300,
            "pitch_stability": 70,
            "core_message_clarity": 75,
            "argument_evidence_balance": 70,
            "empty_phrases_count": 1,
        }
    )
    assert 50 <= s <= 95
