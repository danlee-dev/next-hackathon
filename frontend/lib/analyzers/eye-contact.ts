import type { FaceLandmarkerResult } from "@mediapipe/tasks-vision";
import { clamp } from "../utils";

/**
 * 정면 응시율을 0-100 score로 환산.
 *
 * 단순 휴리스틱: 코끝(1)과 양 눈(33,263)의 정중앙 사이의 x/y 편차가 작을수록
 * 정면. yaw/pitch에 영향받음. transformation matrix 활용은 무거워서 패스.
 */
export function computeEyeContact(face: FaceLandmarkerResult | null): number {
  if (!face?.faceLandmarks?.[0]) return 0;
  const lm = face.faceLandmarks[0];
  const noseTip = lm[1];
  const leftEyeOuter = lm[33];
  const rightEyeOuter = lm[263];
  if (!noseTip || !leftEyeOuter || !rightEyeOuter) return 0;
  const eyeMidX = (leftEyeOuter.x + rightEyeOuter.x) / 2;
  const eyeMidY = (leftEyeOuter.y + rightEyeOuter.y) / 2;

  const dx = Math.abs(noseTip.x - eyeMidX);
  const dy = Math.abs(noseTip.y - eyeMidY - 0.05);
  const score = Math.max(0, 1 - (dx * 50 + dy * 30) / 2);
  return Math.round(clamp(score * 100, 0, 100));
}
