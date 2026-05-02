"use client";

import { LogoMark } from "@/components/brand/logo-mark";
import { motion, useScroll, useTransform } from "motion/react";
import Link from "next/link";

/**
 * 떠다니는 mono mark + nav. 스크롤 시작하면 솔리드 다크 패널이 깔려 흰 섹션
 * 위에서도 깨끗하게 읽힘. 글래스모피즘 회피 — semi-transparent 색감 X.
 *
 * Mobile: nav 의 Dashboard / Sign in 라벨은 숨기고 Try demo 만 우측. 워드마크는
 * 좌측 단독.
 */
export function LandingChrome() {
  const { scrollY } = useScroll();
  const bg = useTransform(scrollY, [0, 120], ["rgba(8,8,10,0)", "rgba(8,8,10,0.92)"]);
  const borderOpacity = useTransform(scrollY, [0, 120], [0, 0.08]);
  const borderBottom = useTransform(borderOpacity, (o) => `1px solid rgba(255,255,255,${o})`);

  return (
    <motion.header
      style={{ background: bg, borderBottom }}
      className="fixed inset-x-0 top-0 z-50 backdrop-blur-md"
    >
      <div className="mx-auto flex h-14 max-w-[1280px] items-center justify-between px-5 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <LogoMark size={22} />
          <span
            className="font-mono text-[11px] uppercase tracking-[0.32em] text-white"
            style={{ fontFeatureSettings: '"tnum"' }}
          >
            TrustPitch
          </span>
        </Link>
        <nav className="flex items-center gap-5 sm:gap-6">
          <Link
            href="/dashboard"
            className="hidden font-mono text-[10.5px] uppercase tracking-[0.32em] text-white/55 transition-colors hover:text-white sm:inline"
          >
            Dashboard
          </Link>
          <Link
            href="/auth/login"
            className="hidden font-mono text-[10.5px] uppercase tracking-[0.32em] text-white/55 transition-colors hover:text-white sm:inline"
          >
            Sign in
          </Link>
          <Link
            href="/pitch/demo/live?title=Demo&demo=1"
            className="group inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-[11.5px] font-semibold text-black transition-transform hover:scale-[1.04] sm:px-4 sm:text-[12px]"
          >
            Try demo
            <span className="transition-transform group-hover:translate-x-0.5">→</span>
          </Link>
        </nav>
      </div>
    </motion.header>
  );
}
