# 배포 환경 설정 — 단계별 정확 값

> 위에서 아래로 순서대로 진행. 각 단계의 *값*은 그대로 복사·붙여넣기.

확정 도메인:
- Frontend (Vercel): `https://trustpitch.vercel.app`
- Backend (Railway): **별도 서비스로 배포 필요** (STEP 6 참고). 일반적 형태:
  `https://<service-name>-production.up.railway.app`
- Supabase: `https://rownzmepduqeezanhicg.supabase.co`
- Supabase ref: `rownzmepduqeezanhicg`

> `trustpitch-frontend-production.up.railway.app` 도메인은 *frontend* (Next.js)가
> 배포된 곳입니다. Backend (FastAPI) 는 *별도 Railway 서비스* 로 추가 배포 필요.
> Railway 한 project 에 두 서비스 (frontend + backend) 모두 둘 수 있습니다.

---

## STEP 0 — Supabase JWT Secret 찾기 (제일 먼저)

Railway 환경변수에 박을 `SUPABASE_JWT_SECRET` 값이 필요. 한 번만 얻으면 됨.

1. https://supabase.com/dashboard/project/rownzmepduqeezanhicg/settings/api 접속
2. 페이지 안에서 **`JWT Secret`** 라벨 찾기 (보통 "Project API keys" 또는 "JWT Settings" 섹션)
3. 옆의 *Reveal* / *Show* 버튼 → 값을 메모장에 임시 저장 (`xxx...` 형태의 긴 문자열, base64-like)

> 이 secret 은 *절대 frontend 에 노출 금지*. backend 만.

---

## STEP 1 — Supabase SQL 마이그레이션 (한 번만)

1. https://supabase.com/dashboard/project/rownzmepduqeezanhicg/sql/new 접속
2. 로컬에서 `supabase/migrations/20260502_init.sql` 열기 → **전체 복사**
3. Supabase SQL Editor 빈 query 에 *붙여넣기*
4. 우측 하단 **RUN** 버튼 클릭
5. 성공 메시지 확인 — `profiles`, `pitch_sessions`, `pitch_timeline`, `judge_reactions`, `pitch_events` 5개 테이블이 만들어짐. RLS 정책도 함께.

> 두 번 실행하면 `if not exists` / `drop policy if exists` 로 멱등 — 안전합니다.

---

## STEP 2 — Supabase Auth URL Configuration

1. https://supabase.com/dashboard/project/rownzmepduqeezanhicg/auth/url-configuration

2. **Site URL** 칸 — 다음 *그대로* 붙여넣기:
   ```
   https://trustpitch.vercel.app
   ```

3. **Redirect URLs** 칸 — 한 줄씩 또는 콤마 구분으로 다음 *4개 모두* 입력:
   ```
   http://localhost:3000/auth/callback
   http://localhost:3000/**
   https://trustpitch.vercel.app/auth/callback
   https://trustpitch.vercel.app/**
   ```

4. **Save** 클릭.

---

## STEP 3 — Supabase Auth Providers (Google)

1. https://supabase.com/dashboard/project/rownzmepduqeezanhicg/auth/providers
2. **Google** 카드 펼치기
3. 토글 **Enabled** 켜기
4. **Client ID for OAuth** 칸 — 본인 GCP Console 의 OAuth Client ID 붙여넣기 (`xxxxx.apps.googleusercontent.com` 형태)
5. **Client Secret for OAuth** 칸 — 본인 GCP Console 의 Client Secret 붙여넣기 (`GOCSPX-...` 형태)
6. **Save** 클릭.

> Google Client ID 는 GCP Console > APIs & Services > Credentials 에서 확인.
> 처음이면 거기서 새 OAuth 2.0 Client ID 만들고 (Web Application), redirect URI 는 STEP 4 참고.

---

## STEP 4 — Google Cloud Console (GCP) OAuth

Supabase 의 callback 만 등록하면 됨. Google 은 frontend 도메인을 *직접* 못 봄 (Supabase 거쳐서 옴).

1. https://console.cloud.google.com/apis/credentials 접속
2. OAuth 2.0 Client IDs 목록에서 **next-hackathon** (Supabase 에 박은 Client ID 와 동일) 클릭
3. **승인된 JavaScript 원본 (Authorized JavaScript origins)** 섹션 — `+ URI 추가` 로 다음 2개 *모두* 추가:
   ```
   http://localhost:3000
   https://trustpitch.vercel.app
   ```
4. **승인된 리디렉션 URI (Authorized redirect URIs)** 섹션 — 다음 1개만 추가:
   ```
   https://rownzmepduqeezanhicg.supabase.co/auth/v1/callback
   ```
