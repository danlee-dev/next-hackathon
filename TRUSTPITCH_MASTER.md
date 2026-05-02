# TrustPitch — Master Spec for Implementation

> 본 문서는 Claude Code(또는 다른 코딩 에이전트)가 단일 입력으로 받아 전체 프로젝트를 빌드할 수 있도록 작성된 통합 명세서다. 기획, 기술 스택, 디자인, 구현 순서, 코드 스니펫, 환경 변수, 데이터 스키마까지 모두 포함한다.

---

## 0. Quick Facts (Claude Code가 가장 먼저 읽을 것)

- 프로젝트 코드네임: **TrustPitch**
- 프로덕트 한 줄: 가상 AI 심사위원단이 실시간 반응하는 IR 피칭 코칭 서비스
- 스프린트 길이: 48시간 해커톤
- 배포 대상: 프론트 = Vercel, 백엔드 = Railway, DB/Auth = Supabase
- 작업자 환경: macOS (Apple Silicon M3), Node 20+, Python 3.12, pnpm, Docker(선택)
- 최우선 가치: (1) 시연 안정성 (2) 비주얼 임팩트 (3) 점수 산정의 신뢰성
- 절대 금지: 이모지(코드/문서/UI 텍스트 일체), GPU 의존 모델 자체 호스팅, Hume Expression Measurement API(2026-06-14 sunset)

---

## 1. Product Vision

### 1.1 Problem Statement
초기 창업자는 IR 피칭에서 시선 회피, 잦은 추임새, 과장된 표현 때문에 투자자의 본능적인 불신을 산다. 기존 발표 코칭은 시간/비용이 크고, 영어권 도구(Yoodli, Orai, Poised, Orato AI)는 한국어 IR 환경을 제대로 다루지 못한다.

### 1.2 Solution
세 명의 가상 AI 심사위원이 발표를 실시간으로 보고, 듣고, 즉각 반응한다. 발표자는 인간 청중 앞에 서기 전에, 데이터 기반의 솔직한 피드백을 실전 환경에서 받는다.

### 1.3 Differentiation
- 한국어 IR 환경 특화 (한국어 필러워드 사전, 한국 VC 톤)
- "신뢰 점수" 단일 지표로 모든 분석을 통합 (남들은 점수 분리)
- 가상 심사위원이 실시간으로 표정/제스처로 반응 (남들은 그래프만)
- 발표 종료 후 "이상적인 너 vs 지금의 너" Before/After 시각화

### 1.4 Target User
- 한국 스타트업 초기 창업자 (대학 창업 동아리, 액셀러레이터 입주팀)
- IR 데모데이 / VC 미팅 앞둔 팀 리더
- 1차 타겟: 고려대 NEXT, 프로메테우스, KAIST E5, SNU 창업동아리 등

---

## 2. Tech Stack (2026-05 기준 최신, 검증 완료)

### 2.1 Frontend (Vercel)
| 항목 | 버전/이름 | 비고 |
|---|---|---|
| Framework | Next.js 16 (App Router) | Turbopack 기본, params는 Promise |
| React | 19 | Server Components + Suspense |
| Language | TypeScript 5.x | strict 모드 |
| Styling | Tailwind CSS v4 | `@theme inline`, OKLCH 컬러 |
| Components | shadcn/ui (new-york style) | Radix UI 기반, copy-paste |
| Animations | tw-animate-css + motion(framer-motion) | shadcn 기본 |
| Icons | lucide-react | |
| Charts | recharts | 시간축 그래프, 레이더 차트 |
| ML (브라우저) | @mediapipe/tasks-vision | FaceLandmarker + PoseLandmarker |
| Speech (보조) | Web Speech API (브라우저 내장) | 실시간 자막 즉각성용 |
| Forms | react-hook-form + zod | shadcn Form 컴포넌트 |
| State | zustand (전역) + React state(로컬) | 가벼운 전역 상태 |
| Supabase | @supabase/supabase-js + @supabase/ssr | 서버/클라 양쪽 |
| Package Mgr | pnpm | |
| Linter | Biome | ESLint보다 빠름 |

### 2.2 Backend (Railway)
| 항목 | 버전/이름 | 비고 |
|---|---|---|
| Language | Python 3.12 | |
| Framework | FastAPI 0.115+ | async, Pydantic v2 |
| ASGI Server | uvicorn[standard] | |
| LLM Orchestration | LangGraph (latest) | 멀티 에이전트 |
| LLM SDK | openai (Python, latest) | |
| LLM SDK (보조) | anthropic (Python, latest) | 한국어 콘텐츠 분석용 |
| 음성 분석 | librosa 0.10+ | CPU only |
| 음성학 (선택) | praat-parselmouth | jitter/shimmer |
| 비동기 HTTP | httpx | |
| 검증 | pydantic 2.x | |
| Supabase | supabase-py 2.x | service_role 키 사용 |
| 패키지 매니저 | uv 또는 pip + requirements.txt | uv 추천(빠름) |

### 2.3 Data Layer (Supabase)
- Auth: Email + Google OAuth (PKCE)
- Database: PostgreSQL 15
- Storage: 발표 영상 녹화 (선택, MVP는 미저장)
- Realtime: 점수 동기화 (선택, MVP는 클라/서버 직접 통신)
- 키 시스템: 신규 publishable key (`sb_publishable_xxx`) + secret key 사용

### 2.4 External APIs
| 용도 | 모델/서비스 | 가격 (2026-05) |
|---|---|---|
| 한국어 STT | OpenAI gpt-4o-mini-transcribe | $0.003/분 |
| 멀티모달 종합 | OpenAI gpt-4o | $2.50/$10 per M tokens |
| 콘텐츠 분석 (보조) | Anthropic Claude Opus 4.7 또는 Sonnet 4.6 | 한국어 강함 |
| 이미지 생성 | OpenAI gpt-image-1 또는 DALL-E 3 | 심사위원 표정/Before-After |

### 2.5 사용 금지/주의
- Hume Expression Measurement API: **2026-06-14 sunset**, 절대 사용 금지
- Hume EVI: 발표 분석엔 부적합 (대화형 음성 AI)
- face-api.js: 구식, MediaPipe로 대체
- WebSocket: Vercel에서 안 됨, HTTP POST 청크 방식 사용
- localStorage/sessionStorage: 가능하지만 SSR 시 주의

---

## 3. Core Features (3 Pillars + 1 Meta)

