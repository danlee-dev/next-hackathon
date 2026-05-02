"use client";

import { JudgeAvatar } from "@/components/judges/judge-avatar";
import type { Judge } from "@/types/judges";
import type { JudgeReaction } from "@/types/pitch";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";

interface Chip {
  id: number;
  judge: Judge;
  comment: string;
  expression: JudgeReaction["expression"];
  expiresAt: number;
}

interface Props {
  judges: Judge[];
  reactions: Record<string, JudgeReaction | undefined>;
  /** Chip lifetime in ms (default 5500). */
  ttlMs?: number;
  /** Max number of chips visible at once (default 3). */
  maxVisible?: number;
}

/**
 * Floating chip overlay shown on top of the speaker's webcam feed so the
 * presenter can actually read the judges' comments without breaking eye
 * contact with the camera. Chips slide in from the right when a judge speaks
 * and dismiss themselves after `ttlMs`. Stacks up to `maxVisible`.
 */
export function JudgeCommentOverlay({ judges, reactions, ttlMs = 5500, maxVisible = 3 }: Props) {
  const judgeMap = new Map(judges.map((j) => [j.id, j]));
  const [chips, setChips] = useState<Chip[]>([]);
  const lastCommentRef = useRef<Record<string, string | null>>({});
  const seqRef = useRef(0);

  // Detect new / changed comments per judge and push chips.
  useEffect(() => {
    let mutated = false;
    const next = [...chips];
    const now = performance.now();

    for (const j of judges) {
      const r = reactions[j.id];
      const prev = lastCommentRef.current[j.id] ?? null;
      const cur = r?.comment ?? null;
      if (cur && cur !== prev) {
        seqRef.current += 1;
        next.push({
          id: seqRef.current,
          judge: j,
          comment: cur,
          expression: r?.expression ?? "neutral",
          expiresAt: now + ttlMs,
        });
        mutated = true;
      }
      lastCommentRef.current[j.id] = cur;
    }

    if (mutated) {
      // Cap visible stack — drop oldest chip when over limit.
      while (next.length > maxVisible) next.shift();
      setChips(next);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reactions]);

  // GC expired chips.
  useEffect(() => {
    if (chips.length === 0) return;
    const id = window.setInterval(() => {
      const now = performance.now();
      setChips((prev) => prev.filter((c) => c.expiresAt > now));
    }, 250);
    return () => window.clearInterval(id);
  }, [chips.length]);

  return (
    <div className="pointer-events-none absolute right-4 top-14 z-10 flex w-[min(380px,55%)] flex-col gap-2">
      <AnimatePresence initial={false}>
        {chips.map((chip) => (
          <motion.div
            key={chip.id}
            layout
            initial={{ x: 40, opacity: 0, scale: 0.96 }}
            animate={{ x: 0, opacity: 1, scale: 1 }}
            exit={{ x: 24, opacity: 0, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className="flex items-start gap-3 rounded-2xl border border-white/12 bg-black/35 p-3 shadow-[0_10px_30px_rgba(0,0,0,0.35)] backdrop-blur-xl"
          >
            <div className="shrink-0">
              <JudgeAvatar
                judgeId={chip.judge.id}
                expression={chip.expression}
                accent="rgba(255,255,255,0.9)"
                size={44}
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <span className="text-[13px] font-medium text-white">{chip.judge.nameKo}</span>
                <span className="font-mono text-[9px] uppercase tracking-[0.28em] text-white/45">
                  {chip.expression}
                </span>
              </div>
              <p className="mt-0.5 text-[15px] leading-[1.45] text-white">"{chip.comment}"</p>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
