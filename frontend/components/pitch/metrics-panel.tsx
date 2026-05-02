"use client";

import { motion } from "motion/react";

interface MetricRow {
  label: string;
  value: number;
  inverse?: boolean;
  unit?: string;
}

interface Props {
  rows: MetricRow[];
}

export function MetricsPanel({ rows }: Props) {
  return (
    <div className="rounded-2xl border border-white/8 bg-black px-5 py-5">
      <div className="mb-4 font-mono text-[10px] uppercase tracking-[0.32em] text-white/45">
        Metrics
      </div>
      <ul className="flex flex-col gap-3.5">
        {rows.map((r) => {
          const score = r.inverse ? 100 - Math.min(r.value * 8, 100) : r.value;
          const isLow = score < 45;
          return (
            <li key={r.label} className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-[12.5px]">
                <span className="text-white/55">{r.label}</span>
                <span
                  className={`font-mono tabular-nums ${isLow ? "text-white/55" : "text-white"}`}
                >
                  {Math.round(r.value)}
                  {r.unit ? <span className="ml-0.5 text-white/35">{r.unit}</span> : null}
                </span>
              </div>
              <div className="h-[2px] w-full overflow-hidden rounded-full bg-white/8">
                <motion.div
                  className="h-full rounded-full bg-white"
                  animate={{
                    width: `${Math.min(Math.max(score, 0), 100)}%`,
                    opacity: isLow ? 0.45 : 0.9,
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
