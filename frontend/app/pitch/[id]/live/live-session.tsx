"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useMediaPipe } from "@/hooks/use-mediapipe";
import { useAudioRecorder, type AudioChunkInfo } from "@/hooks/use-audio-recorder";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import { useTrustStore } from "@/hooks/use-trust-store";
import { computeEyeContact } from "@/lib/analyzers/eye-contact";
import { HeadStabilityTracker } from "@/lib/analyzers/head-stability";
import { BodySwayTracker } from "@/lib/analyzers/body-sway";
import { GestureUsageTracker } from "@/lib/analyzers/gesture";
import { SmileNaturalnessTracker } from "@/lib/analyzers/smile";
import { EMA } from "@/lib/analyzers/smoothing";
import { computeAll } from "@/lib/score";
import { JUDGES } from "@/lib/judges/definitions";
import { evaluateAllJudges } from "@/lib/judges/trigger-engine";
import {
  uploadAudioChunk,
  uploadVisualTick,
  coachSnapshot,
  finalizeSession,
} from "@/lib/api-client";
import { WebcamCanvas } from "@/components/pitch/webcam-canvas";
import { TrustScoreCard } from "@/components/pitch/trust-score-card";
import { MetricsPanel } from "@/components/pitch/metrics-panel";
import { CoachMessage } from "@/components/pitch/coach-message";
import { LiveTranscript } from "@/components/pitch/live-transcript";
import { JudgeCard } from "@/components/judges/judge-card";
import { formatDuration, trustColor } from "@/lib/utils";
import { Square, Pause, Play } from "lucide-react";

interface Props {
  sessionId: string;
  title: string;
}

const COUNTDOWN_S = 3;

