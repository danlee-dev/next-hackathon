"use client";

import { motion, useScroll, useTransform } from "motion/react";
import { useRef } from "react";

const JUDGES_DATA = [
  {
    nameKo: "김팩트",
    nameEn: "Mr. Fact",
    persona: "데이터 기반 냉철한 투자자",
    quote: "근거 없는 단정은 위험합니다.",
  },
  {
    nameKo: "이공감",
    nameEn: "Ms. Connect",
    persona: "태도와 진정성을 보는 창업가 출신",
    quote: "눈을 봐주세요.",
  },
  {
    nameKo: "박독설",
    nameEn: "Dr. Critical",
    persona: "디테일에 강한 독설가 전문가",
    quote: "추임새를 줄이세요.",
  },
];

export function Judges() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const headingOpacity = useTransform(scrollYProgress, [0, 0.2, 0.85, 1], [0, 1, 1, 0.6]);
  const headingY = useTransform(scrollYProgress, [0, 0.25], [40, 0]);

  return (
    <section ref={ref} className="relative w-full bg-black py-[20vh] text-white">
      <div className="mx-auto max-w-[1280px] px-8">
        <motion.div
          style={{ opacity: headingOpacity, y: headingY }}
          className="mx-auto max-w-[820px] text-center"
        >
          <div className="mb-5 font-mono text-[10.5px] uppercase tracking-[0.32em] text-white/45">
            05 · The Judges
          </div>
          <h2
            className="text-balance font-medium leading-[1.06]"
            style={{ fontSize: "clamp(36px, 5.6vw, 76px)", letterSpacing: "-0.022em" }}
          >
            세 명의 가상 심사위원이
            <br />
            실시간으로 반응합니다.
          </h2>
          <p className="mx-auto mt-6 max-w-[560px] text-[15.5px] leading-[1.65] text-white/60">
            각자 다른 페르소나, 다른 트리거. 발표자의 신호가 임계값을 넘는 순간 표정과 코멘트가
            바뀝니다.
          </p>
        </motion.div>

        <div className="mt-24 grid gap-px overflow-hidden rounded-2xl bg-white/8 md:grid-cols-3">
          {JUDGES_DATA.map((j, i) => (
            <JudgeRow key={j.nameKo} judge={j} index={i} progress={scrollYProgress} />
          ))}
        </div>
      </div>
    </section>
  );
}

function JudgeRow({
  judge,
  index,
  progress,
}: {
  judge: (typeof JUDGES_DATA)[number];
  index: number;
  progress: ReturnType<typeof useScroll>["scrollYProgress"];
}) {
  const reveal = useTransform(progress, [0.25 + index * 0.05, 0.4 + index * 0.05], [0, 1]);
  const opacity = useTransform(reveal, [0, 1], [0, 1]);
  const y = useTransform(reveal, [0, 1], [22, 0]);

  return (
    <motion.div
      style={{ opacity, y }}
      className="relative flex flex-col items-start gap-6 bg-black p-10 transition-colors hover:bg-white/[0.02]"
    >
      <span className="font-mono text-[10px] uppercase tracking-[0.32em] text-white/40">
        0{index + 1} / {JUDGES_DATA.length}
      </span>

      {/* abstract face */}
      <div className="flex h-[180px] w-full items-center justify-center">
        <FaceMark index={index} />
      </div>

      <div>
        <div className="text-[22px] font-medium tracking-tight">
          {judge.nameKo}
          <span className="ml-2 font-mono text-[11px] uppercase tracking-[0.24em] text-white/45">
            {judge.nameEn}
          </span>
        </div>
        <div className="mt-1 text-[13px] text-white/60">{judge.persona}</div>
      </div>

      <div className="mt-2 border-l border-white pl-4 text-[15px] leading-[1.5] text-white/85">
        “{judge.quote}”
      </div>
    </motion.div>
  );
}

function FaceMark({ index }: { index: number }) {
  // 단순한 monochrome 얼굴 표식 — 점, 라인, 광선 (구분선 X, 의미가 있는 라인만)
  return (
    <svg viewBox="-90 -90 180 180" className="h-full w-auto">
      <circle
        cx="0"
        cy="0"
        r="62"
        stroke="white"
        strokeOpacity="0.18"
        strokeWidth="1"
        fill="none"
      />
      <circle cx="0" cy="0" r="40" stroke="white" strokeOpacity="0.4" strokeWidth="1" fill="none" />
      {/* eyes */}
      <circle cx="-14" cy="-6" r="2.4" fill="white" />
      <circle cx="14" cy="-6" r="2.4" fill="white" />
      {/* mouth — index 따라 다르게 */}
      {index === 0 ? (
        <line
          x1="-14"
          y1="14"
          x2="14"
          y2="14"
          stroke="white"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      ) : index === 1 ? (
        <path
          d="M -14 12 Q 0 22 14 12"
          stroke="white"
          strokeWidth="1.5"
          strokeLinecap="round"
          fill="none"
        />
      ) : (
        <path
          d="M -14 16 Q 0 8 14 16"
          stroke="white"
          strokeWidth="1.5"
          strokeLinecap="round"
          fill="none"
        />
      )}
      {/* gaze ray */}
      <line
        x1="0"
        y1="0"
        x2="0"
        y2="-78"
        stroke="white"
        strokeOpacity="0.3"
        strokeWidth="0.6"
        strokeDasharray="2 4"
      />
    </svg>
  );
}
