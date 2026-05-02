# TrustPitch — DESIGN.md

> 본 문서는 TrustPitch의 시각·정보·인터랙션 디자인 단일 ground truth.
> 모든 UI 결정은 이 문서를 기준으로 한다. 변경하려면 이 문서부터 갱신한다.

---

## 1. Design Philosophy

### 1.1 The Vibe (한 문장)
**"Bloomberg Terminal × Linear × Granola"** — 데이터가 빽빽하게 살아 움직이는 다크 모드, 그러나 미니멀한 금융 계측기.

### 1.2 안 하는 것들 (anti-patterns)

본 프로젝트에서 **금지하는 시각 요소**:

- 반투명 배경 + 색감 있는 배경 + 테두리 색감 조합 (AI가 디폴트로 토해내는 글래스모피즘)
- 그라디언트 메쉬 배경 (purple-pink-blue 계열)
- "Hero" 섹션의 거대한 헤딩 + 작은 부제 + CTA 두 개 패턴
- 둥근 카드 안에 둥근 카드 안에 둥근 카드 (러시안 돌)
- 무의미한 이모지 (코드, UI, 문서 일체 금지 — CLAUDE.md 룰)
- 무의미한 borders/dividers (필요한 곳에만)
- 둥근 모서리 18px+ (큰 radius는 toy처럼 보임)
- 채도 높은 단일 brand 컬러로 모든 강조 (단조로움)

### 1.3 Core Aesthetic Principles

1. **Information density** > whitespace — IR 분석은 데이터다. 데이터를 숨기지 마라.
2. **Sharp edges, small radii** — 4px·8px·12px만 사용. 카드는 8px, 인풋은 6px, 버튼은 6px.
3. **Monospace for numerics** — 모든 숫자는 JetBrains Mono Variable. 게이지·점수·시간·count 정렬 필수.
4. **Motion only when it earns its place** — 점수 변화·표정 전환·필러 발견에만 motion. UI 입장은 fade 80ms.
5. **One bright color per moment** — 같은 화면에 강조색 2개 이상 X. 빨강 강조 중이면 다른 곳은 grayscale.
6. **Korean-first typography** — Pretendard Variable이 디폴트. 영어 fallback은 Inter Variable.

---

## 2. Color System (OKLCH, Tailwind v4 `@theme inline`)

### 2.1 컬러 토큰 (light + dark — *둘 다 정의 필수*)

**Dark mode (default — IR 환경 우선)**

```css
:root {
  /* Surface — 5단계 elevation */
  --background: oklch(0.13 0.005 240);        /* #0a0c10 - canvas */
  --surface-1: oklch(0.165 0.008 240);        /* card / sidebar */
  --surface-2: oklch(0.205 0.01 240);         /* elevated card */
  --surface-3: oklch(0.245 0.012 240);        /* popover */
  --foreground: oklch(0.97 0.005 240);        /* main text */
  --muted-foreground: oklch(0.66 0.012 240);  /* meta text */
  --subtle-foreground: oklch(0.5 0.015 240);  /* timestamps */

  /* Borders — 단계별 */
  --border: oklch(0.235 0.012 240);           /* default */
  --border-strong: oklch(0.32 0.015 240);     /* emphasized */
  --border-faint: oklch(0.19 0.008 240);      /* internal sep */

  /* Brand — 차분한 청록 (IR = trust) */
  --primary: oklch(0.74 0.15 195);            /* teal-cyan */
  --primary-foreground: oklch(0.13 0.005 240);
  --primary-muted: oklch(0.4 0.08 195);

  /* Semantic — Trust gradient (3-stop) */
  --trust-high: oklch(0.78 0.17 145);         /* >=70 — confident green */
  --trust-mid: oklch(0.83 0.16 85);           /* 40-69 — caution amber */
  --trust-low: oklch(0.68 0.22 25);           /* <40 — alert red-orange */

  /* Diagnostic */
  --filler-highlight: oklch(0.72 0.22 22);    /* 자막 빨강 */
  --filler-highlight-bg: oklch(0.32 0.12 22 / 0.35);

  /* Judges — 각자 고유 색 (서로 충돌 안 하게) */
  --judge-fact-accent: oklch(0.72 0.16 250);     /* 차가운 파랑 */
  --judge-connect-accent: oklch(0.78 0.14 145);  /* 따뜻한 초록 */
  --judge-critical-accent: oklch(0.7 0.2 28);    /* 날카로운 빨강 */

  /* Special — pulse / focus rings */
  --ring: oklch(0.74 0.15 195 / 0.55);
  --pulse: oklch(0.78 0.17 145);
}
```