### 3.1 Visual Trust (시각 신뢰)
**입력**: 웹캠 비디오 (640x480, 30fps)
**처리 위치**: 브라우저 (MediaPipe WASM)
**출력 지표**:
- `eye_contact_ratio` (0-100): 정면 응시 비율
- `head_stability` (0-100): 얼굴 방향 안정성 (낮을수록 두리번)
- `body_sway` (0-100): 어깨 좌우 흔들림 (낮을수록 흔들림 적음)
- `gesture_usage` (0-100): 손이 가슴 위로 올라온 시간 비율
- `smile_naturalness` (0-100): mouthSmile blendshape의 시간 평균과 표준편차 조합

### 3.2 Verbal Trust (음성 신뢰)
**입력**: 마이크 오디오 (16kHz mono, 5초 청크)
**처리 위치**: 브라우저(MediaRecorder) → Railway 백엔드
**출력 지표**:
- `filler_count_per_min` (count): 한국어 필러워드 분당 빈도
- `pace_cpm` (chars/min): 한국어는 분당 글자수 기준 (정상: 280-320)
- `pitch_stability` (0-100): 피치 std 기반
- `volume_consistency` (0-100): RMS 에너지 std/mean 기반
- `speech_ratio` (0-100): 말한 시간 / 총 시간

**한국어 필러워드 사전** (정확히 이 리스트 사용):
```python
KOREAN_FILLERS = {
    "primary": ["음", "어", "아", "그"],
    "extended": ["그러니까", "약간", "뭐", "이제", "근데", "사실", "막"],
    "phrase": ["그게 이제", "뭐랄까", "그니까", "어 그", "음 그"],
}
```

### 3.3 Logical Trust (논리 신뢰)
**입력**: 발표 전체 전사 (Whisper 결과 통합)
**처리 위치**: Railway → OpenAI gpt-4o
**출력 지표** (LLM 평가, 0-100):
- `core_message_clarity`: 한 문장으로 요약 가능한가
- `argument_evidence_balance`: 주장에 근거가 있는가
- `empty_phrases_count`: "혁신적인", "최고의", "절대적", "무조건" 등 카운트
- `audience_comprehension`: 투자자가 1분 안에 이해할 수 있는가

### 3.4 Trust Score (종합)
```
trust_score = (
    visual_score  * 0.30 +
    audio_score   * 0.40 +  # 음성이 가장 비중 큼
    content_score * 0.30
)

visual_score = (
    eye_contact   * 0.40 +
    body_stability* 0.30 +  # head_stability와 body_sway 평균
    gesture_usage * 0.30
)

audio_score = (
    (100 - normalized_filler) * 0.40 +
    pace_score                * 0.30 +
    pitch_stability           * 0.30
)

content_score = (
    core_message_clarity            * 0.40 +
    argument_evidence_balance       * 0.30 +
    (100 - normalized_empty_phrases)* 0.30
)
```

`pace_score` 계산: 정상 범위(280-320 cpm)에서 100점, 멀어질수록 감점.
`normalized_filler` = min(filler_per_min * 10, 100)
`normalized_empty_phrases` = min(empty_phrases * 15, 100)

---

## 4. AI Judge System (가상 심사위원)

3명, 각각 다른 페르소나와 트리거를 갖는다.

### 4.1 Judge Definitions

```typescript
// types/judges.ts
export type JudgeId = "judge-fact" | "judge-connect" | "judge-critical";
export type Expression = "neutral" | "smile" | "nod" | "frown" | "doubt" | "bored" | "surprised";

export interface Judge {
  id: JudgeId;
  nameKo: string;
  nameEn: string;
  persona: string;
  triggers: TriggerRule[];
  defaultExpression: Expression;
}

export const JUDGES: Judge[] = [
  {
    id: "judge-fact",
    nameKo: "김팩트",
    nameEn: "Mr. Fact",
    persona: "데이터 기반 냉철한 투자자. 숫자와 근거를 본다.",
    defaultExpression: "neutral",
    triggers: [
      { metric: "empty_phrases_count", op: ">=", value: 1, expression: "frown", comment: "근거 없는 단정은 위험합니다." },
      { metric: "core_message_clarity", op: ">=", value: 80, expression: "nod", comment: "메시지가 명확하군요." },
    ],
  },
  {
    id: "judge-connect",
    nameKo: "이공감",
    nameEn: "Ms. Connect",
    persona: "태도와 진정성을 보는 창업가 출신 투자자.",
    defaultExpression: "neutral",
    triggers: [
      { metric: "eye_contact_ratio", op: "<", value: 40, expression: "frown", comment: "눈을 봐주세요." },
      { metric: "eye_contact_ratio", op: ">=", value: 70, expression: "smile", comment: "좋은 아이컨택입니다." },
      { metric: "body_sway", op: ">", value: 70, expression: "doubt", comment: "긴장이 보이네요." },
    ],
  },
  {
    id: "judge-critical",
    nameKo: "박독설",
    nameEn: "Dr. Critical",
    persona: "디테일에 강한 독설가 전문가. 약점을 짚는다.",
    defaultExpression: "neutral",
    triggers: [
      { metric: "filler_count_per_min", op: ">=", value: 8, expression: "bored", comment: "추임새를 줄이세요." },
      { metric: "pitch_stability", op: "<", value: 40, expression: "doubt", comment: "목소리가 떨립니다." },
      { metric: "pace_cpm", op: ">", value: 380, expression: "surprised", comment: "너무 빠릅니다." },
    ],
  },
];
```

### 4.2 Judge Avatar 구현 전략

**선택지 A (추천, 빠름)**: SVG 일러스트 + CSS 표정 전환
- 각 judge별 표정 7종을 SVG로 만들거나 무료 일러스트 활용
- Lucide/Radix Icons + Tailwind로 색/효과만 변경
- 표정 전환 시 motion(framer-motion) crossfade

**선택지 B (임팩트 큼, 시간 더 듦)**: gpt-image-1으로 사전 생성
- 각 judge별 캐릭터 컨셉 정의 → gpt-image-1으로 표정 7종 생성
- Supabase Storage에 업로드 → 정적 자산으로 사용
- 표정 전환 시 framer-motion으로 부드럽게

**해커톤 전략**: 일단 A로 만들고, 시간 남으면 B로 교체. SVG 컴포넌트 인터페이스를 통일해두면 교체 비용 낮음.

```tsx
// 통일된 인터페이스
<JudgeAvatar judgeId="judge-fact" expression="frown" comment="근거가 부족합니다" />
```

