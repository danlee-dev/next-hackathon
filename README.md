# TrustPitch

가상 AI 심사위원 셋이 발표를 보고, 듣고, 즉각 반응하는 한국어 IR 피칭 코칭 서비스.

## 구성

```
trustpitch/
├── frontend/            Next.js 16 + Tailwind v4 + shadcn-style (Vercel)
├── backend/             FastAPI 3.12 + LangGraph + librosa (Railway)
├── supabase/migrations  PostgreSQL 스키마 + RLS
├── DESIGN.md            디자인 시스템 ground truth
└── TRUSTPITCH_MASTER.md 통합 명세
```

## 빠른 시작

### 1. Supabase

1. <https://supabase.com> 에서 프로젝트 생성
2. SQL Editor에서 `supabase/migrations/20260502_init.sql` 실행
3. Authentication > Providers에서 Google OAuth 활성화 (선택)
4. Project Settings > API에서 URL / anon (publishable) key / service_role / JWT secret 복사

### 2. Backend (Railway)

```bash
cd backend
uv venv --python 3.12 .venv
source .venv/bin/activate
uv pip install -e .
cp .env.example .env  # 키 채우기
uvicorn app.main:app --reload --port 8000
```

`DEMO_MODE=true` 로 두면 Supabase JWT 검증을 건너뛰고 single-user 모드로 동작 (해커톤용).

Railway 배포: GitHub 연결 + 위 환경변수 등록 + `Dockerfile` 자동 빌드.

### 3. Frontend (Vercel)

```bash
cd frontend
cp .env.local.example .env.local  # 키 채우기
pnpm install
pnpm dev
```

`NEXT_PUBLIC_API_URL`은 로컬에서는 `http://localhost:8000`, 배포에서는 Railway 도메인.

## 구조 한눈에

- 시각: 브라우저 안에서 MediaPipe FaceLandmarker + PoseLandmarker (WASM, GPU 가속)
- 음성: 5초 청크를 Railway로 → OpenAI gpt-4o-mini-transcribe + librosa
- 논리: 발표 종료 시 LangGraph fan-out (content + 3 judges) → action items
- 점수: visual 0.30 + audio 0.40 + content 0.30 (server / client 양쪽 동일 공식)

## 라이선스

MIT
