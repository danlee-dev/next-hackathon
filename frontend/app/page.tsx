import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Eye, Mic, Brain, Activity } from "lucide-react";

export default function LandingPage() {
  return (
    <main className="relative min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-border-faint bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-[1280px] items-center justify-between px-6">
          <Link
            href="/"
            className="flex items-center gap-2 font-mono text-sm font-medium tracking-tight"
          >
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-xs border border-primary/40 bg-primary/10 text-primary">
              <span className="block h-1.5 w-1.5 rounded-full bg-primary" />
            </span>
            TrustPitch
          </Link>
          <nav className="flex items-center gap-4 text-sm text-muted-foreground">
            <Link href="/dashboard" className="hover:text-foreground">
              대시보드
            </Link>
            <Link href="/auth/login" className="hover:text-foreground">
              로그인
            </Link>
            <Button asChild size="sm">
              <Link href="/pitch/new">
                발표 시작 <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          </nav>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-grid pointer-events-none" />
        <div className="relative mx-auto grid max-w-[1280px] gap-10 px-6 pt-20 pb-24 lg:grid-cols-[1.2fr_1fr] lg:items-center">
          <div className="flex flex-col gap-6">
            <Badge variant="outline" className="self-start">
              <span className="rec-dot inline-block h-1.5 w-1.5 rounded-full bg-trust-high" />
              Hackathon Build · 2026.05
            </Badge>
            <h1 className="font-display text-[clamp(48px,7vw,96px)] font-extrabold leading-[1.02] tracking-[-0.04em]">
              한 번도 본 적 없는
              <br />
              <span className="text-primary">IR 코칭</span>의 형태.
            </h1>
            <p className="max-w-xl text-lg text-muted-foreground">
              가상 AI 심사위원 셋이 발표를 보고, 듣고, 즉각 반응합니다. 실제
              VC 미팅에 들어가기 전, 데이터 기반의 솔직한 피드백을 받으세요.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Button asChild size="lg">
                <Link href="/pitch/new">
                  지금 발표 시작 <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild variant="ghost" size="lg">
                <Link href="/auth/login">로그인</Link>
              </Button>
            </div>
            <dl className="mt-8 grid grid-cols-3 gap-6 border-t border-border-faint pt-6">
              <Stat label="신뢰 점수" value="78" suffix="/100" />
              <Stat label="실시간 자막" value="< 1s" />
              <Stat label="필러 사전" value="14" suffix="words" />
            </dl>
          </div>

          <div className="relative">
            <div className="rounded-md border border-border-faint bg-surface-1 p-5 shadow-[inset_0_0_0_1px_var(--border-faint)]">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs uppercase text-muted-foreground tracking-wider">
                  Live Preview
                </span>
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="rec-dot inline-block h-1.5 w-1.5 rounded-full bg-trust-low" />
                  REC 02:34
                </span>
              </div>
              <div className="mt-4 aspect-video rounded-md border border-border-faint bg-surface-2 grid place-items-center text-subtle-foreground text-xs">
                webcam frame
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <PreviewMetric label="아이컨택" value={68} />
                <PreviewMetric label="자세" value={82} />
                <PreviewMetric label="음성" value={71} />
                <PreviewMetric label="필러" value={12} suffix="회" inverse />
              </div>
              <div className="mt-4 rounded-sm border-l-2 border-primary bg-surface-2 px-3 py-2 text-sm">
                <span className="text-muted-foreground">AI 코치</span> · 지금
                시선이 회피되고 있어요. 카메라를 정면으로 보세요.
              </div>
            </div>
            <div className="absolute -right-4 -bottom-4 hidden lg:block">
              <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-subtle-foreground">
                trust-engine v0.1
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-border-faint">
        <div className="mx-auto max-w-[1280px] px-6 py-20">
          <h2 className="font-display text-3xl font-semibold tracking-tight">
            세 개의 신호를 한 점수로.
          </h2>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            TrustPitch는 시각·음성·논리 세 축을 측정해 단일 신뢰 점수로
            압축합니다. 점수가 변하면 심사위원의 표정이 바뀝니다.
          </p>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            <FeatureCard
              icon={<Eye className="size-4" />}
              title="시각 신뢰"
              meta="MediaPipe Tasks Vision"
            >
              아이컨택, 머리 안정성, 어깨 흔들림, 손 사용, 자연스러운 미소를
              브라우저 안에서 30fps로 측정합니다.
            </FeatureCard>
            <FeatureCard
              icon={<Mic className="size-4" />}
              title="음성 신뢰"
              meta="OpenAI Whisper · librosa"
            >
              한국어 필러워드 14종, 분당 글자수, 피치 안정성, 볼륨 일관성을
              5초 청크로 분석합니다.
            </FeatureCard>
            <FeatureCard
              icon={<Brain className="size-4" />}
              title="논리 신뢰"
              meta="GPT-4o · LangGraph"
            >
              메시지 명확도, 주장-근거 균형, 공허한 표현 빈도를 LLM이 평가해
              구체적인 개선 액션을 돌려줍니다.
            </FeatureCard>
          </div>
        </div>
      </section>

      <section className="border-t border-border-faint">
        <div className="mx-auto grid max-w-[1280px] gap-10 px-6 py-20 lg:grid-cols-[1fr_1.4fr]">
          <div>
            <h2 className="font-display text-3xl font-semibold tracking-tight">
              실시간으로 반응하는
              <br />
              세 명의 가상 심사위원.
            </h2>
            <p className="mt-3 text-muted-foreground">
              김팩트, 이공감, 박독설. 세 페르소나가 각각 다른 트리거로 표정을
              바꾸고, 한 줄로 코멘트를 던집니다.
            </p>
            <div className="mt-6 flex items-center gap-2 text-xs text-muted-foreground font-mono">
              <Activity className="size-3.5" />
              평가 트리거 11종 · 100ms 반응
            </div>
          </div>
          <div className="grid gap-3">
            <JudgePreview
              name="김팩트"
              accent="var(--judge-fact-accent)"
              persona="데이터 기반 냉철한 투자자"
              comment="근거가 명확합니다."
            />
            <JudgePreview
              name="이공감"
              accent="var(--judge-connect-accent)"
              persona="태도와 진정성을 보는 창업가 출신"
              comment="좋은 아이컨택입니다."
            />
            <JudgePreview
              name="박독설"
              accent="var(--judge-critical-accent)"
              persona="디테일에 강한 독설가"
              comment="추임새가 많습니다."
            />
          </div>
        </div>
      </section>

      <footer className="border-t border-border-faint">
        <div className="mx-auto flex max-w-[1280px] flex-col items-start justify-between gap-3 px-6 py-8 text-xs text-subtle-foreground md:flex-row md:items-center">
          <span className="font-mono">
            TrustPitch · Built for Korean IR · 2026
          </span>
          <span>모든 발표 데이터는 본인 계정 안에서만 보관됩니다.</span>
        </div>
      </footer>
    </main>
  );
}

