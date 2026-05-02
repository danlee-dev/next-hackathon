"use client";

import { useMemo, useState } from "react";
import { PUBLIC_PITCHES, type PublicPitch } from "./mock";

/**
 * 3-pane Discover workspace.
 *
 * Desktop: lg:grid-cols-[300px_minmax(0,1fr)_360px]
 *   - 좌: Deal list (선택된 row 가 화이트 보더 강조)
 *   - 중: 영상 + 헤딩 + Trust score breakdown + 회사 설명
 *   - 우: 모집 진행 / LOI 폼
 *
 * Mobile: 세로 stack (deal scroll → 비디오/점수 → LOI). lg 이하에선 deal list 가
 * horizontal-scroll chip 으로 변형 (고정 높이, gesture 자연).
 */
export function DiscoverWorkspace() {
  const [selectedId, setSelectedId] = useState(PUBLIC_PITCHES[0].id);
  const selected = useMemo(
    () => PUBLIC_PITCHES.find((p) => p.id === selectedId) ?? PUBLIC_PITCHES[0],
    [selectedId],
  );

  return (
    <div className="grid min-h-[calc(100dvh-3.5rem)] grid-cols-1 lg:grid-cols-[300px_minmax(0,1fr)_360px]">
      <DealList selectedId={selected.id} onSelect={setSelectedId} />
      <PitchDetail pitch={selected} />
      <InvestmentPanel pitch={selected} />
    </div>
  );
}

/* ---------- 좌측: Deal list ---------- */

