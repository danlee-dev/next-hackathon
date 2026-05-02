import type { PoseLandmarkerResult } from "@mediapipe/tasks-vision";
import { clamp } from "../utils";

/**
 * 어깨 좌우 흔들림 (0-100, 높을수록 더 흔들림 — 점수에선 반전).
 *
 * 양 어깨 (11, 12) 의 mid-x 의 표준편차를 기반으로 계산.
 */
export class BodySwayTracker {
  private mids: number[] = [];
  constructor(private readonly windowSize: number = 60) {}

  push(pose: PoseLandmarkerResult | null) {
    const lm = pose?.landmarks?.[0];
    if (!lm) return;
    const ls = lm[11];
    const rs = lm[12];
    if (!ls || !rs) return;
    const midX = (ls.x + rs.x) / 2;
    this.mids.push(midX);
    if (this.mids.length > this.windowSize) this.mids.shift();
  }

  reset() {
    this.mids = [];
  }

  /** 0 (no sway) ~ 100 (heavy sway). 점수 계산 시 100-X 사용. */
  swayValue(): number {
    if (this.mids.length < 5) return 25;
    const m = this.mids.reduce((a, b) => a + b, 0) / this.mids.length;
    const v =
      this.mids.reduce((s, x) => s + (x - m) ** 2, 0) / this.mids.length;
    const std = Math.sqrt(v);
    return Math.round(clamp(std * 1500, 0, 100));
  }
}