**Light mode (sub — 데이의 데이라이트 IR 환경)**

```css
:root[data-theme="light"] {
  --background: oklch(0.985 0.002 240);
  --surface-1: oklch(0.965 0.004 240);
  --surface-2: oklch(0.94 0.005 240);
  --surface-3: oklch(0.91 0.006 240);
  --foreground: oklch(0.18 0.01 240);
  --muted-foreground: oklch(0.42 0.012 240);
  --subtle-foreground: oklch(0.58 0.012 240);
  --border: oklch(0.88 0.008 240);
  --border-strong: oklch(0.78 0.012 240);
  --border-faint: oklch(0.93 0.006 240);
  --primary: oklch(0.55 0.18 195);
  --primary-foreground: oklch(0.985 0.002 240);
  --primary-muted: oklch(0.85 0.06 195);
  --trust-high: oklch(0.55 0.2 145);
  --trust-mid: oklch(0.65 0.18 85);
  --trust-low: oklch(0.55 0.24 25);
  --filler-highlight: oklch(0.55 0.24 25);
  --filler-highlight-bg: oklch(0.92 0.08 22 / 0.6);
  --judge-fact-accent: oklch(0.55 0.18 250);
  --judge-connect-accent: oklch(0.55 0.18 145);
  --judge-critical-accent: oklch(0.55 0.22 28);
  --ring: oklch(0.55 0.18 195 / 0.5);
  --pulse: oklch(0.55 0.2 145);
}
```

### 2.2 Contrast 보장 (WCAG AA)

- 본문 텍스트 (foreground × background) ≥ 4.5:1
- meta 텍스트 (muted × background) ≥ 4.5:1
- 인터랙티브 (primary × primary-foreground) ≥ 4.5:1
- 단순 UI 그래픽 (border × surface) ≥ 3:1

### 2.3 Semantic-only

- `bg-blue-500` 류 hardcoded Tailwind 컬러 **금지**.
- `bg-primary text-primary-foreground` 짝으로만.
- `dark:` prefix hardcoding 금지 — `--surface-1`이 모드별로 자동 전환.

---

## 3. Typography

### 3.1 Font Stack

```css
--font-sans: "Pretendard Variable", "Pretendard", "Inter Variable", "Inter",
             ui-sans-serif, system-ui, sans-serif;
--font-mono: "JetBrains Mono Variable", "JetBrains Mono", ui-monospace,
             SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
--font-display: "Pretendard Variable", "Pretendard", "Inter Variable", sans-serif;
```

- **Pretendard**: 한국어 헤딩·본문 디폴트 (variable font, 9 weights).
- **JetBrains Mono**: 모든 숫자, code, 점수, 시간 (모노스페이스 정렬 필수).
- 영어 단독 페이지 (랜딩의 영어 카피)에서도 Pretendard으로 통일 — 한·영 transition 매끄러움.

### 3.2 Type Scale

| token | size / line | weight | use |
|---|---|---|---|
| `text-xs` | 12 / 16 | 500 | meta, timestamps |
| `text-sm` | 14 / 20 | 450 | body small, labels |
| `text-base` | 15 / 24 | 450 | body |
| `text-lg` | 17 / 26 | 500 | section title |
| `text-xl` | 20 / 28 | 600 | card heading |
| `text-2xl` | 26 / 32 | 600 | page heading |
| `text-3xl` | 34 / 40 | 650 | hero sub |
| `text-4xl` | 48 / 52 | 700 | hero / score-big |
| `text-5xl` | 64 / 68 | 750 | trust-score readout |
| `text-display` | clamp(72px, 9vw, 128px) / 1.0 | 800 | landing display |

- 본문은 weight 450 (regular와 medium 사이) — Pretendard에서 가장 잘 읽힘.
- Display weight 800은 -0.04em letter-spacing으로 조정.

### 3.3 Numeric Formatting

- **Trust score** (78 / 100 류): `font-mono`, `tabular-nums`, `font-feature-settings: "tnum", "ss01"`.
- **시간** (02:34): `font-mono`, `tabular-nums`.
- **분당 cpm**: `font-mono`, 정수+한자리 소수.

---

## 4. Spacing & Layout

### 4.1 Spacing Scale (Tailwind 기본 + 추가)

기본 4px 그리드. `space-1` = 4, `space-2` = 8, `space-3` = 12, `space-4` = 16, `space-6` = 24, `space-8` = 32, `space-12` = 48, `space-16` = 64.

### 4.2 Radius

```
--radius-xs: 3px;   /* badge, tag */
--radius-sm: 6px;   /* button, input */
--radius-md: 8px;   /* card, dialog */
--radius-lg: 12px;  /* main panel */
--radius-full: 9999px;  /* avatar, pulse dot */
```

