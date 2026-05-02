"use client";

import { JudgeCard } from "@/components/judges/judge-card";
import { CoachMessage } from "@/components/pitch/coach-message";
import { LiveTranscript } from "@/components/pitch/live-transcript";
import { MetricsPanel } from "@/components/pitch/metrics-panel";
import { TrustScoreCard } from "@/components/pitch/trust-score-card";
import { WebcamCanvas } from "@/components/pitch/webcam-canvas";
import { useAudioLevel } from "@/hooks/use-audio-level";
import { type AudioChunkInfo, useAudioRecorder } from "@/hooks/use-audio-recorder";
import { useMediaPipe } from "@/hooks/use-mediapipe";
import { useRealtimeTranscription } from "@/hooks/use-realtime-transcription";
import { useTrustStore } from "@/hooks/use-trust-store";
import { BodySwayTracker } from "@/lib/analyzers/body-sway";
import { computeEyeContact } from "@/lib/analyzers/eye-contact";
import { GestureUsageTracker } from "@/lib/analyzers/gesture";
import { HeadStabilityTracker } from "@/lib/analyzers/head-stability";
import { SmileNaturalnessTracker } from "@/lib/analyzers/smile";
import { EMA } from "@/lib/analyzers/smoothing";
import {
  coachSnapshot,
  createRealtimeSession,
  fetchLiveReaction,
  finalizeSession,
  postTranscriptDelta,
  uploadAudioChunk,
  uploadVisualTick,
} from "@/lib/api-client";
import { DemoSimulator } from "@/lib/demo-simulator";
import { JUDGES } from "@/lib/judges/definitions";
import { evaluateAllJudges } from "@/lib/judges/trigger-engine";
import { computeAll } from "@/lib/score";
import { formatDuration } from "@/lib/utils";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

interface Props {
  sessionId: string;
  title: string;
  demoMode?: boolean;
}

const COUNTDOWN_S = 3;

const DEMO_COACH_LINES = [
  "메시지 흐름이 좋아요. 핵심 숫자를 또박또박 강조해주세요.",
  "지금 시선이 잠깐 흔들렸어요. 카메라 정면으로 다시 잡아보세요.",
  "추임새가 한 번 잡혔어요. 다음 문장 시작 전 1초만 멈춰보세요.",
  "톤이 안정됐습니다. 이대로 끝까지 유지해주세요.",
];