export function LiveSession({ sessionId, title }: Props) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [phase, setPhase] = useState<
    "arming" | "countdown" | "live" | "paused" | "finalizing"
  >("arming");
  const [count, setCount] = useState(COUNTDOWN_S);
  const [interim, setInterim] = useState("");
  const lastTickRef = useRef<number>(0);
  const lastVisualUploadRef = useRef<number>(0);
  const lastCoachRef = useRef<number>(0);
  const lastReactionRef = useRef<Record<string, number>>({});

  const trust = useTrustStore();
  const { metrics, scores, reactions, transcript, coach, durationMs, isLive } =
    trust;

  const headTracker = useMemo(() => new HeadStabilityTracker(), []);
  const swayTracker = useMemo(() => new BodySwayTracker(), []);
  const gestureTracker = useMemo(() => new GestureUsageTracker(), []);
  const smileTracker = useMemo(() => new SmileNaturalnessTracker(), []);
  const eyeEMA = useMemo(() => new EMA(0.85), []);

  // mediapipe (only after countdown)
  const mp = useMediaPipe(videoRef, phase === "live" || phase === "paused");

  // 카메라 + 마이크 stream
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480 },
          audio: false, // 오디오는 use-audio-recorder가 따로 잡음
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
        // 1초 후 countdown 시작
        setTimeout(() => setPhase("countdown"), 800);
      } catch (e) {
        toast.error("카메라 권한이 거부되었습니다.");
        router.replace("/pitch/new");
      }
    })();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [router]);

  // countdown
  useEffect(() => {
    if (phase !== "countdown") return;
    if (count <= 0) {
      trust.setSession(sessionId);
      trust.start();
      setPhase("live");
      return;
    }
    const t = window.setTimeout(() => setCount((c) => c - 1), 700);
    return () => window.clearTimeout(t);
  }, [phase, count, sessionId, trust]);

  // duration ticker
  useEffect(() => {
    if (phase !== "live") return;
    const id = window.setInterval(() => trust.tick(performance.now()), 100);
    return () => window.clearInterval(id);
  }, [phase, trust]);

  // visual analysis loop — runs every animation frame the mp frame updates
  useEffect(() => {
    if (phase !== "live") return;
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

      // judge eval (debounced 1.5s per judge)
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
        if (
          prev?.expression === ev.expression &&
          prev?.comment === ev.comment
        )
          continue;
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

    // upload visual tick to backend every 1s
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

  // audio chunk handler
  const onAudioChunk = useCallback(
    async (blob: Blob, info: AudioChunkInfo) => {
      try {
        const res = await uploadAudioChunk(
          sessionId,
          blob,
          info.index,
          info.startMs
        );
        if (res.transcript_partial) {
          trust.appendTranscript(res.transcript_partial);
        }
        if (res.filler_words_found?.length) {
          trust.pushFillerEvents(res.filler_words_found);
          // recompute filler-per-min
          const totalMin = Math.max(durationMs / 60000, 1 / 60);
          const fillerPerMin =
            (trust.filler_total + res.filler_words_found.length) / totalMin;
          trust.updateMetrics({
            filler_count_per_min: fillerPerMin,
            pace_cpm: res.pace_cpm,
            pitch_stability: res.pitch_stability,
            volume_consistency: res.volume_consistency,
          });
        } else if (res.pace_cpm) {
          trust.updateMetrics({
            pace_cpm: res.pace_cpm,
            pitch_stability: res.pitch_stability,
            volume_consistency: res.volume_consistency,
          });
        }
      } catch {
        // backend not available — silently degrade
      }
    },
    [sessionId, trust, durationMs]
  );

  useAudioRecorder(phase === "live", onAudioChunk);

  useSpeechRecognition(phase === "live", {
    onInterim: setInterim,
    onFinal: (t) => {
      setInterim("");
      // 보조 자막은 백엔드 transcript와 별도로 보여주지만, fallback이 더 빠를 수 있어 append
      // 백엔드가 있으면 중복 가능 — 단순 표시 용도이므로 OK
      trust.appendTranscript(t);
    },
  });

  // 10s coach
  useEffect(() => {
    if (phase !== "live") return;
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
        const blob = await new Promise<Blob | null>((res) =>
          cnv.toBlob(res, "image/jpeg", 0.7)
        );
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
  }, [phase, sessionId, trust, durationMs]);

  async function endSession() {
    setPhase("finalizing");
    trust.beginFinalize();
    trust.stop();
    try {
      await finalizeSession(
        sessionId,
        transcript,
        Math.round(durationMs / 1000)
      );
    } catch {
      // backend가 없으면 로컬 모드 — 점수만 저장
    }
    trust.endFinalize();
    router.push(`/pitch/${sessionId}/report`);
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

  return (
    <main className="relative h-dvh overflow-hidden bg-background text-foreground">
      {/* topbar */}
      <header className="absolute inset-x-0 top-0 z-20 flex h-12 items-center justify-between border-b border-border-faint bg-background/80 backdrop-blur-md px-4">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="font-mono text-xs text-muted-foreground hover:text-foreground">
            ←
          </Link>
          <span className="font-mono text-xs text-subtle-foreground">
            세션
          </span>
          <span className="text-sm font-medium">{title}</span>
        </div>
        <div className="flex items-center gap-3">
          {phase === "live" || phase === "paused" ? (
            <span className="flex items-center gap-1.5 text-xs font-mono">
              <span className="rec-dot inline-block h-1.5 w-1.5 rounded-full bg-trust-low" />
              REC
              <span className="text-muted-foreground tabular-nums ml-1">
                {formatDuration(durationMs / 1000)}
              </span>
            </span>
          ) : null}
          <Badge variant="outline">{phase.toUpperCase()}</Badge>
        </div>
      </header>

      {/* main grid */}
      <div className="absolute inset-0 mt-12 grid grid-cols-1 lg:grid-cols-[1fr_400px]">
        {/* left */}
        <section className="relative flex flex-col gap-3 overflow-hidden p-4">
          <div className="relative flex-1 min-h-0">
            <div
              className="relative h-full w-full overflow-hidden rounded-md border-2"
              style={{
                borderColor: trustColor(scores.trust),
                transition: "border-color 250ms ease-out",
              }}
            >
              <video
                ref={videoRef}
                playsInline
                muted
                className="h-full w-full object-cover -scale-x-100"
              />
              <WebcamCanvas
                videoRef={videoRef}
                face={mp.frame?.face ?? null}
                pose={mp.frame?.pose ?? null}
                trustColor={trustColor(scores.trust)}
              />
              {phase === "countdown" && (
                <CountdownOverlay count={count} />
              )}
              {phase === "arming" && (
                <ArmingOverlay ready={mp.ready} />
              )}
            </div>
          </div>
          <LiveTranscript finalText={transcript} interimText={interim} />
          <CoachMessage message={coach?.text ?? null} />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
              <Activity active={isLive} /> 분석 활성
            </div>
            <div className="flex items-center gap-2">
              {phase === "live" ? (
                <Button variant="ghost" size="sm" onClick={pause}>
                  <Pause className="size-3.5" /> 일시정지
                </Button>
              ) : phase === "paused" ? (
                <Button variant="ghost" size="sm" onClick={resume}>
                  <Play className="size-3.5" /> 재개
                </Button>
              ) : null}
              <Button variant="destructive" size="sm" onClick={endSession}>
                <Square className="size-3.5" /> 발표 종료
              </Button>
            </div>
          </div>
        </section>

        {/* right */}
        <aside className="border-t lg:border-t-0 lg:border-l border-border-faint flex flex-col gap-3 overflow-y-auto p-4">
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
          <div className="border-t border-border-faint pt-3">
            <TrustScoreCard trust={scores.trust} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <MiniScore label="시각" value={scores.visual} />
            <MiniScore label="음성" value={scores.audio} />
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
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[2px] bg-primary/40 ambient-wave origin-center" />

      {/* finalizing overlay */}
      <AnimatePresence>
        {phase === "finalizing" && <FinalizingOverlay />}
      </AnimatePresence>
    </main>
  );
}

function CountdownOverlay({ count }: { count: number }) {
  return (
    <div className="absolute inset-0 grid place-items-center bg-background/85 backdrop-blur-sm">
      <div className="flex flex-col items-center">
        <span className="font-mono text-xs uppercase tracking-[0.4em] text-muted-foreground">
          ARMING
        </span>
        <span className="font-mono text-[140px] leading-none font-semibold tabular-nums text-primary">
          {count > 0 ? count : "GO"}
        </span>
      </div>
    </div>
  );
}

function ArmingOverlay({ ready }: { ready: boolean }) {
  return (
    <div className="absolute inset-0 grid place-items-center bg-background/85">
      <div className="flex flex-col items-center gap-2">
        <span className="font-mono text-xs uppercase tracking-[0.4em] text-muted-foreground">
          {ready ? "Ready" : "Loading MediaPipe..."}
        </span>
      </div>
    </div>
  );
}

function MiniScore({ label, value }: { label: string; value: number }) {
  const c = trustColor(value);
  return (
    <div className="rounded-sm border border-border-faint bg-surface-1 px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
        {label}
      </div>
      <div
        className="font-mono text-2xl font-semibold tabular-nums"
        style={{ color: c }}
      >
        {Math.round(value)}
      </div>
    </div>
  );
}

function Activity({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-block h-1.5 w-1.5 rounded-full ${active ? "rec-dot bg-trust-high" : "bg-subtle-foreground"}`}
    />
  );
}

function FinalizingOverlay() {
  const lines = [
    "analyzing transcript...",
    "evaluating judges...",
    "balancing trust score...",
    "drafting action items...",
  ];
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const id = window.setInterval(
      () => setShown((s) => Math.min(s + 1, lines.length)),
      650
    );
    return () => window.clearInterval(id);
  }, []);
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-30 grid place-items-center bg-background/95 backdrop-blur-md"
    >
      <div className="rounded-md border border-border-faint bg-surface-1 px-6 py-5 font-mono text-xs">
        <div className="text-primary mb-3 uppercase tracking-wider">
          [trust-engine] finalize
        </div>
        {lines.slice(0, shown).map((l, i) => (
          <div
            key={i}
            className="flex items-center gap-2 text-muted-foreground"
          >
            <span className="text-trust-high">›</span> {l}{" "}
            {i < shown - 1 ? (
              <span className="text-trust-high">[done]</span>
            ) : (
              <span className="ml-1 inline-block h-3 w-1.5 bg-primary animate-pulse" />
            )}
          </div>
        ))}
      </div>
    </motion.div>
  );
}
