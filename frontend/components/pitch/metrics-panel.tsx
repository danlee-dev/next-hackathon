"use client";

import { trustColor } from "@/lib/utils";
import { motion } from "motion/react";

interface MetricRow {
  label: string;
  value: number;
  /** 낮을수록 좋은 지표인 경우 (필러카운트 등) */
  inverse?: boolean;
  unit?: string;
}

interface Props {
  rows: MetricRow[];
}

export function MetricsPanel({ rows }: Props) {
  return (
    <div className="rounded-md border border-border-faint bg-surface-1 px-5 py-4">
      <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3">지표</div>
      <ul className="flex flex-col gap-3">
        {rows.map((r) => {
          const score = r.inverse ? 100 - Math.min(r.value * 8, 100) : r.value;
          const c = trustColor(score);
          return (
            <li key={r.label} className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{r.label}</span>
                <span className="font-mono tabular-nums font-medium" style={{ color: c }}>
                  {Math.round(r.value)}
                  {r.unit ? <span className="text-subtle-foreground ml-0.5">{r.unit}</span> : null}
                </span>
              </div>
              <div className="h-[3px] w-full overflow-hidden rounded-full bg-border-faint">
                <motion.div
                  className="h-full rounded-full"
                  animate={{
                    width: `${Math.min(Math.max(score, 0), 100)}%`,
                    backgroundColor: c,
                  }}
                  transition={{ type: "spring", stiffness: 200, damping: 25 }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
