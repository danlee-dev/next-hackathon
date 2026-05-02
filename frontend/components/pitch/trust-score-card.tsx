"use client";

import { motion, AnimatePresence } from "motion/react";
import { trustColor, trustLabel } from "@/lib/utils";

interface Props {
  trust: number;
}

export function TrustScoreCard({ trust }: Props) {
  const c = trustColor(trust);
  const rounded = Math.round(trust);
  return (
    <div className="rounded-md border border-border-faint bg-surface-1 px-5 py-4">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-muted-foreground">
          신뢰 점수
        </span>
        <span
          className="font-mono text-[10px] uppercase tracking-wider"
          style={{ color: c }}
        >
          {trustLabel(trust)}
        </span>
      </div>
      <div className="mt-2 flex items-baseline gap-2">
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
