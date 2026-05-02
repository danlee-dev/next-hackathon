import { AppShell } from "@/components/landing/landing-shell";
import { DiscoverWorkspace } from "./discover-workspace";

/**
 * Discover — 공개된 IR 피치 영상을 다른 투자자가 둘러보고 LOI 제출.
 * 본인 피치 세션의 trust score / breakdown 이 그대로 노출돼 투자자가 신호로 활용.
 * mock 데이터 우선 — Supabase `pitch_sessions.is_public` + `investments` 연결은 다음 단계.
 */
export default function DiscoverPage() {
  return (
    <AppShell active="discover" width="wide" padding="flush">
      <DiscoverWorkspace />
    </AppShell>
  );
}