### 4.3 Realtime Reaction Loop

```
[클라이언트]
  매 100ms마다:
    - 시각 지표 EMA 업데이트
    - 각 judge의 trigger rule 평가
    - 표정 변경 + 말풍선 표시 (debounce 1.5초)
  매 5초마다:
    - 음성 청크 백엔드로 전송
    - 응답 받은 음성 지표로 trigger 재평가
  매 10초마다:
    - 현재까지 누적 지표 + 영상 스냅샷 1장을 백엔드 /coach-snapshot으로 전송
    - GPT-4o가 자연어 코칭 메시지 생성 → 화면 하단 표시
```

---

## 5. UI / UX Specification

### 5.1 Page Structure

```
/                        랜딩 (히어로 + 데모 영상 + CTA)
/auth/login              이메일 + Google OAuth
/auth/callback           OAuth 콜백
/dashboard               지난 세션 목록
/pitch/new               새 피칭 시작 (마이크/카메라 권한 + 카운트다운)
/pitch/[sessionId]/live  실시간 분석 화면 (메인)
/pitch/[sessionId]/report 사후 리포트
/settings                계정 설정
```

### 5.2 메인 분석 화면 레이아웃 (`/pitch/[id]/live`)

```
┌─────────────────────────────────────────────────────────────┐
│  TrustPitch  [세션명: Q3 시드 IR]              [녹음 중 02:34]│ <- 상단바
├─────────────────────────────────────────────────────────────┤
│                                      │                       │
│                                      │  [심사위원 카드 1]    │
│      ┌────────────────────────┐     │  김팩트 (neutral)     │
│      │                        │     │  "근거가 명확합니다"   │
│      │   웹캠 영상 + 랜드마크 │     │                       │
│      │   (시선/포즈 시각화)    │     │  [심사위원 카드 2]    │
│      │                        │     │  이공감 (smile)       │
│      └────────────────────────┘     │  "좋은 아이컨택"       │
│                                      │                       │
│  ┌──────────────────────────────┐   │  [심사위원 카드 3]    │
│  │ 실시간 자막 (필러 빨강 강조) │   │  박독설 (frown)       │
│  │ "그러니까 저희 회사는..."    │   │  "추임새 줄이세요"     │
│  └──────────────────────────────┘   │                       │
│                                      │  ─────────────────    │
│  AI 코치: "지금 시선이 회피되고      │  신뢰 점수            │
│  있어요. 카메라를 정면으로 보세요."  │  ┌───────────────┐    │
│                                      │  │   78          │    │
│                                      │  │   /100        │    │
│                                      │  └───────────────┘    │
│                                      │                       │
│                                      │  시선 ████░░ 68%      │
│                                      │  자세 ██████ 82%      │
│                                      │  음성 ████░░ 71%      │
│                                      │  필러 [12회]          │
│                                      │                       │
│  [발표 종료] [일시정지]             │                       │
└─────────────────────────────────────────────────────────────┘

비율: 좌(웹캠+자막+코치) 60% : 우(심사위원+점수) 40%
```

### 5.3 사후 리포트 레이아웃 (`/pitch/[id]/report`)

```
┌─────────────────────────────────────────────────────────────┐
│  최종 신뢰 점수                                              │
│  ┌──────────────┐                                            │
│  │     78       │   상위 35% (IR 평균 기준)                  │
│  │    /100      │                                            │
│  └──────────────┘                                            │
├─────────────────────────────────────────────────────────────┤
│  시간축 신뢰도 그래프                                        │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ 100 ┤                                                │   │
│  │  75 ┤    ╱╲    ╱╲                                  │   │
│  │  50 ┤───╱──╲──╱──╲────────                         │   │
│  │  25 ┤        ╲╱                                     │   │
│  │   0 └──────────────────────────────────────────     │   │
│  │     0:00    0:30    1:00    1:30    2:00            │   │
│  └──────────────────────────────────────────────────────┘   │
│  빨강 마커: 점수 급락 구간 (클릭 시 영상 점프)              │
├─────────────────────────────────────────────────────────────┤
│  4축 레이더 차트         │  심사위원 한 줄평                │
│      시각               │  김팩트:                          │
│       /\                │  "데이터는 좋으나 결론이 약함"    │
│      /  \               │  이공감:                          │
│  음성--+--논리          │  "진정성이 느껴졌습니다"          │
│      \  /               │  박독설:                          │
│       \/                │  "추임새 12회, 분당 8회는 많음"   │
│      일관성             │                                   │
├─────────────────────────────────────────────────────────────┤
│  강점 / 약점 / 액션 아이템                                   │
│  강점: 음성 안정성 우수, 핵심 메시지 명확                    │
│  약점: 시선 응시 45%, 필러워드 분당 12회, 공허한 표현 7회    │
│  액션: 1) "약간"을 "정확히는"으로 대체                       │
│        2) 슬라이드 전환 시 의도적 1초 pause                  │
│        3) 핵심 숫자 3개 암기 후 발표                         │
├─────────────────────────────────────────────────────────────┤
│  [Before/After 이미지: 지금의 너 vs 신뢰감 있는 너]         │
│  (gpt-image-1으로 생성, 시간 남으면)                        │
└─────────────────────────────────────────────────────────────┘
```

### 5.4 디자인 시스템

#### 컬러 (OKLCH, Tailwind v4 `@theme inline`)
```css
:root {
  /* Base — 다크 모드 우선, IR 환경 적합 */
  --background: oklch(0.145 0 0);          /* 거의 검정 */
  --foreground: oklch(0.985 0 0);          /* 거의 흰색 */
  --card: oklch(0.205 0 0);
  --card-foreground: oklch(0.985 0 0);
  --border: oklch(0.269 0 0);
  --input: oklch(0.269 0 0);

  /* Primary — 차분한 청록 (신뢰 색) */
  --primary: oklch(0.696 0.142 200);       /* teal-cyan */
  --primary-foreground: oklch(0.145 0 0);

  /* Trust score gradient */
  --trust-high: oklch(0.745 0.18 145);     /* green */
  --trust-mid: oklch(0.795 0.165 85);      /* amber */
  --trust-low: oklch(0.65 0.22 25);        /* red-orange */

  /* Accents */
  --filler-highlight: oklch(0.65 0.22 25); /* 자막 빨강 */
  --judge-fact-accent: oklch(0.7 0.15 250);    /* 시원한 파랑 */
  --judge-connect-accent: oklch(0.74 0.16 145); /* 따뜻한 초록 */
  --judge-critical-accent: oklch(0.65 0.22 30); /* 날카로운 빨강 */
}
```

