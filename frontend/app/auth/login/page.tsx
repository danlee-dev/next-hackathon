"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { ArrowRight, Mail } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [loading, setLoading] = useState(false);

  async function onEmail(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    const fn =
      mode === "sign-in"
        ? supabase.auth.signInWithPassword({ email, password })
        : supabase.auth.signUp({
            email,
            password,
            options: {
              emailRedirectTo: `${window.location.origin}/auth/callback`,
            },
          });
    const { error } = await fn;
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (mode === "sign-up") {
      toast.success("이메일 인증을 확인하세요.");
      return;
    }
    router.push("/dashboard");
  }

  async function onGoogle() {
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    setLoading(false);
    if (error) toast.error(error.message);
  }

  return (
    <main className="grid min-h-dvh place-items-center px-6">
      <div className="w-full max-w-[420px]">
        <Link
          href="/"
          className="mb-8 flex items-center gap-2 font-mono text-sm text-muted-foreground hover:text-foreground"
        >
          <span className="block h-1.5 w-1.5 rounded-full bg-primary" />
          TrustPitch
        </Link>
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          {mode === "sign-in" ? "다시 오신 걸 환영합니다." : "계정을 만듭니다."}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">한국 IR 발표에 특화된 AI 코칭 서비스.</p>

        <form onSubmit={onEmail} className="mt-8 flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">이메일</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">비밀번호</Label>
            <Input
              id="password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="6자 이상"
              autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
            />
          </div>
          <Button type="submit" disabled={loading} size="lg">
            <Mail className="size-4" />
            {mode === "sign-in" ? "이메일로 로그인" : "이메일로 가입"}
            <ArrowRight className="size-4" />
          </Button>
        </form>

        <div className="my-6 flex items-center gap-3 text-xs uppercase text-subtle-foreground tracking-wider">
          <span className="h-px flex-1 bg-border-faint" />
          또는
          <span className="h-px flex-1 bg-border-faint" />
        </div>

        <Button
          type="button"
          variant="secondary"
          size="lg"
          onClick={onGoogle}
          disabled={loading}
          className="w-full"
        >
          Google로 계속하기
        </Button>

        <button
          type="button"
          onClick={() => setMode(mode === "sign-in" ? "sign-up" : "sign-in")}
          className="mt-6 w-full text-center text-xs text-muted-foreground hover:text-foreground"
        >
          {mode === "sign-in" ? "처음이신가요? 가입하기" : "이미 계정이 있으신가요? 로그인"}
        </button>
      </div>
    </main>
  );
}
