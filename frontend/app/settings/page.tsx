"use client";

import { AppShell } from "@/components/landing/landing-shell";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function SettingsPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) router.replace("/auth/login");
      else setEmail(user.email ?? null);
    });
  }, [router]);

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/");
  }

  return (
    <AppShell active="settings">
      <div className="mb-2 font-mono text-[10.5px] uppercase tracking-[0.32em] text-white/45">
        Account · 01
      </div>
      <h1
        className="mb-12 text-balance font-medium leading-[1.04]"
        style={{ fontSize: "clamp(36px, 4.6vw, 64px)", letterSpacing: "-0.024em" }}
      >
        계정 설정
      </h1>

      <div className="overflow-hidden rounded-2xl border border-white/8">
        <div className="flex items-center justify-between px-6 py-5">
          <div>
            <div className="font-mono text-[10.5px] uppercase tracking-[0.32em] text-white/45">
              Email
            </div>
            <div className="mt-1.5 text-[14.5px] text-white">{email ?? "—"}</div>
          </div>
          <span className="font-mono text-[10.5px] uppercase tracking-[0.32em] text-white/55">
            Signed in
          </span>
        </div>
      </div>

      <div className="mt-6">
        <button
          type="button"
          onClick={signOut}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-white/15 px-5 text-[13.5px] text-white transition-colors hover:border-white/35 hover:bg-white/[0.04]"
        >
          로그아웃
        </button>
      </div>
    </AppShell>
  );
}
