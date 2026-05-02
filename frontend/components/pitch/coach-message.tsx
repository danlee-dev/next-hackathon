"use client";

import { AnimatePresence, motion } from "motion/react";

interface Props {
  message: string | null;
}

export function CoachMessage({ message }: Props) {
  return (
    <div className="min-h-[56px] rounded-2xl border border-white/8 bg-black px-5 py-3.5">
      <AnimatePresence mode="wait">
        {message ? (
          <motion.div
            key={message}
            initial={{ y: 6, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -4, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="flex items-start gap-3"
          >
            <span className="mt-1 inline-block h-px w-4 bg-white" aria-hidden />
            <span className="flex-1">
              <span className="font-mono text-[10px] uppercase tracking-[0.32em] text-white/45">
                Coach
              </span>
              <p className="mt-0.5 text-[14px] leading-[1.55] text-white">{message}</p>
            </span>
          </motion.div>
        ) : (
          <motion.div
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-3"
          >
            <span className="inline-block h-px w-4 bg-white/30" aria-hidden />
            <span className="font-mono text-[10px] uppercase tracking-[0.32em] text-white/35">
              Coach · 분석 중
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
