"use client";

import { LogoMark } from "@/components/brand/logo-mark";
import Link from "next/link";

/**
 * 랜딩 톤을 그대로 가져온 *앱 shell* — auth 후 페이지(대시보드/세션/설정)에서 사용.
 * 검정 배경 + 흰 텍스트, 떠 있는 chrome (랜딩과 동일한 시각 언어).
 */
export function AppShell({
  children,
  active,
  width = "default",
  padding = "default",
}: {
  children: React.ReactNode;
  active?: "dashboard" | "settings" | "new" | "discover";
  width?: "default" | "wide" | "full";
  padding?: "default" | "flush";
}) {
  const maxW =
    width === "full" ? "max-w-none" : width === "wide" ? "max-w-[1440px]" : "max-w-[1100px]";
  const bodyPad = padding === "flush" ? "px-0 py-0" : "px-6 py-12";
  return (
    <div className="relative min-h-dvh bg-black text-white">
      <header className="sticky top-0 z-30 border-b border-white/8 bg-black/85 backdrop-blur-md">
        <div className={`mx-auto flex h-14 ${maxW} items-center justify-between px-5 sm:px-6`}>
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <LogoMark size={22} />
            <span className="font-mono text-[11px] uppercase tracking-[0.32em] text-white">
              TrustPitch
            </span>
          </Link>
          <nav className="flex items-center gap-5 sm:gap-6">
            <NavLink href="/dashboard" active={active === "dashboard"} className="hidden md:inline">
              Dashboard
            </NavLink>
            <NavLink href="/discover" active={active === "discover"} className="hidden md:inline">
              Discover
            </NavLink>
            <NavLink href="/settings" active={active === "settings"} className="hidden md:inline">
              Settings
            </NavLink>
            <Link
              href="/pitch/new"
              className="group inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-[11.5px] font-semibold text-black transition-transform hover:scale-[1.04] sm:px-4 sm:text-[12px]"
            >
              New pitch
              <span className="transition-transform group-hover:translate-x-0.5">→</span>
            </Link>
          </nav>
        </div>
      </header>
      <div className={`mx-auto ${maxW} ${bodyPad}`}>{children}</div>
    </div>
  );
}

function NavLink({
  href,
  active,
  className,
  children,
}: {
  href: string;
  active?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`font-mono text-[10.5px] uppercase tracking-[0.32em] transition-colors ${active ? "text-white" : "text-white/55 hover:text-white"} ${className ?? ""}`}
    >
      {children}
    </Link>
  );
}
