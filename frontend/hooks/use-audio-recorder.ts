"use client";

import { useEffect, useRef, useState } from "react";

const CHUNK_MS = 5000;

export interface AudioChunkInfo {
  index: number;
  startMs: number;
}

/**
 * MediaRecorder 5초 청크. 매 사이클마다 stop -> start 로 *독립적인* webm
 * 파일 청크를 만든다. timeslice 모드 (`recorder.start(ms)`) 는 두 번째
 * 청크부터 webm 헤더 없는 raw fragment 라 Whisper 가 디코딩 못 함.
 */
export function useAudioRecorder(
  enabled: boolean,
  onChunk: (blob: Blob, info: AudioChunkInfo) => void,
) {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const indexRef = useRef(0);
  const startedAtRef = useRef(0);
  const onChunkRef = useRef(onChunk);
  onChunkRef.current = onChunk;

  const [state, setState] = useState<"idle" | "requesting" | "recording" | "stopped" | "error">(
    "idle",
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let cycleTimer: number | null = null;
    setState("requesting");

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            sampleRate: 16000,
            channelCount: 1,
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
          },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;

        const mime =
          MediaRecorder.isTypeSupported("audio/webm;codecs=opus") && "audio/webm;codecs=opus";

        const startCycle = () => {
          if (cancelled) return;
          const recorder = mime
            ? new MediaRecorder(stream, { mimeType: mime })
            : new MediaRecorder(stream);
          recorderRef.current = recorder;

          recorder.ondataavailable = (e) => {
            if (e.data.size > 0) {
              const startMs = indexRef.current * CHUNK_MS;
              onChunkRef.current(e.data, { index: indexRef.current, startMs });
              indexRef.current += 1;
            }
          };
          recorder.onerror = (e) => {
            const msg = (e as ErrorEvent).message || "unknown";
            console.error("[recorder] error", msg);
            setError(`recorder error: ${msg}`);
            setState("error");
          };
          recorder.onstop = () => {
            if (!cancelled) startCycle();
          };

          recorder.start();
          cycleTimer = window.setTimeout(() => {
            if (recorder.state === "recording") {
              try {
                recorder.stop();
              } catch {}
            }
          }, CHUNK_MS);
        };

        startedAtRef.current = performance.now();
        startCycle();
        setState("recording");
        console.info("[recorder] started", { mime, chunkMs: CHUNK_MS });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        const name = e instanceof Error ? e.name : "Unknown";
        console.error("[recorder] getUserMedia failed", name, msg);
        setError(`${name}: ${msg}`);
        setState("error");
      }
    })();

    return () => {
      cancelled = true;
      if (cycleTimer) window.clearTimeout(cycleTimer);
      try {
        const r = recorderRef.current;
        if (r) {
          r.onstop = null;
          if (r.state === "recording") r.stop();
        }
      } catch {}
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      setState("stopped");
    };
    // *only* enabled — onChunk 변경에 재실행 X (ref 사용)
  }, [enabled]);

  return { state, error };
}
