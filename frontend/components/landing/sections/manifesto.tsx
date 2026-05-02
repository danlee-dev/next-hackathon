"use client";

import { motion, useScroll, useTransform } from "motion/react";
import { useRef } from "react";

const LINES = [
  "IR 발표에서 가장 비싼 비용은 시간이 아니라,",
  "투자자의 본능적인 불신입니다.",
  "시선 회피, 잦은 추임새, 공허한 수식어 —",
  "이 신호를 데이터로 측정해 단일 점수로 압축합니다.",
  "더 이상 감으로 발표하지 마세요.",
];

export function Manifesto() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  return (
    <section ref={ref} className="relative w-full bg-white py-[28vh] text-black">
      <div className="mx-auto max-w-[1100px] px-8">
        <div className="mb-20 flex items-baseline justify-between">
          <span className="font-mono text-[10.5px] uppercase tracking-[0.32em] text-black/45">
            Manifesto · 01
          </span>
          <span className="hidden font-mono text-[10.5px] uppercase tracking-[0.32em] text-black/45 md:inline">
            45초 read
          </span>
        </div>

        <h2
          className="text-balance font-medium leading-[1.08]"
          style={{
            fontSize: "clamp(34px, 5.4vw, 80px)",
            letterSpacing: "-0.022em",
          }}
        >
          {LINES.map((line, i) => (
            <ManifestoLine
              key={i}
              line={line}
              index={i}
              progress={scrollYProgress}
              total={LINES.length}
            />
          ))}
        </h2>
      </div>
    </section>
  );
}

function ManifestoLine({
  line,
  index,
  total,
  progress,
}: {
  line: string;
  index: number;
  total: number;
  progress: ReturnType<typeof useScroll>["scrollYProgress"];
}) {
  const start = 0.15 + (0.6 / total) * index;
  const end = start + 0.6 / total + 0.05;
  const opacity = useTransform(progress, [start, end], [0.18, 1]);
  const y = useTransform(progress, [start, end], [12, 0]);
  const blur = useTransform(progress, [start, end], [4, 0]);

  return (
    <motion.span
      className="block"
      style={{
        opacity,
        y,
        filter: useTransform(blur, (b) => `blur(${b}px)`),
      }}
    >
      {line}
    </motion.span>
  );
}
