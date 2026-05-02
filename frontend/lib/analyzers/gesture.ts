import type { PoseLandmarkerResult } from "@mediapipe/tasks-vision";
import { clamp } from "../utils";

/**
 * 손 사용 비율 — 가슴 위로 손이 올라온 프레임 비율.
 *
 * Pose landmarks: 11/12 = shoulders, 15 = left wrist, 16 = right wrist.
 */
export class GestureUsageTracker {
  private aboveCount = 0;
  private totalCount = 0;
  constructor(private readonly windowSize: number = 90) {}

  push(pose: PoseLandmarkerResult | null) {
    const lm = pose?.landmarks?.[0];
    if (!lm) return;
    const ls = lm[11];
    const rs = lm[12];
    const lw = lm[15];
    const rw = lm[16];
    if (!ls || !rs || !lw || !rw) return;
    const shoulderY = Math.min(ls.y, rs.y); // 카메라 좌표에서 위로 갈수록 y 작음
    const wristAbove = lw.y < shoulderY + 0.05 || rw.y < shoulderY + 0.05;
    if (wristAbove) this.aboveCount += 1;
    this.totalCount += 1;

    // sliding window: window 채우면 가장 오래된 카운트 1씩 빼기 (대략적 sliding)
    if (this.totalCount > this.windowSize) {
      this.totalCount = this.windowSize;
      this.aboveCount = Math.floor((this.aboveCount * (this.windowSize - 1)) / this.windowSize);
    }
  }

  reset() {
    this.aboveCount = 0;
    this.totalCount = 0;
  }

  score(): number {
    if (this.totalCount < 5) return 30;
    return Math.round(clamp((this.aboveCount / this.totalCount) * 100, 0, 100));
  }
}
