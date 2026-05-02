"use client";

import { motion, AnimatePresence } from "motion/react";
import type { Judge, Expression } from "@/types/judges";
import { JudgeAvatar } from "./judge-avatar";

interface Props {
  judge: Judge;
  expression: Expression;
  comment: string | null;
  gazeX?: number;
}

export function JudgeCard({ judge, expression, comment, gazeX = 0 }: Props) {
  const accent = judge.accentVar;
  return (
    <div
      className="flex items-start gap-3 rounded-md border bg-surface-1 p-3 transition-colors"
      style={{ borderColor: comment ? accent : "var(--border-faint)" }}
    >
      <JudgeAvatar
        judgeId={judge.id}
        expression={expression}
        accent={accent}
        gazeX={gazeX}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{judge.nameKo}</span>
          <span
            className="font-mono text-[9px] uppercase tracking-wider"
            style={{ color: accent }}
          >
            {expression}
          </span>
        </div>
        <p className="text-[11px] text-muted-foreground line-clamp-1">
          {judge.persona}
        </p>
        <AnimatePresence mode="wait">
          {comment ? (
            <motion.p
              key={comment}
              initial={{ y: 4, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -4, opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="mt-2 inline-block w-fit border-l-2 px-2 py-0.5 text-xs"
              style={{ borderColor: accent }}
            >
              {comment}
            </motion.p>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}
