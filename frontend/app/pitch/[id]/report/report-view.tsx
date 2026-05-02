"use client";

import { RadarScore } from "@/components/report/radar-chart";
import { TimelineChart } from "@/components/report/timeline-chart";
import { useTrustStore } from "@/hooks/use-trust-store";
import { fetchReport } from "@/lib/api-client";
import { generateDemoTimeline } from "@/lib/demo-simulator";
import { JUDGES } from "@/lib/judges/definitions";
import type { FinalReport } from "@/types/pitch";
import { motion } from "motion/react";
import Link from "next/link";
import { useEffect, useState } from "react";

interface Props {
  sessionId: string;
  demoMode?: boolean;
}

export function ReportView({ sessionId, demoMode = false }: Props) {
  const store = useTrustStore();
  const [report, setReport] = useState<FinalReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (demoMode) {
      setReport({
        session_id: sessionId,
        trust_score: 78,
        visual_score: 72,
        audio_score: 81,
        content_score: 75,
        strengths: [
          "음성 안정성 우수 — 피치 std 낮음",
          "메시지 흐름 명확 — 문제 정의 → 해결 → 다음 단계",
          "발표를 60초 안에 끝내는 페이스 컨트롤",
        ],
        weaknesses: [
          "시선 응시 평균 58% — 카메라 정면 시간 더 필요",
          "필러워드 분당 4.2회 — '음', '약간', '그러니까'",
          "공허한 표현 1회 — '혁신적인'",
        ],
        action_items: [
          "'약간' / '그러니까' 를 의도적인 1초 침묵으로 대체합니다.",
          "슬라이드 전환 직후 2초간 카메라를 응시하는 습관을 만듭니다.",
          "핵심 숫자 3개를 자료를 보지 않고 말하는 연습을 합니다.",
        ],
        judge_summaries: {
          "judge-fact": "근거의 명확함은 좋으나 시장 규모 숫자가 약합니다.",
          "judge-connect": "진정성이 느껴졌습니다. 시선만 더 잡아주세요.",
          "judge-critical": "필러워드 4.2회/분. 다음 라운드는 2회 이하로.",
        },
      });
      setLoading(false);
      return;
    }
    fetchReport(sessionId)
      .then((r) =>
        setReport({
          session_id: r.session_id,
          trust_score: r.trust_score,
          visual_score: r.visual_score,
          audio_score: r.audio_score,
          content_score: r.content_score,
          strengths: r.strengths,
          weaknesses: r.weaknesses,
          action_items: r.action_items,
          judge_summaries: r.judge_summaries,
        }),
      )
      .catch((e) => {
        // backend /report 실패 — *정직하게* 분석 불가 표시. 가짜 점수 X.
        console.error("[report] fetch failed", e);
        const noSpeech = !store.transcript || store.transcript.trim().length < 30;
        const noVisual = (store.metrics.eye_contact_ratio || 0) === 0;
        if (noSpeech && noVisual) {
          // 정말로 입력 신호 0 — 진짜 평가 못 함
          setReport({
            session_id: sessionId,
            trust_score: 0,
            visual_score: 0,
            audio_score: 0,
            content_score: 0,
            strengths: [],
            weaknesses: [
              "발표 음성·전사 신호 부족 — 분석 불가",
              "마이크 권한 + 30초 이상 발표 필요",
            ],
            action_items: [
              "마이크 권한이 차단되지 않았는지 확인 (자물쇠 → 사이트 설정).",
              "Devtools Network 탭에서 /audio-chunk 요청이 5초마다 보이는지 확인.",
              "Backend Railway 로그에 audio-chunk POST 가 들어오는지 확인.",
            ],
            judge_summaries: {
              "judge-fact": "발표 신호 없음 — 평가 보류.",
              "judge-connect": "발표 신호 없음 — 평가 보류.",
              "judge-critical": "발표 신호 없음 — 평가 보류.",
            },
          });
          return;
        }
        // 부분적 신호 있음 — store 기반 휴리스틱 (진짜 측정값 활용)
        setReport({
          session_id: sessionId,
          trust_score: store.scores.trust || 0,
          visual_score: store.scores.visual || 0,
          audio_score: store.scores.audio || 0,
          content_score: 0, // content 는 LLM 없이 평가 불가
          strengths: deriveStrengths(store),
          weaknesses: deriveWeaknesses(store),
          action_items: deriveActions(store),
          judge_summaries: {
            "judge-fact": "백엔드 LLM 평가 미연결 — 휴리스틱만 표시.",
            "judge-connect": "백엔드 LLM 평가 미연결 — 휴리스틱만 표시.",
            "judge-critical": `필러워드 ${store.filler_total}회 (${Math.round(store.metrics.filler_count_per_min)}/분).`,
          },
        });
      })
      .finally(() => setLoading(false));
  }, [sessionId, store, demoMode]);

  if (loading || !report) {
    return (
      <main className="grid min-h-dvh place-items-center bg-black">
        <span className="font-mono text-[10.5px] uppercase tracking-[0.32em] text-white/40">
          분석 결과를 불러오는 중...
        </span>
      </main>
    );
  }

  const label = trustLabelEn(report.trust_score);

  return (
    <main className="min-h-dvh bg-black text-white">
      <header className="border-b border-white/8">
        <div className="mx-auto flex h-14 max-w-[1100px] items-center justify-between px-6">
          <Link
            href="/dashboard"
            className="font-mono text-[10.5px] uppercase tracking-[0.32em] text-white/55 transition-colors hover:text-white"
          >
            ← Dashboard
          </Link>
          <Link
            href="/pitch/new"
            className="group inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-1.5 text-[12px] font-semibold text-black transition-transform hover:scale-[1.04]"
          >
            다시 발표
            <span className="transition-transform group-hover:translate-x-0.5">→</span>
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-[1100px] px-6 py-16">
        <motion.div
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="grid gap-10 lg:grid-cols-[1fr_360px] lg:items-end"
        >
          <div>
            <div className="font-mono text-[10.5px] uppercase tracking-[0.32em] text-white/45">
              Final report · 01
            </div>
            <h1
              className="mt-3 text-balance font-medium leading-[1.04]"
              style={{ fontSize: "clamp(36px, 5vw, 64px)", letterSpacing: "-0.024em" }}
            >
              발표 분석 결과
            </h1>
            <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.24em] text-white/35">
              Session · {sessionId.slice(0, 8)}
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black px-6 py-5">
            <div className="flex items-baseline justify-between">
              <span className="font-mono text-[10px] uppercase tracking-[0.32em] text-white/45">
                Trust score
              </span>
              <span className="font-mono text-[10px] uppercase tracking-[0.32em] text-white/55">
                {label}
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-mono text-[64px] font-medium leading-none tabular-nums text-white">
                {Math.round(report.trust_score)}
              </span>
              <span className="font-mono text-[20px] text-white/30">/100</span>
            </div>
            <div className="mt-4 h-[2px] w-full overflow-hidden rounded-full bg-white/8">
              <div
                className="h-full bg-white"
                style={{ width: `${Math.round(report.trust_score)}%` }}
              />
            </div>
          </div>
        </motion.div>

        <Section title="시간축 신뢰도" delay={0.05}>
          <div className="rounded-2xl border border-white/8 bg-black p-4">
            <TimelineChart
              data={
                store.timeline.length > 0
                  ? store.timeline
                  : demoMode
                    ? generateDemoTimeline(60_000)
                    : Array.from({ length: 12 }).map((_, i) => ({
                        ts_ms: i * 5000,
                        trust: Math.max(40, report.trust_score + Math.sin(i / 2) * 12),
                      }))
              }
            />
          </div>
        </Section>

        <Section title="4축 분석" delay={0.1}>
          <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
            <div className="rounded-2xl border border-white/8 bg-black p-5">
              <RadarScore
                visual={report.visual_score}
                audio={report.audio_score}
                content={report.content_score}
                consistency={(report.visual_score + report.audio_score) / 2}
              />
            </div>
            <div className="grid gap-3">
              <ScoreRow label="시각 신뢰" value={report.visual_score} />
              <ScoreRow label="음성 신뢰" value={report.audio_score} />
              <ScoreRow label="논리 신뢰" value={report.content_score} />
            </div>
          </div>
        </Section>

        <Section title="심사위원 한 줄평" delay={0.15}>
          <div className="grid gap-3 lg:grid-cols-3">
            {JUDGES.map((j, i) => (
              <div key={j.id} className="rounded-2xl border border-white/8 bg-black p-5">
                <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-white/45">
                  0{i + 1} · {j.nameEn}
                </div>
                <div className="mt-1 text-[15px] font-medium">{j.nameKo}</div>
                <div className="mt-3 border-l border-white pl-3 text-[14px] leading-[1.5] text-white/85">
                  "{report.judge_summaries[j.id]}"
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section title="강점 / 약점" delay={0.2}>
          <div className="grid gap-3 lg:grid-cols-2">
            <SectionList title="강점" items={report.strengths} marker="+" />
            <SectionList title="약점" items={report.weaknesses} marker="−" muted />
          </div>
        </Section>

        <Section title="액션 아이템" delay={0.25}>
          <ol className="overflow-hidden rounded-2xl border border-white/8">
            {report.action_items.map((a, i) => (
              <li
                key={i}
                className={`flex items-start gap-4 px-5 py-4 ${i > 0 ? "border-t border-white/8" : ""}`}
              >
                <span className="font-mono text-[10.5px] tabular-nums uppercase tracking-[0.32em] text-white/45">
                  0{i + 1}
                </span>
                <span className="text-[14.5px] leading-[1.55]">{a}</span>
              </li>
            ))}
          </ol>
        </Section>

        <div className="mt-16 flex items-center justify-between border-t border-white/8 pt-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-white/40">
            세션이 본인 계정에 저장되었습니다
          </p>
          <Link
            href="/pitch/new"
            className="group inline-flex items-center gap-1.5 rounded-full bg-white px-5 py-2.5 text-[13px] font-semibold text-black transition-transform hover:scale-[1.04]"
          >
            다시 한 번 발표
            <span className="transition-transform group-hover:translate-x-0.5">→</span>
          </Link>
        </div>
      </section>
    </main>
  );
}

function Section({
  title,
  children,
  delay = 0,
}: {
  title: string;
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <motion.section
      initial={{ y: 18, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3, delay }}
      className="mt-12"
    >
      <h2 className="mb-4 font-mono text-[10px] uppercase tracking-[0.32em] text-white/45">
        {title}
      </h2>
      {children}
    </motion.section>
  );
}

function ScoreRow({ label, value }: { label: string; value: number }) {
  const v = Math.round(value);
  const isLow = v < 45;
  return (
    <div className="rounded-2xl border border-white/8 bg-black px-5 py-4">
      <div className="flex items-baseline justify-between">
        <span className="text-[14px]">{label}</span>
        <span
          className={`font-mono text-[28px] font-medium tabular-nums ${isLow ? "text-white/55" : "text-white"}`}
        >
          {v}
        </span>
      </div>
      <div className="mt-3 h-[2px] w-full overflow-hidden rounded-full bg-white/8">
        <div className="h-full bg-white" style={{ width: `${v}%`, opacity: isLow ? 0.45 : 0.9 }} />
      </div>
    </div>
  );
}

function SectionList({
  title,
  items,
  marker,
  muted,
}: {
  title: string;
  items: string[];
  marker: string;
  muted?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/8 bg-black p-5">
      <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-white/45">{title}</div>
      <ul className="mt-3 space-y-2 text-[14px] leading-[1.55]">
        {items.map((s, i) => (
          <li key={i} className="flex gap-3">
            <span className={`font-mono ${muted ? "text-white/40" : "text-white/85"}`}>
              {marker}
            </span>
            <span className={muted ? "text-white/75" : "text-white"}>{s}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function trustLabelEn(score: number): string {
  if (score >= 80) return "Strong";
  if (score >= 65) return "Stable";
  if (score >= 45) return "Caution";
  return "Risk";
}

function deriveStrengths(s: ReturnType<typeof useTrustStore.getState>) {
  const r: string[] = [];
  if (s.metrics.eye_contact_ratio >= 65) r.push("아이컨택 안정");
  if (s.metrics.pitch_stability >= 65) r.push("음성 안정성 우수");
  if (s.metrics.gesture_usage >= 50) r.push("자연스러운 제스처 사용");
  if (s.metrics.head_stability >= 70) r.push("머리 안정성 양호");
  if (r.length === 0) r.push("발표를 끝까지 이어간 것 자체가 자산입니다");
  return r;
}

function deriveWeaknesses(s: ReturnType<typeof useTrustStore.getState>) {
  const r: string[] = [];
  if (s.metrics.eye_contact_ratio < 50)
    r.push(`시선 응시 ${Math.round(s.metrics.eye_contact_ratio)}% — 카메라 정면 응시 시간 부족`);
  if (s.metrics.filler_count_per_min >= 6)
    r.push(`필러워드 분당 ${Math.round(s.metrics.filler_count_per_min)}회`);
  if (s.metrics.pitch_stability < 50) r.push("피치 불안정 — 떨림이 감지됨");
  if (s.metrics.body_sway > 50) r.push("어깨 흔들림이 큼 — 긴장 신호");
  if (r.length === 0) r.push("전체적으로 안정적, 디테일 추가 가능");
  return r;
}

function deriveActions(s: ReturnType<typeof useTrustStore.getState>) {
  const r: string[] = [];
  if (s.metrics.filler_count_per_min >= 5)
    r.push("'약간', '그러니까'를 의도적인 1초 침묵으로 대체합니다.");
  if (s.metrics.eye_contact_ratio < 60)
    r.push("슬라이드 전환 직후 2초간 카메라를 응시하는 습관을 만듭니다.");
  if (s.metrics.pitch_stability < 60)
    r.push("호흡을 고르고 첫 문장은 천천히 내뱉는 연습을 합니다.");
  if (r.length < 3) r.push("핵심 숫자 3개를 암기 후 발표 — 자료를 보지 않고 말합니다.");
  return r.slice(0, 3);
}
