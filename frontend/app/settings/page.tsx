"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";

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
    <main className="min-h-dvh">
      <header className="border-b border-border-faint">
        <div className="mx-auto flex h-14 max-w-[700px] items-center justify-between px-6">
          <Link href="/dashboard" className="font-mono text-sm">
            ← 대시보드
          </Link>
          <span className="text-sm text-muted-foreground">설정</span>
        </div>
      </header>
      <section className="mx-auto max-w-[700px] px-6 py-12">
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          계정 설정
        </h1>
        <div className="mt-8 flex flex-col gap-4">
          <div className="flex items-center justify-between rounded-md border border-border-faint bg-surface-1 px-5 py-4">
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">
                이메일
              </div>
              <div className="font-mono text-sm">{email ?? "—"}</div>
            </div>
            <Badge variant="primary">SIGNED IN</Badge>
          </div>
          <Button onClick={signOut} variant="destructive">
            로그아웃
          </Button>
        </div>
      </section>
    </main>
  );
}
