/**
 * Presenter tracker — 다인 환경에서 주발표자를 lock 한다.
 *
 * 첫 발표 lock 후엔 그 사람의 *공간 anchor* (얼굴 중심·크기, 어깨 중심)를
 * 기준으로 매 프레임 가장 가까운 person을 선택. 새 person 이 갑자기 anchor
 * 바깥에서 나타나면 reject (frame skip). 얼굴과 몸이 같은 사람인지 검증
 * (얼굴 중심 x가 어깨 중심 x ± 0.18 내에 있어야 함).
 *
 * 사용법:
 *   const tracker = new PresenterTracker();
 *   const { face, pose, locked } = tracker.match(faceResult, poseResult);
 */

import type {
  FaceLandmarkerResult,
  NormalizedLandmark,
  PoseLandmarkerResult,
} from "@mediapipe/tasks-vision";

export interface PresenterFrame {
  /** matched face landmarks (or null). */
  face: { landmarks: NormalizedLandmark[]; blendshapes: any | undefined } | null;
  /** matched pose landmarks (or null). */
  pose: { landmarks: NormalizedLandmark[] } | null;
  /** true after the tracker has chosen its presenter. */
  locked: boolean;
  /** distance from anchor (debug). */
  drift: number;
}

interface Anchor {
  faceX: number;
  faceY: number;
  faceSize: number; // width in normalized coords
  shoulderX: number;
  shoulderY: number;
}

const LOCK_FRAMES_REQUIRED = 6; // ~200ms at 30fps to confirm
const MAX_DRIFT = 0.25; // normalized coord — reject if anchor jumps >25%
const ANCHOR_EMA = 0.92; // 92% prior, 8% new → slow drift toward subject motion
const ALIGNMENT_TOLERANCE = 0.22; // face↔shoulder center mismatch threshold

export class PresenterTracker {
  private anchor: Anchor | null = null;
  private confirmed = false;
  private lockCounter = 0;

  reset() {
    this.anchor = null;
    this.confirmed = false;
    this.lockCounter = 0;
  }