큰 radius (16px+) 사용 금지. 데이터 밀도가 낮아 보임.

### 4.3 Container Widths

- 랜딩 max: 1280px
- 분석 화면: full-bleed (overflow: hidden, viewport 100vw 100dvh)
- 리포트: max 1100px
- Auth/settings: max 480px

### 4.4 Live 화면 그리드 (메인 분석 화면)

```
┌─ topbar (h-12) ────────────────────────────────────────────┐
│ logo  session-title         status-indicator      timer   │
├─ main grid (grid-cols-[1fr_400px]) ──────────────────────┤
│                                    │                       │
│  webcam-canvas (16:9 fluid)       │  judges-stack (3x)   │
│                                    │                       │
│  ───────────────                   │  ─── divider ───      │
│                                    │                       │
│  live-transcript (h-32)            │  trust-readout       │
│  coach-message (h-14)              │  metrics-quad        │
│                                    │                       │
│  controls-bar (h-14)               │                       │
└────────────────────────────────────┴───────────────────────┘
```

좌 60% : 우 40%는 1024px 미만에서 좌 100% (모바일은 stacked).

---

## 5. Component Specs

### 5.1 Button

- Primary: `bg-primary text-primary-foreground hover:opacity-90 active:opacity-80`
- Secondary: `bg-surface-2 text-foreground border border-border hover:border-border-strong`
- Ghost: `hover:bg-surface-2`
- Destructive: `bg-trust-low text-foreground hover:opacity-90`
- 크기: sm (h-8 px-3 text-xs), md (h-9 px-4 text-sm), lg (h-11 px-5 text-base)
- icon 옵션은 left/right inline, 14px stroke 1.75 (lucide 디폴트)

**Anti-pattern**: 그라디언트 버튼 X. 그림자 X (`shadow-lg` 류).

### 5.2 Card

```
border border-border-faint
rounded-md
bg-surface-1
hover:border-border (interactive)
```

내부 패딩 16~20px. 헤더는 `text-sm font-medium text-muted-foreground`.

### 5.3 Trust Score Big Readout

- 컨테이너: 카드, 패딩 24px
- 숫자: `text-5xl font-mono tabular-nums` + 색상 토큰 (`var(--trust-high|mid|low)`)
- 분모: `text-2xl font-mono text-subtle-foreground` (slash로 구분)
- 변화 시: spring (stiffness 200, damping 25), 숫자 roll-up 효과
- 임계값 통과 시 (예 70 ↑↓): 1회 pulse outer ring (200ms scale 1 → 1.06 → 1)

### 5.4 Metric Gauge

- horizontal bar 구조 (얇은 4px bar)
- `bg-border-faint` track + 색상 fill
- 라벨 좌, 값 우 (mono)
- 깎인 임계값 기반 색 변경: 0~40 low, 40~70 mid, 70~100 high
- 변화 motion: width transition 250ms ease-out

### 5.5 Judge Card

- `flex items-start gap-3 p-3 rounded-md border border-border-faint bg-surface-1`
- 좌 avatar (56x56, 표정 SVG), 우 정보:
  - 이름 (text-sm font-medium)
  - 페르소나 한 줄 (text-xs muted)
  - 코멘트 말풍선 (활성 시) — `bg-surface-2 border-l-2 border-{judge-accent} px-2 py-1 text-xs`
- 활성 표정 변경 시: avatar fade + 1.02 scale, accent color side bar 1초간 밝아짐
- 표정 정의: neutral / smile / nod / frown / doubt / bored / surprised

### 5.6 Live Transcript

- `font-mono text-sm` (한국어도 mono 글꼴 fallback이 sans로 자연스럽게 됨)
- 새 단어 fade-up 120ms (motion)
- 필러워드: `bg-filler-highlight-bg text-filler-highlight underline decoration-wavy decoration-1`
- 공허한 표현 ("혁신적인" 등): `text-trust-mid` underline
- 자동 스크롤 (스크롤바 hidden but functional)
- 최대 3줄 view, 아래로 fade mask

### 5.7 Webcam Canvas Overlay

- 비디오는 `object-cover w-full aspect-video rounded-md border border-border-faint`
- 위에 absolute Canvas2D — 얼굴 mesh + pose skeleton
- mesh: stroke `oklch(0.74 0.15 195 / 0.4)` 0.5px
- pose skeleton: stroke `oklch(0.78 0.17 145 / 0.6)` 1.5px
- 시선 회피 시 mesh가 1초간 trust-low 색으로 펄스

### 5.8 Coach Message

