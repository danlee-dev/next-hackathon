"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";

interface Props {
  trust: number;
}

export function TrustScoreCard({ trust }: Props) {
  const rounded = Math.round(trust);
  const prevRef = useRef<number>(rounded);
  const [delta, setDelta] = useState<{ value: number; key: number } | null>(null);

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
    <div className="rounded-2xl border border-white/8 bg-black px-5 py-5">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.32em] text-white/45">
          Trust score
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.32em] text-white/55">
          {trustLabel(trust)}
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
            className="font-mono text-[56px] font-medium leading-none tabular-nums text-white"
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
              className="pointer-events-none absolute left-0 top-0 font-mono text-[14px] font-medium tabular-nums text-white/85"
            >
              {delta.value > 0 ? "+" : ""}
              {delta.value}
            </motion.span>
          ) : null}
        </AnimatePresence>
      </div>
      <div className="mt-4 h-[2px] w-full overflow-hidden rounded-full bg-white/8">
        <motion.div
          className="h-full rounded-full bg-white"
          animate={{ width: `${rounded}%` }}
          transition={{ type: "spring", stiffness: 200, damping: 25 }}
        />
      </div>
    </div>
  );
}

function trustLabel(score: number): string {
  if (score >= 80) return "Strong";
  if (score >= 65) return "Stable";
  if (score >= 45) return "Caution";
  return "Risk";
}