#### 타이포그래피
- 본문: Pretendard Variable (한글 우선) → fallback Inter
- 숫자/점수: JetBrains Mono Variable (모노스페이스, 점수 정렬용)
- 사이즈 스케일: shadcn 기본 (text-xs ~ text-4xl)

#### 컴포넌트 (shadcn add 명령)
```
button, card, dialog, drawer, sonner(toast), tabs, badge,
progress, separator, skeleton, alert, avatar, tooltip,
dropdown-menu, sheet, input, label, form, scroll-area,
chart (recharts wrapper), sidebar
```

### 5.5 디자인 레퍼런스
참고할 사이트들 (직접 보면서 디자인 톤 맞춰라):
- **Linear** (linear.app): 다크 모드, 미니멀, 키보드 우선 UX
- **Vercel** (vercel.com): 검정/회색 베이스 + 컬러 액센트
- **Cursor** (cursor.com): 기능 강조형 랜딩
- **v0.dev**: shadcn 컴포넌트 조합 영감
- **21st.dev**: shadcn 컴포넌트 갤러리
- **Yoodli, Orai, Orato AI**: 같은 도메인 경쟁자, UX 패턴 참고
- **Mochi** (mochi.app) / **Dribbble의 "voice analytics"**: 음파/실시간 시각화

### 5.6 Motion / Microinteraction 가이드
- 점수 변화는 spring (stiffness: 200, damping: 25) 부드럽게
- 표정 전환은 fade 200ms + slight scale 1.02
- 자막 새 단어는 typewriter 또는 fade-up
- 필러워드 발견 시 빨간 펄스 1회 + 카운트 +1 애니메이션
- 페이지 전환은 Next.js 16 ViewTransition 활용

---

## 6. Folder Structure

```
trustpitch/
├── frontend/                          # Vercel 배포
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   └── callback/route.ts
│   │   ├── (app)/
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── pitch/
│   │   │   │   ├── new/page.tsx
│   │   │   │   └── [id]/
│   │   │   │       ├── live/page.tsx
│   │   │   │       └── report/page.tsx
│   │   │   └── settings/page.tsx
│   │   ├── api/
│   │   │   └── proxy/[...path]/route.ts  # Railway 프록시 (CORS 회피용, 선택)
│   │   ├── layout.tsx
│   │   ├── page.tsx                       # 랜딩
│   │   └── globals.css
│   ├── components/
│   │   ├── ui/                            # shadcn 컴포넌트
│   │   ├── pitch/
│   │   │   ├── webcam-canvas.tsx          # 웹캠 + 랜드마크 오버레이
│   │   │   ├── live-transcript.tsx        # 실시간 자막
│   │   │   ├── trust-score-card.tsx       # 빅 점수
│   │   │   ├── metrics-panel.tsx          # 4개 게이지
│   │   │   ├── coach-message.tsx          # AI 코치 한 줄
│   │   │   └── controls.tsx               # 시작/종료
│   │   ├── judges/
│   │   │   ├── judge-card.tsx
│   │   │   ├── judge-avatar.tsx           # SVG 표정 전환
│   │   │   └── judge-comment-bubble.tsx
│   │   └── report/
│   │       ├── timeline-chart.tsx
│   │       ├── radar-chart.tsx
│   │       ├── strengths-weaknesses.tsx
│   │       └── action-items.tsx
│   ├── hooks/
│   │   ├── use-mediapipe.ts               # FaceLandmarker + PoseLandmarker
│   │   ├── use-audio-recorder.ts          # MediaRecorder 5초 청크
│   │   ├── use-speech-recognition.ts      # Web Speech API (보조 자막)
│   │   ├── use-trust-store.ts             # zustand 점수 상태
│   │   └── use-judge-reactions.ts         # trigger 평가
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts                  # 브라우저 클라
│   │   │   ├── server.ts                  # 서버 컴포넌트 클라
│   │   │   └── proxy.ts                   # Next.js Proxy (auth 새로고침)
│   │   ├── analyzers/
│   │   │   ├── eye-contact.ts             # 시선 계산
│   │   │   ├── head-stability.ts
│   │   │   ├── body-sway.ts
│   │   │   ├── gesture.ts
│   │   │   └── smoothing.ts               # EMA 필터
│   │   ├── judges/
│   │   │   ├── definitions.ts             # JUDGES 배열
│   │   │   └── trigger-engine.ts
│   │   ├── api-client.ts                  # Railway API 호출 래퍼
│   │   ├── score.ts                       # trust_score 계산
│   │   └── utils.ts                       # cn 등
│   ├── types/
│   │   ├── pitch.ts
│   │   ├── judges.ts
│   │   └── api.ts
│   ├── public/
│   │   └── judges/                        # SVG 일러스트 (또는 gpt-image-1 결과)
│   ├── components.json                    # shadcn 설정
│   ├── next.config.ts
│   ├── package.json
│   ├── tsconfig.json
│   ├── biome.json
│   └── .env.local.example
│
├── backend/                           # Railway 배포
│   ├── app/
│   │   ├── main.py                        # FastAPI 엔트리
│   │   ├── config.py                      # 환경변수 로딩
│   │   ├── deps.py                        # 의존성 주입
│   │   ├── routers/
│   │   │   ├── sessions.py
│   │   │   ├── audio.py
│   │   │   ├── coach.py
│   │   │   └── reports.py
│   │   ├── services/
│   │   │   ├── transcription.py           # Whisper API 호출
│   │   │   ├── audio_features.py          # librosa 분석
│   │   │   ├── filler_detector.py         # 한국어 필러워드
│   │   │   ├── content_analyzer.py        # GPT-4o 콘텐츠 평가
│   │   │   ├── coach_generator.py         # GPT-4o 실시간 코칭
│   │   │   └── report_generator.py        # 최종 리포트
│   │   ├── agents/                        # LangGraph
│   │   │   ├── graph.py                   # StateGraph 정의
│   │   │   └── nodes.py                   # 각 노드 함수
│   │   ├── models/
│   │   │   ├── schemas.py                 # Pydantic 스키마
│   │   │   └── enums.py
│   │   └── core/
│   │       ├── supabase.py                # supabase-py 클라이언트
│   │       └── openai_client.py
│   ├── tests/
│   │   └── test_audio.py                  # 샘플 음성 단위 테스트
│   ├── Dockerfile
│   ├── pyproject.toml                     # uv 용
│   ├── requirements.txt                   # pip 백업용
│   ├── railway.toml
│   └── .env.example
│
├── supabase/
│   ├── migrations/
│   │   └── 20260502_init.sql              # 아래 스키마
│   └── seed.sql
│
├── docs/
│   ├── DESIGN_TOKENS.md
│   ├── API_SPEC.md
│   └── DEMO_SCRIPT.md
│
├── .github/
│   └── workflows/                          # 선택
│
├── README.md
├── pnpm-workspace.yaml                     # 모노레포 (선택)
└── TRUSTPITCH_MASTER.md                    # 본 문서
```

