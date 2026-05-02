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

type Tone = "negative" | "positive" | "neutral";

function expressionTone(e: Chip["expression"]): Tone {
  if (e === "frown" || e === "doubt" || e === "bored") return "negative";
  if (e === "smile" || e === "nod") return "positive";
  // 'surprised' often signals "too fast" in our trigger set — treat as negative
  // to draw attention; 'neutral' keeps the default styling.
  if (e === "surprised") return "negative";
  return "neutral";
}

const TONE_STYLE: Record<
  Tone,
  { container: string; nameClass: string; commentClass: string; sideBar: string }
> = {
  negative: {
    container: "border-red-400/55 bg-red-500/15 shadow-[0_10px_30px_rgba(248,113,113,0.25)]",
    nameClass: "text-red-100",
    commentClass: "text-red-50 font-medium",
    sideBar: "bg-red-400",
  },
  positive: {
    container: "border-emerald-300/40 bg-emerald-400/8 shadow-[0_10px_30px_rgba(0,0,0,0.3)]",
    nameClass: "text-white",
    commentClass: "text-white",
    sideBar: "bg-emerald-300/70",
  },
  neutral: {
    container: "border-white/12 bg-black/35 shadow-[0_10px_30px_rgba(0,0,0,0.3)]",
    nameClass: "text-white",
    commentClass: "text-white",
    sideBar: "bg-white/30",
  },
};

/**
 * Floating chip overlay shown on top of the speaker's webcam feed so the
 * presenter can actually read the judges' comments without breaking eye
 * contact with the camera. Chips slide in from the right when a judge speaks
 * and dismiss themselves after `ttlMs`. Stacks up to `maxVisible`.
 *
 * Negative-tone reactions (frown / doubt / bored / surprised) are styled in
 * red with an entry shake so the speaker catches them at a glance; positive
 * reactions get an understated emerald accent.
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
        {chips.map((chip) => {
          const tone = expressionTone(chip.expression);
          const style = TONE_STYLE[tone];
          const isNegative = tone === "negative";
          return (
            <motion.div
              key={chip.id}
              layout
              initial={{ x: 40, opacity: 0, scale: 0.96 }}
              animate={
                isNegative
                  ? { x: [40, -8, 4, 0], opacity: 1, scale: [0.96, 1.04, 1] }
                  : { x: 0, opacity: 1, scale: 1 }
              }
              exit={{ x: 24, opacity: 0, scale: 0.98 }}
              transition={
                isNegative
                  ? { duration: 0.55, ease: "easeOut" }
                  : { type: "spring", stiffness: 320, damping: 28 }
              }
              className={`relative flex items-start gap-3 overflow-hidden rounded-2xl border p-3 backdrop-blur-xl transition-colors ${style.container}`}
            >
              {/* tone side bar */}
              <span
                aria-hidden
                className={`absolute inset-y-2 left-0 w-1 rounded-full ${style.sideBar}`}
              />
              <div className="shrink-0 pl-1">
                <JudgeAvatar
                  judgeId={chip.judge.id}
                  expression={chip.expression}
                  accent={isNegative ? "rgba(248,113,113,0.95)" : "rgba(255,255,255,0.9)"}
                  size={44}
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className={`text-[13px] font-medium ${style.nameClass}`}>
                    {chip.judge.nameKo}
                  </span>
                  <span
                    className={`font-mono text-[9px] uppercase tracking-[0.28em] ${
                      isNegative ? "text-red-200/80" : "text-white/45"
                    }`}
                  >
                    {chip.expression}
                  </span>
                </div>
                <p className={`mt-0.5 text-[15px] leading-[1.45] ${style.commentClass}`}>
                  "{chip.comment}"
                </p>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
