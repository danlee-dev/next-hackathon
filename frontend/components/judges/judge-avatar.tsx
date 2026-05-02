"use client";

import type { Expression, JudgeId } from "@/types/judges";
import { AnimatePresence, motion, useAnimationControls } from "motion/react";
import { useEffect } from "react";

interface Props {
  judgeId: JudgeId;
  expression: Expression;
  accent: string;
  size?: number;
  /** -1..1 horizontal gaze offset (e.g. eye-tracking) */
  gazeX?: number;
  /** When true, the speaker is currently talking and the judge is "listening" */
  listening?: boolean;
}

const HAIR_COLORS: Record<JudgeId, string> = {
  "judge-fact": "oklch(0.35 0.02 240)",
  "judge-connect": "oklch(0.45 0.04 100)",
  "judge-critical": "oklch(0.3 0.02 30)",
};

const SKIN: Record<JudgeId, string> = {
  "judge-fact": "oklch(0.78 0.04 60)",
  "judge-connect": "oklch(0.82 0.04 70)",
  "judge-critical": "oklch(0.74 0.04 60)",
};

const ACCESSORIES: Record<JudgeId, "glasses" | "earring" | "stubble"> = {
  "judge-fact": "glasses",
  "judge-connect": "earring",
  "judge-critical": "stubble",
};

function MouthShape({ expression, accent }: { expression: Expression; accent: string }) {
  switch (expression) {
    case "smile":
      return (
        <path
          d="M28 56 Q40 66 52 56"
          stroke={accent}
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />
      );
    case "nod":
      return (
        <path
          d="M30 57 Q40 60 50 57"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />
      );
    case "frown":
      return (
        <path
          d="M28 60 Q40 52 52 60"
          stroke="oklch(0.7 0.2 28)"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />
      );
    case "doubt":
      return (
        <path
          d="M28 58 Q34 56 40 58 T52 58"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />
      );
    case "bored":
      return (
        <line
          x1="30"
          y1="58"
          x2="50"
          y2="58"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      );
    case "surprised":
      return <ellipse cx="40" cy="58" rx="3" ry="4" fill="currentColor" />;
    default:
      return (
        <line
          x1="32"
          y1="57"
          x2="48"
          y2="57"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      );
  }
}

function Eyebrows({ expression, accent }: { expression: Expression; accent: string }) {
  if (expression === "surprised") {
    return (
      <>
        <path
          d="M22 30 Q28 26 34 30"
          stroke={accent}
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M46 30 Q52 26 58 30"
          stroke={accent}
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />
      </>
    );
  }
  if (expression === "frown" || expression === "doubt") {
    return (
      <>
        <path d="M22 32 L34 30" stroke={accent} strokeWidth="2" strokeLinecap="round" fill="none" />
        <path d="M46 30 L58 32" stroke={accent} strokeWidth="2" strokeLinecap="round" fill="none" />
      </>
    );
  }
  return (
    <>
      <line x1="22" y1="32" x2="34" y2="32" stroke={accent} strokeWidth="2" strokeLinecap="round" />
      <line x1="46" y1="32" x2="58" y2="32" stroke={accent} strokeWidth="2" strokeLinecap="round" />
    </>
  );
}

