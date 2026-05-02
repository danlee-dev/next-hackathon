# TrustPitch API Spec

Base URL: `https://<railway-domain>/api/v1`

모든 요청은 `Authorization: Bearer <supabase_access_token>` 필수. `DEMO_MODE=true` 시 토큰 없이 single-user로 동작.

## POST /sessions

새 피칭 세션 생성.

```json
// req
{ "title": "Q3 시드 IR 1차 리허설" }
// res
{ "session_id": "uuid", "started_at": "2026-05-02T10:00:00Z" }
```

## POST /sessions/{id}/audio-chunk

5초 음성 청크. multipart:
- `audio` (webm/opus)
- `chunk_index` (int)
- `chunk_start_ms` (int)

응답:

```json
{
  "chunk_index": 3,
  "transcript_partial": "그러니까 저희가...",
  "filler_count_delta": 1,
  "filler_words_found": [{ "word": "그러니까", "ts_ms": 15200 }],
  "pace_cpm": 295.4,
  "pitch_stability": 72.0,
  "volume_consistency": 68.5,
  "audio_score": 71.2
}
```

## POST /sessions/{id}/visual-tick

1Hz visual metric ingestion.

```json
{
  "ts_ms": 15000,
  "eye_contact_ratio": 65.2,
  "head_stability": 81.0,
  "body_sway": 22.4,
  "gesture_usage": 45.0,
  "smile_naturalness": 30.1
}
```

응답: `{ "ok": true }`.

## POST /sessions/{id}/coach-snapshot

10초마다 종합 코칭 메시지. multipart:
- `frame` (jpeg)
- `metrics_window` (json string)

```json
{ "coaching": "지금 시선이 회피되고 있어요...", "judge_id_addressed": "judge-connect" }
```

## POST /sessions/{id}/finalize

발표 종료 — LangGraph 호출.

```json
// req
{ "transcript": "...", "duration_seconds": 95 }
// res
{
  "session_id": "uuid",
  "trust_score": 78.4,
  "visual_score": 72.0,
  "audio_score": 81.5,
  "content_score": 75.0,
  "strengths": ["..."],
  "weaknesses": ["..."],
  "action_items": ["..."],
  "judge_summaries": {
    "judge-fact": "...",
    "judge-connect": "...",
    "judge-critical": "..."
  }
}
```

## GET /sessions/{id}/report

저장된 리포트 조회.
