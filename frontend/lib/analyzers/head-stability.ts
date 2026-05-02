import type { FaceLandmarkerResult } from "@mediapipe/tasks-vision";
import { clamp } from "../utils";

/**
 * 머리 방향 안정성 — 코끝 위치 standard deviation 기반.
 *
 * 호출 측에서 sliding window를 두고 push() 한 다음 score()로 점수 산출.
 */
export class HeadStabilityTracker {
  private xs: number[] = [];
  private ys: number[] = [];
  constructor(private readonly windowSize: number = 60) {}

  push(face: FaceLandmarkerResult | null) {
    const tip = face?.faceLandmarks?.[0]?.[1];
    if (!tip) return;
    this.xs.push(tip.x);
    this.ys.push(tip.y);
    if (this.xs.length > this.windowSize) this.xs.shift();
    if (this.ys.length > this.windowSize) this.ys.shift();
  }

  reset() {
    this.xs = [];
    this.ys = [];
  }

  score(): number {
    if (this.xs.length < 5) return 60;
    const stdx = std(this.xs);
    const stdy = std(this.ys);
    // std가 0.02 이하면 매우 안정. 0.08 넘으면 두리번.
    const combined = stdx + stdy;
    const s = clamp(100 - combined * 800, 0, 100);
    return Math.round(s);
  }
}

function std(arr: number[]): number {
  if (arr.length < 2) return 0;
  const m = arr.reduce((a, b) => a + b, 0) / arr.length;
  return Math.sqrt(arr.reduce((s, x) => s + (x - m) ** 2, 0) / arr.length);
}
