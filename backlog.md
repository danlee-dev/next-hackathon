# Backlog

해야 할 일·아이디어 (우선순위 순). 끝나면 옮기지 말고 줄긋기 또는 삭제.

## 시연 안정성 (P0)
- [ ] 시연용 데모 시뮬레이터 (`?demo=1`) — 카메라 권한 없이도 라이브 화면 작동
- [ ] 인터넷 끊김 시 fallback 토스트
- [ ] 첫 MediaPipe 로딩 2-3초 동안 부드러운 skeleton

## 비주얼 임팩트 (P0)
- [ ] Score Delta Ghost — 점수 변화 시 잔상
- [ ] Judge Eye-Tracking — 발표자 시선 따라 눈동자 이동 (이미 일부 구현)
- [ ] 발표 종료 → 리포트 진입 시 ViewTransition 부드럽게
- [ ] Before/After 이미지 (gpt-image-1) — 시간 남으면

## 데이터 신뢰성 (P1)
- [ ] 한국어 필러 사전 *수동 5문장 테스트*
- [ ] 점수 -음수 / 100+ 튜는 케이스 검증
- [ ] LLM 응답 timeout (8초) + fallback

## 운영 (P2)
- [ ] Vercel 배포 환경변수 정리
- [ ] Railway 배포 환경변수 정리
- [ ] OpenAI 비용 모니터링 dashboard

## 향후 (P3)
- [ ] 다국어 지원 (영어 IR 환경)
- [ ] 발표 영상 저장 (Supabase Storage opt-in)
- [ ] 팀 공유 모드 (cross-user view 권한)
- [ ] PWA — 오프라인 첫 화면

---

야간 자율 시작 시 `/overnight` 호출하면 이 backlog 기반으로 prompt 자동 생성됨.
