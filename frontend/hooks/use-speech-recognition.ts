"use client";

import { useEffect, useRef, useState } from "react";

interface SpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onerror: ((e: Event) => void) | null;
  onend: (() => void) | null;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognition;
    webkitSpeechRecognition?: new () => SpeechRecognition;
  }
}

interface Options {
  onInterim?: (text: string) => void;
  onFinal?: (text: string) => void;
}

export function useSpeechRecognition(
  enabled: boolean,
  { onInterim, onFinal }: Options = {}
) {
  const ref = useRef<SpeechRecognition | null>(null);
  const [supported, setSupported] = useState(true);
  const [active, setActive] = useState(false);
  const onInterimRef = useRef(onInterim);
  const onFinalRef = useRef(onFinal);
  onInterimRef.current = onInterim;
  onFinalRef.current = onFinal;

  useEffect(() => {
    if (!enabled) return;
    const Ctor =
      typeof window !== "undefined"
        ? (window.SpeechRecognition ?? window.webkitSpeechRecognition)
        : undefined;
    if (!Ctor) {
      setSupported(false);
      return;
    }
    const rec = new Ctor();
    rec.lang = "ko-KR";
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (ev) => {
      let interim = "";
      let finalText = "";
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const r = ev.results[i];
        if (r.isFinal) finalText += r[0].transcript;
        else interim += r[0].transcript;
      }
      if (interim) onInterimRef.current?.(interim);
      if (finalText) onFinalRef.current?.(finalText);
    };
    rec.onerror = () => {
      // network 또는 no-speech 에러는 무시 후 재시작
    };
    rec.onend = () => {
      // 자동 재시작 (continuous true임에도 브라우저 내부 limit)
      try {
        if (enabled) rec.start();
      } catch {}
    };

    try {
      rec.start();
      ref.current = rec;
      setActive(true);
    } catch {
      // already started
    }

    return () => {
      try {
        rec.stop();
      } catch {}
      ref.current = null;
      setActive(false);
    };
  }, [enabled]);

  return { supported, active };
}
