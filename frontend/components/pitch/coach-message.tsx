"use client";

import { Sparkles } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

interface Props {
  message: string | null;
}

export function CoachMessage({ message }: Props) {
  return (
    <div className="rounded-md border border-border-faint bg-surface-1 px-4 py-3 min-h-[56px]">
      <AnimatePresence mode="wait">
        {message ? (
          <motion.div
            key={message}
            initial={{ y: 6, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -4, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="flex items-start gap-2"
          >
            <Sparkles className="size-4 text-primary mt-0.5 shrink-0" />
            <span className="text-sm leading-relaxed">{message}</span>
          </motion.div>
        ) : (
          <motion.div
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2 text-xs text-subtle-foreground"
          >
            <Sparkles className="size-3.5" />
            <span>코치가 분석 중입니다...</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