- `flex items-start gap-2 px-4 py-3 rounded-md border-l-2 border-primary bg-surface-1`
- 좌 아이콘 (lucide `Sparkle` w-4) — 스피닝 X, 색만 primary
- 우 텍스트 (text-sm)
- 새 메시지 등장: slide-up 200ms + fade

### 5.9 Recording Indicator (topbar)

- `flex items-center gap-1.5`
- 빨간 점 (8px) — pulse 1.5s loop (opacity 0.4 → 1)
- 텍스트 "REC" (text-xs font-mono uppercase tracking-wider)
- 옆에 timer (mm:ss font-mono tabular-nums)

---

## 6. Motion System

### 6.1 Durations

```
--motion-fast: 80ms;     /* hover, focus */
--motion-base: 160ms;    /* card hover, button */
--motion-slow: 280ms;    /* layout shift */
--motion-emphasis: 400ms; /* score change, judge expression */
```

### 6.2 Easings

```
--ease-out: cubic-bezier(0.22, 1, 0.36, 1);     /* default */
--ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);  /* layout */
--ease-spring: spring(stiffness=200, damping=25); /* score, sentiment */
```

### 6.3 Specific motions

| event | motion |
|---|---|
| 점수 변화 | spring number roll-up + 1px 색 변화 |
| 표정 전환 | crossfade 200ms + scale 1 → 1.02 → 1 |
| 자막 새 단어 | fade-up 120ms |
| 필러 발견 | red 1px ring pulse 350ms (말풍선 자체에) |
| 페이지 전환 | Next.js 16 ViewTransition (fade 200ms) |
| Judge 코멘트 등장 | slide-down 180ms + fade |
| Loading | dot pulse (no spinner — 시계 안 보고 싶다) |

### 6.4 Reduced motion

`prefers-reduced-motion: reduce` 모두 fade 80ms 대체. 점수 변화도 즉시 변경.

---

## 7. Iconography

- 라이브러리: `lucide-react` (단일)
- 크기: 14px (default body), 16px (button), 20px (heading)
- stroke-width: 1.75 (default), 2 (small UI)
- 컬러: 본문 색 inherit; 액션 색은 토큰

**금지**: 일러스트 아이콘, emoji 아이콘 대용, 다른 라이브러리 (Heroicons 등)와 혼용.

---

## 8. Visual Identity Beats (창의적 디테일)

해커톤 임팩트 위해 *반드시* 들어가는 요소들:

### 8.1 "Trust Aura" — Webcam Halo
웹캠 캔버스 바깥에 신뢰 점수에 비례하는 아주 얇은 (1.5px) 컬러 ring. 점수 색 토큰 따름. 점수 변화 시 spring으로 두께/색상 전환. 점수 < 40에서는 ring이 잠시 끊겨 보임 (의도적 결손).

### 8.2 Judge Eye-Tracking
Judge avatar 안의 눈동자 SVG가 *발표자가 카메라를 응시할 때* 정면, *시선이 떨어졌을 때* 같은 방향으로 약간 따라간다 (CSS transform). 디테일은 작지만 "심사위원이 살아있다"는 느낌.

### 8.3 Voice Waveform Pulse
화면 *최하단 1px* 두께의 컬러 strip이 마이크 음량에 따라 약하게 진동 (오디오 RMS → strip opacity/saturation). 항상 보이지만 의식하지 않을 정도로 미묘. 발표 흐름이 살아있다는 신호.

### 8.4 Filler Counter Tick
필러워드 카운트가 +1 될 때 카운터 옆 1px scale 펄스 + 색이 잠시 trust-low로 깜빡 후 복귀.

### 8.5 Score Delta Ghost
신뢰 점수가 변경될 때, 이전 숫자가 0.5초간 잔상처럼 살짝 위 또는 아래에 trust-low (감소) 또는 trust-high (증가)로 보였다 사라짐. 변화 방향 즉각 인지.

### 8.6 Loading State
LangGraph finalize 호출 (5초 정도 걸림) 시:
- 풀 스크린 darkened
- 중앙에 mono 텍스트 line-by-line 출력 (가짜 console look):
  ```
  > analyzing transcript...      [done]
  > evaluating judges...         [done]
  > generating action items...   [...]
  ```
- 마지막 줄 cursor blink
- 끝나면 fade out → 리포트 페이지로 ViewTransition

---

## 9. Accessibility

- 모든 인터랙티브 요소 keyboard accessible (`focus-visible` ring)
- 색만으로 정보 전달 X — 점수 색에 항상 텍스트 라벨 동반
- aria-label 모든 icon-only 버튼
- 자막은 `aria-live="polite"` (screen reader)
- 다크 모드 contrast 위 4.5:1 검증 (axe-core 자동)
- 음성 권한 거부 시 `<Alert>` 로 명확한 가이드 + 재시도 버튼

