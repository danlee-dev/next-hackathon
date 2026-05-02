"use client";

import { useEffect, useRef, useState } from "react";

interface EphemeralSession {
  client_secret: string;
  expires_at: number;
  model: string;
  sample_rate: number;
}

interface Options {
  /** Called once with each interim/streaming transcript fragment from the model */
  onDelta?: (delta: string) => void;
  /** Called when the model marks an utterance complete; carries the canonical text */
  onCompleted?: (transcript: string) => void;
  /** Mints a short-lived OpenAI Realtime token from our backend */
  fetchSession: () => Promise<EphemeralSession>;
}

type Status = "idle" | "connecting" | "live" | "stopped" | "error";

const SAMPLE_RATE = 24000;
const REALTIME_URL = "wss://api.openai.com/v1/realtime?model=gpt-4o-mini-transcribe";

function floatToPcm16Base64(input: Float32Array): string {
  const out = new Int16Array(input.length);
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]));
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  // Int16Array -> bytes -> binary string -> base64
  const bytes = new Uint8Array(out.buffer);
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

/**
 * Streams 24kHz PCM mic audio to the OpenAI Realtime API for live transcription.
 *
 * The browser connects directly to wss://api.openai.com using a short-lived
 * client_secret minted by our backend (`fetchSession`). Server-side VAD detects
 * utterance boundaries; we surface deltas (interim) and completed events
 * (final canonical text) via the `onDelta` / `onCompleted` callbacks.
 *
 * Acoustic analysis (pitch / volume) and webm chunking continue independently
 * via `useAudioRecorder`.
 */
export function useRealtimeTranscription(enabled: boolean, opts: Options) {
  const wsRef = useRef<WebSocket | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const nodeRef = useRef<AudioWorkletNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const optsRef = useRef(opts);
  optsRef.current = opts;

  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    setStatus("connecting");
    setError(null);

    (async () => {
      try {
        const session = await optsRef.current.fetchSession();
        if (cancelled) return;

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
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

        const AudioCtor = (window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext) as typeof AudioContext;
        const ctx = new AudioCtor({ sampleRate: SAMPLE_RATE });
        audioCtxRef.current = ctx;
        await ctx.audioWorklet.addModule("/pcm-worklet.js");
        if (cancelled) {
          ctx.close().catch(() => {});
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        const source = ctx.createMediaStreamSource(stream);
        sourceRef.current = source;
        const node = new AudioWorkletNode(ctx, "pcm-worklet", {
          numberOfInputs: 1,
          numberOfOutputs: 0,
          processorOptions: { sampleRate: ctx.sampleRate },
        });
        nodeRef.current = node;

        // GA Realtime API: subprotocols are `realtime` + `openai-insecure-api-key.<token>`.
        // Do NOT include `openai-beta.realtime-v1` — it forces beta mode and the GA
        // client_secret minted server-side will fail with api_version_mismatch.
        const ws = new WebSocket(REALTIME_URL, [
          "realtime",
          `openai-insecure-api-key.${session.client_secret}`,
        ]);
        wsRef.current = ws;

        ws.onopen = () => {
          if (cancelled) return;
          ws.send(
            JSON.stringify({
              type: "session.update",
              session: {
                type: "transcription",
                audio: {
                  input: {
                    format: { type: "audio/pcm", rate: SAMPLE_RATE },
                    transcription: {
                      model: "gpt-4o-mini-transcribe",
                      language: "ko",
                    },
                    turn_detection: {
                      type: "server_vad",
                      threshold: 0.5,
                      prefix_padding_ms: 300,
                      silence_duration_ms: 500,
                    },
                  },
                },
              },
            }),
          );
          setStatus("live");
          source.connect(node);
        };

        ws.onmessage = (ev) => {
          let evt: { type?: string; delta?: string; transcript?: string };
          try {
            evt = JSON.parse(ev.data);
          } catch {
            return;
          }
          if (!evt.type) return;
          if (evt.type === "conversation.item.input_audio_transcription.delta" && evt.delta) {
            optsRef.current.onDelta?.(evt.delta);
          } else if (
            evt.type === "conversation.item.input_audio_transcription.completed" &&
            evt.transcript
          ) {
            optsRef.current.onCompleted?.(evt.transcript);
          } else if (evt.type === "error") {
            console.error("[realtime] server error", evt);
          }
        };

        ws.onerror = (e) => {
          console.error("[realtime] ws error", e);
          setError("realtime connection error");
          setStatus("error");
        };

        ws.onclose = () => {
          if (!cancelled) setStatus("stopped");
        };

        node.port.onmessage = (ev) => {
          if (ws.readyState !== WebSocket.OPEN) return;
          const samples = ev.data as Float32Array;
          const audio = floatToPcm16Base64(samples);
          ws.send(JSON.stringify({ type: "input_audio_buffer.append", audio }));
        };
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error("[realtime] setup failed", e);
        setError(msg);
        setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
      try {
        nodeRef.current?.disconnect();
      } catch {}
      try {
        sourceRef.current?.disconnect();
      } catch {}
      try {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.close(1000, "client closed");
        }
      } catch {}
      try {
        audioCtxRef.current?.close().catch(() => {});
      } catch {}
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      audioCtxRef.current = null;
      nodeRef.current = null;
      sourceRef.current = null;
      wsRef.current = null;
    };
  }, [enabled]);

  return { status, error };
}