export function LiveSession({ sessionId, title, demoMode = false }: Props) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [phase, setPhase] = useState<"arming" | "countdown" | "live" | "paused" | "finalizing">(
    "arming",
  );
  const [count, setCount] = useState(COUNTDOWN_S);
  const [interim, setInterim] = useState("");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const lastTickRef = useRef<number>(0);
  const lastVisualUploadRef = useRef<number>(0);
  const lastCoachRef = useRef<number>(0);
  const lastReactionRef = useRef<Record<string, number>>({});

  const trust = useTrustStore();
  const { metrics, scores, reactions, transcript, coach, durationMs, isLive } = trust;

  const headTracker = useMemo(() => new HeadStabilityTracker(), []);
  const swayTracker = useMemo(() => new BodySwayTracker(), []);
  const gestureTracker = useMemo(() => new GestureUsageTracker(), []);
  const smileTracker = useMemo(() => new SmileNaturalnessTracker(), []);
  const eyeEMA = useMemo(() => new EMA(0.85), []);
  const simulator = useMemo(() => new DemoSimulator(), []);

  // Real-mode hooks (skipped in demo)
  const mp = useMediaPipe(videoRef, !demoMode && (phase === "live" || phase === "paused"));
  const audioLevel = useAudioLevel(!demoMode && phase === "live");

  // Camera + mic stream (real mode only)
  useEffect(() => {
    if (demoMode) {
      // Skip camera entirely. Start countdown after a beat.
      const t = window.setTimeout(() => setPhase("countdown"), 600);
      return () => window.clearTimeout(t);
    }
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480 },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setTimeout(() => setPhase("countdown"), 800);
      } catch {
        setCameraError("카메라 권한이 거부되었습니다. 데모 모드로 전환합니다.");
        toast.error("카메라 권한이 거부되었습니다. 데모 모드로 전환합니다.");
        setTimeout(() => {
          router.replace(`/pitch/${sessionId}/live?title=${encodeURIComponent(title)}&demo=1`);
        }, 1200);
      }
    })();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [demoMode, router, sessionId, title]);

  // countdown -> live
  useEffect(() => {
    if (phase !== "countdown") return;
    if (count <= 0) {
      trust.setSession(sessionId);
      trust.start();
      simulator.reset();
      setPhase("live");
      return;
    }
    const t = window.setTimeout(() => setCount((c) => c - 1), 700);
    return () => window.clearTimeout(t);
  }, [phase, count, sessionId, trust, simulator]);

  // duration ticker
  useEffect(() => {
    if (phase !== "live") return;
    const id = window.setInterval(() => trust.tick(performance.now()), 100);
    return () => window.clearInterval(id);
  }, [phase, trust]);

  // === DEMO MODE LOOP ===
  useEffect(() => {
    if (!demoMode || phase !== "live") return;
    const id = window.setInterval(() => {
      const t = simulator.tick();
      const m = t.metrics;
      trust.updateMetrics(m);
      const all = computeAll({
        eye_contact_ratio: m.eye_contact_ratio,
        head_stability: m.head_stability,
        body_sway: m.body_sway,
        gesture_usage: m.gesture_usage,
        filler_count_per_min: m.filler_count_per_min,
        pace_cpm: m.pace_cpm,
        pitch_stability: m.pitch_stability,
        volume_consistency: m.volume_consistency,
        core_message_clarity: 70,
        argument_evidence_balance: 65,
        empty_phrases_count: 0,
      });
      trust.updateScores(all);
      trust.pushTimeline({
        ts_ms: t.ts_ms,
        trust: all.trust,
        visual: all.visual,
        audio: all.audio,
        metrics: m,
      });
      if (t.transcript_addition) trust.appendTranscript(t.transcript_addition);
      if (t.filler_event) {
        trust.pushFillerEvents([{ word: t.filler_event.word, ts_ms: Math.round(t.ts_ms) }]);
      }

      // judge evaluation w/ debounce
      const evals = evaluateAllJudges({
        eye_contact_ratio: m.eye_contact_ratio,
        body_sway: m.body_sway,
        smile_naturalness: m.smile_naturalness,
        filler_count_per_min: m.filler_count_per_min,
        pitch_stability: m.pitch_stability,
        pace_cpm: m.pace_cpm,
        empty_phrases_count: 0,
        core_message_clarity: 70,
        argument_evidence_balance: 65,
      });
      const now = performance.now();
      for (const ev of evals) {
        const last = lastReactionRef.current[ev.judgeId] ?? 0;
        if (now - last < 1500) continue;
        const prev = trust.reactions[ev.judgeId];
        if (prev?.expression === ev.expression && prev?.comment === ev.comment) continue;
        lastReactionRef.current[ev.judgeId] = now;
        trust.setReaction({
          judge_id: ev.judgeId,
          expression: ev.expression,
          comment: ev.comment,
          ts_ms: t.ts_ms,
          trigger_metric: ev.trigger?.metric,
          trigger_value: ev.trigger?.value,
        });
      }

      // periodic demo coach line
      if (now - lastCoachRef.current > 8000 && Math.random() < 0.4) {
        lastCoachRef.current = now;
        const line = DEMO_COACH_LINES[Math.floor(Math.random() * DEMO_COACH_LINES.length)];
        trust.setCoach({ text: line, ts_ms: t.ts_ms });
      }

      // auto-end at 60s for demo
      if (t.ts_ms > 62_000) {
        endSession();
      }
    }, 200);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demoMode, phase]);

  // === REAL MODE — visual analysis loop ===
  useEffect(() => {
    if (demoMode || phase !== "live") return;
    const frame = mp.frame;
    if (!frame) return;
    const now = performance.now();
    headTracker.push(frame.face);
    swayTracker.push(frame.pose);
    gestureTracker.push(frame.pose);
    smileTracker.push(frame.face);
    const eyeRaw = computeEyeContact(frame.face);
    const eye = eyeEMA.push(eyeRaw);
    const head = headTracker.score();
    const sway = swayTracker.swayValue();
    const gesture = gestureTracker.score();
    const smile = smileTracker.score();

    if (now - lastTickRef.current > 200) {
      trust.updateMetrics({
        eye_contact_ratio: eye,
        head_stability: head,
        body_sway: sway,
        gesture_usage: gesture,
        smile_naturalness: smile,
      });
      const all = computeAll({
        eye_contact_ratio: eye,
        head_stability: head,
        body_sway: sway,
        gesture_usage: gesture,
        filler_count_per_min: trust.metrics.filler_count_per_min,
        pace_cpm: trust.metrics.pace_cpm,
        pitch_stability: trust.metrics.pitch_stability,
        volume_consistency: trust.metrics.volume_consistency,
        core_message_clarity: 65,
        argument_evidence_balance: 60,
        empty_phrases_count: 0,
      });
      trust.updateScores(all);
      trust.pushTimeline({
        ts_ms: durationMs,
        trust: all.trust,
        visual: all.visual,
        audio: all.audio,
        metrics: {
          eye_contact_ratio: eye,
          head_stability: head,
          body_sway: sway,
          gesture_usage: gesture,
          smile_naturalness: smile,
          filler_count_per_min: trust.metrics.filler_count_per_min,
          pace_cpm: trust.metrics.pace_cpm,
          pitch_stability: trust.metrics.pitch_stability,
        },
      });

      const evals = evaluateAllJudges({
        eye_contact_ratio: eye,
        body_sway: sway,
        smile_naturalness: smile,
        filler_count_per_min: trust.metrics.filler_count_per_min,
        pitch_stability: trust.metrics.pitch_stability,
        pace_cpm: trust.metrics.pace_cpm,
        empty_phrases_count: 0,
        core_message_clarity: 65,
        argument_evidence_balance: 60,
      });
      for (const ev of evals) {
        const last = lastReactionRef.current[ev.judgeId] ?? 0;
        if (now - last < 1500) continue;
        const prev = trust.reactions[ev.judgeId];
        if (prev?.expression === ev.expression && prev?.comment === ev.comment) continue;
        lastReactionRef.current[ev.judgeId] = now;
        trust.setReaction({
          judge_id: ev.judgeId,
          expression: ev.expression,
          comment: ev.comment,
          ts_ms: durationMs,
          trigger_metric: ev.trigger?.metric,
          trigger_value: ev.trigger?.value,
        });
      }
      lastTickRef.current = now;
    }

    if (now - lastVisualUploadRef.current > 1000) {
      lastVisualUploadRef.current = now;
      uploadVisualTick(sessionId, {
        ts_ms: Math.round(durationMs),
        eye_contact_ratio: eye,
        head_stability: head,
        body_sway: sway,
        gesture_usage: gesture,
        smile_naturalness: smile,
      }).catch(() => {});
    }
  }, [
    demoMode,
    phase,
    mp.frameVersion,
    headTracker,
    swayTracker,
    gestureTracker,
    smileTracker,
    eyeEMA,
    sessionId,
    durationMs,
    trust,
    mp.frame,
  ]);

  const onAudioChunk = useCallback(
    async (blob: Blob, info: AudioChunkInfo) => {
      try {
        const res = await uploadAudioChunk(sessionId, blob, info.index, info.startMs);
        // Transcription now flows through useRealtimeTranscription / transcript-delta.
        // audio-chunk only carries acoustic (pitch/volume) metrics now.
        trust.updateMetrics({
          pitch_stability: res.pitch_stability,
          volume_consistency: res.volume_consistency,
        });
      } catch {
        // backend not available — silently degrade
      }
    },
    [sessionId, trust],
  );

  useAudioRecorder(!demoMode && phase === "live", onAudioChunk);

  // OpenAI Realtime transcription — interim deltas (gray) + completed
  // utterances (white, canonical). Backend filler / pace / judge analysis
  // runs on each completed utterance via /transcript-delta.
  const interimBufferRef = useRef("");
  useRealtimeTranscription(!demoMode && phase === "live", {
    fetchSession: createRealtimeSession,
    onDelta: (delta) => {
      interimBufferRef.current += delta;
      setInterim(interimBufferRef.current);
    },
    onCompleted: (text) => {
      interimBufferRef.current = "";
      setInterim("");
      const clean = text.trim();
      if (!clean) return;
      trust.appendTranscript(clean);
      postTranscriptDelta(sessionId, clean, Math.round(durationMs), true)
        .then((res) => {
          if (res.filler_words_found?.length) {
            trust.pushFillerEvents(res.filler_words_found);
          }
          trust.updateMetrics({
            pace_cpm: res.pace_cpm,
            filler_count_per_min: res.filler_count_per_min,
          });
        })
        .catch(() => {
          // backend transcript-delta down — interim/final still rendered
        });
    },
  });

  // 6s rotating LLM judge comment — overrides hardcoded trigger comment.
  // Only in real mode; demo mode uses local rotation prompts.
  useEffect(() => {
    if (demoMode || phase !== "live") return;
    const judgeOrder: Array<"judge-fact" | "judge-connect" | "judge-critical"> = [
      "judge-fact",
      "judge-connect",
      "judge-critical",
    ];
    let idx = 0;
    const id = window.setInterval(async () => {
      const judgeId = judgeOrder[idx % judgeOrder.length];
      idx += 1;
      try {
        const r = await fetchLiveReaction(
          sessionId,
          judgeId,
          {
            eye_contact_ratio: trust.metrics.eye_contact_ratio,
            head_stability: trust.metrics.head_stability,
            body_sway: trust.metrics.body_sway,
            gesture_usage: trust.metrics.gesture_usage,
            filler_count_per_min: trust.metrics.filler_count_per_min,
            pitch_stability: trust.metrics.pitch_stability,
            pace_cpm: trust.metrics.pace_cpm,
            trust_score: trust.scores.trust,
          },
          trust.transcript.slice(-1500),
        );
        const prev = trust.reactions[judgeId];
        trust.setReaction({
          judge_id: judgeId,
          expression: prev?.expression ?? "neutral",
          comment: r.comment,
          ts_ms: durationMs,
        });
      } catch {
        // backend down — keep hardcoded trigger comment
      }
    }, 6500);
    return () => window.clearInterval(id);
  }, [demoMode, phase, sessionId, trust, durationMs]);

  // 10s coach (real mode)
  useEffect(() => {
    if (demoMode || phase !== "live") return;
    const id = window.setInterval(async () => {
      const now = performance.now();
      if (now - lastCoachRef.current < 10_000) return;
      lastCoachRef.current = now;
      try {
        const v = videoRef.current;
        if (!v) return;
        const cnv = document.createElement("canvas");
        cnv.width = 320;
        cnv.height = 240;
        const ctx = cnv.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(v, 0, 0, cnv.width, cnv.height);
        const blob = await new Promise<Blob | null>((res) => cnv.toBlob(res, "image/jpeg", 0.7));
        if (!blob) return;
        const r = await coachSnapshot(sessionId, blob, {
          eye_contact_ratio: trust.metrics.eye_contact_ratio,
          body_sway: trust.metrics.body_sway,
          gesture_usage: trust.metrics.gesture_usage,
          filler_count_per_min: trust.metrics.filler_count_per_min,
          pitch_stability: trust.metrics.pitch_stability,
          pace_cpm: trust.metrics.pace_cpm,
          trust_score: trust.scores.trust,
        });
        trust.setCoach({ text: r.coaching, ts_ms: durationMs });
      } catch {
        // ignore
      }
    }, 2000);
    return () => window.clearInterval(id);
  }, [demoMode, phase, sessionId, trust, durationMs]);

  async function endSession() {
    setPhase("finalizing");
    trust.beginFinalize();
    trust.stop();
    if (!demoMode) {
      try {
        await finalizeSession(sessionId, transcript, Math.round(durationMs / 1000));
      } catch {
        // backend가 없으면 로컬 모드 — 점수만 저장
      }
    } else {
      // give the finalize overlay a moment to play
      await new Promise((r) => setTimeout(r, 2600));
    }
    trust.endFinalize();
    router.push(`/pitch/${sessionId}/report${demoMode ? "?demo=1" : ""}`);
  }

  function pause() {
    setPhase("paused");
    trust.stop();
  }
  function resume() {
    setPhase("live");
    trust.start();
  }

  // gaze 1축 동기화 — 시선이 떨어졌을 때 judge eyes도 같은 방향으로
  const gazeX = useMemo(() => {
    const e = trust.metrics.eye_contact_ratio;
    if (e >= 70) return 0;
    return ((70 - e) / 70) * 0.6 - 0.3;
  }, [trust.metrics.eye_contact_ratio]);

  // ambient bar — real mode면 mic level, demo면 sin wave
  const [demoLevel, setDemoLevel] = useState(0.5);
  useEffect(() => {
    if (!demoMode || phase !== "live") return;
    const id = window.setInterval(() => {
      setDemoLevel(0.4 + Math.random() * 0.6);
    }, 220);
    return () => window.clearInterval(id);
  }, [demoMode, phase]);
  const ambient = demoMode ? demoLevel : audioLevel;

  return (
    <main className="relative h-dvh overflow-hidden bg-black text-white">
      {/* topbar */}
      <header className="absolute inset-x-0 top-0 z-20 flex h-12 items-center justify-between border-b border-white/8 bg-black/85 backdrop-blur-md px-5">
        <div className="flex min-w-0 items-center gap-4">
          <Link
            href="/dashboard"
            className="font-mono text-[11px] uppercase tracking-[0.32em] text-white/55 transition-colors hover:text-white"
          >
            ←
          </Link>
          <span className="hidden font-mono text-[10px] uppercase tracking-[0.32em] text-white/40 sm:inline">
            Session
          </span>
          <span className="truncate text-[13.5px] font-medium">{title}</span>
          {demoMode ? (
            <span className="hidden font-mono text-[10px] uppercase tracking-[0.32em] text-white/55 sm:inline">
              · Demo
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-5">
          {phase === "live" || phase === "paused" ? (
            <span className="flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.32em]">
              <span className="rec-dot inline-block h-1.5 w-1.5 rounded-full bg-white" />
              <span className="text-white">REC</span>
              <span className="ml-1 tabular-nums text-white/55">
                {formatDuration(durationMs / 1000)}
              </span>
            </span>
          ) : null}
          <span className="font-mono text-[10px] uppercase tracking-[0.32em] text-white/45">
            {phase}
          </span>
        </div>
      </header>

      {/* main grid (mobile: scrollable column, desktop: 2-col) */}
      <div className="absolute inset-x-0 top-12 bottom-0 overflow-y-auto lg:overflow-hidden lg:grid lg:grid-cols-[1fr_400px]">
        {/* left */}
        <section className="relative flex flex-col gap-3 p-5 lg:overflow-hidden">
          <div className="relative aspect-video lg:aspect-auto lg:flex-1 lg:min-h-0">
            <div className="relative h-full w-full overflow-hidden rounded-2xl border border-white/12">
              {!demoMode ? (
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  className="h-full w-full -scale-x-100 object-cover"
                />
              ) : (
                <DemoCanvas />
              )}
              {!demoMode && (
                <WebcamCanvas
                  videoRef={videoRef}
                  face={mp.frame?.face ?? null}
                  pose={mp.frame?.pose ?? null}
                  trustColor="rgba(255,255,255,0.65)"
                />
              )}
              {phase === "countdown" && <CountdownOverlay count={count} />}
              {phase === "arming" && (
                <ArmingOverlay
                  ready={demoMode || mp.ready}
                  demoMode={demoMode}
                  cameraError={cameraError}
                />
              )}
              {/* trust corner readout */}
              <div className="absolute right-3 top-3 rounded-full border border-white/12 bg-black/70 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.32em] text-white/75 backdrop-blur-md">
                Trust {Math.round(scores.trust)}/100
              </div>
            </div>
          </div>
          <LiveTranscript finalText={transcript} interimText={interim} />
          <CoachMessage message={coach?.text ?? null} />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.32em] text-white/45">
              <Activity active={isLive} /> Analyzing
              {demoMode ? <span className="text-white/65">· Simulated</span> : null}
            </div>
            <div className="flex items-center gap-3">
              {phase === "live" ? (
                <button
                  type="button"
                  onClick={pause}
                  className="font-mono text-[10.5px] uppercase tracking-[0.32em] text-white/55 transition-colors hover:text-white"
                >
                  Pause
                </button>
              ) : phase === "paused" ? (
                <button
                  type="button"
                  onClick={resume}
                  className="font-mono text-[10.5px] uppercase tracking-[0.32em] text-white/55 transition-colors hover:text-white"
                >
                  Resume
                </button>
              ) : null}
              <button
                type="button"
                onClick={endSession}
                className="group inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-1.5 text-[12px] font-semibold text-black transition-transform hover:scale-[1.04]"
              >
                발표 종료
                <span className="transition-transform group-hover:translate-x-0.5">→</span>
              </button>
            </div>
          </div>
        </section>

        {/* right */}
        <aside className="flex flex-col gap-3 border-t border-white/8 p-5 lg:border-l lg:border-t-0 lg:overflow-y-auto">
          <div className="flex flex-col gap-2">
            {JUDGES.map((j) => {
              const r = reactions[j.id];
              return (
                <JudgeCard
                  key={j.id}
                  judge={j}
                  expression={r?.expression ?? j.defaultExpression}
                  comment={r?.comment ?? null}
                  gazeX={gazeX}
                />
              );
            })}
          </div>
          <TrustScoreCard trust={scores.trust} />
          <div className="grid grid-cols-3 gap-2">
            <MiniScore label="시각" value={scores.visual} live />
            <MiniScore label="음성" value={scores.audio} live />
            <MiniScore label="논리" value={null} hint="발표 종료 후" />
          </div>
          <MetricsPanel
            rows={[
              { label: "아이컨택", value: metrics.eye_contact_ratio },
              { label: "머리 안정", value: metrics.head_stability },
              {
                label: "어깨 흔들림",
                value: 100 - Math.min(metrics.body_sway, 100),
              },
              { label: "제스처", value: metrics.gesture_usage },
              {
                label: "필러/분",
                value: metrics.filler_count_per_min,
                inverse: true,
                unit: "회",
              },
              { label: "피치 안정", value: metrics.pitch_stability },
            ]}
          />
        </aside>
      </div>

      {/* ambient strip */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[2px] origin-center">
        <motion.div
          className="h-full w-full"
          animate={{ scaleX: 0.55 + ambient * 0.45, opacity: 0.45 + ambient * 0.4 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          style={{
            background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.85), transparent)",
          }}
        />
      </div>

      {/* finalizing overlay */}
      <AnimatePresence>{phase === "finalizing" && <FinalizingOverlay />}</AnimatePresence>
    </main>
  );
}

function CountdownOverlay({ count }: { count: number }) {
  return (
    <div className="absolute inset-0 grid place-items-center bg-black/85 backdrop-blur-sm">
      <div className="flex flex-col items-center">
        <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-white/45">
          Arming
        </span>
        <motion.span
          key={count}
          initial={{ scale: 1.2, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.92, opacity: 0 }}
          className="font-mono text-[140px] font-medium leading-none tabular-nums text-white"
        >
          {count > 0 ? count : "GO"}
        </motion.span>
      </div>
    </div>
  );
}

function ArmingOverlay({
  ready,
  demoMode,
  cameraError,
}: {
  ready: boolean;
  demoMode: boolean;
  cameraError: string | null;
}) {
  return (
    <div className="absolute inset-0 grid place-items-center bg-black/85">
      <div className="flex flex-col items-center gap-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-white/55">
          {cameraError
            ? "Switching to demo mode..."
            : demoMode
              ? "Demo simulator initializing..."
              : ready
                ? "Ready"
                : "Loading MediaPipe..."}
        </span>
        {!ready && !demoMode && !cameraError ? (
          <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="block h-1 w-1 rounded-full bg-white"
                animate={{ opacity: [0.25, 1, 0.25] }}
                transition={{
                  duration: 1.2,
                  repeat: Number.POSITIVE_INFINITY,
                  delay: i * 0.15,
                }}
              />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function DemoCanvas() {
  return (
    <div className="relative h-full w-full overflow-hidden bg-[#0a0a0c]">
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 50% 60% at 50% 60%, rgba(255,255,255,0.08), transparent 70%)",
        }}
      />
      <svg
        viewBox="0 0 400 300"
        className="absolute inset-0 h-full w-full"
        preserveAspectRatio="xMidYMid meet"
      >
        <ellipse cx="200" cy="125" rx="44" ry="52" fill="rgba(255,255,255,0.04)" />
        <path d="M120 300 Q120 200 200 200 Q280 200 280 300 Z" fill="rgba(255,255,255,0.04)" />
        <ellipse cx="186" cy="120" rx="3" ry="3" fill="rgba(255,255,255,0.85)" />
        <ellipse cx="214" cy="120" rx="3" ry="3" fill="rgba(255,255,255,0.85)" />
        {Array.from({ length: 60 }).map((_, i) => {
          const angle = (i / 60) * Math.PI * 2;
          const r = 38 + (i % 5) * 4;
          const x = Math.round((200 + Math.cos(angle) * r) * 100) / 100;
          const y = Math.round((125 + Math.sin(angle) * r * 1.05) * 100) / 100;
          return <circle key={i} cx={x} cy={y} r="0.7" fill="rgba(255,255,255,0.55)" />;
        })}
      </svg>
      <div className="absolute bottom-3 left-3 rounded-full border border-white/12 bg-black/70 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.32em] text-white/55 backdrop-blur-md">
        Synthetic input · Demo
      </div>
    </div>
  );
}

function MiniScore({
  label,
  value,
  live,
  hint,
}: {
  label: string;
  value: number | null;
  live?: boolean;
  hint?: string;
}) {
  const isPending = value === null;
  const isLow = !isPending && (value as number) < 45;
  return (
    <div className="rounded-2xl border border-white/8 bg-black px-4 py-3">
      <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.32em] text-white/45">
        <span>{label}</span>
        {live ? <span className="text-white/35">live</span> : null}
      </div>
      {isPending ? (
        <div className="mt-1 flex flex-col gap-0.5">
          <span className="font-mono text-[24px] font-medium tabular-nums text-white/30">—</span>
          {hint ? (
            <span className="font-mono text-[9px] uppercase tracking-[0.28em] text-white/35">
              {hint}
            </span>
          ) : null}
        </div>
      ) : (
        <div
          className={`mt-1 font-mono text-[24px] font-medium tabular-nums ${isLow ? "text-white/55" : "text-white"}`}
        >
          {Math.round(value as number)}
        </div>
      )}
    </div>
  );
}

function Activity({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-block h-1 w-1 rounded-full ${active ? "rec-dot bg-white" : "bg-white/30"}`}
    />
  );
}

function FinalizingOverlay() {
  const stages = ["전사 분석 중", "심사위원 평가 중", "신뢰 점수 산출", "액션 아이템 정리"];
  const [stageIdx, setStageIdx] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setStageIdx((s) => (s + 1) % stages.length), 2200);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-30 grid place-items-center bg-black/95 backdrop-blur-md"
    >
      <div className="flex w-full max-w-[480px] flex-col items-center gap-7 px-6 text-center">
        <div className="font-mono text-[10.5px] uppercase tracking-[0.4em] text-white/45">
          Final report
        </div>
        <h2
          className="text-balance font-medium leading-[1.1]"
          style={{ fontSize: "clamp(28px, 3.2vw, 40px)", letterSpacing: "-0.02em" }}
        >
          심사위원 셋이
          <br />
          종합 평가를 작성하고 있습니다.
        </h2>
        <div className="h-7 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.span
              key={stages[stageIdx]}
              initial={{ y: 14, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -14, opacity: 0 }}
              transition={{ duration: 0.35 }}
              className="block font-mono text-[12px] uppercase tracking-[0.32em] text-white/65"
            >
              {stages[stageIdx]}
            </motion.span>
          </AnimatePresence>
        </div>
        <div className="flex items-center gap-2.5">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="block h-1 w-1 rounded-full bg-white"
              animate={{ opacity: [0.2, 1, 0.2] }}
              transition={{
                duration: 1.4,
                repeat: Number.POSITIVE_INFINITY,
                delay: i * 0.18,
              }}
            />
          ))}
        </div>
        <p className="max-w-[360px] text-[12.5px] leading-[1.6] text-white/45">
          GPT-4o-mini 가 발표 전사·메타 지표·사전 컨텍스트를 모두 보고 있습니다. 5-10초 소요됩니다.
        </p>
      </div>
    </motion.div>
  );
}
