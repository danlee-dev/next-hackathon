/**
 * Demo Simulator — 카메라 권한 없이 라이브 화면을 합성한다.
 *
 * 시연용. `?demo=1` 또는 사용자가 카메라 권한 거부했을 때 사용.
 * 실제 발표를 모방한 시간축으로 metric을 흘려보낸다.
 */

import type { AggregateMetrics } from "@/types/pitch";

export interface DemoTick {
  ts_ms: number;
  metrics: AggregateMetrics;
  transcript_addition?: string;
  filler_event?: { word: string };
}

const DEMO_TRANSCRIPT_PARTS = [
  "안녕하세요, 저희는 한국어 IR 피칭에 특화된 AI 코칭 서비스를 만들고 있습니다.",
  "사실 IR 발표는 그러니까 창업자에게 가장 큰 허들 중 하나인데요.",
  "음 저희가 풀려는 문제는 시선 회피, 추임새, 공허한 표현 같은",
  "세 가지 신호를 데이터로 측정해서 단일 신뢰 점수로 보여주는 것입니다.",
  "혁신적인 기술이라기보다는, 기존 도구가 한국어 환경을 다루지 못한 빈자리를 채우는 일입니다.",
  "약간 첫 단계는 대학 창업 동아리 30팀 베타로 검증할 예정이고요.",
  "감사합니다.",
];

const DEMO_FILLERS = [
  { ts: 8000, word: "그러니까" },
  { ts: 14000, word: "음" },
  { ts: 22000, word: "혁신적인" },
  { ts: 31000, word: "약간" },
];

interface SimState {
  started: number;
  fillerIdx: number;
  transcriptIdx: number;
  lastTranscript: number;
}

export class DemoSimulator {
  private state: SimState;
  constructor() {
    this.state = {
      started: performance.now(),
      fillerIdx: 0,
      transcriptIdx: 0,
      lastTranscript: 0,
    };
  }

  reset() {
    this.state = {
      started: performance.now(),
      fillerIdx: 0,
      transcriptIdx: 0,
      lastTranscript: 0,
    };
  }

  /** 매 100ms 호출. 현재 시점의 합성 metric을 돌려준다. */
  tick(): DemoTick {
    const now = performance.now();
    const ts = now - this.state.started;

    // 시간에 따라 약간씩 변하는 metric 합성 (sine wave + drift)
    const t = ts / 1000;
    const eye =
      55 + Math.sin(t / 4) * 18 + (t > 18 ? -10 : 0) + (t > 30 ? 5 : 0);
    const head = 70 + Math.cos(t / 5) * 12;
    const sway = 22 + Math.sin(t / 3) * 12 + (t > 20 ? 8 : 0);
    const gesture = 45 + Math.sin(t / 6) * 18;
    const smile = 30 + Math.cos(t / 7) * 14;
    const pace = 290 + Math.sin(t / 8) * 30;
    const pitch = 70 + Math.cos(t / 5) * 12 + (t > 22 ? -10 : 0);
    const volume = 70 + Math.sin(t / 4) * 8;

    const metrics: AggregateMetrics = {
      eye_contact_ratio: clamp(eye, 0, 100),
      head_stability: clamp(head, 0, 100),
      body_sway: clamp(sway, 0, 100),
      gesture_usage: clamp(gesture, 0, 100),
      smile_naturalness: clamp(smile, 0, 100),
      filler_count_per_min: this.fillersPerMin(ts),
      pace_cpm: pace,
      pitch_stability: clamp(pitch, 0, 100),
      volume_consistency: clamp(volume, 0, 100),
      speech_ratio: 80,
      filler_count_total: this.state.fillerIdx,
    };

    let transcript_addition: string | undefined;
    let filler_event: { word: string } | undefined;

    // 매 4.5초마다 전사 한 줄 추가
    if (
      this.state.transcriptIdx < DEMO_TRANSCRIPT_PARTS.length &&
      now - this.state.lastTranscript > 4500
    ) {
      transcript_addition = DEMO_TRANSCRIPT_PARTS[this.state.transcriptIdx];
      this.state.transcriptIdx += 1;
      this.state.lastTranscript = now;
    }

    // 정해진 시각에 필러 이벤트
    const next = DEMO_FILLERS[this.state.fillerIdx];
    if (next && ts >= next.ts) {
      filler_event = { word: next.word };
      this.state.fillerIdx += 1;
    }

    return { ts_ms: ts, metrics, transcript_addition, filler_event };
  }

  private fillersPerMin(ts: number): number {
    if (ts < 1000) return 0;
    const minutes = ts / 60_000;
    return Math.min(this.state.fillerIdx / Math.max(minutes, 0.05), 30);
  }
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

/**
 * Synthetic timeline for the post-pitch report — used when the live session
 * never connected to a backend (demo mode). 60 seconds of plausible variance.
 */
export function generateDemoTimeline(durationMs: number = 60_000) {
  const points: { ts_ms: number; trust: number; visual: number; audio: number; metrics: any }[] = [];
  const step = 1500;
  for (let t = 0; t <= durationMs; t += step) {
    const sec = t / 1000;
    const trust = 70 + Math.sin(sec / 5) * 10 - (sec > 20 && sec < 28 ? 12 : 0);
    const visual = 65 + Math.cos(sec / 4) * 12;
    const audio = 75 + Math.sin(sec / 6) * 8;
    points.push({
      ts_ms: t,
      trust: clamp(trust, 0, 100),
      visual: clamp(visual, 0, 100),
      audio: clamp(audio, 0, 100),
      metrics: {},
    });
  }
  return points;
}