---

## 10. Page-by-Page Mood

### 10.1 Landing (`/`)

- 진입 시 "voice waveform"이 hero 텍스트 뒤에 ambient 흐름
- 헤드라인: `한 번도 본 적 없는 IR 코칭` (text-display, weight 800, letter-spacing -0.04em)
- 서브: `가상 AI 심사위원이 실시간 반응합니다` (text-xl, muted-foreground)
- CTA 단 1개: `발표 시작하기` (primary lg) — 두 개 X
- 스크롤 시: 분석 화면 미리보기 (스크린샷 또는 MediaPipe 라이브 데모)
- 푸터 minimal — link 4개

### 10.2 Pitch Live (`/pitch/[id]/live`)

- 진입 직후 5초간 "ARMING..." 풀 스크린 카운트다운 (mono, 숫자 큼)
- 카운트다운 끝나면 fade-in으로 분석 UI
- 발표 중에는 UI chrome 최소 — 데이터만 살아있음
- "발표 종료" 버튼은 우하단 destructive ghost

### 10.3 Pitch Report (`/pitch/[id]/report`)

- 진입: hero에 큰 점수 + 한 줄 평
- 스크롤: 시간축 그래프 → 4축 레이더 → 강약점 → 액션 아이템 → Before/After 이미지
- 각 섹션 fade-up on scroll (180ms, stagger 60ms)
- export PDF 버튼 우상단 (선택 기능)

### 10.4 Dashboard (`/dashboard`)

- Linear-style 리스트: 한 행에 세션명·날짜·점수·duration
- 각 행 클릭 시 리포트로
- 점수는 좌측 컬러 dot (3px) — 가장 인접한 데이터로 한눈에 보임
- 빈 상태: `아직 피칭이 없습니다. 첫 피칭을 시작하세요.` + CTA

---

## 11. Tailwind v4 토큰 매핑

`globals.css`의 `@theme inline` 안에 위 CSS 변수를 Tailwind 토큰으로 매핑.

```css
@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-surface-1: var(--surface-1);
  --color-surface-2: var(--surface-2);
  --color-surface-3: var(--surface-3);
  --color-muted-foreground: var(--muted-foreground);
  --color-subtle-foreground: var(--subtle-foreground);
  --color-border: var(--border);
  --color-border-strong: var(--border-strong);
  --color-border-faint: var(--border-faint);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-trust-high: var(--trust-high);
  --color-trust-mid: var(--trust-mid);
  --color-trust-low: var(--trust-low);
  --color-judge-fact: var(--judge-fact-accent);
  --color-judge-connect: var(--judge-connect-accent);
  --color-judge-critical: var(--judge-critical-accent);
  --font-sans: "Pretendard Variable", "Inter Variable", system-ui, sans-serif;
  --font-mono: "JetBrains Mono Variable", ui-monospace, monospace;
  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;
}
```

---

## 12. Quality Bar (검증 체크리스트)

새 컴포넌트/페이지 추가 후 *반드시* 통과:

- [ ] light + dark 두 모드 모두 깨짐 없음
- [ ] 모바일 (375×667) 안 깨짐 — 텍스트 잘림 X, overflow-x X
- [ ] 모든 인터랙티브 keyboard 접근 가능
- [ ] focus-visible ring 보임
- [ ] 색만으로 의미 전달하지 않음 (텍스트/아이콘 동반)
- [ ] motion이 useful (장식 motion X)
- [ ] hardcoded color X (semantic token만)
- [ ] 이모지 X
- [ ] mono 폰트는 숫자/시간/code에만
- [ ] 1024px 이상에서 정보 밀도가 충분 (whitespace 과다 X)

---

## 13. References

- **Linear** (linear.app) — 다크, 미니멀, keyboard-first, 톤
- **Granola** (granola.ai) — pre-AI 노트 ambient 흐름
- **Rewind** (rewind.ai) — "your voice analyzed" hero
- **Vercel** (vercel.com) — 검정 + 미니멀 + 타이포그래피 강조
- **v0.dev / 21st.dev** — shadcn 톤 검수
- **Yoodli, Orai, Orato AI** — IR 코칭 도메인 UX 패턴
- **Bloomberg Terminal** — 정보 밀도, mono numerics
- **Krea AI** — creative motion (사용은 제한적)

이 모두를 chimera로 묶기보다, **Linear의 정렬 + Bloomberg의 밀도 + Granola의 ambient**가 핵심 mix.
