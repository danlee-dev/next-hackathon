"""음성 특징 추출 — librosa CPU only."""

from __future__ import annotations

import io
from typing import Optional


def extract_audio_features(audio_bytes: bytes) -> dict:
    """Returns pitch_stability / volume_consistency / speech_ratio / duration_s.

    Falls back gracefully on import or decode failures so the API stays up
    even when ffmpeg isn't available locally.
    """
    try:
        import librosa
        import numpy as np
    except Exception:
        return _fallback()

    try:
        y, sr = librosa.load(io.BytesIO(audio_bytes), sr=16000, mono=True)
    except Exception:
        return _fallback()

    if y is None or len(y) == 0:
        return _fallback()

    # 피치 (pyin은 무거우므로 yin 사용)
    try:
        f0 = librosa.yin(
            y,
            fmin=float(librosa.note_to_hz("C2")),
            fmax=float(librosa.note_to_hz("C7")),
            sr=sr,
        )
        valid = f0[~np.isnan(f0)]
        if len(valid) > 5:
            pitch_std = float(np.std(valid))
            pitch_stability = max(0.0, 100.0 - min(pitch_std / 2.0, 100.0))
        else:
            pitch_stability = 0.0
    except Exception:
        pitch_stability = 50.0

    # 볼륨 일관성
    try:
        rms = librosa.feature.rms(y=y)[0]
        if rms.mean() > 1e-5:
            cv = (rms.std() / rms.mean()) * 100.0
            volume_consistency = max(0.0, 100.0 - cv)
        else:
            volume_consistency = 0.0
    except Exception:
        volume_consistency = 50.0

    # 말한 비율
    try:
        intervals = librosa.effects.split(y, top_db=25)
        speech = sum(int(end - start) for start, end in intervals)
        total = max(len(y), 1)
        speech_ratio = (speech / total) * 100.0
    except Exception:
        speech_ratio = 50.0

    return {
        "pitch_stability": round(float(pitch_stability), 1),
        "volume_consistency": round(float(volume_consistency), 1),
        "speech_ratio": round(float(speech_ratio), 1),
        "duration_s": round(len(y) / max(sr, 1), 2) if sr else 0.0,
    }


def _fallback() -> dict:
    return {
        "pitch_stability": 60.0,
        "volume_consistency": 60.0,
        "speech_ratio": 70.0,
        "duration_s": 5.0,
    }
