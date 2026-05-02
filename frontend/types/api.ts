import type { JudgeId } from "./judges";
import type { FillerEvent } from "./pitch";

export interface CreateSessionRes {
  session_id: string;
  started_at: string;
}

export interface AudioChunkRes {
  chunk_index: number;
  transcript_partial: string;
  filler_count_delta: number;
  filler_words_found: FillerEvent[];
  pace_cpm: number;
  pitch_stability: number;
  volume_consistency: number;
  audio_score: number;
}

export interface CoachSnapshotRes {
  coaching: string;
  judge_id_addressed: JudgeId | null;
}

export interface FinalizeRes {
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
