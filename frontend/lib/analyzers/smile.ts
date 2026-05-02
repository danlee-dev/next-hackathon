import type { FaceLandmarkerResult } from "@mediapipe/tasks-vision";
import { clamp } from "../utils";

const SMILE_BLENDSHAPES = ["mouthSmileLeft", "mouthSmileRight"];

/** Naturalness는 too-low / too-high 모두 어색하므로 sweet spot 중간값. */
export class SmileNaturalnessTracker {
  private values: number[] = [];
  constructor(private readonly windowSize: number = 60) {}

  push(face: FaceLandmarkerResult | null) {
    const bs = face?.faceBlendshapes?.[0]?.categories;
    if (!bs) return;
    let total = 0;
    let count = 0;
    for (const c of bs) {
      if (SMILE_BLENDSHAPES.includes(c.categoryName)) {
        total += c.score;
        count += 1;
      }
    }
    const avg = count > 0 ? total / count : 0;
    this.values.push(avg);
    if (this.values.length > this.windowSize) this.values.shift();
  }

  reset() {
    this.values = [];
  }

  score(): number {
    if (this.values.length < 5) return 30;
    const mean = this.values.reduce((a, b) => a + b, 0) / this.values.length;
    const v =
      this.values.reduce((s, x) => s + (x - mean) ** 2, 0) / this.values.length;
    const std = Math.sqrt(v);
    // sweet spot: mean 0.15 ~ 0.4, std around 0.05~0.15
    const meanScore = clamp(100 - Math.abs(mean - 0.27) * 250, 0, 100);
    const stdScore = clamp(100 - Math.abs(std - 0.1) * 400, 0, 100);
    return Math.round(meanScore * 0.6 + stdScore * 0.4);
  }
}
