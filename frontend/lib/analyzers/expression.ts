/**
 * Expression analyzer — MediaPipe FaceLandmarker blendshape 52종을
 * 사용해 confidence / engagement / nervousness / authenticity 신호로
 * 환산한다.
 *
 * 출처: Apple ARKit FACS 호환 blendshape names. MediaPipe FaceLandmarker는
 * `outputFaceBlendshapes: true` 일 때 [{categoryName, score 0..1}, ...]
 * 형태로 반환한다.
 *
 * 휴리스틱 — 학술적으로 완벽하진 않지만 IR 발표 도메인에서 *상대적 신호*
 * 로는 충분하다. 학술적 근거 (대략):
 *   - Authentic smile (Duchenne): mouth + cheekSquint + eyeSquint 동반
 *   - Confidence: jaw 안정 + brow 중립~상승, eye 정상 개방
 *   - Nervousness: lipPress + lipSuck, eyeBlink rate 증가, jawClench
 *   - Engagement: brow inner up + mouth slight open
 */

import type { FaceLandmarkerResult } from "@mediapipe/tasks-vision";

interface Blends {
  [key: string]: number;
}

function toMap(face: FaceLandmarkerResult | null): Blends | null {
  const cats = face?.faceBlendshapes?.[0]?.categories;
  if (!cats || cats.length === 0) return null;
  const m: Blends = {};
  for (const c of cats) m[c.categoryName] = c.score ?? 0;
  return m;
}

/** 0..100 — 자신감 (jaw 안정 + brow 중립 + eye 개방). */
export function computeConfidence(face: FaceLandmarkerResult | null): number {
  const m = toMap(face);
  if (!m) return 50;
  const jawTight = (m.jawForward ?? 0) + (m.mouthClose ?? 0);
  const browFurrow = m.browDownLeft ?? 0 + (m.browDownRight ?? 0);
  const eyeSquint = (m.eyeSquintLeft ?? 0) + (m.eyeSquintRight ?? 0);
  const mouthPress = (m.mouthPressLeft ?? 0) + (m.mouthPressRight ?? 0);
  const negative = jawTight * 35 + browFurrow * 25 + eyeSquint * 15 + mouthPress * 25;
  return clamp(100 - negative);
}

/** 0..100 — engagement (눈 개방·brow inner up + 약간의 mouth open). */
export function computeEngagement(face: FaceLandmarkerResult | null): number {
  const m = toMap(face);
  if (!m) return 50;
  const eyeOpen = 1 - Math.min(((m.eyeBlinkLeft ?? 0) + (m.eyeBlinkRight ?? 0)) / 2, 1);
  const browUp = (m.browInnerUp ?? 0 + (m.browOuterUpLeft ?? 0) + (m.browOuterUpRight ?? 0)) / 3;
  const mouthOpen = m.mouthOpen ?? 0;
  return clamp(eyeOpen * 50 + browUp * 90 + mouthOpen * 12);
}

/** 0..100 — nervousness (lipPress, lipSuck, jawClench, frequent blink). */
export function computeNervousness(face: FaceLandmarkerResult | null): number {
  const m = toMap(face);
  if (!m) return 0;
  const lipPress = (m.mouthPressLeft ?? 0) + (m.mouthPressRight ?? 0);
  const lipSuck =
    (m.mouthRollLower ?? 0) +
    (m.mouthRollUpper ?? 0) +
    (m.mouthShrugUpper ?? 0) +
    (m.mouthShrugLower ?? 0);
  const jawClench = m.jawForward ?? 0;
  const blink = (m.eyeBlinkLeft ?? 0) + (m.eyeBlinkRight ?? 0);
  return clamp(lipPress * 35 + lipSuck * 30 + jawClench * 20 + blink * 15);
}

/**
 * 0..100 — Duchenne 미소 (입꼬리 + 광대 + 눈가 동시 활성화).
 * 진짜 미소는 mouthSmile + cheekSquint + eyeSquint 동시 발생, 가짜는 입만.
 */
export function computeAuthenticSmile(face: FaceLandmarkerResult | null): number {
  const m = toMap(face);
  if (!m) return 0;
  const smile = ((m.mouthSmileLeft ?? 0) + (m.mouthSmileRight ?? 0)) / 2;
  const cheek = ((m.cheekSquintLeft ?? 0) + (m.cheekSquintRight ?? 0)) / 2;
  const eye = ((m.eyeSquintLeft ?? 0) + (m.eyeSquintRight ?? 0)) / 2;
  // 미소가 약하면 0, 강하지만 cheek/eye 반응 없으면 fake → 낮은 점수
  if (smile < 0.05) return 0;
  const accompanied = (cheek + eye) / 2;
  const ratio = accompanied / Math.max(smile, 0.01);
  // ratio 1+ = perfectly authentic, 0.5+ = decent, <0.2 = obviously fake
  return clamp(smile * 60 + Math.min(ratio, 1) * 40);
}

function clamp(n: number, lo = 0, hi = 100) {
  return Math.max(lo, Math.min(hi, n));
}

export interface ExpressionSnapshot {
  confidence: number;
  engagement: number;
  nervousness: number;
  authenticSmile: number;
}

export function computeExpressionAll(face: FaceLandmarkerResult | null): ExpressionSnapshot {
  return {
    confidence: computeConfidence(face),
    engagement: computeEngagement(face),
    nervousness: computeNervousness(face),
    authenticSmile: computeAuthenticSmile(face),
  };
}
