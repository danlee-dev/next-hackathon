"use client";

import { type MotionValue, motion, useScroll, useTransform } from "motion/react";
import { useRef } from "react";

type Pillar = {
  num: string;
  label: string;
  title: string;
  copy: string;
  visual: "visual" | "audio" | "logic";
};

const PILLARS: readonly Pillar[] = [
  {
    num: "02",
    label: "Visual Trust",
    title: "시선과 자세를 30fps로 측정합니다.",
    copy: "MediaPipe Tasks Vision이 478개 얼굴 랜드마크와 33개 자세 포인트를 브라우저 안에서 추적해 아이컨택, 머리 안정성, 어깨 흔들림, 제스처 사용을 점수화합니다. 영상은 어떤 서버에도 보내지 않습니다.",
    visual: "visual",
  },
  {
    num: "03",
    label: "Verbal Trust",
    title: "한국어 필러워드 14종, 분당 글자수 280-320 sweet spot.",
    copy: "5초마다 음성 청크를 전송해 OpenAI Whisper로 전사하고, librosa로 피치 안정성·볼륨 일관성을 분석합니다. '음', '그러니까', '약간' 같은 한국어 특유의 추임새를 한자 단어와 분리해 감지합니다.",
    visual: "audio",
  },
  {
    num: "04",
    label: "Logical Trust",
    title: "GPT-4o가 IR 콘텐츠를 평가합니다.",
    copy: "발표 종료 후 LangGraph가 콘텐츠 분석과 세 심사위원 페르소나를 병렬로 실행해, 핵심 메시지 명확도, 주장-근거 균형, 공허한 수식어를 점수로 환산합니다. 그리고 다음 발표를 위한 액션 3가지를 돌려줍니다.",
    visual: "logic",
  },
];

export function Pillars() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });

  return (
    <section
      ref={ref}
      className="relative w-full bg-black text-white"
      style={{ height: `${PILLARS.length * 100}vh` }}
    >
      <div className="sticky top-0 grid h-screen w-full place-items-center overflow-hidden">
        <Stage progress={scrollYProgress} />
      </div>
    </section>
  );
}

function Stage({ progress }: { progress: MotionValue<number> }) {
  return (
    <div className="relative grid w-full max-w-[1280px] grid-cols-1 gap-12 px-8 md:grid-cols-[1fr_1fr] md:gap-20">
      <div className="relative flex flex-col justify-center md:min-h-[560px]">
        {PILLARS.map((p, i) => (
          <PillarText key={p.num} pillar={p} index={i} total={PILLARS.length} progress={progress} />
        ))}
      </div>
      <div className="relative flex items-center justify-center md:min-h-[560px]">
        {PILLARS.map((p, i) => (
          <VisualWrap key={p.num} pillar={p} index={i} total={PILLARS.length} progress={progress} />
        ))}
      </div>
      <div className="absolute right-8 top-0 hidden flex-col items-end gap-2 md:flex">
        {PILLARS.map((p, i) => (
          <ProgressDot
            key={p.num}
            label={p.label}
            num={p.num}
            index={i}
            total={PILLARS.length}
            progress={progress}
          />
        ))}
      </div>
    </div>
  );
}

function PillarText({
  pillar,
  index,
  total,
  progress,
}: {
  pillar: Pillar;
  index: number;
  total: number;
  progress: MotionValue<number>;
}) {
  const start = index / total;
  const end = (index + 1) / total;
  const fadeIn = start + (end - start) * 0.05;
  const fadeOut = end - (end - start) * 0.1;
  const opacity = useTransform(progress, [start, fadeIn, fadeOut, end], [0, 1, 1, 0]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      style={{ opacity }}
      className="absolute inset-0 flex flex-col justify-center opacity-0"
    >
      <div className="mb-5 flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.32em] text-white/45">
        <span>{pillar.num}</span>
        <span className="text-white/25">·</span>
        <span>{pillar.label}</span>
      </div>
      <h3
        className="text-balance font-medium leading-[1.05] text-white"
        style={{
          fontSize: "clamp(28px, 4.6vw, 60px)",
          letterSpacing: "-0.02em",
        }}
      >
        {pillar.title}
      </h3>
      <p className="mt-7 max-w-[480px] text-[15.5px] leading-[1.65] text-white/65">{pillar.copy}</p>
    </motion.div>
  );
}