5. 하단 **저장** 클릭.

> 적용까지 5분~수시간 걸릴 수 있음. 적용 전 로그인하면 `redirect_uri_mismatch` 에러.

---

## STEP 5 — Vercel 환경변수 (Frontend)

1. https://vercel.com/dashboard → `trustpitch` 프로젝트 클릭
2. 상단 **Settings** → 좌측 **Environment Variables**
3. 다음 3개를 *각각* `+ Add New` 로 추가. **Production / Preview / Development** 모두 체크:

| Key | Value (이 페이지에 그대로 — publishable key 는 공개 가능) |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://rownzmepduqeezanhicg.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | 본인 로컬 `frontend/.env.local` 의 값 그대로 |
| `NEXT_PUBLIC_API_URL` | `https://<backend-service>.up.railway.app` (STEP 6 에서 backend 배포 후 실제 URL) |

4. 저장 후 **Deployments** 탭 → 최신 production 배포 우측 `⋯` → **Redeploy** (env 적용 위해 재배포 필수).

---

## STEP 6 — Railway Backend 서비스 배포 + 환경변수

### 6-A. Backend 새 서비스 만들기 (한 번만)

1. https://railway.app/dashboard → 기존 trustpitch project 진입
2. 우상단 **+ New** → **Deploy from GitHub repo**
3. `danlee-dev/next-hackathon` 선택
4. 새 서비스 settings (서비스 클릭 → Settings 탭):
   - **Root Directory**: `backend` ← 중요
   - **Start Command** 비워두기 (Dockerfile 자동 사용)
   - **Service Name**: `trustpitch-backend` 으로 rename (선택)
5. Generate Domain → 새 도메인 (예: `trustpitch-backend-production.up.railway.app`) 받기
6. 이 새 URL 을 메모해서 STEP 5 의 `NEXT_PUBLIC_API_URL` 에 넣고 Vercel redeploy

### 6-B. 환경변수 박기

1. backend 서비스 클릭 → 상단 **Variables** 탭
2. **Raw Editor** 클릭 (효율적)

3. *모든 키 값* 은 로컬 `backend/.env` 파일에 이미 채워져 있음. 그 파일을 통째로 열어 복사 → Railway Raw Editor 에 붙여넣기. 단 다음 *3 가지* 만 변경:

   - 추가/덮어쓰기: `DEMO_MODE=false`
   - 추가: `SUPABASE_JWT_SECRET=<STEP 0 에서 찾은 값>`
   - `CORS_ORIGINS` 라인을 다음으로 *교체*:
     ```
     CORS_ORIGINS=http://localhost:3000,https://trustpitch.vercel.app
     ```

5. 즉, Railway 변수 *최종* 형태:
   ```
   DEMO_MODE=false
   SUPABASE_URL=<backend/.env 그대로>
   SUPABASE_SERVICE_ROLE_KEY=<backend/.env 그대로>
   SUPABASE_JWT_SECRET=<STEP 0>
   OPENAI_API_KEY=<backend/.env 그대로>
   ANTHROPIC_API_KEY=<backend/.env 그대로>
   ELEVENLABS_API_KEY=<backend/.env 그대로>
   JUDGE_FACT_VOICE_ID=<backend/.env 그대로>
   JUDGE_CONNECT_VOICE_ID=<backend/.env 그대로>
   JUDGE_CRITICAL_VOICE_ID=<backend/.env 그대로>
   VOYAGE_API_KEY=<backend/.env 그대로>
   TAVILY_API_KEY=<backend/.env 그대로>
   CORS_ORIGINS=http://localhost:3000,https://trustpitch.vercel.app
   LOG_LEVEL=INFO
   ```

> 실제 키 값은 *공개 repo 에 박지 X* — 본인 로컬 `backend/.env` 에서만 복사. 이 파일은 `.gitignore` 됐으니 안전.

4. 저장 → Railway 자동 재배포.
5. 약 1분 후 backend URL의 `/healthz` 접속 → 다음과 같이 보여야 정상:
   ```json
   {"ok":true,"supabase":true,"openai":true,"demo_mode":false,"jwt_verify":true}
   ```

---

## STEP 7 — 검증 (모두 끝난 후)

브라우저에서 차례로:

1. https://trustpitch.vercel.app — 랜딩 보임
2. 우상단 **Sign in** → Google → 로그인 성공 → `/dashboard` 자동 이동
3. **새 발표 시작** → `/pitch/new` → 권한 허용 → 발표 시작 → 60초 → 종료
4. **`/pitch/[id]/report`** 진입 → trust score + 심사위원 평가 + 액션 보임
5. (선택) **`/pitch/[id]/qna`** → 심사위원 음성 질문 → 답변 → follow-up

