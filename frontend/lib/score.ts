import { clamp } from "./utils";

export interface ScoreInputs {
  // visual
  eye_contact_ratio?: number;
  head_stability?: number;
  body_sway?: number; // 낮을수록 좋음
  gesture_usage?: number;
  // audio
  filler_count_per_min?: number;
  pace_cpm?: number;
  pitch_stability?: number;
  volume_consistency?: number;
  // content
  core_message_clarity?: number;
  argument_evidence_balance?: number;
  empty_phrases_count?: number;
}

export function paceScore(cpm: number | undefined): number {
  if (cpm === undefined || cpm <= 0) return 50;
  // 정상 범위 280-320
  if (cpm >= 280 && cpm <= 320) return 100;
  if (cpm < 280) {
    const diff = 280 - cpm;
    return clamp(100 - diff / 2, 0, 100);
  }
  const diff = cpm - 320;
  return clamp(100 - diff / 2, 0, 100);
}

export function normalizeFiller(perMin: number | undefined): number {
  if (!perMin || perMin <= 0) return 0;
  return clamp(perMin * 10, 0, 100);
}

export function normalizeEmptyPhrases(count: number | undefined): number {
  if (!count || count <= 0) return 0;
  return clamp(count * 15, 0, 100);
}

export function visualScore(i: ScoreInputs): number {
  const eye = i.eye_contact_ratio ?? 50;
  const head = i.head_stability ?? 60;
  const sway = 100 - clamp(i.body_sway ?? 30, 0, 100); // 흔들림 적을수록 점수 ↑
  const stab = (head + sway) / 2;
  const ges = i.gesture_usage ?? 40;
  return clamp(eye * 0.4 + stab * 0.3 + ges * 0.3, 0, 100);
}

export function audioScore(i: ScoreInputs): number {
  const filler = 100 - normalizeFiller(i.filler_count_per_min);
  const pace = paceScore(i.pace_cpm);
  const pitch = i.pitch_stability ?? 60;
  return clamp(filler * 0.4 + pace * 0.3 + pitch * 0.3, 0, 100);
}

export function contentScore(i: ScoreInputs): number {
  const clarity = i.core_message_clarity ?? 60;
  const evidence = i.argument_evidence_balance ?? 60;
  const emptyDed = 100 - normalizeEmptyPhrases(i.empty_phrases_count);
  return clamp(clarity * 0.4 + evidence * 0.3 + emptyDed * 0.3, 0, 100);
}

export function trustScore(i: ScoreInputs): number {
  const v = visualScore(i);
  const a = audioScore(i);
  const c = contentScore(i);
  return clamp(v * 0.3 + a * 0.4 + c * 0.3, 0, 100);
}

export function computeAll(i: ScoreInputs) {
  return {
    visual: visualScore(i),
    audio: audioScore(i),
    content: contentScore(i),
    trust: trustScore(i),
  };
}
