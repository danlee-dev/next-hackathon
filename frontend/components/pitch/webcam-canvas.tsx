"use client";

import type { FaceLandmarkerResult, PoseLandmarkerResult } from "@mediapipe/tasks-vision";
import { useEffect, useRef } from "react";

interface Props {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  face: FaceLandmarkerResult | null;
  pose: PoseLandmarkerResult | null;
  trustColor?: string;
}

const POSE_LINKS: [number, number][] = [
  [11, 12], // shoulders
  [11, 13],
  [13, 15],
  [12, 14],
  [14, 16],
  [11, 23],
  [12, 24],
  [23, 24],
];

export function WebcamCanvas({ videoRef, face, pose, trustColor }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = video.clientWidth * dpr;
    canvas.height = video.clientHeight * dpr;
    canvas.style.width = `${video.clientWidth}px`;
    canvas.style.height = `${video.clientHeight}px`;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const w = video.clientWidth;
    const h = video.clientHeight;

    // face mesh — simple sparse points
    if (face?.faceLandmarks?.[0]) {
      const lm = face.faceLandmarks[0];
      ctx.fillStyle = trustColor ?? "rgba(46, 200, 219, 0.5)";
      for (let i = 0; i < lm.length; i += 4) {
        const p = lm[i];
        ctx.beginPath();
        // mirror x
        ctx.arc((1 - p.x) * w, p.y * h, 0.8, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // pose skeleton
    if (pose?.landmarks?.[0]) {
      const lm = pose.landmarks[0];
      ctx.strokeStyle = "oklch(0.78 0.17 145 / 0.7)";
      ctx.lineWidth = 1.5;
      for (const [a, b] of POSE_LINKS) {
        const pa = lm[a];
        const pb = lm[b];
        if (!pa || !pb) continue;
        ctx.beginPath();
        ctx.moveTo((1 - pa.x) * w, pa.y * h);
        ctx.lineTo((1 - pb.x) * w, pb.y * h);
        ctx.stroke();
      }
      ctx.fillStyle = "oklch(0.78 0.17 145 / 0.95)";
      for (const i of [11, 12, 13, 14, 15, 16, 23, 24]) {
        const p = lm[i];
        if (!p) continue;
        ctx.beginPath();
        ctx.arc((1 - p.x) * w, p.y * h, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  });

  return <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" />;
}