---

## 7. Database Schema (Supabase)

```sql
-- supabase/migrations/20260502_init.sql

-- 사용자 프로필
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  display_name text,
  created_at timestamptz not null default now()
);

-- 피칭 세션
create table public.pitch_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default '제목 없는 피칭',
  status text not null default 'in_progress' check (status in ('in_progress','completed','aborted')),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  duration_seconds integer,

  -- 종합 점수
  trust_score numeric(5,2),
  visual_score numeric(5,2),
  audio_score numeric(5,2),
  content_score numeric(5,2),

  -- 핵심 지표
  filler_count integer default 0,
  pace_cpm numeric(6,2),
  eye_contact_avg numeric(5,2),

  -- 원본 데이터
  transcript text,
  metrics jsonb default '{}'::jsonb,        -- 모든 지표 평균/std
  llm_feedback jsonb default '{}'::jsonb,   -- LLM 종합 피드백

  created_at timestamptz not null default now()
);

create index idx_pitch_sessions_user on public.pitch_sessions(user_id, created_at desc);

-- 시계열 이벤트 (시간축 그래프용)
create table public.pitch_timeline (
  id bigserial primary key,
  session_id uuid not null references public.pitch_sessions(id) on delete cascade,
  ts_ms integer not null,                   -- 발표 시작부터 ms
  trust_score numeric(5,2),
  visual_score numeric(5,2),
  audio_score numeric(5,2),
  metrics jsonb default '{}'::jsonb
);

create index idx_pitch_timeline_session on public.pitch_timeline(session_id, ts_ms);

-- 심사위원 반응
create table public.judge_reactions (
  id bigserial primary key,
  session_id uuid not null references public.pitch_sessions(id) on delete cascade,
  ts_ms integer not null,
  judge_id text not null check (judge_id in ('judge-fact','judge-connect','judge-critical')),
  expression text not null,
  comment text,
  trigger_metric text,
  trigger_value numeric
);

create index idx_judge_reactions_session on public.judge_reactions(session_id, ts_ms);

-- 발견된 이벤트 (필러워드, 공허한 표현 등 — 자막 하이라이트용)
create table public.pitch_events (
  id bigserial primary key,
  session_id uuid not null references public.pitch_sessions(id) on delete cascade,
  ts_ms integer not null,
  event_type text not null,                 -- 'filler_word', 'empty_phrase', 'eye_drop', 'pitch_drop'
  payload jsonb default '{}'::jsonb         -- e.g. {"word": "음", "context": "..."}
);

create index idx_pitch_events_session on public.pitch_events(session_id, ts_ms);

-- RLS
alter table public.profiles enable row level security;
alter table public.pitch_sessions enable row level security;
alter table public.pitch_timeline enable row level security;
alter table public.judge_reactions enable row level security;
alter table public.pitch_events enable row level security;

-- profiles 정책
create policy "profiles_self_select" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_self_update" on public.profiles
  for update using (auth.uid() = id);
create policy "profiles_self_insert" on public.profiles
  for insert with check (auth.uid() = id);

-- pitch_sessions 정책
create policy "sessions_owner_all" on public.pitch_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 자식 테이블들은 세션 owner만 접근
create policy "timeline_owner" on public.pitch_timeline
  for all using (
    exists (select 1 from public.pitch_sessions s where s.id = session_id and s.user_id = auth.uid())
  );
create policy "judge_reactions_owner" on public.judge_reactions
  for all using (
    exists (select 1 from public.pitch_sessions s where s.id = session_id and s.user_id = auth.uid())
  );
create policy "pitch_events_owner" on public.pitch_events
  for all using (
    exists (select 1 from public.pitch_sessions s where s.id = session_id and s.user_id = auth.uid())
  );

-- 트리거: 회원가입 시 profile 자동 생성
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

---

## 8. API Specification (Railway FastAPI)

Base URL: `https://trustpitch-api.up.railway.app/api/v1`

모든 요청은 `Authorization: Bearer <supabase_access_token>` 헤더 필수. 백엔드는 토큰을 Supabase로 검증 후 `user_id` 추출.

### 8.1 POST `/sessions`
새 피칭 세션 생성.

Request:
```json
{ "title": "Q3 시드 IR 1차 리허설" }
```

Response:
```json
{ "session_id": "uuid", "started_at": "2026-05-02T10:00:00Z" }
```

### 8.2 POST `/sessions/{id}/audio-chunk`
5초 음성 청크 업로드 + 분석.

Request: `multipart/form-data`
- `audio` (file, webm/opus): 마이크 청크
- `chunk_index` (int): 0부터 시작
- `chunk_start_ms` (int): 발표 시작 기준 시작 시각

Response:
```json
{
  "chunk_index": 3,
  "transcript_partial": "그러니까 저희가 풀려는 문제는",
  "filler_count_delta": 1,
  "filler_words_found": [{ "word": "그러니까", "ts_ms": 15200 }],
  "pace_cpm": 295.4,
  "pitch_stability": 72.0,
  "volume_consistency": 68.5,
  "audio_score": 71.2
}
```

### 8.3 POST `/sessions/{id}/visual-tick`
프론트에서 계산한 시각 지표 기록 (1초당 1회).

Request:
```json
{
  "ts_ms": 15000,
  "eye_contact_ratio": 65.2,
  "head_stability": 81.0,
  "body_sway": 22.4,
  "gesture_usage": 45.0,
  "smile_naturalness": 30.1
}
```

Response: `{ "ok": true }` (DB에만 적재)

### 8.4 POST `/sessions/{id}/coach-snapshot`
10초마다 종합 코칭 메시지 요청.

Request: `multipart/form-data`
- `frame` (file, jpeg): 영상 스냅샷 1장
- `metrics_window` (json string): 최근 10초 평균 지표

