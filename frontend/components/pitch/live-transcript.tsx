"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef } from "react";

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
  /** Increments whenever the speaker is detected to have used a filler word.
   * Used to flash the left border red as a real-time UX cue. */
  fillerPulseKey?: number;
}

function highlight(text: string) {
  if (!text) return null;
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
          className="rounded-sm px-0.5 underline decoration-wavy decoration-1 underline-offset-[5px]"
          style={{
            color: "oklch(0.84 0.13 75)",
            textDecorationColor: "oklch(0.78 0.16 70)",
            backgroundColor: "oklch(0.84 0.13 75 / 0.08)",
          }}
        >
          {tk.text}
        </span>
      );
    if (tk.type === "empty")
      return (
        <span
          key={i}
          className="underline decoration-1 underline-offset-[5px]"
          style={{
            color: "oklch(0.84 0.13 75 / 0.95)",
            textDecorationColor: "oklch(0.78 0.16 70 / 0.7)",
          }}
        >
          {tk.text}
        </span>
      );
    return <span key={i}>{tk.text}</span>;
  });
}

export function LiveTranscript({ finalText, interimText, fillerPulseKey = 0 }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.scrollTo({
      top: ref.current.scrollHeight,
      behavior: "smooth",
    });
  }, [finalText, interimText]);

  return (
    <div className="relative h-32 overflow-hidden rounded-2xl border border-white/8 bg-black px-5 py-4">
      {/* left edge filler pulse — flashes red for ~600ms whenever a new
          filler/empty-phrase utterance is detected. */}
      <AnimatePresence>
        {fillerPulseKey > 0 ? (
          <motion.span
            key={fillerPulseKey}
            initial={{ opacity: 0.95, scaleY: 0.4 }}
            animate={{ opacity: 0, scaleY: 1 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="pointer-events-none absolute inset-y-2 left-0 w-0.75 origin-center rounded-full bg-red-400"
            aria-hidden
          />
        ) : null}
      </AnimatePresence>
      <div className="mb-2 flex items-center gap-3">
        <span className="inline-block h-px w-4 bg-white" aria-hidden />
        <span className="font-mono text-[10px] uppercase tracking-[0.32em] text-white/45">
          Live transcript
        </span>
      </div>
      <div
        ref={ref}
        aria-live="polite"
        className="h-[68px] overflow-y-auto pr-2 text-[14px] leading-relaxed text-white [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
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
        <span className="text-white/35"> {interimText}</span>
      </div>
    </div>
  );
}
