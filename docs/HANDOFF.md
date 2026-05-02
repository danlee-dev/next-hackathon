# 사용자 핸드오프 — TrustPitch

> 사용자가 *직접* 해야 하는 일과 *Claude에게 줄 것* 정리. 시연 직전 체크리스트로 사용.

---

## 1. 지금 바로 시연 가능한 상태 (할 일 0개)

`?demo=1` 모드는 **카메라/마이크 권한 없이도** 60초 동안 합성 발표를 보여주고
사후 리포트까지 자동 진행합니다. 데모 영상 준비물 없이도 동작합니다.

```
http://localhost:3000                           ← 랜딩
http://localhost:3000/pitch/demo/live?demo=1   ← 60초 데모 라이브
http://localhost:3000/pitch/demo/report?demo=1 ← 데모 리포트
```

- 가상 발표자 (SVG mesh 오버레이)
- 시간에 따라 변하는 6개 metric 게이지
- 3 심사위원이 표정 변경 + 한 줄 코멘트
- 자막 highlight (필러 빨강, 공허한 표현 amber)
- 신뢰 점수 spring + delta ghost (↑↓ 잔상)
- AI 코치 메시지 8초마다
- 발표 종료 → finalize console 오버레이 → 리포트 자동 이동

이 상태에서 시연 키노트 30초 컷으로 충분히 awesome.

---

## 2. 실시간 모드 (실제 카메라/마이크 + 실제 LLM) 가동에 필요한 것

### 2.1 이미 박혀있는 것 (제가 처리함)

- `frontend/.env.local` — Supabase URL + publishable key (사용자 제공분)
- `backend/.env` — OpenAI + Anthropic key (사용자 제공분)
- `DEMO_MODE=true` — backend가 JWT 검증 건너뛰는 시연 모드

이 상태에서:
- `cd backend && source .venv/bin/activate && uvicorn app.main:app --reload --port 8000`
- `cd frontend && pnpm dev`
- `http://localhost:3000/pitch/new` → 권한 허용 → 발표
- 실제 GPT-4o-mini가 finalize 시 한국어로 강·약·액션 생성 ← **검증 완료**

### 2.2 사용자가 직접 받아 박아야 하는 것

#### A. Supabase (영속성 — 세션 저장 필요할 때만)

현재 frontend는 `rownzmepduqeezanhicg.supabase.co` 프로젝트를 가리키고 있습니다.
backend도 같은 프로젝트를 봐야 정상 작동합니다. 다음 둘이 필요:

1. https://supabase.com/dashboard/project/rownzmepduqeezanhicg/settings/api
   - `service_role` 키 복사 → `backend/.env` 의 `SUPABASE_SERVICE_ROLE_KEY=` 채우기
   - `JWT Secret` 복사 → `backend/.env` 의 `SUPABASE_JWT_SECRET=` 채우기
   - 그 후 `backend/.env` 의 `DEMO_MODE=true` → `false` 로 변경

2. https://supabase.com/dashboard/project/rownzmepduqeezanhicg/sql
   - 새 query → `supabase/migrations/20260502_init.sql` 내용 전체 복사·실행
   - 5개 테이블 + RLS 정책 + auth trigger 생성됨 (한 번만 실행)

3. (선택) Authentication > Providers > Google 활성화
   - Google Cloud Console에서 OAuth client 만들고 callback URL 등록
   - Authorized redirect URI:
     `https://rownzmepduqeezanhicg.supabase.co/auth/v1/callback`

#### B. 시연 직전 체크 (5분 전)

```bash
# 1. backend 가동 확인
curl -s http://localhost:8000/healthz
# {"ok":true,"openai":true,"supabase":<true/false>,"demo_mode":<...>}

# 2. frontend dev 가동
cd frontend && pnpm dev

# 3. 데모 흐름 1회 리허설
open "http://localhost:3000/pitch/demo/live?title=리허설&demo=1"

# 4. 인터넷 끊겼을 때 백업 — 데모 모드는 인터넷 없이도 작동
```

---

## 3. 배포할 때 (시연 후 실제 운영)

### Vercel (frontend)

