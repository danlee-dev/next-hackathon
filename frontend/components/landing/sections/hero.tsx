"use client";

import { motion, useScroll, useTransform } from "motion/react";
import Link from "next/link";
import { useRef } from "react";

const HEADING = "TRUSTPITCH";
const easeOut = [0.22, 1, 0.36, 1] as const;

export function Hero() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  // 워드마크: 진행률 0→1 동안 1배 → 4.8배 zoom + opacity decay.
  const titleScale = useTransform(scrollYProgress, [0, 1], [1, 4.8]);
  const titleOpacity = useTransform(scrollYProgress, [0, 0.55, 0.78], [1, 0.85, 0]);
  const titleTracking = useTransform(scrollYProgress, [0, 1], ["0.08em", "0.16em"]);

  // 그리드: 패럴랙스 + 빠르게 사라짐
  const gridY = useTransform(scrollYProgress, [0, 1], ["0%", "-18%"]);
  const gridOpacity = useTransform(scrollYProgress, [0, 0.6], [0.45, 0]);

  // 모서리 캡션 + 부제·CTA — 스크롤 시작과 동시에 페이드
  const captionOpacity = useTransform(scrollYProgress, [0, 0.35], [1, 0]);
  const subOpacity = useTransform(scrollYProgress, [0, 0.35], [1, 0]);
  const indicatorOpacity = useTransform(scrollYProgress, [0, 0.12], [1, 0]);

  return (
    <section
      ref={ref}
      className="relative flex h-screen w-full items-center justify-center overflow-hidden bg-black"
    >
      {/* 백그라운드 그리드 — 가장자리 자연 fade */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          y: gridY,
          opacity: gridOpacity,
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)",
          backgroundSize: "72px 72px",
          maskImage: "radial-gradient(ellipse 78% 70% at 50% 50%, #000 25%, transparent 75%)",
          WebkitMaskImage: "radial-gradient(ellipse 78% 70% at 50% 50%, #000 25%, transparent 75%)",
        }}
      />

      {/* 모서리 mono 캡션 */}
      <motion.div
        style={{ opacity: captionOpacity }}
        className="pointer-events-none absolute inset-0 z-[1] hidden md:block"
        aria-hidden
      >
        <div className="absolute left-8 top-24 font-mono text-[10.5px] uppercase tracking-[0.32em] text-white/35">
          Korean IR Coaching · 2026
        </div>
        <div className="absolute bottom-12 right-8 font-mono text-[10.5px] uppercase tracking-[0.32em] text-white/35">
          Three judges · One trust score
        </div>
        <div className="absolute right-8 top-24 font-mono text-[10.5px] uppercase tracking-[0.32em] text-white/35">
          Realtime · 100ms reaction
        </div>
        <div className="absolute bottom-12 left-8 font-mono text-[10.5px] uppercase tracking-[0.32em] text-white/35">
          Built for Korean founders
        </div>
      </motion.div>

      {/* 워드마크 + 부제·CTA */}
      <div className="relative z-10 flex flex-col items-center px-6 text-center">
        <motion.h1
          aria-label={HEADING}
          className="select-none text-white will-change-transform"
          style={{
            fontFamily: "var(--font-mono)",
            fontWeight: 700,
            letterSpacing: titleTracking,
            fontSize: "clamp(40px, 11vw, 168px)",
            lineHeight: 0.95,
            scale: titleScale,
            opacity: titleOpacity,
            transformOrigin: "center center",
          }}
        >
          {HEADING.split("").map((ch, i) => (
            <motion.span
              key={i}
              className="inline-block"
              initial={{ opacity: 0, y: "0.45em", filter: "blur(10px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{
                duration: 0.95,
                ease: easeOut,
                delay: 0.18 + i * 0.04,
              }}
            >
              {ch}
            </motion.span>
          ))}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: easeOut, delay: 0.95 }}
          style={{ opacity: subOpacity }}
          className="mt-9 max-w-[640px] text-balance text-[18px] leading-[1.55] text-white/70"
        >
          가상 AI 심사위원이 <span className="text-white">실시간으로 반응합니다.</span>
          <br className="hidden md:block" />
          한국어 IR 발표를 데이터로 측정하고, 단일 신뢰 점수로 압축합니다.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: easeOut, delay: 1.15 }}
          style={{ opacity: subOpacity }}
          className="mt-12 flex items-center gap-4"
        >
          <Link
            href="/pitch/demo/live?title=Demo&demo=1"
            className="group inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-[14px] font-semibold text-black transition-transform hover:scale-[1.03]"
          >
            60초 데모 시작
            <span className="transition-transform group-hover:translate-x-0.5">→</span>
          </Link>
          <Link
            href="/pitch/new"
            className="font-mono text-[12px] uppercase tracking-[0.32em] text-white/65 transition-colors hover:text-white"
          >
            실제 발표 시작
          </Link>
        </motion.div>
      </div>

      {/* 스크롤 인디케이터 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.7, duration: 0.6 }}
        style={{ opacity: indicatorOpacity }}
        className="absolute bottom-12 left-1/2 z-10 -translate-x-1/2"
      >
        <div className="flex flex-col items-center gap-2.5">
          <span className="font-mono text-[10px] tracking-[0.36em] text-white/40">SCROLL</span>
          <span
            aria-hidden
            className="block h-8 w-[1px] origin-top animate-[heroScrollLine_1.6s_ease-in-out_infinite] bg-white/55"
          />
        </div>
        <style jsx>{`
          @keyframes heroScrollLine {
            0%,
            100% {
              transform: scaleY(0.4);
              opacity: 0.3;
            }
            50% {
              transform: scaleY(1);
              opacity: 0.85;
            }
          }
        `}</style>
      </motion.div>
    </section>
  );
}