Response:
```json
{
  "coaching": "지금 시선이 회피되고 있어요. 김팩트 심사위원을 정면으로 보세요.",
  "judge_id_addressed": "judge-connect"
}
```

### 8.5 POST `/sessions/{id}/finalize`
발표 종료. 최종 리포트 생성 (LangGraph 호출).

Request:
```json
{ "transcript": "전체 발표 통합 전사", "duration_seconds": 95 }
```

Response:
```json
{
  "session_id": "uuid",
  "trust_score": 78.4,
  "visual_score": 72.0,
  "audio_score": 81.5,
  "content_score": 75.0,
  "strengths": ["음성 안정성 우수", "핵심 메시지 명확"],
  "weaknesses": ["시선 응시 45%", "필러워드 분당 12회"],
  "action_items": ["..."],
  "judge_summaries": {
    "judge-fact": "...",
    "judge-connect": "...",
    "judge-critical": "..."
  }
}
```

### 8.6 GET `/sessions/{id}/report`
저장된 리포트 조회.

---

## 9. LangGraph Architecture (백엔드 LLM 오케스트레이션)

```
finalize 엔드포인트 호출
    │
    ▼
┌─────────────────────────────────┐
│  AnalysisState (TypedDict)      │
│  - transcript                   │
│  - audio_metrics                │
│  - visual_metrics               │
│  - filler_events                │
│  ...                            │
└─────────────────────────────────┘
    │
    ▼
[fan-out 병렬 실행]
    │
    ├──> ContentAnalyzerNode      (GPT-4o, 콘텐츠 평가)
    ├──> StrengthFinderNode       (GPT-4o, 강점 탐색)
    ├──> WeaknessFinderNode       (GPT-4o, 약점 탐색)
    ├──> JudgeFactNode            (페르소나 적용 코멘트)
    ├──> JudgeConnectNode         (페르소나 적용 코멘트)
    └──> JudgeCriticalNode        (페르소나 적용 코멘트)
    │
    ▼
[merge]
    │
    ▼
ActionItemGeneratorNode (모든 입력을 받아 액션 아이템 3개 생성)
    │
    ▼
SaveToSupabaseNode
    │
    ▼
응답 반환
```

병렬 실행은 LangGraph의 fan-out/fan-in 패턴 사용. 각 노드는 GPT-4o-mini 또는 Claude Haiku로 비용 절감 가능.

---

## 10. Critical Code Snippets

### 10.1 MediaPipe 통합 훅
```typescript
// frontend/hooks/use-mediapipe.ts
"use client";
import { useEffect, useRef, useState } from "react";
import {
  FaceLandmarker,
  PoseLandmarker,
  FilesetResolver,
  type FaceLandmarkerResult,
  type PoseLandmarkerResult,
} from "@mediapipe/tasks-vision";

export interface MediaPipeFrame {
  face: FaceLandmarkerResult | null;
  pose: PoseLandmarkerResult | null;
  timestampMs: number;
}

export function useMediaPipe(videoRef: React.RefObject<HTMLVideoElement>) {
  const faceRef = useRef<FaceLandmarker | null>(null);
  const poseRef = useRef<PoseLandmarker | null>(null);
  const rafRef = useRef<number | null>(null);
  const [ready, setReady] = useState(false);
  const [latestFrame, setLatestFrame] = useState<MediaPipeFrame | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm"
      );
      const [face, pose] = await Promise.all([
        FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
            delegate: "GPU",
          },
          outputFaceBlendshapes: true,
          outputFacialTransformationMatrixes: false,
          runningMode: "VIDEO",
          numFaces: 1,
        }),
        PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          numPoses: 1,
        }),
      ]);
      if (cancelled) {
        face.close();
        pose.close();
        return;
      }
      faceRef.current = face;
      poseRef.current = pose;
      setReady(true);
    })();

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      faceRef.current?.close();
      poseRef.current?.close();
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    let lastTs = 0;

    const tick = () => {
      const v = videoRef.current;
      if (v && v.readyState >= 2 && faceRef.current && poseRef.current) {
        const ts = performance.now();
        if (ts - lastTs > 33) {
          const face = faceRef.current.detectForVideo(v, ts);
          const pose = poseRef.current.detectForVideo(v, ts);
          setLatestFrame({ face, pose, timestampMs: ts });
          lastTs = ts;
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    tick();

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [ready, videoRef]);

  return { ready, frame: latestFrame };
}
```

### 10.2 시선 응시율 계산
```typescript
// frontend/lib/analyzers/eye-contact.ts
import type { FaceLandmarkerResult } from "@mediapipe/tasks-vision";

export function computeEyeContact(face: FaceLandmarkerResult): number {
  if (!face.faceLandmarks?.[0]) return 0;
  const lm = face.faceLandmarks[0];

  const noseTip = lm[1];
  const leftEyeOuter = lm[33];
  const rightEyeOuter = lm[263];
  const eyeMidX = (leftEyeOuter.x + rightEyeOuter.x) / 2;
  const eyeMidY = (leftEyeOuter.y + rightEyeOuter.y) / 2;

  const dx = Math.abs(noseTip.x - eyeMidX);
  const dy = Math.abs(noseTip.y - eyeMidY - 0.05);

  const score = Math.max(0, 1 - (dx * 50 + dy * 30) / 2);
  return Math.round(score * 100);
}
```

### 10.3 음성 청크 전송 훅
```typescript
// frontend/hooks/use-audio-recorder.ts
"use client";
import { useEffect, useRef, useState } from "react";

const CHUNK_MS = 5000;

export function useAudioRecorder(
  enabled: boolean,
  onChunk: (blob: Blob, indexInfo: { index: number; startMs: number }) => void
) {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const indexRef = useRef(0);
  const startedAtRef = useRef(0);
  const [state, setState] = useState<"idle" | "recording" | "stopped">("idle");

  useEffect(() => {
    if (!enabled) return;
    let stream: MediaStream;

    (async () => {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { sampleRate: 16000, channelCount: 1, echoCancellation: true },
      });
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });
      recorderRef.current = recorder;
      startedAtRef.current = performance.now();

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          const startMs = indexRef.current * CHUNK_MS;
          onChunk(e.data, { index: indexRef.current, startMs });
          indexRef.current += 1;
        }
      };

      recorder.start(CHUNK_MS);
      setState("recording");
    })();

    return () => {
      recorderRef.current?.stop();
      stream?.getTracks().forEach((t) => t.stop());
      setState("stopped");
    };
  }, [enabled, onChunk]);

  return { state };
}
```

