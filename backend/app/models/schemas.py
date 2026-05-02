"""Pydantic schemas — request/response payloads."""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class CreateSessionReq(BaseModel):
    title: str = Field(default="제목 없는 피칭", max_length=120)


class CreateSessionRes(BaseModel):
    session_id: str
    started_at: str


class FillerEvent(BaseModel):
    word: str
    ts_ms: int


class AudioChunkRes(BaseModel):
    chunk_index: int
    transcript_partial: str
    filler_count_delta: int
    filler_words_found: List[FillerEvent] = Field(default_factory=list)
    pace_cpm: float
    pitch_stability: float
    volume_consistency: float
    audio_score: float


class VisualTickReq(BaseModel):
    ts_ms: int
    eye_contact_ratio: float
    head_stability: float
    body_sway: float
    gesture_usage: float
    smile_naturalness: float


class CoachSnapshotRes(BaseModel):
    coaching: str
    judge_id_addressed: Optional[str] = None


class FinalizeReq(BaseModel):
    transcript: str
    duration_seconds: int


class JudgeReportEntry(BaseModel):
    score: int
    comment: str
    quote_cited: str = ""
    correction_suggestion: str = ""


class FinalizeRes(BaseModel):
    session_id: str
    trust_score: float
    visual_score: float
    audio_score: float
    content_score: float
    trust_grade: str = "B"
    grade_reason: str = ""
    strengths: List[str]
    weaknesses: List[str]
    action_items: List[str]
    judge_reports: Dict[str, JudgeReportEntry] = Field(default_factory=dict)
    # legacy: for older frontends, keep summary text
    judge_summaries: Dict[str, str] = Field(default_factory=dict)
    content_evaluation: Dict[str, Any] = Field(default_factory=dict)


# Q&A — Phase B
class QnaStartReq(BaseModel):
    """Q&A 라운드 시작 — 발표 종료 후 호출."""

    session_id: str


class QnaQuestion(BaseModel):
    judge_id: str
    judge_name: str
    text: str
    voice_url: Optional[str] = None
    voice_b64: Optional[str] = None  # base64 audio (mp3) — frontend로 즉시 재생


class QnaTurnReq(BaseModel):
    session_id: str
    judge_id: str
    user_answer_transcript: str


class QnaTurnRes(BaseModel):
    judge_followup: Optional[QnaQuestion] = None
    next_judge_id: Optional[str] = None
    finished: bool = False


class OkRes(BaseModel):
    ok: bool = True
