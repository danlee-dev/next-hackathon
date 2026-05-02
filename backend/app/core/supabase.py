"""Supabase service-role client (server-side only)."""

from __future__ import annotations

from functools import lru_cache
from typing import Optional

from supabase import Client, create_client

from app.config import settings


@lru_cache(maxsize=1)
def supabase_admin() -> Optional[Client]:
    if not settings.supabase_configured:
        return None
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)


def insert_session(user_id: str, title: str) -> Optional[dict]:
    client = supabase_admin()
    if not client:
        return None
    res = (
        client.table("pitch_sessions")
        .insert({"user_id": user_id, "title": title, "status": "in_progress"})
        .execute()
    )
    rows = res.data or []
    return rows[0] if rows else None


def upsert_timeline(session_id: str, ts_ms: int, scores: dict, metrics: dict) -> None:
    client = supabase_admin()
    if not client:
        return
    client.table("pitch_timeline").insert(
        {
            "session_id": session_id,
            "ts_ms": ts_ms,
            "trust_score": scores.get("trust"),
            "visual_score": scores.get("visual"),
            "audio_score": scores.get("audio"),
            "metrics": metrics,
        }
    ).execute()


def insert_event(session_id: str, ts_ms: int, event_type: str, payload: dict) -> None:
    client = supabase_admin()
    if not client:
        return
    client.table("pitch_events").insert(
        {
            "session_id": session_id,
            "ts_ms": ts_ms,
            "event_type": event_type,
            "payload": payload,
        }
    ).execute()


def insert_judge_reaction(
    session_id: str,
    ts_ms: int,
    judge_id: str,
    expression: str,
    comment: str | None,
    trigger_metric: str | None = None,
    trigger_value: float | None = None,
) -> None:
    client = supabase_admin()
    if not client:
        return
    client.table("judge_reactions").insert(
        {
            "session_id": session_id,
            "ts_ms": ts_ms,
            "judge_id": judge_id,
            "expression": expression,
            "comment": comment,
            "trigger_metric": trigger_metric,
            "trigger_value": trigger_value,
        }
    ).execute()


def update_session_final(
    session_id: str,
    *,
    transcript: str,
    duration_seconds: int,
    scores: dict,
    metrics: dict,
    llm_feedback: dict,
) -> None:
    client = supabase_admin()
    if not client:
        return
    client.table("pitch_sessions").update(
        {
            "status": "completed",
            "ended_at": "now()",
            "duration_seconds": duration_seconds,
            "trust_score": scores.get("trust"),
            "visual_score": scores.get("visual"),
            "audio_score": scores.get("audio"),
            "content_score": scores.get("content"),
            "filler_count": metrics.get("filler_count_total", 0),
            "pace_cpm": metrics.get("pace_cpm"),
            "eye_contact_avg": metrics.get("eye_contact_ratio"),
            "transcript": transcript,
            "metrics": metrics,
            "llm_feedback": llm_feedback,
        }
    ).eq("id", session_id).execute()


def fetch_session(session_id: str) -> dict | None:
    client = supabase_admin()
    if not client:
        return None
    res = client.table("pitch_sessions").select("*").eq("id", session_id).limit(1).execute()
    rows = res.data or []
    return rows[0] if rows else None
