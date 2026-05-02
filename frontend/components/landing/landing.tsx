"use client";

import { useEffect } from "react";
import { LandingChrome } from "./landing-chrome";
import { Cta } from "./sections/cta";
import { LandingFooter } from "./sections/footer";
import { Hero } from "./sections/hero";
import { Judges } from "./sections/judges";
import { Manifesto } from "./sections/manifesto";
import { Pillars } from "./sections/pillars";

/**
 * Public landing — 비로그인 사용자에게 보여지는 메인 페이지.
 * 흑백 교차 + scroll-driven 인터랙션. motion v12.
 *
 * 토큰 의존도 0 — pure black/white + 단일 accent (primary cyan).
 * 앱 안의 라이트/다크 토큰은 의도적으로 분리.
 */
export function Landing() {
  useEffect(() => {
    document.body.classList.add("landing-active");
    return () => {
      document.body.classList.remove("landing-active");
    };
  }, []);

  return (
    <div className="relative w-full bg-black text-white antialiased" style={{ overflowX: "clip" }}>
      <LandingChrome />
      <Hero />
      <Manifesto />
      <Pillars />
      <Judges />
      <Cta />
      <LandingFooter />
    </div>
  );
}
