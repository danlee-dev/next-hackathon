"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSession } from "@/lib/api-client";
import { createClient } from "@/lib/supabase/client";
import { AlertCircle, ArrowRight, Camera, Check, Mic } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type Permission = "idle" | "ok" | "denied";

export default function NewPitchPage() {
  const router = useRouter();
  const [title, setTitle] = useState("Q3 시드 IR");
  const [camPerm, setCamPerm] = useState<Permission>("idle");
  const [micPerm, setMicPerm] = useState<Permission>("idle");
  const [submitting, setSubmitting] = useState(false);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) router.replace("/auth/login");
      else setAuthReady(true);
    });
  }, [router]);

  async function requestPermissions() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
        audio: true,
      });
      stream.getTracks().forEach((t) => t.stop());
      setCamPerm("ok");
      setMicPerm("ok");
      toast.success("권한 확인 완료");
    } catch {
      setCamPerm("denied");
      setMicPerm("denied");
      toast.error("카메라·마이크 권한이 거부되었습니다.");
    }
  }

  async function startSession() {
    if (camPerm !== "ok" || micPerm !== "ok") {
      toast.error("먼저 권한을 허용해 주세요.");
      return;
    }
    setSubmitting(true);
    try {
      // Try to create session via Railway. If unavailable (해커톤 dev),
      // fall back to client-only UUID — Live page handles both paths.
      let id: string | null = null;
      try {
        const res = await createSession(title);
        id = res.session_id;
      } catch {
        id = crypto.randomUUID();
        toast.info("백엔드 미연결 — 로컬 모드로 시작합니다.");
      }
      router.push(`/pitch/${id}/live?title=${encodeURIComponent(title)}`);
    } finally {
      setSubmitting(false);
    }
  }

  if (!authReady) {
    return (
      <main className="grid min-h-dvh place-items-center text-muted-foreground text-sm">
        loading...
      </main>
    );
  }

  return (
    <main className="grid min-h-dvh place-items-center px-6">
      <div className="w-full max-w-[520px]">
        <Link
          href="/dashboard"
          className="mb-6 inline-flex font-mono text-xs text-muted-foreground hover:text-foreground"
        >
          ← 대시보드
        </Link>

        <h1 className="font-display text-2xl font-semibold tracking-tight">
          새 피칭을 시작합니다.
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          카메라와 마이크 권한이 필요합니다. 모든 분석은 본인 계정에만 저장됩니다.
        </p>

        <div className="mt-8 flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="title">세션 이름</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: Q3 시드 IR 1차 리허설"
            />
          </div>
        </div>

        <div className="mt-6 grid gap-2">
          <PermissionRow icon={<Camera className="size-4" />} label="카메라" state={camPerm} />
          <PermissionRow icon={<Mic className="size-4" />} label="마이크" state={micPerm} />
        </div>

        <div className="mt-6 flex flex-col gap-3">
          {camPerm !== "ok" || micPerm !== "ok" ? (
            <Button onClick={requestPermissions} variant="secondary" size="lg">
              권한 요청
            </Button>
          ) : null}
          <Button
            onClick={startSession}
            disabled={submitting || camPerm !== "ok" || micPerm !== "ok"}
            size="lg"
          >
            발표 시작 <ArrowRight className="size-4" />
          </Button>
        </div>

        <Badge variant="outline" className="mt-6">
          5초 청크 · 100ms 트리거 · 5축 측정
        </Badge>
      </div>
    </main>
  );
}

function PermissionRow({
  icon,
  label,
  state,
}: {
  icon: React.ReactNode;
  label: string;
  state: Permission;
}) {
  return (
    <div className="flex items-center justify-between rounded-sm border border-border-faint bg-surface-1 px-3 py-2.5">
      <span className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">{icon}</span>
        {label}
      </span>
      {state === "ok" ? (
        <span className="flex items-center gap-1 text-xs text-trust-high font-mono">
          <Check className="size-3.5" /> READY
        </span>
      ) : state === "denied" ? (
        <span className="flex items-center gap-1 text-xs text-trust-low font-mono">
          <AlertCircle className="size-3.5" /> DENIED
        </span>
      ) : (
        <span className="text-xs text-subtle-foreground font-mono">PENDING</span>
      )}
    </div>
  );
}
