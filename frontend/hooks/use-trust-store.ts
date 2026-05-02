"use client";

import type {
  AggregateMetrics,
  CoachMessage,
  FillerEvent,
  JudgeReaction,
  ScoreSet,
  SessionTimelineTick,
} from "@/types/pitch";
import { create } from "zustand";

interface TrustStore {
  sessionId: string | null;
  startedAt: number | null;
  durationMs: number;
  isLive: boolean;
  isFinalizing: boolean;

  metrics: AggregateMetrics;
  scores: ScoreSet;
  filler_total: number;
  filler_events: FillerEvent[];
  reactions: Record<string, JudgeReaction>;
  coach: CoachMessage | null;
  timeline: SessionTimelineTick[];
  transcript: string;

  setSession: (id: string) => void;
  start: () => void;
  stop: () => void;
  beginFinalize: () => void;
  endFinalize: () => void;
  reset: () => void;

  updateMetrics: (m: Partial<AggregateMetrics>) => void;
  updateScores: (s: Partial<ScoreSet>) => void;
  pushFillerEvents: (ev: FillerEvent[]) => void;
  setReaction: (r: JudgeReaction) => void;
  setCoach: (c: CoachMessage) => void;
  pushTimeline: (t: SessionTimelineTick) => void;
  appendTranscript: (text: string) => void;
  tick: (now: number) => void;
}

const initialMetrics: AggregateMetrics = {
  eye_contact_ratio: 0,
  head_stability: 0,
  body_sway: 0,
  gesture_usage: 0,
  smile_naturalness: 0,
  filler_count_per_min: 0,
  pace_cpm: 0,
  pitch_stability: 0,
  volume_consistency: 0,
  speech_ratio: 0,
  filler_count_total: 0,
};

const initialScores: ScoreSet = {
  trust: 0,
  visual: 0,
  audio: 0,
  content: 0,
};

export const useTrustStore = create<TrustStore>((set) => ({
  sessionId: null,
  startedAt: null,
  durationMs: 0,
  isLive: false,
  isFinalizing: false,
  metrics: initialMetrics,
  scores: initialScores,
  filler_total: 0,
  filler_events: [],
  reactions: {},
  coach: null,
  timeline: [],
  transcript: "",

  setSession: (id) => set({ sessionId: id }),
  start: () => set({ isLive: true, startedAt: performance.now() }),
  stop: () => set({ isLive: false }),
  beginFinalize: () => set({ isFinalizing: true }),
  endFinalize: () => set({ isFinalizing: false }),
  reset: () =>
    set({
      sessionId: null,
      startedAt: null,
      durationMs: 0,
      isLive: false,
      isFinalizing: false,
      metrics: initialMetrics,
      scores: initialScores,
      filler_total: 0,
      filler_events: [],
      reactions: {},
      coach: null,
      timeline: [],
      transcript: "",
    }),

  updateMetrics: (m) => set((s) => ({ metrics: { ...s.metrics, ...m } })),
  updateScores: (sc) => set((s) => ({ scores: { ...s.scores, ...sc } })),
  pushFillerEvents: (ev) =>
    set((s) => ({
      filler_total: s.filler_total + ev.length,
      filler_events: [...s.filler_events, ...ev].slice(-200),
      metrics: {
        ...s.metrics,
        filler_count_total: s.filler_total + ev.length,
      },
    })),
  setReaction: (r) => set((s) => ({ reactions: { ...s.reactions, [r.judge_id]: r } })),
  setCoach: (c) => set({ coach: c }),
  pushTimeline: (t) => set((s) => ({ timeline: [...s.timeline, t] })),
  appendTranscript: (text) => set((s) => ({ transcript: `${s.transcript} ${text}`.trim() })),

  tick: (now) =>
    set((s) => (s.startedAt !== null && s.isLive ? { durationMs: now - s.startedAt } : s)),
}));
