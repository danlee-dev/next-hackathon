"use client";

import { type QnaQuestion, qnaStart, qnaTextAnswer } from "@/lib/api-client";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export default function QnaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [sessionId, setSessionId] = useState<string>("");
  const [current, setCurrent] = useState<QnaQuestion | null>(null);
  const [answer, setAnswer] = useState("");
  const [history, setHistory] = useState<
    Array<{ judge: string; question: string; answer?: string }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [finished, setFinished] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    params.then((p) => setSessionId(p.id));
  }, [params]);

  useEffect(() => {
    if (!sessionId) return;
    qnaStart(sessionId)
      .then((q) => {
        setCurrent(q);
        setHistory([{ judge: q.judge_name, question: q.text }]);
        playAudio(q.voice_b64);
      })
      .catch(() => setFinished(true))
      .finally(() => setLoading(false));
  }, [sessionId]);

  function playAudio(b64?: string | null) {
    if (!b64) return;
    const audio = new Audio(`data:audio/mpeg;base64,${b64}`);
    audioRef.current = audio;
    audio.play().catch(() => {});
  }

  async function submitAnswer() {
    if (!current || !answer.trim() || submitting) return;
    setSubmitting(true);
    try {
      // mark previous Q with answer
      setHistory((h) => {
        const next = [...h];
        next[next.length - 1] = { ...next[next.length - 1], answer };
        return next;
      });
      const res = await qnaTextAnswer(sessionId, current.judge_id, answer);
      setAnswer("");
      if (res.finished || !res.judge_followup) {
        setFinished(true);
        setCurrent(null);
        return;
      }
      setCurrent(res.judge_followup);
      setHistory((h) => [
        ...h,
        {
          judge: res.judge_followup!.judge_name,
          question: res.judge_followup!.text,
        },
      ]);
      playAudio(res.judge_followup.voice_b64);
    } catch {
      setFinished(true);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="grid min-h-dvh place-items-center bg-black text-white">
        <span className="font-mono text-[10.5px] uppercase tracking-[0.32em] text-white/55">
          심사위원이 첫 질문을 준비하고 있습니다...
        </span>
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-black text-white">
      <header className="border-b border-white/8">
        <div className="mx-auto flex h-14 max-w-[900px] items-center justify-between px-6">
          <Link
            href={`/pitch/${sessionId}/report`}
            className="font-mono text-[10.5px] uppercase tracking-[0.32em] text-white/55 transition-colors hover:text-white"
          >
            ← Report
          </Link>
          <span className="font-mono text-[10.5px] uppercase tracking-[0.32em] text-white/45">
            Q&A · {history.length} turn
          </span>
        </div>
      </header>

      <section className="mx-auto max-w-[900px] px-6 py-12">
        <div className="mb-2 font-mono text-[10.5px] uppercase tracking-[0.32em] text-white/45">
          Q&A · 심사위원 인터뷰
        </div>
        <h1
          className="text-balance font-medium leading-[1.04]"
          style={{ fontSize: "clamp(28px, 4vw, 48px)", letterSpacing: "-0.024em" }}
        >
          {finished ? "Q&A 라운드 종료" : "심사위원이 질문하고 있습니다."}
        </h1>
        <p className="mt-3 max-w-[640px] text-[14.5px] leading-[1.6] text-white/55">
          세 명이 차례로 자기 역할 안에서 질문을 던집니다. 답변이 부족하면 같은 심사위원이
          follow-up, 충분하면 다음 심사위원으로 넘어갑니다.
        </p>

        <div className="mt-10 flex flex-col gap-4">
          {history.map((h, i) => (
            <Turn
              key={i}
              judge={h.judge}
              question={h.question}
              answer={h.answer}
              isCurrent={!finished && i === history.length - 1 && !h.answer}
            />
          ))}

          {!finished && current ? (
            <div className="mt-4 rounded-2xl border border-white/12 bg-black p-5">
              <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.32em] text-white/45">
                Your answer
              </div>
              <textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                rows={4}
                placeholder="답변을 입력하세요..."
                className="w-full resize-y rounded-lg border border-white/12 bg-black px-4 py-3 text-[14.5px] leading-relaxed text-white placeholder:text-white/30 transition-colors focus:border-white/45 focus:outline-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submitAnswer();
                }}
              />
              <div className="mt-3 flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-white/35">
                  ⌘ + Enter 로 제출
                </span>
                <button
                  type="button"
                  onClick={submitAnswer}
                  disabled={!answer.trim() || submitting}
                  className="group inline-flex items-center gap-1.5 rounded-full bg-white px-5 py-2 text-[12px] font-semibold text-black transition-transform hover:scale-[1.04] disabled:opacity-50"
                >
                  {submitting ? "평가 중..." : "답변 제출"}
                  <span className="transition-transform group-hover:translate-x-0.5">→</span>
                </button>
              </div>
            </div>
          ) : null}

          {finished ? (
            <div className="mt-6 rounded-2xl border border-white/8 bg-black p-6 text-center">
              <div className="mb-2 font-mono text-[10.5px] uppercase tracking-[0.32em] text-white/45">
                Q&A done
              </div>
              <p className="text-[15px] text-white">
                세 명 모두 질문을 마쳤습니다. 최종 리포트로 돌아가세요.
              </p>
              <Link
                href={`/pitch/${sessionId}/report`}
                className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-white px-5 py-2.5 text-[13px] font-semibold text-black transition-transform hover:scale-[1.04]"
              >
                리포트 보기 →
              </Link>
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}

function Turn({
  judge,
  question,
  answer,
  isCurrent,
}: {
  judge: string;
  question: string;
  answer?: string;
  isCurrent: boolean;
}) {
  return (
    <div
      className="rounded-2xl border bg-black p-5 transition-colors"
      style={{
        borderColor: isCurrent ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.08)",
      }}
    >
      <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-white/45">{judge}</div>
      <p className="mt-2 border-l border-white pl-3 text-[15px] leading-[1.55]">"{question}"</p>
      <AnimatePresence>
        {answer ? (
          <motion.div
            initial={{ y: 6, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="mt-4 rounded-lg bg-white/[0.03] px-4 py-3"
          >
            <div className="mb-1 font-mono text-[9px] uppercase tracking-[0.32em] text-white/35">
              You
            </div>
            <p className="text-[13.5px] leading-[1.55] text-white/85">{answer}</p>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