  match(face: FaceLandmarkerResult | null, pose: PoseLandmarkerResult | null): PresenterFrame {
    const faces = face?.faceLandmarks ?? [];
    const blendshapes = face?.faceBlendshapes ?? [];
    const poses = pose?.landmarks ?? [];

    // 1) extract candidates
    const faceCandidates = faces.map((lm, i) => ({
      lm,
      bs: blendshapes[i],
      ...faceCenterAndSize(lm),
    }));
    const poseCandidates = poses.map((lm) => ({
      lm,
      ...poseShoulderCenter(lm),
    }));

    if (faceCandidates.length === 0 && poseCandidates.length === 0) {
      return { face: null, pose: null, locked: this.confirmed, drift: 0 };
    }

    // 2) if no anchor yet, pick the largest face (or only pose) as candidate
    if (!this.anchor) {
      const bestFace = pickLargestFace(faceCandidates);
      const bestPose = bestFace
        ? pickClosestPose(poseCandidates, bestFace.x)
        : (poseCandidates[0] ?? null);
      if (!bestFace && !bestPose) {
        return { face: null, pose: null, locked: false, drift: 0 };
      }
      this.anchor = {
        faceX: bestFace?.x ?? bestPose!.shoulderX,
        faceY: bestFace?.y ?? bestPose!.shoulderY - 0.15,
        faceSize: bestFace?.size ?? 0.18,
        shoulderX: bestPose?.shoulderX ?? bestFace!.x,
        shoulderY: bestPose?.shoulderY ?? bestFace!.y + 0.18,
      };
      this.lockCounter = 1;
      return {
        face: bestFace ? { landmarks: bestFace.lm, blendshapes: bestFace.bs } : null,
        pose: bestPose ? { landmarks: bestPose.lm } : null,
        locked: false,
        drift: 0,
      };
    }

    // 3) we have anchor — pick candidates closest to it
    const anchor = this.anchor;
    const matchedFace = faceCandidates
      .map((c) => ({ ...c, d: dist(c.x, c.y, anchor.faceX, anchor.faceY) }))
      .filter((c) => c.d < MAX_DRIFT)
      .sort((a, b) => a.d - b.d)[0];
    const matchedPose = poseCandidates
      .map((c) => ({
        ...c,
        d: dist(c.shoulderX, c.shoulderY, anchor.shoulderX, anchor.shoulderY),
      }))
      .filter((c) => c.d < MAX_DRIFT)
      .sort((a, b) => a.d - b.d)[0];

    // 4) face/body alignment check — face center should sit above shoulder center
    if (matchedFace && matchedPose) {
      const dx = Math.abs(matchedFace.x - matchedPose.shoulderX);
      if (dx > ALIGNMENT_TOLERANCE) {
        // mismatch — likely face from one person + body from another. drop this frame.
        return {
          face: null,
          pose: null,
          locked: this.confirmed,
          drift: dx,
        };
      }
    }

    // 5) update anchor (slow EMA toward matched subject)
    if (matchedFace) {
      this.anchor.faceX = ANCHOR_EMA * anchor.faceX + (1 - ANCHOR_EMA) * matchedFace.x;
      this.anchor.faceY = ANCHOR_EMA * anchor.faceY + (1 - ANCHOR_EMA) * matchedFace.y;
      this.anchor.faceSize = ANCHOR_EMA * anchor.faceSize + (1 - ANCHOR_EMA) * matchedFace.size;
    }
    if (matchedPose) {
      this.anchor.shoulderX =
        ANCHOR_EMA * anchor.shoulderX + (1 - ANCHOR_EMA) * matchedPose.shoulderX;
      this.anchor.shoulderY =
        ANCHOR_EMA * anchor.shoulderY + (1 - ANCHOR_EMA) * matchedPose.shoulderY;
    }

    // 6) lock confirmation (need N consecutive matched frames)
    if (matchedFace || matchedPose) {
      this.lockCounter = Math.min(this.lockCounter + 1, LOCK_FRAMES_REQUIRED + 1);
      if (this.lockCounter >= LOCK_FRAMES_REQUIRED) this.confirmed = true;
    } else {
      this.lockCounter = Math.max(this.lockCounter - 1, 0);
    }

    return {
      face: matchedFace ? { landmarks: matchedFace.lm, blendshapes: matchedFace.bs } : null,
      pose: matchedPose ? { landmarks: matchedPose.lm } : null,
      locked: this.confirmed,
      drift: matchedFace?.d ?? matchedPose?.d ?? 0,
    };
  }
}

function faceCenterAndSize(lm: NormalizedLandmark[]) {
  // bbox via landmark 234 (right cheek) and 454 (left cheek)
  const r = lm[234];
  const l = lm[454];
  const top = lm[10];
  const bottom = lm[152];
  if (!r || !l || !top || !bottom) {
    const tip = lm[1];
    return { x: tip?.x ?? 0.5, y: tip?.y ?? 0.5, size: 0.18 };
  }
  const x = (r.x + l.x) / 2;
  const y = (top.y + bottom.y) / 2;
  const size = Math.abs(l.x - r.x);
  return { x, y, size };
}

function poseShoulderCenter(lm: NormalizedLandmark[]) {
  const ls = lm[11];
  const rs = lm[12];
  if (!ls || !rs) return { shoulderX: 0.5, shoulderY: 0.5 };
  return {
    shoulderX: (ls.x + rs.x) / 2,
    shoulderY: (ls.y + rs.y) / 2,
  };
}

function dist(x1: number, y1: number, x2: number, y2: number) {
  return Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2);
}

function pickLargestFace(
  candidates: { x: number; y: number; size: number; lm: NormalizedLandmark[]; bs: any }[],
) {
  if (candidates.length === 0) return null;
  return [...candidates].sort((a, b) => b.size - a.size)[0];
}

function pickClosestPose(
  candidates: { shoulderX: number; shoulderY: number; lm: NormalizedLandmark[] }[],
  targetX: number,
) {
  if (candidates.length === 0) return null;
  return [...candidates].sort(
    (a, b) => Math.abs(a.shoulderX - targetX) - Math.abs(b.shoulderX - targetX),
  )[0];
}