### 10.4 백엔드 Whisper + librosa 처리
```python
# backend/app/services/transcription.py
import io
import re
from openai import AsyncOpenAI
import librosa
import numpy as np
from app.config import settings

KOREAN_FILLERS = {
    "primary": ["음", "어", "아", "그"],
    "extended": ["그러니까", "약간", "뭐", "이제", "근데", "사실", "막"],
    "phrase": ["그게 이제", "뭐랄까", "그니까"],
}

client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

async def transcribe_chunk(audio_bytes: bytes) -> dict:
    """5초 청크를 gpt-4o-mini-transcribe로 전사"""
    transcript = await client.audio.transcriptions.create(
        model="gpt-4o-mini-transcribe",
        file=("chunk.webm", audio_bytes, "audio/webm"),
        language="ko",
        response_format="json",
    )
    return {"text": transcript.text}


def detect_fillers(text: str) -> list[dict]:
    """한국어 필러워드 탐지"""
    found = []
    all_fillers = KOREAN_FILLERS["primary"] + KOREAN_FILLERS["extended"]
    for word in all_fillers:
        # 단어 경계 인지 (짧은 음절은 단독 등장만)
        if len(word) == 1:
            pattern = rf"(?<![가-힣]){re.escape(word)}(?![가-힣])"
        else:
            pattern = re.escape(word)
        for m in re.finditer(pattern, text):
            found.append({"word": word, "position": m.start()})
    return found


def extract_audio_features(audio_bytes: bytes) -> dict:
    """librosa로 피치/볼륨/속도 분석"""
    y, sr = librosa.load(io.BytesIO(audio_bytes), sr=16000, mono=True)
    if len(y) == 0:
        return {"pitch_stability": 0, "volume_consistency": 0, "speech_ratio": 0}

    # 피치 추출
    f0, voiced_flag, _ = librosa.pyin(
        y, fmin=librosa.note_to_hz("C2"), fmax=librosa.note_to_hz("C7"), sr=sr
    )
    valid_pitches = f0[~np.isnan(f0)]
    if len(valid_pitches) > 5:
        pitch_std = float(np.std(valid_pitches))
        pitch_stability = max(0, 100 - min(pitch_std / 2, 100))
    else:
        pitch_stability = 0

    # 볼륨 일관성
    rms = librosa.feature.rms(y=y)[0]
    if rms.mean() > 1e-5:
        volume_consistency = max(0, 100 - (rms.std() / rms.mean()) * 100)
    else:
        volume_consistency = 0

    # 말한 비율
    intervals = librosa.effects.split(y, top_db=25)
    speech_ms = sum(end - start for start, end in intervals)
    total_ms = len(y)
    speech_ratio = (speech_ms / total_ms) * 100 if total_ms > 0 else 0

    return {
        "pitch_stability": round(pitch_stability, 1),
        "volume_consistency": round(volume_consistency, 1),
        "speech_ratio": round(speech_ratio, 1),
    }
```

### 10.5 LangGraph 종합 분석
```python
# backend/app/agents/graph.py
from langgraph.graph import StateGraph, END
from typing import TypedDict
from app.services.content_analyzer import analyze_content, evaluate_judge
from app.services.report_generator import generate_action_items

class AnalysisState(TypedDict, total=False):
    transcript: str
    audio_metrics: dict
    visual_metrics: dict
    filler_events: list
    content_evaluation: dict
    judge_fact: dict
    judge_connect: dict
    judge_critical: dict
    strengths: list[str]
    weaknesses: list[str]
    action_items: list[str]


async def content_node(state: AnalysisState) -> AnalysisState:
    return {"content_evaluation": await analyze_content(state["transcript"])}

async def judge_fact_node(state: AnalysisState) -> AnalysisState:
    return {"judge_fact": await evaluate_judge("judge-fact", state)}

async def judge_connect_node(state: AnalysisState) -> AnalysisState:
    return {"judge_connect": await evaluate_judge("judge-connect", state)}

async def judge_critical_node(state: AnalysisState) -> AnalysisState:
    return {"judge_critical": await evaluate_judge("judge-critical", state)}

async def merge_node(state: AnalysisState) -> AnalysisState:
    items = await generate_action_items(state)
    return {"action_items": items["actions"], "strengths": items["strengths"], "weaknesses": items["weaknesses"]}


def build_graph():
    g = StateGraph(AnalysisState)
    g.add_node("content", content_node)
    g.add_node("judge_fact", judge_fact_node)
    g.add_node("judge_connect", judge_connect_node)
    g.add_node("judge_critical", judge_critical_node)
    g.add_node("merge", merge_node)

    # 병렬 실행 (fan-out)
    g.set_entry_point("content")
    g.add_edge("content", "judge_fact")
    g.add_edge("content", "judge_connect")
    g.add_edge("content", "judge_critical")
    g.add_edge("judge_fact", "merge")
    g.add_edge("judge_connect", "merge")
    g.add_edge("judge_critical", "merge")
    g.add_edge("merge", END)

    return g.compile()
```

