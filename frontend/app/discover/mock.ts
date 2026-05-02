/**
 * Discover 페이지 mock 데이터.
 * 실제 데이터 source 는 Supabase `pitch_sessions` (is_public=true) + `companies` join —
 * 그 단계로 마이그레이션할 때 이 파일은 삭제하고 server component 에서 fetch.
 */

export interface PublicPitch {
  id: string;
  founder: string;
  startupName: string;
  sector: string;
  oneLiner: string;
  description: string;
  videoUrl: string;
  trustScore: number;
  breakdown: { visual: number; audio: number; content: number };
  valuation: string;
  minTicket: number;
  raised: number;
  goal: number;
  recordedAt: string;
  highlights: { label: string; value: string }[];
}

export const PUBLIC_PITCHES: PublicPitch[] = [
  {
    id: "ps_jandi",
    founder: "김대현",
    startupName: "토스랩 (Jandi)",
    sector: "Collab SaaS",
    oneLiner: "아시아 1위 협업 툴 — 30만+ 팀이 사용하는 엔터프라이즈 메신저.",
    description:
      "토스랩은 아시아권 엔터프라이즈가 Slack 대신 선택할 수 있는 한국어·일본어·중국어 First 협업 메신저를 운영합니다. 보안·관리자 콘솔·국내 ISMS 인증 등 한국 기업에 맞춘 기능으로 LG, 한국투자증권 등 대형사 도입 사례를 확보했습니다.",
    videoUrl: "https://www.youtube.com/embed/nt_-76Awg-s",
    trustScore: 84,
    breakdown: { visual: 86, audio: 78, content: 88 },
    valuation: "1,200억 원",
    minTicket: 30_000_000,
    raised: 850_000_000,
    goal: 1_500_000_000,
    recordedAt: "2026-04-21T10:32:00",
    highlights: [
      { label: "Paying teams", value: "300K+" },
      { label: "ARR YoY", value: "+62%" },
      { label: "NRR", value: "118%" },
    ],
  },
  {
    id: "ps_ttcare",
    founder: "허은아",
    startupName: "에이아이포펫 (TTcare)",
    sector: "Pet × AI Health",
    oneLiner: "스마트폰 카메라로 반려동물 안구·피부 질환을 1차 스크리닝.",
    description:
      "에이아이포펫은 반려동물 헬스케어 시장에서 의료영상 AI 를 모바일로 끌어내린 회사입니다. 안과·피부 7종 질환에 대해 임상 검증된 모델을 보유, 미국 시장 진출과 동물병원 SaaS 라인을 동시에 전개합니다.",
    videoUrl: "https://www.youtube.com/embed/G2zvgPa2_oA",
    trustScore: 71,
    breakdown: { visual: 74, audio: 68, content: 72 },
    valuation: "450억 원",
    minTicket: 10_000_000,
    raised: 310_000_000,
    goal: 800_000_000,
    recordedAt: "2026-04-18T15:10:00",
    highlights: [
      { label: "Trained images", value: "1.4M" },
      { label: "Disease coverage", value: "7" },
      { label: "Vet partners", value: "180" },
    ],
  },
  {
    id: "ps_codeit",
    founder: "강석원",
    startupName: "코드잇 (Codeit)",
    sector: "Edtech",
    oneLiner: "인터랙티브 러닝 — 한국 코딩 교육 시장 완강률 1위.",
    description:
      "코드잇은 LMS 가 아닌 *학습 환경* 자체를 만든 회사입니다. 자체 IDE 와 step-by-step 코드 채점 엔진으로 평균 완강률을 기존 강의 플랫폼 대비 2~3배 끌어올렸습니다. 부트캠프·기업 교육으로 B2B 매출 비중 확대 중.",
    videoUrl: "https://www.youtube.com/embed/s0OptvZrbDk",
    trustScore: 76,
    breakdown: { visual: 80, audio: 72, content: 76 },
    valuation: "800억 원",
    minTicket: 20_000_000,
    raised: 550_000_000,
    goal: 1_200_000_000,
    recordedAt: "2026-04-12T09:45:00",
    highlights: [
      { label: "Active learners", value: "210K" },
      { label: "Completion rate", value: "61%" },
      { label: "B2B accounts", value: "94" },
    ],
  },
  {
    id: "ps_greenlabs",
    founder: "신상훈",
    startupName: "그린랩스 (Greenlabs)",
    sector: "Agritech",
    oneLiner: "데이터 기반 농산업 플랫폼 '팜모닝' — 농가 디지털 OS.",
    description:
      "그린랩스는 농민이 매일 들여다보는 *팜모닝* 앱 위에 영농일지·시세·자재 커머스·금융을 얹어 농산업 전체를 디지털화합니다. 도매시장·산지조합과의 가격 데이터 정합성이 차별점.",
    videoUrl: "https://www.youtube.com/embed/nBfqN3m672Q",
    trustScore: 65,
    breakdown: { visual: 70, audio: 62, content: 64 },
    valuation: "8,000억 원",
    minTicket: 50_000_000,
    raised: 2_400_000_000,
    goal: 5_000_000_000,
    recordedAt: "2026-04-05T16:00:00",
    highlights: [
      { label: "MAU", value: "1.1M" },
      { label: "GMV", value: "₩4,200억" },
      { label: "Farmer LTV", value: "+38%" },
    ],
  },
  {
    id: "ps_981park",
    founder: "정동훈",
    startupName: "모노리스 (9.81 파크)",
    sector: "Themepark × ICT",
    oneLiner: "중력 가속도로 달리는 무동력 레이싱 — ICT 결합 차세대 테마파크.",
    description:
      "9.81 파크는 ICT·IoT 기반의 무동력 레이싱 카트와 실시간 랭킹·라이브 분석 시스템을 결합한 신개념 테마파크입니다. 제주 본점에 이어 동남아 해외 라이선스 모델로 확장 중.",
    videoUrl: "https://www.youtube.com/embed/ifbsKFhmxX0",
    trustScore: 79,
    breakdown: { visual: 82, audio: 74, content: 80 },
    valuation: "1,500억 원",
    minTicket: 30_000_000,
    raised: 920_000_000,
    goal: 2_000_000_000,
    recordedAt: "2026-03-29T11:20:00",
    highlights: [
      { label: "Annual visitors", value: "320K" },
      { label: "Repeat rate", value: "41%" },
      { label: "Licensing MoU", value: "3" },
    ],
  },
  {
    id: "ps_trevari",
    founder: "윤수영",
    startupName: "트레바리 (Trevari)",
    sector: "Community",
    oneLiner: "독서 모임 SaaS — 지적 소셜 네트워킹 1위 커뮤니티.",
    description:
      "트레바리는 4-6명 단위 오프라인 독서 모임을 운영체계화 한 커뮤니티 회사입니다. 멤버십 갱신율 70% 이상의 retention 을 기반으로 기업 학습·네트워킹 B2B 라인을 키우고 있습니다.",
    videoUrl: "https://www.youtube.com/embed/kP-5OPTCELM",
    trustScore: 68,
    breakdown: { visual: 72, audio: 66, content: 66 },
    valuation: "500억 원",
    minTicket: 15_000_000,
    raised: 400_000_000,
    goal: 1_000_000_000,
    recordedAt: "2026-03-22T19:15:00",
    highlights: [
      { label: "Members", value: "12K" },
      { label: "Renewal rate", value: "73%" },
      { label: "Cities", value: "4" },
    ],
  },
];
