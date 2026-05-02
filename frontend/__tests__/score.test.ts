import {
  audioScore,
  contentScore,
  normalizeFiller,
  paceScore,
  trustScore,
  visualScore,
} from "@/lib/score";
import { describe, expect, it } from "vitest";

describe("paceScore — sweet spot 280-320 cpm", () => {
  it("hits 100 in window", () => {
    expect(paceScore(300)).toBe(100);
    expect(paceScore(280)).toBe(100);
    expect(paceScore(320)).toBe(100);
  });

  it("drops below window", () => {
    expect(paceScore(180)).toBeLessThan(100);
  });

  it("clamps to 0..100", () => {
    expect(paceScore(50)).toBeGreaterThanOrEqual(0);
    expect(paceScore(800)).toBeGreaterThanOrEqual(0);
  });
});

describe("normalizeFiller", () => {
  it("returns 0 when no fillers", () => {
    expect(normalizeFiller(0)).toBe(0);
    expect(normalizeFiller(undefined)).toBe(0);
  });
  it("scales linearly capped at 100", () => {
    expect(normalizeFiller(5)).toBe(50);
    expect(normalizeFiller(15)).toBe(100);
  });
});

describe("score weights match spec", () => {
  it("visual = eye*.4 + stab*.3 + gesture*.3", () => {
    const s = visualScore({
      eye_contact_ratio: 100,
      head_stability: 100,
      body_sway: 0,
      gesture_usage: 100,
    });
    expect(s).toBe(100);
  });

  it("audio penalizes fillers", () => {
    const high = audioScore({
      filler_count_per_min: 0,
      pace_cpm: 300,
      pitch_stability: 80,
    });
    const low = audioScore({
      filler_count_per_min: 12,
      pace_cpm: 300,
      pitch_stability: 80,
    });
    expect(high).toBeGreaterThan(low);
  });

  it("content penalizes empty phrases", () => {
    const a = contentScore({
      core_message_clarity: 80,
      argument_evidence_balance: 75,
      empty_phrases_count: 0,
    });
    const b = contentScore({
      core_message_clarity: 80,
      argument_evidence_balance: 75,
      empty_phrases_count: 5,
    });
    expect(a).toBeGreaterThan(b);
  });

  it("trust never escapes 0..100", () => {
    const t = trustScore({
      eye_contact_ratio: 70,
      head_stability: 70,
      body_sway: 30,
      gesture_usage: 50,
      filler_count_per_min: 4,
      pace_cpm: 300,
      pitch_stability: 70,
      core_message_clarity: 75,
      argument_evidence_balance: 70,
      empty_phrases_count: 1,
    });
    expect(t).toBeGreaterThanOrEqual(0);
    expect(t).toBeLessThanOrEqual(100);
  });
});
