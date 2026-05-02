# TrustPitch — 프로젝트 룰

> 본 파일은 *프로젝트 단위 ground truth*. 글로벌 `~/CLAUDE.md`보다 우선.
> TrustPitch는 한국어 IR 피칭 코칭 서비스(해커톤). production-grade로 운영.

---

## 프로젝트 개요

가상 AI 심사위원 셋이 발표를 보고/듣고/실시간 반응하는 한국어 IR 피칭 코칭 SaaS.
시각·음성·논리 3축을 단일 신뢰 점수로 통합하고, 사후 리포트로 강·약점·액션을 제시.

- 모드: **솔로** + **production-grade** (해커톤이지만 시연 후 다듬음)
- 시연 우선순위: (1) 안정성 (2) 비주얼 임팩트 (3) 점수 신뢰성

## 스택

### Frontend (Vercel 배포)
- Next.js 16 (App Router, Turbopack 기본, params는 Promise)
- React 19 + TypeScript 5 strict
- Tailwind CSS v4 (`@theme inline`, OKLCH)
- shadcn-style 컴포넌트 (직접 copy-paste, npm install 금지)
- @mediapipe/tasks-vision (FaceLandmarker + PoseLandmarker, WASM/GPU)
- @supabase/ssr + @supabase/supabase-js
- motion (framer-motion 후속), lucide-react, recharts
- zustand (전역 상태), react-hook-form + zod
- Biome (ESLint 대신, 빠름)
- pnpm

### Backend (Railway 배포)
- Python 3.12 + FastAPI 0.115+ (async, Pydantic v2)
- LangGraph 멀티 에이전트 (content + 3 judges 병렬)
- OpenAI gpt-4o-mini-transcribe (Whisper) + gpt-4o-mini (콘텐츠/코치)
- Anthropic 보조 (한국어 콘텐츠 분석)
- librosa 0.10 (CPU only, 피치/볼륨/속도)
- supabase-py (service_role)
- uv + pyproject.toml + Dockerfile

### Data (Supabase)
- PostgreSQL 15 + RLS owner 정책
- Auth: Email + Google OAuth (PKCE)
- 신규 publishable key 시스템 (`sb_publishable_xxx` + secret)

## 디렉토리

```
trustpitch/
├── frontend/                Next.js 16 + components/{ui,pitch,judges,report}
├── backend/                 FastAPI + agents/graph.py + services/*
├── supabase/migrations/     20260502_init.sql
├── docs/                    API_SPEC.md, DEMO_SCRIPT.md, specs/, scratch/
├── DESIGN.md                디자인 시스템 (Bloomberg×Linear×Granola)
├── TRUSTPITCH_MASTER.md     통합 명세 (절대 ground truth)
├── backlog.md               작업 backlog
└── CLAUDE.md                본 파일
```

## 명령어

### Frontend (`/frontend` 에서 실행)
- `pnpm dev` — Next 16 dev server (Turbopack)
- `pnpm build` — production build (큰 변경 commit 전 필수)
- `pnpm typecheck` — `tsc --noEmit`
- `pnpm lint` / `pnpm lint:fix` — Biome
- `pnpm test` — vitest (sanity 포함, 단계 D2 도입 후)
- `pnpm test:e2e` — playwright (단계 D4 도입 후)

### Backend (`/backend` 에서 실행)
- `source .venv/bin/activate` 후
- `uvicorn app.main:app --reload --port 8000` — dev
- `pytest tests/` — 유닛 테스트
- `python -c "from app.main import app"` — import smoke

### DB
- Supabase Dashboard SQL Editor에서 `supabase/migrations/20260502_init.sql` 실행
- RLS 정책 변경 시 SELECT 으로 cross-user 격리 검증

## 코드 규칙

### 절대 금지
- 이모지 (코드/UI/주석/커밋/문서/콘솔로그 일체)
- Hume Expression Measurement API (2026-06-14 sunset)
- WebSocket으로 실시간 통신 (Vercel 안 됨)
- face-api.js / opencv.js (구식)
- service_role key 클라이언트 노출
- shadcn 컴포넌트 npm install (CLI/copy-paste만)
- `enhanced_*`, `improved_*` 같은 임의 명명
- CORS_ORIGINS에 `*`

### 필수 패턴
- 모든 토큰은 *semantic* (`bg-primary`, `text-foreground`) — hardcoded `bg-blue-500` 금지
- `bg-X` 다음 *반드시* `text-X-foreground` 짝
- 모든 UI 컴포넌트는 light + dark 양쪽에서 깨지지 않아야 함
- 숫자/시간/점수는 `font-mono tabular-nums`
- LLM 호출에 *항상 fallback* — 키 없으면 휴리스틱으로 동작
- `JUDGES`, `KOREAN_FILLERS` 같은 spec-defined 상수는 그대로 유지 (이름 변경 X)