1. https://vercel.com/new → GitHub 연결 → repo 선택
2. Root Directory: `frontend`
3. Environment Variables:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://rownzmepduqeezanhicg.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_4XiLenH3OOotl33WG-_Pxg_9XW45dfA
   NEXT_PUBLIC_API_URL=https://<railway-backend-url>
   ```
4. Deploy

### Railway (backend)

1. https://railway.app/new → Deploy from GitHub
2. Root Directory: `backend`
3. Environment Variables (전부):
   ```
   OPENAI_API_KEY=<key>
   ANTHROPIC_API_KEY=<key>
   SUPABASE_URL=<url>
   SUPABASE_SERVICE_ROLE_KEY=<key>
   SUPABASE_JWT_SECRET=<secret>
   CORS_ORIGINS=https://trustpitch.vercel.app,http://localhost:3000
   DEMO_MODE=false
   LOG_LEVEL=INFO
   ```
4. Deploy (Dockerfile 자동 인식)

### CORS 동기화

Vercel 도메인을 backend `CORS_ORIGINS` 에 추가, Supabase Auth > URL Configuration
에 frontend 도메인 추가.

---

## 4. 보안 — 노출된 키 (제 추천)

이전에 채팅에 붙여넣으신 backend env (`snsclbezzwunmsknlhfg.supabase.co` 프로젝트)
의 키들은 *이미 제3자 시스템(이 채팅)에 흘렀습니다*. 다음 키는 즉시 rotate 권장:

- 그 Supabase 프로젝트의 service_role key
- ANTHROPIC_API_KEY (그 키 그대로 TrustPitch에도 사용 중)
- OPENAI_API_KEY (그 키 그대로 TrustPitch에도 사용 중)
- VOYAGE_API_KEY, MAPBOX_TOKEN, ELEVENLABS_API_KEY, GOOGLE_GEMINI_API_KEY,
  TAVILY_API_KEY, EXA_API_KEY, FAL_KEY, E2B_API_KEY, NEWSAPI_KEY,
  GOOGLE_CLIENT_SECRET, GITHUB_CLIENT_SECRET

OPENAI/ANTHROPIC는 TrustPitch에서 그대로 쓰고 있으니, rotate 후 `backend/.env`
에 새 키로 갱신해주세요. (제가 새 키 받으면 바로 박아드립니다.)

---

## 5. 시연 시나리오 (30초 권장)

```
0:00  랜딩 진입 (vercel 도메인) — 큰 헤드라인 + 대비 보임
0:03  "지금 발표 시작" 클릭 → /pitch/new (또는 "데모 보기" → /pitch/demo/live)
0:08  카운트다운 3-2-1 → 라이브 화면 진입
0:12  팀원이 진짜 IR 멘트 시작:
      "안녕하세요 음 저희는 한국어 IR 코칭 서비스를 만들고 있습니다..."
      → 자막에 "음" 빨갛게 highlight
      → 박독설이 'bored' 표정으로 변경 + "추임새를 줄이세요"
      → 신뢰 점수 78 → 65로 하락 (delta ghost 화면)
0:25  "발표 종료" 클릭 → finalize 콘솔 오버레이 (analyzing → done)
0:28  사후 리포트 자동 이동 — 시간축 그래프 + 레이더 + 강·약·액션
0:30  닫음 — "다음 IR 전 한 번만 돌려보세요"

키 메시지: "신뢰를 측정 가능한 지표로 바꿨다. AI 심사위원이 실시간으로 반응한다."
```

---

## 6. 마지막 체크리스트

- [ ] backend `pytest` 통과 (10/10)
- [ ] frontend `pnpm test` 통과 (14/14)
- [ ] frontend `pnpm build` 통과
- [ ] frontend `pnpm dev` 모바일 + 데스크톱 둘 다 깨짐 없음
- [ ] 데모 모드 (`?demo=1`) 60초 자동 흐름 정상
- [ ] 실제 모드 — 권한 허용 → 30초 발표 → finalize 5초 안에
- [ ] (선택) Supabase 마이그레이션 실행 + service_role/JWT 박음
- [ ] 이모지 한 글자도 없음 (코드/UI/문서 일체)

---

## 7. 향후 (시연 후)

`backlog.md` 참고. P0/P1 항목부터.