위 흐름 중 어디서든 막히면 STEP 8 트러블슈팅 참고.

---

## STEP 8 — 트러블슈팅

| 증상 | 원인 | 해결 |
|------|------|------|
| **HTTP 431 Request Header Too Large** | Supabase 인증 쿠키 누적 | 브라우저 쿠키 클리어 (Application 탭 → Cookies → trustpitch.vercel.app 전부 삭제) → 다시 로그인 |
| **CORS preflight 실패** | Railway `CORS_ORIGINS` 에 `https://trustpitch.vercel.app` 누락 | STEP 6 의 `CORS_ORIGINS` 정확히 입력 후 재배포 |
| **로그인 시 `redirect_uri_mismatch`** | GCP Console redirect URI 가 Supabase callback 미일치 | STEP 4 의 4번 — `https://rownzmepduqeezanhicg.supabase.co/auth/v1/callback` 정확히 입력 |
| **로그인 후 빈 dashboard** | SQL 마이그레이션 미실행 → 테이블 없음 | STEP 1 다시 실행 |
| **healthz 가 `supabase: false`** | service_role 키 또는 URL 불일치 | Railway 환경변수에서 `SUPABASE_URL` 과 `SUPABASE_SERVICE_ROLE_KEY` 다시 확인 |
| **Google 로그인 후 무한 로딩** | Supabase Site URL / Redirect URLs 미설정 | STEP 2 의 4개 redirect URL 정확히 입력 |
| **finalize 후 report 가 빈 화면** | backend 로 finalize 요청은 갔지만 응답 실패 | Railway logs 에서 OpenAI 키 문제 확인. healthz 에서 `openai: true` 보여야 함 |
| **Q&A 음성이 안 들림** | ElevenLabs key 미설정 또는 quota 초과 | Railway env 의 `ELEVENLABS_API_KEY` 확인. 저장된 답변/질문은 텍스트로는 보임 |

---

## 완료 후 점검 명령

로컬에서 한 줄로 체크:

```bash
# backend healthz (STEP 6-A 에서 받은 URL 로 교체)
curl -s https://<backend-service>.up.railway.app/healthz | python3 -m json.tool

# frontend 상태
curl -sI https://trustpitch.vercel.app | head -1
```

기대:
- backend: `{"ok": true, "supabase": true, "openai": true, "demo_mode": false, "jwt_verify": true}`
- frontend: `HTTP/2 200`

> 만약 backend URL 에서 Next.js HTML / 404 가 보이면 → frontend 가 그 도메인에 배포된
> 것. STEP 6-A 의 *Root Directory: backend* 설정을 다시 확인.

---

## 자주 묻는 것

### Q1. JWT Secret 못 찾겠어요
Supabase Dashboard 좌측 **Project Settings** (톱니바퀴) → **API** → 페이지 중간 정도에 **JWT Settings** 섹션 → **JWT Secret** 옆에 *Reveal* 버튼.

### Q2. 키들이 서로 다른 프로젝트의 것이라는데 괜찮나요?
- **Supabase 키**: TrustPitch 본인 프로젝트(`rownzmepduqeezanhicg`)의 것이어야 함 — STEP 0/1 에서 본인 dashboard 에서 직접 가져옴 ✓
- **OpenAI / Anthropic / ElevenLabs**: 다른 프로젝트와 공유하지만 *키 자체*는 본인 소유. 청구가 본인 계정으로 들어옴. 키 leak 위험 있으면 rotate 권장.
- **Google OAuth Client**: 다른 프로젝트의 것 — TrustPitch 도메인을 *위에서 추가*했으므로 두 프로젝트 모두에서 사용 가능. 분리하고 싶으면 GCP 에서 새 OAuth Client 발급.

### Q3. 로컬은 어떻게 테스트하나요?
`backend/.env` 와 `frontend/.env.local` 은 이미 로컬용으로 채워져 있음. 그냥:
```bash
# backend
cd backend && source .venv/bin/activate
uvicorn app.main:app --reload --port 8000

# frontend (다른 터미널)
cd frontend && pnpm dev
```
로컬은 `localhost:3000` ↔ `localhost:8000` 으로 자동 연결.

### Q4. Vercel preview 배포 (PR 미리보기)에서도 작동시키려면?
Vercel 환경변수를 *Production + Preview + Development* 모두에 체크해두면 OK. Preview 도메인 (`trustpitch-git-<branch>-<user>.vercel.app`) 까지 잡으려면 Supabase Redirect URLs 에 `https://*-<your-username>.vercel.app/auth/callback` wildcard 추가.
