"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { fetchReport } from "@/lib/api-client";
import { useTrustStore } from "@/hooks/use-trust-store";
import { JUDGES } from "@/lib/judges/definitions";
import { TimelineChart } from "@/components/report/timeline-chart";
import { RadarScore } from "@/components/report/radar-chart";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trustColor, trustLabel } from "@/lib/utils";
import type { FinalReport } from "@/types/pitch";
import { ArrowRight, Repeat } from "lucide-react";
import { generateDemoTimeline } from "@/lib/demo-simulator";

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
      // synthesize a polished demo report immediately
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
        })
      )
      .catch(() => {
        // fallback: synth report from local store
        setReport({
          session_id: sessionId,
          trust_score: store.scores.trust || 70,
          visual_score: store.scores.visual || 65,
          audio_score: store.scores.audio || 72,
          content_score: store.scores.content || 60,
          strengths: deriveStrengths(store),
          weaknesses: deriveWeaknesses(store),
          action_items: deriveActions(store),
          judge_summaries: {
            "judge-fact": "데이터의 명확함은 좋으나 결론이 다소 약합니다.",
            "judge-connect": "진정성이 느껴졌습니다. 시선만 더 잡아주세요.",
            "judge-critical": `필러워드 ${store.filler_total}회. 분당 ${Math.round(store.metrics.filler_count_per_min)}회는 줄여야 합니다.`,
          },
        });
      })
      .finally(() => setLoading(false));
  }, [sessionId, store]);

  if (loading || !report) {
    return (
      <main className="grid min-h-dvh place-items-center text-sm text-muted-foreground">
        분석 결과를 불러오는 중...
      </main>
    );
  }

  const c = trustColor(report.trust_score);

  return (
    <main className="min-h-dvh">
      <header className="border-b border-border-faint">
        <div className="mx-auto flex h-14 max-w-[1100px] items-center justify-between px-6">
          <Link href="/dashboard" className="font-mono text-xs text-muted-foreground hover:text-foreground">
            ← 대시보드
          </Link>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link href="/pitch/new">
                <Repeat className="size-3.5" /> 다시 발표
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-[1100px] px-6 py-12">
        <motion.div
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="grid gap-8 lg:grid-cols-[280px_1fr] lg:items-end"
        >
          <div>
            <Badge variant="primary">FINAL REPORT</Badge>
            <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight">
              발표 분석 결과
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              세션 ID: <span className="font-mono">{sessionId.slice(0, 8)}</span>
            </p>
          </div>
          <div className="rounded-md border border-border-faint bg-surface-1 px-6 py-5">
            <div className="flex items-baseline justify-between">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">
                신뢰 점수
              </span>
              <span className="font-mono text-[10px] uppercase tracking-wider" style={{ color: c }}>
                {trustLabel(report.trust_score)}
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-mono text-6xl font-semibold tabular-nums" style={{ color: c }}>
                {Math.round(report.trust_score)}
              </span>
              <span className="font-mono text-2xl text-subtle-foreground">/100</span>
            </div>
          </div>
        </motion.div>

        <Section title="시간축 신뢰도" delay={0.05}>
          <TimelineChart
            data={
              store.timeline.length > 0
                ? store.timeline
                : (demoMode
                    ? generateDemoTimeline(60_000)
                    : Array.from({ length: 12 }).map((_, i) => ({
                        ts_ms: i * 5000,
                        trust: Math.max(
                          40,
                          report.trust_score + Math.sin(i / 2) * 12
                        ),
                      })))
            }
          />
        </Section>

        <Section title="4축 분석" delay={0.1}>
          <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
            <RadarScore
              visual={report.visual_score}
              audio={report.audio_score}
              content={report.content_score}
              consistency={(report.visual_score + report.audio_score) / 2}
            />
            <div className="grid gap-3">
              <ScoreRow label="시각 신뢰" value={report.visual_score} />
              <ScoreRow label="음성 신뢰" value={report.audio_score} />
              <ScoreRow label="논리 신뢰" value={report.content_score} />
            </div>
          </div>
        </Section>

        <Section title="심사위원 한 줄평" delay={0.15}>
          <div className="grid gap-3 lg:grid-cols-3">
            {JUDGES.map((j) => (
              <Card key={j.id} className="border-l-2" style={{ borderLeftColor: j.accentVar }}>
                <CardHeader>
                  <CardTitle>{j.nameKo}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed">{report.judge_summaries[j.id]}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </Section>

        <Section title="강점 / 약점" delay={0.2}>
          <div className="grid gap-3 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>강점</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1.5 text-sm">
                  {report.strengths.map((s, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-trust-high">＋</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>약점</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1.5 text-sm">
                  {report.weaknesses.map((s, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-trust-low">－</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </Section>

        <Section title="액션 아이템" delay={0.25}>
          <Card>
            <CardContent className="pt-4">
              <ol className="space-y-3 text-sm">
                {report.action_items.map((a, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="font-mono text-xs text-subtle-foreground tabular-nums w-5 pt-0.5">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="leading-relaxed">{a}</span>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </Section>

        <div className="mt-12 flex items-center justify-between border-t border-border-faint pt-6">
          <p className="text-xs text-subtle-foreground font-mono">
            세션이 본인 계정에 저장되었습니다.
          </p>
          <Button asChild>
            <Link href="/pitch/new">
              다시 한 번 발표 <ArrowRight className="size-4" />
            </Link>
          </Button>
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
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3, delay }}
      className="mt-10"
    >
      <h2 className="mb-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {title}
      </h2>
      {children}
    </motion.section>
  );
}

function ScoreRow({ label, value }: { label: string; value: number }) {
  const c = trustColor(value);
  return (
    <div className="rounded-md border border-border-faint bg-surface-1 px-4 py-3">
      <div className="flex items-baseline justify-between">
        <span className="text-sm">{label}</span>
        <span className="font-mono text-2xl font-semibold tabular-nums" style={{ color: c }}>
          {Math.round(value)}
        </span>
      </div>
      <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-border-faint">
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{ width: `${Math.round(value)}%`, background: c }}
        />
      </div>
    </div>
  );
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
  if (r.length < 3)
    r.push("핵심 숫자 3개를 암기 후 발표 — 자료를 보지 않고 말합니다.");
  return r.slice(0, 3);
}
