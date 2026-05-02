"use client";

import { motion, useScroll, useTransform } from "motion/react";
import Link from "next/link";
import { useRef } from "react";

export function Cta() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end center"],
  });

  const titleY = useTransform(scrollYProgress, [0, 0.6], [40, 0]);
  const titleOpacity = useTransform(scrollYProgress, [0, 0.5], [0, 1]);

  return (
    <section ref={ref} className="relative w-full overflow-hidden bg-white py-[26vh] text-black">
      <div className="mx-auto max-w-[1100px] px-8 text-center">
        <motion.div style={{ opacity: titleOpacity, y: titleY }}>
          <div className="mb-6 font-mono text-[10.5px] uppercase tracking-[0.32em] text-black/45">
            06 · Run it before your next IR
          </div>
          <h2
            className="text-balance font-medium leading-[1.04]"
            style={{ fontSize: "clamp(40px, 7vw, 104px)", letterSpacing: "-0.028em" }}
          >
            다음 IR 전,
            <br />한 번만 돌려보세요.
          </h2>
          <p className="mx-auto mt-8 max-w-[600px] text-[16px] leading-[1.6] text-black/55">
            60초 안에 끝납니다. 계정 없이 데모 모드부터 보고, 실제 발표는 로그인 후 시작하세요.
          </p>

          <div className="mt-12 flex flex-wrap items-center justify-center gap-5">
            <Link
              href="/pitch/demo/live?title=Demo&demo=1"
              className="group inline-flex items-center gap-2 rounded-full bg-black px-7 py-3.5 text-[14px] font-semibold text-white transition-transform hover:scale-[1.04]"
            >
              60초 데모 시작
              <span className="transition-transform group-hover:translate-x-0.5">→</span>
            </Link>
            <Link
              href="/auth/login"
              className="font-mono text-[12px] uppercase tracking-[0.32em] text-black/65 transition-colors hover:text-black"
            >
              로그인 후 실제 발표
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
