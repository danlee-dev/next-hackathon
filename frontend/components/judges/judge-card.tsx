"use client";

import type { Expression, Judge } from "@/types/judges";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { JudgeAvatar } from "./judge-avatar";

interface Props {
  judge: Judge;
  expression: Expression;
  comment: string | null;
  gazeX?: number;
  /** True while the speaker is currently talking — drives a subtle "listening"
   * halo and a slow breathing of the card border so the panel reads as alive. */
  listening?: boolean;
  /** 0..N — used to stagger reaction animations across the three judges so
   * they don't all twitch in lockstep. */
  index?: number;
}

export function JudgeCard({
  judge,
  expression,
  comment,
  gazeX = 0,
  listening = false,
  index = 0,
}: Props) {
  const active = !!comment;

  // Reaction nod — tiny y nudge whenever the expression changes (positive
  // expressions nod down, negative expressions tilt up). Stagger by index so
  // the three judges don't move in unison.
  const [reactionKey, setReactionKey] = useState(0);
  const prevExpressionRef = useRef(expression);
  useEffect(() => {
    if (prevExpressionRef.current !== expression) {
      prevExpressionRef.current = expression;
      const t = window.setTimeout(() => setReactionKey((k) => k + 1), index * 90);
      return () => window.clearTimeout(t);
    }
  }, [expression, index]);

  const nodDirection: number = (() => {
    switch (expression) {
      case "nod":
      case "smile":
        return 4; // small bow — agreement
      case "doubt":
      case "frown":
        return -3; // chin up — skeptical
      case "surprised":
        return -2;
      default:
        return 0;
    }
  })();

  return (
    <motion.div
      className="flex items-start gap-3 rounded-2xl border bg-black p-3.5 transition-colors"
      style={{
        borderColor: active ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.06)",
      }}
      animate={
        listening
          ? {
              boxShadow: [
                "0 0 0 0 rgba(255,255,255,0)",
                "0 0 14px 0 rgba(255,255,255,0.06)",
                "0 0 0 0 rgba(255,255,255,0)",
              ],
            }
          : { boxShadow: "0 0 0 0 rgba(0,0,0,0)" }
      }
      transition={
        listening
          ? {
              duration: 2.6,
              repeat: Number.POSITIVE_INFINITY,
              ease: "easeInOut",
              delay: index * 0.4,
            }
          : { duration: 0.3 }
      }
    >
      <motion.div
        key={`nod-${reactionKey}`}
        animate={
          reactionKey > 0
            ? { y: [0, nodDirection, 0], rotate: [0, nodDirection > 0 ? 0 : -1.5, 0] }
            : { y: 0, rotate: 0 }
        }
        transition={{ duration: 0.45, ease: "easeOut" }}
      >
        <JudgeAvatar
          judgeId={judge.id}
          expression={expression}
          accent="rgba(255,255,255,0.85)"
          gazeX={gazeX}
          listening={listening}
        />
      </motion.div>
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
              transition={{ duration: 0.18, delay: index * 0.05 }}
              className="mt-2 inline-block w-fit border-l border-white pl-2 text-[12.5px] leading-[1.4] text-white"
            >
              "{comment}"
            </motion.p>
          ) : null}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
