"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";

interface Props {
  trust: number;
}

type Tier = "strong" | "stable" | "caution" | "risk";

function trustTier(score: number): Tier {
  if (score >= 80) return "strong";
  if (score >= 65) return "stable";
  if (score >= 50) return "caution";
  return "risk";
}

const TIER_COLOR: Record<Tier, { number: string; bar: string; label: string; ring: string }> = {
  strong: {
    number: "text-white",
    bar: "bg-white",
    label: "text-white/55",
    ring: "border-white/8",
  },
  stable: {
    number: "text-white",
    bar: "bg-white",
    label: "text-white/55",
    ring: "border-white/8",
  },
  caution: {
    number: "text-amber-300",
    bar: "bg-amber-300",
    label: "text-amber-300/85",
    ring: "border-amber-300/30",
  },
  risk: {
    number: "text-red-400",
    bar: "bg-red-400",
    label: "text-red-300",
    ring: "border-red-400/45",
  },
};

const TIER_LABEL: Record<Tier, string> = {
  strong: "Strong",
  stable: "Stable",
  caution: "Caution",
  risk: "Risk",
};

export function TrustScoreCard({ trust }: Props) {
  const rounded = Math.round(trust);
  const prevRef = useRef<number>(rounded);
  const [delta, setDelta] = useState<{ value: number; key: number } | null>(null);
  const tier = trustTier(rounded);
  const palette = TIER_COLOR[tier];

  useEffect(() => {
    const prev = prevRef.current;
    if (Math.abs(prev - rounded) >= 2) {
      setDelta({ value: rounded - prev, key: performance.now() });
      const t = window.setTimeout(() => setDelta(null), 800);
      prevRef.current = rounded;
      return () => window.clearTimeout(t);
    }
    prevRef.current = rounded;
  }, [rounded]);

  return (
    <motion.div
      animate={
        tier === "risk"
          ? {
              boxShadow: [
                "0 0 0 0 rgba(248,113,113,0)",
                "0 0 18px 0 rgba(248,113,113,0.45)",
                "0 0 0 0 rgba(248,113,113,0)",
              ],
            }
          : { boxShadow: "0 0 0 0 rgba(0,0,0,0)" }
      }
      transition={
        tier === "risk"
          ? { duration: 1.6, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }
          : { duration: 0.3 }
      }
      className={`rounded-2xl border bg-black px-5 py-5 transition-colors ${palette.ring}`}
    >
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.32em] text-white/45">
          Trust score
        </span>
        <span
          className={`font-mono text-[10px] uppercase tracking-[0.32em] transition-colors ${palette.label}`}
        >
          {TIER_LABEL[tier]}
        </span>
      </div>
      <div className="relative mt-3 flex items-baseline gap-2">
        <AnimatePresence mode="popLayout">
          <motion.span
            key={rounded}
            initial={{ y: -8, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 6, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 26 }}
            className={`font-mono text-[56px] font-medium leading-none tabular-nums transition-colors ${palette.number}`}
          >
            {rounded}
          </motion.span>
        </AnimatePresence>
        <span className="font-mono text-[20px] text-white/30">/100</span>
        <AnimatePresence>
          {delta ? (
            <motion.span
              key={delta.key}
              initial={{ y: 0, opacity: 0.9 }}
              animate={{ y: delta.value > 0 ? -22 : 22, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.7, ease: "easeOut" }}
              className={`pointer-events-none absolute left-0 top-0 font-mono text-[14px] font-medium tabular-nums ${
                delta.value < 0 ? "text-red-300" : "text-emerald-300"
              }`}
            >
              {delta.value > 0 ? "+" : ""}
              {delta.value}
            </motion.span>
          ) : null}
        </AnimatePresence>
      </div>
      <div className="mt-4 h-[2px] w-full overflow-hidden rounded-full bg-white/8">
        <motion.div
          className={`h-full rounded-full transition-colors ${palette.bar}`}
          animate={{ width: `${rounded}%` }}
          transition={{ type: "spring", stiffness: 200, damping: 25 }}
        />
      </div>
    </motion.div>
  );
}
