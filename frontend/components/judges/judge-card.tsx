"use client";

import type { Expression, Judge } from "@/types/judges";
import { AnimatePresence, motion } from "motion/react";
import { JudgeAvatar } from "./judge-avatar";

interface Props {
  judge: Judge;
  expression: Expression;
  comment: string | null;
  gazeX?: number;
}

export function JudgeCard({ judge, expression, comment, gazeX = 0 }: Props) {
  const active = !!comment;
  return (
    <div
      className="flex items-start gap-3 rounded-2xl border bg-black p-3.5 transition-colors"
      style={{
        borderColor: active ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.06)",
      }}
    >
      <JudgeAvatar
        judgeId={judge.id}
        expression={expression}
        accent="rgba(255,255,255,0.85)"
        gazeX={gazeX}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="text-[14px] font-medium text-white">{judge.nameKo}</span>
          <span className="font-mono text-[9px] uppercase tracking-[0.32em] text-white/40">
            {expression}
          </span>
        </div>
        <p className="mt-0.5 text-[11.5px] leading-tight text-white/45">{judge.persona}</p>
        <AnimatePresence mode="wait">
          {comment ? (
            <motion.p
              key={comment}
              initial={{ y: 4, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -4, opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="mt-2 inline-block w-fit border-l border-white pl-2 text-[12.5px] leading-[1.4] text-white"
            >
              "{comment}"
            </motion.p>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}
