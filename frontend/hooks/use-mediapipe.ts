"use client";

import {
  FaceLandmarker,
  type FaceLandmarkerResult,
  FilesetResolver,
  PoseLandmarker,
  type PoseLandmarkerResult,
} from "@mediapipe/tasks-vision";
import { useEffect, useRef, useState } from "react";

export interface MediaPipeFrame {
  face: FaceLandmarkerResult | null;
  pose: PoseLandmarkerResult | null;
  timestampMs: number;
}

const VISION_WASM = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm";

/**
 * MediaPipe TFLite XNNPACK 초기화 INFO 메시지가 Next dev 오버레이에 잡힘.
 * 정상 동작 신호인데 사용자에겐 에러처럼 보임 → 한 번만 wrapper 설치.
 */
let mpLogPatched = false;
function patchMpLog() {
  if (mpLogPatched || typeof window === "undefined") return;
  mpLogPatched = true;
  const origInfo = console.info;
  const origLog = console.log;
  const origWarn = console.warn;
  const origError = console.error;
  const filter = (msg: unknown) =>
    typeof msg === "string" &&
    (msg.startsWith("INFO:") ||
      msg.startsWith("W0000") ||
      msg.startsWith("E0000") ||
      msg.includes("TensorFlow Lite") ||
      msg.includes("XNNPACK") ||
      msg.includes("Created TensorFlow") ||
      msg.includes("Created delegate") ||
      msg.includes("inference_calculator") ||
      msg.includes("graph_builder"));
  console.info = (...args: unknown[]) => {
    if (filter(args[0])) return;
    origInfo.apply(console, args as []);
  };
  console.log = (...args: unknown[]) => {
    if (filter(args[0])) return;
    origLog.apply(console, args as []);
  };
  console.warn = (...args: unknown[]) => {
    if (filter(args[0])) return;
    origWarn.apply(console, args as []);
  };
  console.error = (...args: unknown[]) => {
    if (filter(args[0])) return;
    origError.apply(console, args as []);
  };
}
const FACE_MODEL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";
const POSE_MODEL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";

export function useMediaPipe(videoRef: React.RefObject<HTMLVideoElement | null>, enabled = true) {
  const faceRef = useRef<FaceLandmarker | null>(null);
  const poseRef = useRef<PoseLandmarker | null>(null);
  const rafRef = useRef<number | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const frameRef = useRef<MediaPipeFrame | null>(null);
  const [frameVersion, setFrameVersion] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    patchMpLog();
    let cancelled = false;
    (async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(VISION_WASM);
        const [face, pose] = await Promise.all([
          FaceLandmarker.createFromOptions(vision, {
            baseOptions: { modelAssetPath: FACE_MODEL, delegate: "GPU" },
            outputFaceBlendshapes: true,
            outputFacialTransformationMatrixes: false,
            runningMode: "VIDEO",
            numFaces: 1,
          }),
          PoseLandmarker.createFromOptions(vision, {
            baseOptions: { modelAssetPath: POSE_MODEL, delegate: "GPU" },
            runningMode: "VIDEO",
            numPoses: 1,
          }),
        ]);
        if (cancelled) {
          face.close();
          pose.close();
          return;
        }
        faceRef.current = face;
        poseRef.current = pose;
        setReady(true);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setError(msg);
      }
    })();

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      faceRef.current?.close();
      poseRef.current?.close();
      faceRef.current = null;
      poseRef.current = null;
    };
  }, [enabled]);

  useEffect(() => {
    if (!ready) return;
    let lastTs = 0;

    const tick = () => {
      const v = videoRef.current;
      if (v && v.readyState >= 2 && faceRef.current && poseRef.current) {
        const ts = performance.now();
        if (ts - lastTs > 33) {
          try {
            const face = faceRef.current.detectForVideo(v, ts);
            const pose = poseRef.current.detectForVideo(v, ts);
            frameRef.current = { face, pose, timestampMs: ts };
            setFrameVersion((n) => (n + 1) & 0xffff);
          } catch {
            // 첫 프레임 등 race condition 무시
          }
          lastTs = ts;
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    tick();

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [ready, videoRef]);

  return { ready, error, frame: frameRef.current, frameVersion };
}
