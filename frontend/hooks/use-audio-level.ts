"use client";

import { useEffect, useRef, useState } from "react";

/** WebAudio analyser → 0..1 normalized RMS (smoothed) */
export function useAudioLevel(enabled: boolean) {
  const [level, setLevel] = useState(0);
  const ctxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;

        const Ctor =
          typeof window !== "undefined"
            ? // @ts-expect-error webkit prefix
              (window.AudioContext ?? window.webkitAudioContext)
            : null;
        if (!Ctor) return;
        const ctx = new Ctor();
        ctxRef.current = ctx;
        const src = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        src.connect(analyser);

        const data = new Uint8Array(analyser.frequencyBinCount);
        let smoothed = 0;

        const tick = () => {
          analyser.getByteTimeDomainData(data);
          let sum = 0;
          for (let i = 0; i < data.length; i++) {
            const v = (data[i] - 128) / 128;
            sum += v * v;
          }
          const rms = Math.sqrt(sum / data.length);
          smoothed = smoothed * 0.85 + rms * 0.15;
          setLevel(Math.min(smoothed * 4, 1));
          rafRef.current = requestAnimationFrame(tick);
        };
        tick();
      } catch {
        // mic 권한 없으면 0 유지 — UI에서 fake로 변동
      }
    })();

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      ctxRef.current?.close().catch(() => {});
      ctxRef.current = null;
    };
  }, [enabled]);

  return level;
}
