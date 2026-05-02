"use client";

import { motion, useScroll, useTransform } from "motion/react";
import Link from "next/link";

/**
 * 떠다니는 mono mark + nav. 스크롤 시작하면 솔리드 다크 패널이 깔려 흰 섹션
 * 위에서도 깨끗하게 읽힘. 글래스모피즘 회피 — semi-transparent 색감 X.
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
      <div className="mx-auto flex h-14 max-w-[1280px] items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2">
          <span
            aria-hidden
            className="grid h-5 w-5 place-items-center rounded-sm bg-white text-[10px] font-black text-black"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            T
          </span>
          <span
            className="font-mono text-[11px] uppercase tracking-[0.32em] text-white"
            style={{ fontFeatureSettings: '"tnum"' }}
          >
            TrustPitch
          </span>
        </Link>
        <nav className="flex items-center gap-6">
          <Link
            href="/dashboard"
            className="hidden font-mono text-[10.5px] uppercase tracking-[0.32em] text-white/55 transition-colors hover:text-white sm:inline"
          >
            Dashboard
          </Link>
          <Link
            href="/auth/login"
            className="font-mono text-[10.5px] uppercase tracking-[0.32em] text-white/55 transition-colors hover:text-white"
          >
            Sign in
          </Link>
          <Link
            href="/pitch/demo/live?title=Demo&demo=1"
            className="group inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-1.5 text-[12px] font-semibold text-black transition-transform hover:scale-[1.04]"
          >
            Try demo
            <span className="transition-transform group-hover:translate-x-0.5">→</span>
          </Link>
        </nav>
      </div>
    </motion.header>
  );
}
