import type { Expression, JudgeId, MetricKey } from "./judges";

export interface VisualMetrics {
  eye_contact_ratio: number;
  head_stability: number;
  body_sway: number;
  gesture_usage: number;
  smile_naturalness: number;
}

export interface AudioMetrics {
  filler_count_per_min: number;
  pace_cpm: number;
  pitch_stability: number;
  volume_consistency: number;
  speech_ratio: number;
}

export interface ContentMetrics {
  core_message_clarity: number;
  argument_evidence_balance: number;
  empty_phrases_count: number;
  audience_comprehension: number;
}

export interface AggregateMetrics extends VisualMetrics, AudioMetrics {
  filler_count_total: number;
}

export interface ScoreSet {
  trust: number;
  visual: number;
  audio: number;
  content: number;
}

export interface JudgeReaction {
  judge_id: JudgeId;
  expression: Expression;
  comment: string | null;
  ts_ms: number;
  trigger_metric?: MetricKey;
  trigger_value?: number;
}

export interface FillerEvent {
  word: string;
  ts_ms: number;
}

export interface CoachMessage {
  text: string;
  judge_id_addressed?: JudgeId;
  ts_ms: number;
}

export interface SessionTimelineTick {
  ts_ms: number;
  trust: number;
  visual: number;
  audio: number;
  metrics: Partial<AggregateMetrics>;
}

export interface FinalReport {
  session_id: string;
  trust_score: number;
  visual_score: number;
  audio_score: number;
  content_score: number;
  strengths: string[];
  weaknesses: string[];
  action_items: string[];
  judge_summaries: Record<JudgeId, string>;
}
