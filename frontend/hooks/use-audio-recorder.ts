"use client";

import { useEffect, useRef, useState } from "react";

const CHUNK_MS = 5000;

export interface AudioChunkInfo {
  index: number;
  startMs: number;
}

/**
 * MediaRecorder 5초 청크. onChunk 는 ref 로 보관해서 useEffect 재실행 트리거하지 X.
 * (LiveSession 의 durationMs 의존 useCallback 이 매 tick 재생성돼 recorder 가
 * 계속 재시작되던 버그 수정.)
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
    setState("requesting");

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            sampleRate: 16000,
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true,
          },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;

        const mime =
          MediaRecorder.isTypeSupported("audio/webm;codecs=opus") && "audio/webm;codecs=opus";
        const recorder = mime
          ? new MediaRecorder(stream, { mimeType: mime })
          : new MediaRecorder(stream);
        recorderRef.current = recorder;
        startedAtRef.current = performance.now();

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

        recorder.start(CHUNK_MS);
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
      try {
        if (recorderRef.current?.state === "recording") {
          recorderRef.current.stop();
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
