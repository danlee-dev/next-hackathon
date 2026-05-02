"use client";

import { createSession } from "@/lib/api-client";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

type Permission = "idle" | "ok" | "denied";

export default function NewPitchPage() {
  const router = useRouter();
  const [title, setTitle] = useState("Q3 시드 IR");
  const [script, setScript] = useState("");
  const [criteria, setCriteria] = useState("");
  const [deck, setDeck] = useState<File | null>(null);
  const [camPerm, setCamPerm] = useState<Permission>("idle");
  const [micPerm, setMicPerm] = useState<Permission>("idle");
  const [submitting, setSubmitting] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

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
      for (const t of stream.getTracks()) t.stop();
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
      let id: string | null = null;
      try {
        const res = await createSession({
          title,
          script: script || undefined,
          judgingCriteria: criteria || undefined,
          deck,
        });
        id = res.session_id;
      } catch (e) {
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
      <main className="grid min-h-dvh place-items-center bg-black">
        <span className="font-mono text-[10.5px] uppercase tracking-[0.32em] text-white/40">
          authenticating...
        </span>
      </main>
    );
  }

  return (
    <main className="relative min-h-dvh bg-black px-6 py-16 text-white sm:py-24">
      <div className="pointer-events-none absolute inset-0 opacity-[0.04]">
        <div
          aria-hidden
          className="h-full w-full"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)",
            backgroundSize: "72px 72px",
            maskImage: "radial-gradient(ellipse 60% 60% at 50% 50%, #000 25%, transparent 75%)",
            WebkitMaskImage:
              "radial-gradient(ellipse 60% 60% at 50% 50%, #000 25%, transparent 75%)",
          }}
        />
      </div>

      <div className="relative mx-auto w-full max-w-[560px]">
        <Link
          href="/dashboard"
          className="mb-10 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.32em] text-white/55 transition-colors hover:text-white"
        >
          ← Dashboard
        </Link>

        <div className="mb-2 font-mono text-[10.5px] uppercase tracking-[0.32em] text-white/45">
          New session
        </div>
        <h1
          className="text-balance font-medium leading-[1.06]"
          style={{ fontSize: "clamp(28px, 4.2vw, 48px)", letterSpacing: "-0.024em" }}
        >
          새 피칭을 시작합니다.
        </h1>
        <p className="mt-3 max-w-[460px] text-[14.5px] leading-[1.6] text-white/55">
          영상은 어떤 서버에도 보내지 않고 브라우저 안에서만 분석됩니다. 발표 대본·IR 덱·심사 기준을
          넣어주면 평가가 훨씬 정확해집니다.
        </p>

        <div className="mt-10 grid gap-6">
          <Field id="title" label="세션 이름">
            <input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: Q3 시드 IR 1차 리허설"
              className="h-11 w-full rounded-lg border border-white/12 bg-black px-4 text-[14px] text-white placeholder:text-white/30 transition-colors focus:border-white/45 focus:outline-none"
            />
          </Field>

          <Field id="script" label="발표 대본" optional hint="평가가 대본을 안 만큼 정확해집니다">
            <textarea
              id="script"
              value={script}
              onChange={(e) => setScript(e.target.value)}
              rows={5}
              placeholder="안녕하세요, 저희는 …"
              className="w-full resize-y rounded-lg border border-white/12 bg-black px-4 py-3 text-[14px] leading-relaxed text-white placeholder:text-white/30 transition-colors focus:border-white/45 focus:outline-none"
            />
          </Field>

          <Field id="criteria" label="심사 기준" optional hint="해커톤 심사표·VC 평가 항목 등">
            <textarea
              id="criteria"
              value={criteria}
              onChange={(e) => setCriteria(e.target.value)}
              rows={3}
              placeholder="예: 1) 시장 규모 2) 차별점 3) 팀 4) Traction"
              className="w-full resize-y rounded-lg border border-white/12 bg-black px-4 py-3 text-[14px] leading-relaxed text-white placeholder:text-white/30 transition-colors focus:border-white/45 focus:outline-none"
            />
          </Field>

          <Field id="deck" label="IR 피치 덱" optional hint="PDF · 최대 8 KB 텍스트 추출">
            <div
              className={`flex items-center justify-between rounded-lg border bg-black px-4 py-3 transition-colors ${deck ? "border-white/35" : "border-white/12 hover:border-white/25"}`}
            >
              <div className="min-w-0 flex-1">
                {deck ? (
                  <>
                    <div className="truncate text-[13.5px] text-white">{deck.name}</div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-white/45">
                      {(deck.size / 1024).toFixed(1)} KB · uploaded
                    </div>
                  </>
                ) : (
                  <div className="text-[13.5px] text-white/55">파일을 선택하지 않음</div>
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="application/pdf"
                onChange={(e) => setDeck(e.target.files?.[0] ?? null)}
                className="sr-only"
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="font-mono text-[10.5px] uppercase tracking-[0.32em] text-white/55 transition-colors hover:text-white"
              >
                {deck ? "교체" : "PDF 선택"}
              </button>
              {deck ? (
                <button
                  type="button"
                  onClick={() => {
                    setDeck(null);
                    if (fileRef.current) fileRef.current.value = "";
                  }}
                  className="ml-3 font-mono text-[10.5px] uppercase tracking-[0.32em] text-white/35 transition-colors hover:text-white/85"
                >
                  제거
                </button>
              ) : null}
            </div>
          </Field>
        </div>

        <div className="mt-10">
          <div className="mb-3 font-mono text-[10.5px] uppercase tracking-[0.32em] text-white/45">
            Permissions
          </div>
          <div className="grid gap-2">
            <PermissionRow label="카메라" state={camPerm} />
            <PermissionRow label="마이크" state={micPerm} />
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3">
          {camPerm !== "ok" || micPerm !== "ok" ? (
            <button
              type="button"
              onClick={requestPermissions}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full border border-white/15 px-5 text-[14px] font-medium text-white transition-colors hover:border-white/35 hover:bg-white/[0.04]"
            >
              권한 요청
            </button>
          ) : null}
          <button
            type="button"
            onClick={startSession}
            disabled={submitting || camPerm !== "ok" || micPerm !== "ok"}
            className="group inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-white px-5 text-[14px] font-semibold text-black transition-transform hover:scale-[1.02] disabled:opacity-50"
          >
            {submitting ? "준비 중..." : "발표 시작"}
            {!submitting && (
              <span className="transition-transform group-hover:translate-x-0.5">→</span>
            )}
          </button>
        </div>

        <div className="mt-8 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.32em] text-white/30">
          <span className="h-px flex-1 bg-white/10" />
          또는
          <span className="h-px flex-1 bg-white/10" />
        </div>

        <Link
          href="/pitch/demo/live?title=Demo&demo=1"
          className="mt-4 block text-center font-mono text-[10.5px] uppercase tracking-[0.32em] text-white/55 transition-colors hover:text-white"
        >
          권한 없이 60초 데모 보기 →
        </Link>
      </div>
    </main>
  );
}

function Field({
  id,
  label,
  optional,
  hint,
  children,
}: {
  id: string;
  label: string;
  optional?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <label
          htmlFor={id}
          className="font-mono text-[10.5px] uppercase tracking-[0.32em] text-white/55"
        >
          {label}
          {optional ? <span className="ml-2 text-white/30">· optional</span> : null}
        </label>
        {hint ? (
          <span className="font-mono text-[10px] tracking-[0.24em] text-white/35">{hint}</span>
        ) : null}
      </div>
      {children}
    </div>
  );
}

function PermissionRow({ label, state }: { label: string; state: Permission }) {
  const stateLabel = state === "ok" ? "READY" : state === "denied" ? "DENIED" : "PENDING";
  const stateColor =
    state === "ok" ? "text-white" : state === "denied" ? "text-white/85" : "text-white/35";
  return (
    <div className="flex items-center justify-between rounded-lg border border-white/8 bg-black px-4 py-3">
      <span className="text-[14px]">{label}</span>
      <span className={`font-mono text-[10.5px] uppercase tracking-[0.32em] ${stateColor}`}>
        {stateLabel}
      </span>
    </div>
  );
}