function Stat({
  label,
  value,
  suffix,
}: {
  label: string;
  value: string;
  suffix?: string;
}) {
  return (
    <div className="flex flex-col">
      <dt className="text-xs text-muted-foreground uppercase tracking-wider">
        {label}
      </dt>
      <dd className="font-mono text-2xl font-semibold text-foreground tabular-nums">
        {value}
        {suffix ? (
          <span className="text-sm font-normal text-subtle-foreground ml-1">
            {suffix}
          </span>
        ) : null}
      </dd>
    </div>
  );
}

function PreviewMetric({
  label,
  value,
  suffix,
  inverse,
}: {
  label: string;
  value: number;
  suffix?: string;
  inverse?: boolean;
}) {
  const color = inverse
    ? value <= 6
      ? "var(--trust-high)"
      : value <= 12
        ? "var(--trust-mid)"
        : "var(--trust-low)"
    : value >= 70
      ? "var(--trust-high)"
      : value >= 40
        ? "var(--trust-mid)"
        : "var(--trust-low)";
  return (
    <div className="flex flex-col gap-1.5 rounded-sm border border-border-faint bg-surface-2 px-3 py-2">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
        {label}
      </span>
      <div className="flex items-baseline gap-1">
        <span
          className="font-mono text-xl font-semibold tabular-nums"
          style={{ color }}
        >
          {value}
        </span>
        <span className="text-xs text-subtle-foreground">{suffix ?? "/100"}</span>
      </div>
      {!inverse && (
        <div className="h-1 rounded-full bg-border-faint overflow-hidden">
          <div
            className="h-full rounded-full transition-[width] duration-300"
            style={{ width: `${value}%`, background: color }}
          />
        </div>
      )}
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  meta,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  meta: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-md border border-border-faint bg-surface-1 p-5">
      <div className="flex items-center gap-2 text-primary">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-sm border border-primary/30 bg-primary/10">
          {icon}
        </span>
        <span className="text-sm font-medium text-foreground">{title}</span>
      </div>
      <span className="font-mono text-[10px] uppercase tracking-wider text-subtle-foreground">
        {meta}
      </span>
      <p className="mt-2 text-sm text-muted-foreground">{children}</p>
    </div>
  );
}

function JudgePreview({
  name,
  accent,
  persona,
  comment,
}: {
  name: string;
  accent: string;
  persona: string;
  comment: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-md border border-border-faint bg-surface-1 p-4">
      <div
        className="h-12 w-12 shrink-0 rounded-md border bg-surface-2"
        style={{ borderColor: `${accent}66` }}
      >
        <div
          className="m-2 h-8 w-8 rounded-full"
          style={{ background: `${accent}33` }}
        />
      </div>
      <div className="flex flex-col">
        <span className="text-sm font-medium">{name}</span>
        <span className="text-xs text-muted-foreground">{persona}</span>
        <span
          className="mt-2 inline-flex w-fit border-l-2 px-2 py-0.5 text-xs"
          style={{ borderColor: accent, color: "var(--foreground)" }}
        >
          {comment}
        </span>
      </div>
    </div>
  );
}