export function JudgeAvatar({
  judgeId,
  expression,
  accent,
  size = 64,
  gazeX = 0,
  listening = false,
}: Props) {
  const skin = SKIN[judgeId];
  const hair = HAIR_COLORS[judgeId];
  const acc = ACCESSORIES[judgeId];
  const eyeOffset = Math.max(-1.5, Math.min(1.5, gazeX * 1.8));

  const eyeY = expression === "bored" ? 41 : 40;
  const lidH = expression === "bored" ? 1.5 : 0;

  // Random natural blink — every 4-7s, scale eyes vertically to ~0 for 120ms.
  const blink = useAnimationControls();
  useEffect(() => {
    let cancelled = false;
    const loop = async () => {
      while (!cancelled) {
        const wait = 4000 + Math.random() * 3000;
        await new Promise((r) => setTimeout(r, wait));
        if (cancelled) return;
        try {
          await blink.start({ scaleY: 0.05, transition: { duration: 0.07 } });
          await blink.start({ scaleY: 1, transition: { duration: 0.09 } });
        } catch {}
      }
    };
    loop();
    return () => {
      cancelled = true;
    };
  }, [blink]);

  return (
    <motion.div
      className="relative"
      style={{ width: size, height: size }}
      // Subtle breathing — barely-noticeable scale so the avatar reads as alive.
      animate={{ scale: [1, 1.018, 1] }}
      transition={{ duration: 4.2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
    >
      {/* Listening halo — slow soft pulse around the avatar while the speaker
          is talking. Tells the speaker the judges are paying attention. */}
      {listening ? (
        <motion.span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-md"
          style={{ boxShadow: `0 0 0 0 ${accent}` }}
          animate={{
            boxShadow: [`0 0 0 0 ${accent}33`, `0 0 12px 2px ${accent}55`, `0 0 0 0 ${accent}33`],
          }}
          transition={{ duration: 2.4, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
        />
      ) : null}
      <AnimatePresence mode="wait">
        <motion.svg
          key={expression}
          viewBox="0 0 80 80"
          width={size}
          height={size}
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.18 }}
        >
          <rect
            x="2"
            y="2"
            width="76"
            height="76"
            rx="6"
            fill="var(--surface-2)"
            stroke={accent}
            strokeOpacity="0.4"
          />
          {/* head */}
          <ellipse cx="40" cy="44" rx="22" ry="24" fill={skin} />
          {/* hair */}
          <path
            d={
              judgeId === "judge-connect"
                ? "M18 36 Q24 14 40 14 Q56 14 62 36 Q60 28 50 24 Q40 22 30 24 Q22 28 18 36 Z"
                : judgeId === "judge-critical"
                  ? "M18 36 Q22 18 40 16 Q58 16 62 36 L60 28 L40 22 L20 28 Z"
                  : "M18 36 Q22 16 40 16 Q58 16 62 36 Q60 30 40 28 Q22 30 18 36 Z"
            }
            fill={hair}
          />
          <Eyebrows expression={expression} accent={accent} />
          {/* eyes — wrapped in motion.g so blink animation can scale Y */}
          <motion.g animate={blink} style={{ transformOrigin: `40px ${eyeY}px` }}>
            <ellipse cx="30" cy={eyeY} rx="3" ry={3 - lidH} fill="var(--foreground)" />
            <ellipse cx="50" cy={eyeY} rx="3" ry={3 - lidH} fill="var(--foreground)" />
            {/* pupils with gaze */}
            <circle cx={30 + eyeOffset} cy={eyeY} r="1.4" fill={accent} />
            <circle cx={50 + eyeOffset} cy={eyeY} r="1.4" fill={accent} />
          </motion.g>
          {/* glasses */}
          {acc === "glasses" && (
            <g stroke={accent} strokeWidth="1.5" fill="none" opacity="0.85">
              <circle cx="30" cy={eyeY} r="6" />
              <circle cx="50" cy={eyeY} r="6" />
              <line x1="36" y1={eyeY} x2="44" y2={eyeY} />
            </g>
          )}
          {/* stubble */}
          {acc === "stubble" && (
            <g fill={hair} opacity="0.45">
              <circle cx="34" cy="62" r="0.7" />
              <circle cx="38" cy="64" r="0.7" />
              <circle cx="42" cy="64" r="0.7" />
              <circle cx="46" cy="62" r="0.7" />
              <circle cx="40" cy="60" r="0.7" />
            </g>
          )}
          {/* earring */}
          {acc === "earring" && <circle cx="62" cy="48" r="1.2" fill={accent} />}
          <g style={{ color: "var(--foreground)" }}>
            <MouthShape expression={expression} accent={accent} />
          </g>
          {/* nose */}
          <path
            d="M40 44 L38 50 L42 50 Z"
            fill={skin}
            stroke="oklch(0.5 0.05 60)"
            strokeWidth="0.5"
            opacity="0.6"
          />
        </motion.svg>
      </AnimatePresence>
    </motion.div>
  );
}