function VisualWrap({
  pillar,
  index,
  total,
  progress,
}: {
  pillar: Pillar;
  index: number;
  total: number;
  progress: MotionValue<number>;
}) {
  const start = index / total;
  const end = (index + 1) / total;
  const opacity = useTransform(
    progress,
    [start, start + 0.05 / total + 0.04, end - 0.05, end],
    [0, 1, 1, 0],
  );
  const scale = useTransform(progress, [start, start + 0.5 / total], [0.94, 1]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      style={{ opacity, scale }}
      className="absolute inset-0 grid place-items-center opacity-0"
    >
      <Visual variant={pillar.visual} />
    </motion.div>
  );
}

function ProgressDot({
  label,
  num,
  index,
  total,
  progress,
}: {
  label: string;
  num: string;
  index: number;
  total: number;
  progress: MotionValue<number>;
}) {
  const start = index / total;
  const end = (index + 1) / total;
  const active = useTransform(progress, [start, start + 0.02], [0, 1]);
  const passed = useTransform(progress, [end - 0.02, end], [0, 1]);
  const dotW = useTransform(active, (v) => 8 + v * 22);
  const labelOpacity = useTransform(active, [0, 1], [0.3, 1]);
  const dotBg = useTransform(passed, (v) => `rgba(255,255,255,${0.35 + v * 0.55})`);

  return (
    <div className="flex items-center gap-2.5">
      <motion.span
        style={{ opacity: labelOpacity }}
        className="font-mono text-[10px] uppercase tracking-[0.32em] text-white"
      >
        {num} · {label}
      </motion.span>
      <motion.span
        style={{ width: dotW, background: dotBg }}
        className="block h-[2px] rounded-full"
        aria-hidden
      />
    </div>
  );
}

function Visual({ variant }: { variant: Pillar["visual"] }) {
  if (variant === "visual") return <VisualGaze />;
  if (variant === "audio") return <VisualWaveform />;
  return <VisualLogic />;
}

/** 시선 — 얼굴 mesh 점들 + 시선 ray. */
function VisualGaze() {
  const dots = Array.from({ length: 80 }).map((_, i) => {
    const angle = (i / 80) * Math.PI * 2;
    const r = 60 + (i % 7) * 8;
    const x = Math.cos(angle) * r;
    const y = Math.sin(angle) * r * 1.1;
    return { x, y, key: i };
  });
  return (
    <div className="relative grid h-[360px] w-[360px] place-items-center">
      <svg viewBox="-180 -180 360 360" className="h-full w-full">
        {dots.map((d) => (
          <circle key={d.key} cx={d.x} cy={d.y} r="1.2" fill="white" opacity="0.55" />
        ))}
        {/* eyes */}
        <circle cx="-22" cy="-12" r="3" fill="white" />
        <circle cx="22" cy="-12" r="3" fill="white" />
        <circle cx="-22" cy="-12" r="1.4" fill="oklch(0.74 0.15 195)" />
        <circle cx="22" cy="-12" r="1.4" fill="oklch(0.74 0.15 195)" />
        {/* gaze rays */}
        <line
          x1="-22"
          y1="-12"
          x2="-100"
          y2="-160"
          stroke="oklch(0.74 0.15 195)"
          strokeWidth="1"
          strokeDasharray="2 4"
          opacity="0.6"
        />
        <line
          x1="22"
          y1="-12"
          x2="100"
          y2="-160"
          stroke="oklch(0.74 0.15 195)"
          strokeWidth="1"
          strokeDasharray="2 4"
          opacity="0.6"
        />
      </svg>
      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 font-mono text-[10px] uppercase tracking-[0.32em] text-white/45">
        478 landmarks · 30fps
      </div>
    </div>
  );
}

