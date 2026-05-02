import { AppShell } from "@/components/landing/landing-shell";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";

interface SessionRow {
  id: string;
  title: string;
  status: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  trust_score: number | null;
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data } = await supabase
    .from("pitch_sessions")
    .select("id,title,status,started_at,ended_at,duration_seconds,trust_score")
    .order("started_at", { ascending: false })
    .limit(50);

  const rows = (data ?? []) as SessionRow[];

  return (
    <AppShell active="dashboard">
      <div className="mb-2 font-mono text-[10.5px] uppercase tracking-[0.32em] text-white/45">
        Sessions · {rows.length}
      </div>
      <div className="mb-12 flex items-end justify-between">
        <h1
          className="text-balance font-medium leading-[1.04]"
          style={{ fontSize: "clamp(36px, 4.6vw, 64px)", letterSpacing: "-0.024em" }}
        >
          지난 피칭
        </h1>
        <Link
          href="/pitch/new"
          className="group hidden items-center gap-1.5 rounded-full bg-white px-5 py-2.5 text-[13px] font-semibold text-black transition-transform hover:scale-[1.04] sm:inline-flex"
        >
          새 발표 시작
          <span className="transition-transform group-hover:translate-x-0.5">→</span>
        </Link>
      </div>

      {rows.length === 0 ? (
        <EmptyState />
      ) : (
        <ul className="overflow-hidden rounded-2xl border border-white/8">
          {rows.map((r, i) => (
            <li key={r.id} className={i > 0 ? "border-t border-white/8" : ""}>
              <Link
                href={r.status === "completed" ? `/pitch/${r.id}/report` : `/pitch/${r.id}/live`}
                className="group grid grid-cols-[auto_1fr_auto_auto_auto] items-center gap-4 px-5 py-4 transition-colors hover:bg-white/[0.02]"
              >
                <StatusDot status={r.status} score={r.trust_score} />
                <span className="truncate text-[15px] font-medium">{r.title}</span>
                <StatusLabel status={r.status} />
                <span className="font-mono text-[11px] uppercase tracking-[0.24em] text-white/40 tabular-nums">
                  {formatDuration(r.duration_seconds)}
                </span>
                <ScoreDisplay score={r.trust_score} />
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Link
        href="/pitch/new"
        className="mt-6 inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-white px-5 py-3 text-[13px] font-semibold text-black transition-transform hover:scale-[1.02] sm:hidden"
      >
        새 발표 시작 →
      </Link>
    </AppShell>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-6 rounded-2xl border border-dashed border-white/10 px-8 py-20 text-center">
      <div className="font-mono text-[10.5px] uppercase tracking-[0.32em] text-white/40">
        Empty · 0 sessions
      </div>
      <h2
        className="text-balance font-medium leading-[1.1]"
        style={{ fontSize: "clamp(22px, 3.2vw, 32px)", letterSpacing: "-0.02em" }}
      >
        아직 피칭이 없습니다.
      </h2>
      <p className="max-w-[420px] text-[14px] leading-[1.55] text-white/55">
        60초 데모로 어떤 분석이 나오는지 먼저 보고, 실제 발표를 시작하세요.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-4">
        <Link
          href="/pitch/new"
          className="group inline-flex items-center gap-1.5 rounded-full bg-white px-6 py-3 text-[13px] font-semibold text-black transition-transform hover:scale-[1.04]"
        >
          첫 피칭 시작
          <span className="transition-transform group-hover:translate-x-0.5">→</span>
        </Link>
        <Link
          href="/pitch/demo/live?title=Demo&demo=1"
          className="font-mono text-[11px] uppercase tracking-[0.32em] text-white/55 transition-colors hover:text-white"
        >
          데모 보기
        </Link>
      </div>
    </div>
  );
}

function StatusDot({ status, score }: { status: string; score: number | null }) {
  const color =
    status === "completed"
      ? "rgba(255,255,255,0.85)"
      : status === "in_progress"
        ? "rgba(255,255,255,0.4)"
        : "rgba(255,255,255,0.18)";
  return (
    <span
      className="block h-1.5 w-1.5 rounded-full"
      style={{ background: color }}
      aria-label={`${status} · ${score ?? "—"}`}
    />
  );
}

function StatusLabel({ status }: { status: string }) {
  const text = status === "completed" ? "Completed" : status === "in_progress" ? "Live" : "Aborted";
  return (
    <span className="hidden font-mono text-[10px] uppercase tracking-[0.32em] text-white/45 sm:inline">
      {text}
    </span>
  );
}

function ScoreDisplay({ score }: { score: number | null }) {
  if (score === null) {
    return <span className="font-mono text-[18px] tabular-nums text-white/30">—</span>;
  }
  return (
    <span className="font-mono text-[20px] font-semibold tabular-nums text-white">
      {Math.round(score)}
      <span className="ml-1 text-[12px] font-normal text-white/40">/100</span>
    </span>
  );
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return "—";
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}
