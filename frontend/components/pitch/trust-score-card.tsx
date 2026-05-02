"use client";

import { trustColor, trustLabel } from "@/lib/utils";
import { ArrowDown, ArrowUp } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";

interface Props {
  trust: number;
}

export function TrustScoreCard({ trust }: Props) {
  const c = trustColor(trust);
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
    <div
      className="relative rounded-md border bg-surface-1 px-5 py-4 transition-colors"
      style={{ borderColor: `${c}33` }}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-muted-foreground">신뢰 점수</span>
        <span className="font-mono text-[10px] uppercase tracking-wider" style={{ color: c }}>
          {trustLabel(trust)}
        </span>
      </div>
      <div className="relative mt-2 flex items-baseline gap-2">
        <AnimatePresence mode="popLayout">
          <motion.span
            key={rounded}
            initial={{ y: -8, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 6, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 26 }}
            className="font-mono text-5xl font-semibold tabular-nums leading-none"
            style={{ color: c }}
          >
            {rounded}
          </motion.span>
        </AnimatePresence>
        <span className="font-mono text-2xl text-subtle-foreground">/100</span>
        <AnimatePresence>
          {delta ? (
            <motion.span
              key={delta.key}
              initial={{ y: 0, opacity: 0.9, scale: 1 }}
              animate={{ y: delta.value > 0 ? -22 : 22, opacity: 0, scale: 0.9 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.7, ease: "easeOut" }}
              className="absolute left-0 top-0 flex items-center gap-0.5 font-mono text-sm font-semibold tabular-nums pointer-events-none"
              style={{
                color: delta.value > 0 ? "var(--trust-high)" : "var(--trust-low)",
              }}
            >
              {delta.value > 0 ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />}
              {Math.abs(delta.value)}
            </motion.span>
          ) : null}
        </AnimatePresence>
      </div>
      <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-border-faint">
        <motion.div
          className="h-full rounded-full"
          animate={{ width: `${rounded}%`, backgroundColor: c }}
          transition={{ type: "spring", stiffness: 200, damping: 25 }}
        />
      </div>
    </div>
  );
}
