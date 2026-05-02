import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Plus } from "lucide-react";
import { trustColor, trustLabel } from "@/lib/utils";

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
    .select(
      "id,title,status,started_at,ended_at,duration_seconds,trust_score"
    )
    .order("started_at", { ascending: false })
    .limit(50);

  const rows = (data ?? []) as SessionRow[];

  return (
    <main className="min-h-dvh">
      <header className="border-b border-border-faint">
        <div className="mx-auto flex h-14 max-w-[1100px] items-center justify-between px-6">
          <Link
            href="/"
            className="font-mono text-sm font-medium tracking-tight"
          >
            TrustPitch
          </Link>
          <nav className="flex items-center gap-3">
            <Link
              href="/settings"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              설정
            </Link>
            <Button asChild size="sm">
              <Link href="/pitch/new">
                <Plus className="size-3.5" />새 피칭
              </Link>
            </Button>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-[1100px] px-6 py-12">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h1 className="font-display text-3xl font-semibold tracking-tight">
              지난 피칭
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              총 {rows.length}회의 발표 기록
            </p>
          </div>
          <Button asChild>
            <Link href="/pitch/new">
              발표 시작 <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>

        {rows.length === 0 ? (
          <div className="rounded-md border border-border-faint border-dashed bg-surface-1 px-8 py-16 text-center">
            <p className="text-sm text-muted-foreground">
              아직 피칭이 없습니다.
            </p>
            <Button asChild className="mt-4">
              <Link href="/pitch/new">첫 피칭 시작하기</Link>
            </Button>
          </div>
        ) : (
          <ul className="divide-y divide-border-faint rounded-md border border-border-faint bg-surface-1">
            {rows.map((r) => (
              <li key={r.id}>
                <Link
                  href={
                    r.status === "completed"
                      ? `/pitch/${r.id}/report`
                      : `/pitch/${r.id}/live`
                  }
                  className="grid grid-cols-[auto_1fr_auto_auto_auto] items-center gap-4 px-4 py-3 hover:bg-surface-2 transition-colors"
                >
                  <span
                    className="block h-2 w-2 rounded-full"
                    style={{
                      background:
                        r.trust_score !== null
                          ? trustColor(r.trust_score)
                          : "var(--border)",
                    }}
                  />
                  <span className="truncate text-sm font-medium">
                    {r.title}
                  </span>
                  <Badge
                    variant={
                      r.status === "completed"
                        ? "success"
                        : r.status === "in_progress"
                          ? "primary"
                          : "default"
                    }
                  >
                    {r.status === "completed"
                      ? "완료"
                      : r.status === "in_progress"
                        ? "진행"
                        : "중단"}
                  </Badge>
                  <span className="font-mono text-xs text-subtle-foreground tabular-nums">
                    {r.duration_seconds
                      ? `${Math.floor(r.duration_seconds / 60)
                          .toString()
                          .padStart(2, "0")}:${(r.duration_seconds % 60)
                          .toString()
                          .padStart(2, "0")}`
                      : "—"}
                  </span>
                  <span className="font-mono text-lg font-semibold tabular-nums">
                    {r.trust_score !== null ? (
                      <span style={{ color: trustColor(r.trust_score) }}>
                        {Math.round(r.trust_score)}
                      </span>
                    ) : (
                      <span className="text-subtle-foreground">—</span>
                    )}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
