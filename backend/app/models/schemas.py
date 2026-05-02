"""Pydantic schemas — request/response payloads."""

from __future__ import annotations

from typing import Dict, List, Optional

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


class FinalizeRes(BaseModel):
    session_id: str
    trust_score: float
    visual_score: float
    audio_score: float
    content_score: float
    strengths: List[str]
    weaknesses: List[str]
    action_items: List[str]
    judge_summaries: Dict[str, str]


class OkRes(BaseModel):
    ok: bool = True