### 점수 공식 (server/client 동일)
```
trust = visual*0.30 + audio*0.40 + content*0.30
visual = eye*0.40 + (head+sway-inv)/2*0.30 + gesture*0.30
audio = (100-norm_filler)*0.40 + pace_score*0.30 + pitch*0.30
content = clarity*0.40 + evidence*0.30 + (100-norm_empty)*0.30
```

## 시각 검증 (frontend UI 변경 후 의무)

- **모바일 우선** — 모든 디자인 변경의 첫 캡처는 모바일 (375×667)
- 데스크톱만 OK 보고 금지. 한국어 wrap이 영어와 달라 모바일에서만 드러나는 회귀 빈번
- 4컷 기본: light + dark 각각 mobile + desktop (1280×800)
- puppeteer MCP (`mcp__puppeteer__*`) 사전 설치됨 — 별도 셋업 X
- 인증 가드 라우트는 cookie 미보유 → /login 리다이렉트. 우회 = supabase 키가
  없을 때 middleware/proxy가 조기 return하는 dev 분기 추가, 또는 라우트 직접 테스트

## 5-stage 워크플로우 (production 모드 default)

각 새 기능은 다음 단계 거침. throwaway면 1·5만:
1. **INTENT** (`docs/specs/<feature>.md`) — 왜·무엇·범위
2. **DESIGN** — 데이터 흐름·UI 와이어·API 계약 (DESIGN.md 참조)
3. **PLAN** — 작업 단위 분해 → backlog.md 또는 GitHub issue
4. **IMPLEMENT** — 작은 PR (한 번에 한 책임), commit 메시지 conventional
5. **VERIFY** — typecheck + test + 시각 검증(UI면) + 사용자 dogfood

스킵 가능: 사소한 fix, throwaway 실험. 다만 *시연 직전 코드*는 절대 5단계 빠뜨림 X.

## 보안 체크리스트

- [ ] `.env` / `.env.local` `.gitignore` 됨 + git 추적 X (`git ls-files | grep -i env`)
- [ ] OpenAI/Anthropic 키는 backend `.env` 만 (frontend 노출 X)
- [ ] Supabase service_role 키는 backend 만 (frontend는 publishable anon)
- [ ] CORS_ORIGINS에 production 도메인만 (와일드카드 X)
- [ ] RLS 정책으로 cross-user 세션 격리 검증 (SQL Editor 직접 SELECT 테스트)
- [ ] LLM 응답에 사용자 input을 그대로 echo 안 함 (prompt injection 방지)
- [ ] 발표 영상은 default *저장 안 함* (Supabase Storage 명시적 opt-in 시만)

## 위험 발견 시

- production 키 leak 의심 → 즉시 rotate + `.env` git 추적 정리 + 사용자 명시 알림
- LLM 비용 폭주 신호 (분당 N\$ 초과) → gpt-4o-mini fallback + 캐싱 + rate limit
- MediaPipe 첫 로드 2-3초 → loading skeleton + 사용자 가이드 (해커톤 시연용)
- 시연 인터넷 끊김 → 로컬 데모 모드 (mock 데이터, 단계 D5 폴리시 항목)

## 브랜치 흐름 (솔로 default)

```
main (production = 배포)
  ↑ release PR (dev 검증 후 = 배포 시점)
dev (staging — 모든 작업 누적)
  ↑ feature/fix/refactor PR
<작업 브랜치> (dev 에서 분기)

hotfix/<desc> → main 직접 (긴급) + dev 즉시 동기화
```

- 작업 브랜치 명명: `<type>/<desc>(-#N)` (예: `feat/judge-eye-tracking`)
- commit 메시지: Conventional Commits (`feat:`, `fix:`, `chore:` 등) — 영어
- Claude 작성 표기 X (Co-Authored-By 절대 X)
- 작업 끝나면: 이슈 close (있으면) + 브랜치 삭제 (`-d`, force `-D` 금지)

## 자주 빠뜨리는 것 (해커톤 후 다듬으면서 점검)

- 다크/라이트 양방향 contrast (axe-core 자동 검증 도입 권장)
- 모바일 텍스트 잘림 (한국어 헤딩 wrap)
- 빈 상태 처리 (대시보드 첫 진입 시 empty state)
- 권한 거부 시 친절한 안내 (카메라/마이크)
- 시연 중 에러 토스트 (silent fail X)

## 외부 도구·서비스

- Vercel (frontend) — `vercel --prod` 또는 GitHub 연결
- Railway (backend) — Dockerfile 자동 빌드, 환경변수 등록
- Supabase (DB + Auth) — SQL Editor에서 마이그레이션 실행
- OpenAI Platform — API 키 (gpt-4o-mini-transcribe + gpt-4o-mini)
- Anthropic Console — API 키 (선택)

## 끝

이 파일은 *살아있는 문서*. 새 패턴/실수가 보이면 즉시 갱신. 매 세션 시작 시 자동 로드.