### 10.6 Supabase 클라이언트 (Next.js 16)
```typescript
// frontend/lib/supabase/client.ts
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

```typescript
// frontend/lib/supabase/server.ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Component에서 호출 시 무시
          }
        },
      },
    }
  );
}
```

---

## 11. Environment Variables

### Frontend `.env.local`
```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_xxx
NEXT_PUBLIC_API_URL=https://trustpitch-api.up.railway.app
```

### Backend `.env`
```
OPENAI_API_KEY=sk-xxx
ANTHROPIC_API_KEY=sk-ant-xxx
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxx
CORS_ORIGINS=https://trustpitch.vercel.app,http://localhost:3000
LOG_LEVEL=INFO
```

---

## 12. 48-hour Sprint Roadmap

### Phase 1 — Foundation (0–8h)
- [ ] 모노레포 폴더 구조 생성, pnpm workspace 셋업
- [ ] Next.js 16 + Tailwind v4 + shadcn/ui new-york 초기화
- [ ] Supabase 프로젝트 생성, 마이그레이션 적용, 정책 적용
- [ ] FastAPI 보일러플레이트 + Railway 배포 (헬로월드 OK)
- [ ] 환경변수 모두 등록 (Vercel/Railway/Supabase)
- [ ] 인증 흐름 (이메일 + Google) 동작 확인
- [ ] MediaPipe 웹캠 통합 PoC (얼굴 점 478개 그려지면 성공)

### Phase 2 — Core Analysis (8–24h)
- [ ] FaceLandmarker + PoseLandmarker 통합, 5개 시각 지표 계산
- [ ] 캔버스 오버레이 (얼굴 메시 + 자세 스켈레톤)
- [ ] MediaRecorder 5초 청크 → `/audio-chunk` 전송 파이프라인
- [ ] 백엔드 Whisper 호출 + 필러워드 탐지 + librosa 분석
- [ ] 점수 계산 함수 (`lib/score.ts`)
- [ ] 메인 분석 화면 레이아웃 (좌 60% : 우 40%)
- [ ] 실시간 게이지 4개 + 빅 신뢰 점수
- [ ] 실시간 자막 (Web Speech API + 백엔드 결과 결합)

### Phase 3 — Judges & Polish (24–40h)
- [ ] JUDGES 정의 + trigger engine
- [ ] Judge 카드 컴포넌트 + 표정 SVG 7종
- [ ] 표정 전환 애니메이션 + 코멘트 말풍선
- [ ] 10초마다 GPT-4o 코칭 메시지 호출
- [ ] 발표 종료 → LangGraph 호출 → 최종 점수 산출
- [ ] 사후 리포트 페이지 (시간축 그래프, 레이더, 강약점)
- [ ] 대시보드 (지난 세션 목록)

### Phase 4 — Demo & Deploy (40–48h)
- [ ] gpt-image-1 Before/After 이미지 생성 (시간 남으면)
- [ ] 시연 시나리오 30초 리허설 1번
- [ ] Vercel 배포 + Railway 프로덕션 확인
- [ ] 발표 슬라이드 (10장 이내)
- [ ] 데모 영상 30초 녹화 (백업용)

---

## 13. Demo Script (시연 30초)

1. (5초) 랜딩 → "발표 시작" 버튼 클릭
2. (5초) 카운트다운 3-2-1 → 분석 화면 진입
3. (15초) 팀원이 진짜 IR 멘트 시작 → 화면에:
   - 좌측: 얼굴 메시 그려지고, 자막 빨간 강조
   - 우측: 신뢰 점수 78 → 시선 회피 시 64로 떨어짐
   - 김팩트가 frown으로 바뀜 + "근거가 부족합니다" 말풍선
4. (5초) 발표 종료 → 로딩 → 사후 리포트 페이지 자동 이동

발표 클로징 한 줄:
> **"우리는 신뢰를 측정 가능한 지표로 바꿨고, AI 심사위원이 실시간으로 반응합니다. 다음 IR 전 한 번만 돌려보세요."**

---

## 14. 위험 요소와 대응

| 위험 | 대응 |
|---|---|
| MediaPipe 첫 로드 2-3초 | 로딩 스크린 + skeleton |
| Whisper API 지연 (한국어) | 5초 청크 비동기 처리, 자막은 Web Speech API 보조 |
| 점수가 너무 자주 깜빡 | EMA smoothing (alpha 0.85) |
| 시연 중 인터넷 끊김 | 로컬 데모 모드 (mock 데이터) 토글 |
| GPT-4o 비용 폭주 | gpt-4o-mini로 fallback, 캐싱 |
| Vercel 함수 타임아웃 (10초) | 무거운 작업은 Railway로, Next.js는 프록시만 |
| Railway 무료 티어 메모리 | librosa 청크당 100MB 미만 유지 |
| Supabase RLS 실수 | 정책 추가 시 SQL Editor에서 SELECT 테스트 |

---

## 15. Don't Do List (절대 하지 마라)

1. 이모지 일체 사용 금지 (코드, UI 텍스트, 주석, 커밋 메시지)
2. Hume Expression Measurement API 절대 사용 금지 (sunset)
3. WebSocket으로 실시간 통신하지 마라 (Vercel 안 됨)
4. localStorage에 민감 데이터 저장 금지
5. 클래스/함수 이름 임의로 `enhanced_*`, `improved_*`로 바꾸지 마라
6. face-api.js, opencv.js 같은 구식 라이브러리 쓰지 마라
7. Whisper 자체 호스팅하지 마라 (GPU 필요)
8. shadcn 컴포넌트 npm 패키지로 설치하지 마라 (CLI로 copy-paste)
9. service_role 키 클라이언트에 노출 금지
10. CORS_ORIGINS에 `*` 쓰지 마라

---

## 16. README.md (루트에 함께 둘 것)

```markdown
# TrustPitch

AI 가상 심사위원이 실시간 반응하는 한국어 IR 피칭 코칭 서비스.

## Quick Start

### 1. Supabase 설정
1. https://supabase.com 에서 프로젝트 생성
2. SQL Editor에서 `supabase/migrations/20260502_init.sql` 실행
3. Authentication > Providers에서 Google OAuth 켜기 (선택)
4. URL/anon key 복사

### 2. Backend (Railway)
\`\`\`
cd backend
cp .env.example .env  # 키 채우기
uv venv && uv sync   # 또는 pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
\`\`\`
Railway 배포: GitHub 연결 후 자동 빌드.

### 3. Frontend (Vercel)
\`\`\`
cd frontend
cp .env.local.example .env.local  # 키 채우기
pnpm install
pnpm dev
\`\`\`
Vercel 배포: `vercel --prod` 또는 GitHub 연결.

## Architecture
[다이어그램 — 본 master spec의 Section 6 참고]

## License
MIT
```

---

## 17. 최종 체크리스트 (PR 머지 전)

- [ ] 다크 모드에서 모든 컴포넌트 깨지지 않는가
- [ ] 웹캠/마이크 권한 거부 시 친절한 안내가 뜨는가
- [ ] 신뢰 점수가 -음수 또는 100 초과로 튀지 않는가
- [ ] 모바일 반응형이 최소 깨지지는 않는가 (1차 타겟은 데스크톱)
- [ ] OpenAI 키가 클라이언트 번들에 포함되지 않았는가
- [ ] Supabase RLS 정책으로 다른 사용자 세션 못 보는가
- [ ] 60초 발표를 끝까지 끊김 없이 분석하는가
- [ ] 발표 종료 후 리포트가 5초 이내에 뜨는가
- [ ] 한국어 필러워드를 정확히 잡는가 (수동 테스트 5문장)
- [ ] 이모지가 어디에도 없는가

---

# 끝.

이 문서를 따라가면 클로드 코드가 길을 잃지 않는다. 모호한 부분이 보이면 본 문서를 우선시하고, 추측하지 말고 본 문서의 정의를 따른다.
