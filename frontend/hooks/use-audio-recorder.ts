"use client";

import { useEffect, useRef, useState } from "react";

const CHUNK_MS = 5000;

export interface AudioChunkInfo {
  index: number;
  startMs: number;
}

export function useAudioRecorder(
  enabled: boolean,
  onChunk: (blob: Blob, info: AudioChunkInfo) => void
) {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const indexRef = useRef(0);
  const startedAtRef = useRef(0);
  const [state, setState] = useState<
    "idle" | "requesting" | "recording" | "stopped" | "error"
  >("idle");
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
          MediaRecorder.isTypeSupported("audio/webm;codecs=opus") &&
          "audio/webm;codecs=opus";
        const recorder = mime
          ? new MediaRecorder(stream, { mimeType: mime })
          : new MediaRecorder(stream);
        recorderRef.current = recorder;
        startedAtRef.current = performance.now();

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            const startMs = indexRef.current * CHUNK_MS;
            onChunk(e.data, { index: indexRef.current, startMs });
            indexRef.current += 1;
          }
        };
        recorder.onerror = (e) => {
          setError(`recorder error: ${(e as ErrorEvent).message}`);
          setState("error");
        };

        recorder.start(CHUNK_MS);
        setState("recording");
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setError(msg);
        setState("error");
      }
    })();

    return () => {
      cancelled = true;
      try {
        recorderRef.current?.state === "recording" &&
          recorderRef.current?.stop();
      } catch {}
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      setState("stopped");
    };
  }, [enabled, onChunk]);

  return { state, error };
}
