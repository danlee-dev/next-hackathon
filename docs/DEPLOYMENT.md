# 배포 환경 설정

도메인 확정:
- **Frontend (Vercel)**: https://trustpitch.vercel.app
- **Backend (Railway)**: https://trustpitch-frontend-production.up.railway.app
- **Supabase**: https://rownzmepduqeezanhicg.supabase.co

## 1. Vercel — Frontend 환경변수

Vercel Dashboard → Project → Settings → Environment Variables → 다음 3개를 *Production* 에 추가:

```
NEXT_PUBLIC_SUPABASE_URL=https://rownzmepduqeezanhicg.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_4XiLenH3OOotl33WG-_Pxg_9XW45dfA
NEXT_PUBLIC_API_URL=https://trustpitch-frontend-production.up.railway.app
```

(Preview / Development 에는 동일 또는 localhost backend 가리키게)

저장 후 Vercel 재배포.

## 2. Railway — Backend 환경변수

Railway Dashboard → Project → trustpitch-backend → Variables → 다음 추가:

```
DEMO_MODE=false
SUPABASE_URL=https://rownzmepduqeezanhicg.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<TrustPitch service_role 키 — 이미 알고 있음>
SUPABASE_JWT_SECRET=<TrustPitch JWT secret — Settings>API의 JWT Secret>
OPENAI_API_KEY=sk-proj-...
ANTHROPIC_API_KEY=sk-ant-...
ELEVENLABS_API_KEY=sk_504e48...
JUDGE_FACT_VOICE_ID=CxErO97xpQgQXYmapDKX
JUDGE_CONNECT_VOICE_ID=jB1Cifc2UQbq1gR3wnb0
JUDGE_CRITICAL_VOICE_ID=F7wT70V3u09d2rY9pNa6
VOYAGE_API_KEY=pa-mczJK...
TAVILY_API_KEY=tvly-dev-...
CORS_ORIGINS=http://localhost:3000,https://trustpitch.vercel.app
LOG_LEVEL=INFO
```

저장 후 Railway 재배포.

## 3. Supabase Dashboard — Auth 설정

Supabase Dashboard → Authentication → URL Configuration:

- **Site URL**: `https://trustpitch.vercel.app`
- **Redirect URLs** (콤마/줄바꿈 구분):
  ```
  http://localhost:3000/auth/callback
  http://localhost:3000/**
  https://trustpitch.vercel.app/auth/callback
  https://trustpitch.vercel.app/**
  ```

Authentication → Providers → Google:
- Google Client ID + Secret 입력 (이미 했음)
- 활성화

## 4. GCP (Google Cloud Console) — OAuth

GCP Console → APIs & Services → Credentials → next-hackathon (OAuth 2.0 Client ID):

**승인된 JavaScript 원본** (브라우저 origin):
```
http://localhost:3000
https://trustpitch.vercel.app
```

**승인된 리디렉션 URI** (Supabase callback):
```
https://rownzmepduqeezanhicg.supabase.co/auth/v1/callback
```

저장 — 5-10분 후 적용됨.

## 5. SQL 마이그레이션 (한 번만)

Supabase Dashboard → SQL Editor → New query → `supabase/migrations/20260502_init.sql` 내용 복사 → RUN.

## 6. 검증

```bash
# 프론트가 백엔드를 보는지
curl https://trustpitch-frontend-production.up.railway.app/healthz
# {"ok":true,"supabase":true,"openai":true,"demo_mode":false}

# 프론트 → 로그인 (Google) → /dashboard 진입
open https://trustpitch.vercel.app
```

## 7. 로컬 vs 프로덕션 자동 분기

프로젝트 레포는 *어떤 env 도 자동으로 분기*하지 않습니다 (간결성). 각 환경에 맞는 값을:
- **로컬**: `frontend/.env.local` + `backend/.env` (gitignored)
- **프로덕션**: Vercel/Railway dashboard 에 직접 입력

## 8. 트러블슈팅

| 증상 | 원인 | 해결 |
|------|------|------|
| HTTP 431 | Supabase 쿠키 누적 | 브라우저 쿠키 클리어 + dev 재시작 |
| CORS 에러 | backend 의 `CORS_ORIGINS` 가 frontend 도메인 미포함 | Railway env 에 vercel 도메인 추가 |
| Google OAuth `redirect_uri_mismatch` | GCP Console 의 redirect URI 가 Supabase callback 미일치 | GCP 에 `https://<supabase-ref>.supabase.co/auth/v1/callback` 정확히 입력 |
| `/dashboard` 진입 후 빈 화면 | RLS 차단 (마이그레이션 미실행) | Supabase SQL Editor 에서 `20260502_init.sql` 실행 |