/** 음성 — 정렬된 vertical bars (waveform), 한국어 자막 ticker. */
function VisualWaveform() {
  const bars = Array.from({ length: 60 }).map((_, i) => {
    const t = (i / 60) * Math.PI * 4;
    return 0.25 + (Math.sin(t) * 0.5 + 0.5) * 0.7;
  });
  return (
    <div className="relative grid h-[360px] w-[440px] place-items-center">
      <div className="relative h-[140px] w-full overflow-hidden">
        <div className="flex h-full items-center justify-center gap-1">
          {bars.map((h, i) => (
            <span
              key={i}
              className="block w-[3px] rounded-full bg-white"
              style={{
                height: `${h * 100}%`,
                opacity: 0.3 + h * 0.6,
                animation: "waveform 1.6s ease-in-out infinite",
                animationDelay: `${(i % 12) * 0.08}s`,
                transformOrigin: "center",
              }}
            />
          ))}
        </div>
      </div>
      <div className="mt-6 flex items-center gap-3 rounded-full border border-white/10 bg-black px-4 py-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.32em] text-white/40">
          Live transcript
        </span>
        <span className="text-[13px] text-white/85">
          음 그러니까 저희가{" "}
          <span className="text-[oklch(0.74_0.15_195)] underline decoration-wavy decoration-1 underline-offset-4">
            혁신적인
          </span>{" "}
          기술로
        </span>
      </div>
      <style jsx>{`
        @keyframes waveform {
          0%,
          100% {
            transform: scaleY(0.6);
          }
          50% {
            transform: scaleY(1);
          }
        }
      `}</style>
    </div>
  );
}

/** 논리 — 노드 그래프 (LangGraph 풍). */
function VisualLogic() {
  const nodes = [
    { id: "tx", x: 0, y: -120, label: "transcript" },
    { id: "ct", x: 0, y: -40, label: "content" },
    { id: "j1", x: -110, y: 60, label: "judge-fact" },
    { id: "j2", x: 0, y: 60, label: "judge-connect" },
    { id: "j3", x: 110, y: 60, label: "judge-critical" },
    { id: "ac", x: 0, y: 140, label: "actions" },
  ];
  const edges = [
    ["tx", "ct"],
    ["ct", "j1"],
    ["ct", "j2"],
    ["ct", "j3"],
    ["j1", "ac"],
    ["j2", "ac"],
    ["j3", "ac"],
  ];
  const map: Record<string, { x: number; y: number; label: string }> = {};
  for (const n of nodes) {
    map[n.id] = n;
  }
  return (
    <div className="relative grid h-[360px] w-[420px] place-items-center">
      <svg viewBox="-200 -180 400 360" className="h-full w-full">
        {edges.map(([a, b], i) => {
          const A = map[a];
          const B = map[b];
          return (
            <line
              key={i}
              x1={A.x}
              y1={A.y}
              x2={B.x}
              y2={B.y}
              stroke="white"
              strokeOpacity="0.18"
              strokeWidth="1"
              strokeDasharray="2 4"
            />
          );
        })}
        {nodes.map((n) => (
          <g key={n.id}>
            <circle cx={n.x} cy={n.y} r="6" fill="white" />
            <text
              x={n.x}
              y={n.y + 22}
              textAnchor="middle"
              fontSize="10"
              fontFamily="var(--font-mono)"
              fill="rgba(255,255,255,0.55)"
              letterSpacing="0.2em"
              style={{ textTransform: "uppercase" }}
            >
              {n.label}
            </text>
          </g>
        ))}
      </svg>
      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 font-mono text-[10px] uppercase tracking-[0.32em] text-white/45">
        LangGraph · fan-out
      </div>
    </div>
  );
}
