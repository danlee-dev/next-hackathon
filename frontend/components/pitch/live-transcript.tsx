"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";

const FILLER_WORDS = [
  "음",
  "어",
  "아",
  "그",
  "그러니까",
  "약간",
  "뭐",
  "이제",
  "근데",
  "사실",
  "막",
  "그게 이제",
  "뭐랄까",
  "그니까",
];

const EMPTY_PHRASES = ["혁신적인", "최고의", "절대적", "무조건", "단연코"];

interface Props {
  finalText: string;
  interimText: string;
}

function highlight(text: string) {
  if (!text) return null;
  // greedy split keeping order; simplistic but fine for live display.
  const tokens: { type: "filler" | "empty" | "plain"; text: string }[] = [];
  let cursor = 0;
  while (cursor < text.length) {
    let matched = false;
    for (const f of FILLER_WORDS) {
      if (text.startsWith(f, cursor)) {
        tokens.push({ type: "filler", text: f });
        cursor += f.length;
        matched = true;
        break;
      }
    }
    if (matched) continue;
    for (const f of EMPTY_PHRASES) {
      if (text.startsWith(f, cursor)) {
        tokens.push({ type: "empty", text: f });
        cursor += f.length;
        matched = true;
        break;
      }
    }
    if (matched) continue;
    // accumulate plain run
    const next = cursor + 1;
    const last = tokens[tokens.length - 1];
    if (last?.type === "plain") last.text += text[cursor];
    else tokens.push({ type: "plain", text: text[cursor] });
    cursor = next;
  }
  return tokens.map((tk, i) => {
    if (tk.type === "filler")
      return (
        <span
          key={i}
          className="bg-filler-highlight-bg text-filler-highlight underline decoration-wavy decoration-1 underline-offset-4 px-0.5 rounded-xs"
        >
          {tk.text}
        </span>
      );
    if (tk.type === "empty")
      return (
        <span
          key={i}
          className="text-trust-mid underline underline-offset-4 decoration-1"
        >
          {tk.text}
        </span>
      );
    return <span key={i}>{tk.text}</span>;
  });
}

export function LiveTranscript({ finalText, interimText }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.scrollTo({
      top: ref.current.scrollHeight,
      behavior: "smooth",
    });
  }, [finalText, interimText]);

  return (
    <div className="rounded-md border border-border-faint bg-surface-1 px-4 py-3 h-32 overflow-hidden relative">
      <div className="absolute inset-x-0 top-0 h-6 bg-gradient-to-b from-surface-1 to-transparent pointer-events-none z-10" />
      <div className="absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-surface-1 to-transparent pointer-events-none z-10" />
      <div
        ref={ref}
        aria-live="polite"
        className="h-full overflow-y-auto font-mono text-sm leading-relaxed pr-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <AnimatePresence>
          <motion.span
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.12 }}
            key="final"
          >
            {highlight(finalText)}
          </motion.span>
        </AnimatePresence>
        <span className="text-subtle-foreground"> {interimText}</span>
      </div>
    </div>
  );
}
