"use client";

import Link from "next/link";

export function LandingFooter() {
  return (
    <footer className="relative w-full bg-black text-white">
      <div className="mx-auto flex max-w-[1280px] flex-col gap-10 px-8 py-16 md:flex-row md:items-end md:justify-between">
        <div>
          <span
            className="block font-mono text-[42px] font-bold leading-none tracking-[-0.02em] text-white"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            TRUSTPITCH
          </span>
          <p className="mt-4 max-w-[420px] text-[13.5px] leading-[1.6] text-white/55">
            한국어 IR 환경에 특화된 실시간 피칭 코칭. 가상 AI 심사위원 셋이 발표를 보고, 듣고, 즉각
            반응합니다.
          </p>
        </div>

        <nav className="grid grid-cols-2 gap-x-12 gap-y-3 text-[12px] md:grid-cols-3">
          <FooterLink href="/pitch/demo/live?title=Demo&demo=1">데모</FooterLink>
          <FooterLink href="/pitch/new">발표 시작</FooterLink>
          <FooterLink href="/auth/login">로그인</FooterLink>
          <FooterLink href="/dashboard">대시보드</FooterLink>
          <FooterLink href="https://github.com/danlee-dev/next-hackathon" external>
            GitHub
          </FooterLink>
        </nav>
      </div>

      <div className="mx-auto flex max-w-[1280px] flex-col items-start justify-between gap-2 border-t border-white/10 px-8 py-6 text-[11px] text-white/40 md:flex-row md:items-center">
        <span className="font-mono uppercase tracking-[0.32em]">
          Built for Korean founders · 2026
        </span>
        <span className="font-mono uppercase tracking-[0.32em]">MIT License</span>
      </div>
    </footer>
  );
}

function FooterLink({
  href,
  external,
  children,
}: {
  href: string;
  external?: boolean;
  children: React.ReactNode;
}) {
  const cls =
    "font-mono uppercase tracking-[0.24em] text-white/55 transition-colors hover:text-white";
  if (external) {
    return (
      <a href={href} target="_blank" rel="noreferrer noopener" className={cls}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={cls}>
      {children}
    </Link>
  );
}