function DealList({
  selectedId,
  onSelect,
}: {
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <aside className="border-b border-white/8 lg:border-b-0 lg:border-r">
      <div className="sticky top-14 z-10 flex items-center justify-between border-b border-white/8 bg-black/85 px-5 py-3 backdrop-blur-md">
        <span className="font-mono text-[10.5px] uppercase tracking-[0.32em] text-white/45">
          Open deals · {PUBLIC_PITCHES.length}
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-white/30">KRW</span>
      </div>
      <div className="flex gap-2 overflow-x-auto px-5 py-4 lg:flex-col lg:gap-1.5 lg:overflow-visible lg:px-3 lg:py-3">
        {PUBLIC_PITCHES.map((p) => {
          const active = p.id === selectedId;
          const pct = Math.round((p.raised / p.goal) * 100);
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onSelect(p.id)}
              className={`group flex w-[260px] shrink-0 flex-col gap-2 rounded-lg border px-4 py-3.5 text-left transition-colors lg:w-auto ${
                active
                  ? "border-white/20 bg-white/[0.04]"
                  : "border-transparent hover:border-white/10 hover:bg-white/[0.02]"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-[9.5px] uppercase tracking-[0.28em] text-white/40">
                  {p.sector}
                </span>
                <ScoreBadge score={p.trustScore} />
              </div>
              <div
                className="text-[14px] font-medium leading-tight"
                style={{ letterSpacing: "-0.012em" }}
              >
                {p.startupName}
              </div>
              <div className="flex items-center justify-between font-mono text-[10.5px] tabular-nums text-white/55">
                <span>{formatKrw(p.minTicket)} min</span>
                <span className={active ? "text-white" : "text-white/40"}>{pct}%</span>
              </div>
              <div className="h-[2px] w-full overflow-hidden rounded-full bg-white/8">
                <div className="h-full bg-white transition-all" style={{ width: `${pct}%` }} />
              </div>
            </button>
          );
        })}
      </div>
    </aside>
  );
}

/* ---------- 중앙: 비디오 + 점수 + 설명 ---------- */

function PitchDetail({ pitch }: { pitch: PublicPitch }) {
  return (
    <section className="overflow-y-auto">
      <div className="mx-auto max-w-[820px] px-6 py-8 sm:px-10 sm:py-12">
        <div className="mb-3 flex items-center gap-3 font-mono text-[10.5px] uppercase tracking-[0.32em] text-white/45">
          <span>Recorded · {formatDate(pitch.recordedAt)}</span>
          <span className="h-1 w-1 rounded-full bg-white/30" />
          <span>{pitch.founder}</span>
        </div>
        <h1
          className="text-balance font-medium leading-[1.06]"
          style={{ fontSize: "clamp(28px, 3.6vw, 44px)", letterSpacing: "-0.022em" }}
        >
          {pitch.startupName}
        </h1>
        <p className="mt-3 max-w-[640px] text-[15px] leading-[1.6] text-white/70">
          {pitch.oneLiner}
        </p>

        {/* Video */}
        <div className="mt-8 overflow-hidden rounded-xl border border-white/10 bg-black">
          <div className="relative aspect-video w-full">
            <iframe
              key={pitch.id}
              src={pitch.videoUrl}
              title={pitch.startupName}
              className="absolute inset-0 h-full w-full"
              frameBorder={0}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
        </div>

        {/* Trust score breakdown */}
        <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_2fr]">
          <TrustHero score={pitch.trustScore} />
          <div className="grid grid-cols-1 gap-2">
            <BreakdownRow label="Visual" value={pitch.breakdown.visual} />
            <BreakdownRow label="Audio" value={pitch.breakdown.audio} />
            <BreakdownRow label="Content" value={pitch.breakdown.content} />
          </div>
        </div>

        {/* Description */}
        <div className="mt-10 rounded-xl border border-white/8 bg-white/[0.015] px-6 py-5">
          <div className="mb-3 font-mono text-[10.5px] uppercase tracking-[0.32em] text-white/45">
            Company brief
          </div>
          <p className="text-[14.5px] leading-[1.7] text-white/75">{pitch.description}</p>
        </div>

        {/* Highlights */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {pitch.highlights.map((h, i) => (
            <div key={i} className="rounded-lg border border-white/8 px-4 py-3.5">
              <div className="font-mono text-[9.5px] uppercase tracking-[0.28em] text-white/40">
                {h.label}
              </div>
              <div className="mt-1.5 font-mono text-[18px] tabular-nums">{h.value}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function TrustHero({ score }: { score: number }) {
  const tone = score >= 75 ? "text-trust-high" : score >= 60 ? "text-trust-mid" : "text-trust-low";
  return (
    <div className="rounded-xl border border-white/10 px-5 py-4">
      <div className="font-mono text-[10.5px] uppercase tracking-[0.32em] text-white/45">
        Trust score
      </div>
      <div className="mt-1 flex items-baseline gap-1.5">
        <span className={`font-mono text-[44px] font-semibold leading-none tabular-nums ${tone}`}>
          {score}
        </span>
        <span className="font-mono text-[12px] tabular-nums text-white/40">/100</span>
      </div>
    </div>
  );
}

function BreakdownRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-white/8 px-4 py-2.5">
      <span className="w-[60px] font-mono text-[10px] uppercase tracking-[0.28em] text-white/45">
        {label}
      </span>
      <div className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/8">
        <div className="h-full bg-white/85 transition-all" style={{ width: `${value}%` }} />
      </div>
      <span className="w-[36px] text-right font-mono text-[12.5px] tabular-nums text-white/85">
        {value}
      </span>
    </div>
  );
}

/* ---------- 우측: LOI 폼 ---------- */

function InvestmentPanel({ pitch }: { pitch: PublicPitch }) {
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submittedAt, setSubmittedAt] = useState<string | null>(null);

  const pct = Math.round((pitch.raised / pitch.goal) * 100);

  function reset() {
    setAmount("");
    setMemo("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const n = Number(amount.replace(/[^\d]/g, ""));
    if (!n || n < pitch.minTicket) {
      alert(`최소 투자 금액은 ${formatKrw(pitch.minTicket)} 입니다.`);
      return;
    }
    setSubmitting(true);
    // mock: Supabase `investments` 연결은 다음 단계 — 일단 성공 처리.
    await new Promise((r) => setTimeout(r, 600));
    setSubmittedAt(new Date().toISOString());
    setSubmitting(false);
    reset();
  }

  return (
    <aside className="border-t border-white/8 lg:sticky lg:top-14 lg:h-[calc(100dvh-3.5rem)] lg:overflow-y-auto lg:border-l lg:border-t-0">
      <div className="px-6 py-6 sm:px-7">
        <div className="mb-4 flex items-center justify-between">
          <span className="font-mono text-[10.5px] uppercase tracking-[0.32em] text-white/45">
            Round
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-white/30">
            Pre-A
          </span>
        </div>

        <div className="space-y-3">
          <Stat label="Valuation" value={pitch.valuation} />
          <Stat label="Min ticket" value={formatKrw(pitch.minTicket)} />
          <Stat label="Goal" value={formatKrw(pitch.goal)} />
        </div>

        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between font-mono text-[10.5px] tabular-nums">
            <span className="uppercase tracking-[0.28em] text-white/45">Raised</span>
            <span className="text-white">{pct}%</span>
          </div>
          <div className="h-[3px] w-full overflow-hidden rounded-full bg-white/8">
            <div className="h-full bg-white transition-all" style={{ width: `${pct}%` }} />
          </div>
          <div className="mt-2 flex items-center justify-between font-mono text-[10.5px] tabular-nums text-white/55">
            <span>{formatKrw(pitch.raised)}</span>
            <span>{formatKrw(pitch.goal)}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-7 space-y-4">
          <div>
            <label
              htmlFor="loi-amount"
              className="mb-2 block font-mono text-[10.5px] uppercase tracking-[0.32em] text-white/45"
            >
              Amount (KRW)
            </label>
            <div className="relative">
              <input
                id="loi-amount"
                inputMode="numeric"
                value={amount}
                onChange={(e) => {
                  const digits = e.target.value.replace(/[^\d]/g, "");
                  setAmount(digits ? Number(digits).toLocaleString("ko-KR") : "");
                }}
                placeholder={formatKrw(pitch.minTicket)}
                className="w-full rounded-lg border border-white/12 bg-black px-4 py-3 font-mono text-[20px] tabular-nums tracking-tight text-white placeholder:text-white/25 focus:border-white/35 focus:outline-none"
              />
              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 font-mono text-[10.5px] uppercase tracking-[0.28em] text-white/30">
                KRW
              </span>
            </div>
          </div>

          <div>
            <label
              htmlFor="loi-memo"
              className="mb-2 block font-mono text-[10.5px] uppercase tracking-[0.32em] text-white/45"
            >
              Memo (optional)
            </label>
            <textarea
              id="loi-memo"
              rows={3}
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="발표자에게 한 마디 — 관심 있는 지표나 follow-up 질문"
              className="w-full resize-none rounded-lg border border-white/12 bg-black px-4 py-3 text-[13px] leading-[1.55] text-white placeholder:text-white/25 focus:border-white/35 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={submitting || !amount}
            className="group inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-white px-5 py-3 text-[13px] font-semibold text-black transition-transform hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
          >
            {submitting ? "제출 중…" : "투자 의향서 제출"}
            {!submitting && (
              <span className="transition-transform group-hover:translate-x-0.5">→</span>
            )}
          </button>

          {submittedAt && (
            <div className="rounded-lg border border-white/12 bg-white/[0.03] px-4 py-3">
              <div className="font-mono text-[10.5px] uppercase tracking-[0.32em] text-trust-high">
                Submitted
              </div>
              <p className="mt-1 text-[12.5px] leading-[1.55] text-white/65">
                의향서가 발표자에게 전달됐습니다. 발표자 수락 시 follow-up 미팅 일정이 메일로
                전달됩니다.
              </p>
            </div>
          )}

          <p className="pt-2 text-[10.5px] leading-[1.55] text-white/40">
            본 제출은 비공개 매수 의향서 (Letter of Intent) 이며, 법적 검토 및 주주 명부 등재 절차를
            거쳐 확정됩니다.
          </p>
        </form>
      </div>
    </aside>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-white/6 pb-2 last:border-b-0 last:pb-0">
      <span className="font-mono text-[10.5px] uppercase tracking-[0.28em] text-white/45">
        {label}
      </span>
      <span className="font-mono text-[12.5px] tabular-nums text-white">{value}</span>
    </div>
  );
}

/* ---------- 작은 helpers ---------- */

function ScoreBadge({ score }: { score: number }) {
  const tone =
    score >= 75
      ? "border-trust-high/40 text-trust-high"
      : score >= 60
        ? "border-trust-mid/40 text-trust-mid"
        : "border-trust-low/40 text-trust-low";
  return (
    <span
      className={`inline-flex items-center rounded border px-1.5 py-0.5 font-mono text-[9.5px] tabular-nums ${tone}`}
    >
      {score}
    </span>
  );
}

function formatKrw(n: number): string {
  if (n >= 100_000_000) {
    const eok = n / 100_000_000;
    return `${eok.toLocaleString("ko-KR", { maximumFractionDigits: 1 })}억 원`;
  }
  if (n >= 10_000) {
    const man = Math.round(n / 10_000);
    return `${man.toLocaleString("ko-KR")}만 원`;
  }
  return `${n.toLocaleString("ko-KR")}원`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const yy = String(d.getFullYear()).slice(2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yy}.${mm}.${dd}`;
}
