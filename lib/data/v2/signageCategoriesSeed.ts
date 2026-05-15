// v2 카테고리 마스터 시드 — 15 확정 + 9 pending = 24종 (2026-05-15)
//
// 출처: 5/14 회의 결정 사항 + SPP 국제콘텐츠마켓 2024 47종 카탈로그 분석 + 발주 리스트 7개 학습
// SOT: docs/NEW_STRUCTURE_260514.md §1
//
// 적용 절차:
//   1. 컴펌 후 is_pending=false 9종 결정 (채택/거절/통합)
//   2. 기존 lib/data/dashboardSeed.ts SEED_SIGNAGE_TYPES와 통합
//   3. signageCategoryStandards.ts 6대 카테고리 매칭 키워드 보강
//   4. DB migration_v10_new_structure.sql 실행

export type SignageCategoryKey =
  // 확정 15종 (5/14 회의)
  | 'outer_wall'           // 외벽 가로현수막
  | 'outer_curtain'        // 외벽 통천현수막
  | 'vertical_pillar'      // 세로현수막 (기둥)
  | 'streetlight'          // 가로등 배너
  | 'gate'                 // 게이트 / 입구 광고
  | 'x_banner_static'      // X배너 (정적 안내)
  | 'route_banner'         // 동선 배너 (X배너 분리, 5/14 확정)
  | 'i_banner'             // I배너 (인포메이션)
  | 'ceiling_hanging'      // 천정 행잉
  | 'podium_title'         // 포디움 타이틀
  | 'form_board_pop'       // 폼보드 (A4·A3·A2·A1 POP)
  | 'water_banner'         // 물통배너
  | 'vehicle_q_bang'       // 큐방 (차량용)
  | 'floor_sticker'        // 바닥 스티커
  | 'window_sticker'       // 시트지 (유리창)
  // 신규 9종 후보 (pending)
  | 'did_signage'          // DID / 디지털 사이니지
  | 'photo_wall'           // 포토월
  | 'award_board'          // 시상보드
  | 'stage_sidewing'       // 무대 사이드윙
  | 'badge_lanyard'        // 비표 / 명찰
  | 'table_number'         // 테이블 넘버링
  | 'name_plate'           // 네임 플레이트
  | 'triangle_nameplate'   // 삼각 명패
  | 'pop_special'          // POP 특수 (A3 QR·드로잉 등)

export interface SignageCategoryV2 {
  key: SignageCategoryKey
  label: string
  description: string
  is_pending: boolean              // true = 컴펌 안 났음 (9종)
  priority: 1 | 2 | 3              // 1 = 외벽/천정 / 2 = 게이트·가로등·세로 / 3 = X배너·부속
  typical_size_mm: {
    min_width: number
    max_width: number
    min_height: number
    max_height: number
  }
  match_keywords: string[]         // 학습 데이터 자유 문자열 매칭 키워드
  source_keywords: string[]        // SPP·BCWW·KME 등 학습 데이터에 등장한 표기
  default_quantity_formula: string // AI 추천 시 기본 수량 산출 공식 (3순위)
  parent_category?: SignageCategoryKey  // 합쳐질 가능성 있는 상위 카테고리 (pop_special → form_board_pop 등)
}

export const SIGNAGE_CATEGORIES_V2: SignageCategoryV2[] = [
  // ========== 확정 15종 (5/14 회의) ==========
  {
    key: 'outer_wall',
    label: '외벽 가로현수막',
    description: '행사장 외부 전면 대형 가로 현수막. 행사 메인 타이틀 키비주얼.',
    is_pending: false,
    priority: 1,
    typical_size_mm: { min_width: 7000, max_width: 12000, min_height: 1080, max_height: 3000 },
    match_keywords: ['외벽', '가로현수막', '행사 현수막', '대형 배너', '외부 광고'],
    source_keywords: ['BCWW 외벽 12000×1080', 'KME 외벽 6000×1800', 'BCWW 외벽 10000×3000'],
    default_quantity_formula: '주출입구 수 × 1',
  },
  {
    key: 'outer_curtain',
    label: '외벽 통천현수막',
    description: '외벽 전면 키비주얼 통천. 매우 큰 사이즈, 키비주얼 + 행사명 + 일자.',
    is_pending: false,
    priority: 1,
    typical_size_mm: { min_width: 6000, max_width: 24000, min_height: 3000, max_height: 17000 },
    match_keywords: ['통천', '통천현수막', '키비주얼', '외벽 통천'],
    source_keywords: ['스마트국토 D2 24000×7000', '스마트국토 외벽 14400×6000 (KME)', '평창올림픽 통천'],
    default_quantity_formula: '외벽 전면 수 × 1',
  },
  {
    key: 'vertical_pillar',
    label: '세로현수막 (기둥)',
    description: '로비·외부 기둥 부착 세로 현수막. 행사 타이틀·동선 표시.',
    is_pending: false,
    priority: 2,
    typical_size_mm: { min_width: 600, max_width: 1200, min_height: 4000, max_height: 7200 },
    match_keywords: ['세로현수막', '기둥배너', '기둥 현수막', '세로배너'],
    source_keywords: ['BCWW 기둥 1200×6000 (16건)', 'KME 프리미어볼룸 1000×7200', 'BCWW 로비 1000×1500'],
    default_quantity_formula: '로비 기둥 수 (보통 4~8)',
  },
  {
    key: 'streetlight',
    label: '가로등 배너',
    description: '외부 가로등 폴 부착. D-30 이전 폴 예약 필수. 행사장별 클램프 규격 상이.',
    is_pending: false,
    priority: 2,
    typical_size_mm: { min_width: 600, max_width: 700, min_height: 1800, max_height: 2000 },
    match_keywords: ['가로등', '폴대', '폴배너', '폴 클램프'],
    source_keywords: ['KME 컨벤시아 전면 600×1800 20개', '평창 가로등 700×1800', 'KME 양면 폴대 1300×2500 13개'],
    default_quantity_formula: '20~50 (행사장 주변 가로등 수)',
  },
  {
    key: 'gate',
    label: '게이트 / 입구 광고',
    description: '출입구 광고면·차량 게이트·공항 영접 게이트.',
    is_pending: false,
    priority: 2,
    typical_size_mm: { min_width: 30000, max_width: 38000, min_height: 1500, max_height: 1500 },
    match_keywords: ['게이트', '출입구 광고', '입구 아치', '차량 게이트', '공항 게이트'],
    source_keywords: ['킨텍스 Gate1 38×1.5m', '킨텍스 Gate2 36×1.5m', 'KME 인천공항 영접 피켓 420×297 4개'],
    default_quantity_formula: '게이트 수 × 1',
  },
  {
    key: 'x_banner_static',
    label: 'X배너 (정적 안내)',
    description: '등록·룸사인·일반 안내. 자체 스탠드 사용. 학습 데이터 상 발주 X배너 중 약 65%.',
    is_pending: false,
    priority: 3,
    typical_size_mm: { min_width: 600, max_width: 600, min_height: 1800, max_height: 1800 },
    match_keywords: ['x배너', 'x-배너', '엑스배너', '롤업', '룸사인', 'Registration', 'Information'],
    source_keywords: ['BCWW Registration Desk', 'KME Buyer Desk', 'SPP 등록데스크 A·B'],
    default_quantity_formula: '등록데스크 수 × 1 + 룸 수 × 1',
  },
  {
    key: 'route_banner',
    label: '동선 배너',  // ⭐ 5/14 회의 확정 — X배너에서 분리
    description: 'X배너 형태, 동선·유도·화살표 안내 전용. 학습 데이터 분석 결과 X배너의 약 35%가 동선용.',
    is_pending: false,
    priority: 3,
    typical_size_mm: { min_width: 600, max_width: 600, min_height: 1800, max_height: 1800 },
    match_keywords: ['유도사인', '동선안내', '화살표', '방향 안내', 'X→Y', '↔'],
    source_keywords: ['BCWW 화살표 별첨 (6건)', 'KME 화살표 별첨 (9건)', '스마트국토 D2↔컨퍼런스룸 동선'],
    default_quantity_formula: '참가자 ÷ 200 + 홀 분리 수 + 주출입구 수',
  },
  {
    key: 'i_banner',
    label: 'I배너 (인포메이션)',
    description: '인포메이션 데스크 셔틀버스·운영시간·프로그램 시간표.',
    is_pending: false,
    priority: 3,
    typical_size_mm: { min_width: 1200, max_width: 2500, min_height: 1500, max_height: 2000 },
    match_keywords: ['i배너', 'I-배너', '현황판', '시간표', '안내판'],
    source_keywords: ['BCWW 시간표 2500×2000', 'KME 셔틀 시간표', 'WSCE 일정 안내'],
    default_quantity_formula: '인포데스크 수 × 1~2',
  },
  {
    key: 'ceiling_hanging',
    label: '천정 행잉',
    description: '천장 매다는 대형 배너. 행사장별 리깅 가능 여부 차이 큼. 학습 데이터 가장 적음.',
    is_pending: false,
    priority: 1,
    typical_size_mm: { min_width: 4000, max_width: 8000, min_height: 3000, max_height: 5000 },
    match_keywords: ['천정', '천장', '행잉', '리깅', 'hanging', '드롭배너'],
    source_keywords: ['BCWW 천정 6000×4000 (8건)', 'BCWW 천정 5000×3750 KBS·MBC·SBS (4건)', 'KME 송도 1·2홀 천정 8000×8000 (6건)'],
    default_quantity_formula: '홀 면적 ÷ 1000 (천장고 5m 이상만)',
  },
  {
    key: 'podium_title',
    label: '포디움 타이틀',
    description: '연단 전면 폼보드. 사회자용·연사용 분리 2개.',
    is_pending: false,
    priority: 3,
    typical_size_mm: { min_width: 600, max_width: 1200, min_height: 140, max_height: 200 },
    match_keywords: ['포디움', '연단', '포디움 타이틀', '폼보드 포디움'],
    source_keywords: ['스마트국토 사회자용 62×15 / 연사용 52×98', 'BCWW 700×400', 'KME 800×460', 'APEC 포디움 사회자용 600×1300', 'SPP 포디움 600×1200 (Agent 2 학습 26건)'],
    default_quantity_formula: '세션 수 × 2 (사회자+연사)',
  },
  {
    key: 'form_board_pop',
    label: '폼보드 / A4·A3·A2·A1 POP',
    description: '일반 안내 보드. A4~A1 크기 자유. 룸 안내·메뉴·서비스 안내.',
    is_pending: false,
    priority: 3,
    typical_size_mm: { min_width: 210, max_width: 594, min_height: 297, max_height: 841 },
    match_keywords: ['폼보드', '안내판', 'A4', 'A3', 'A2', 'A1', 'POP'],
    source_keywords: ['BCWW A4·A1 다수', 'SPP A3 POP (QR·드로잉·매칭)', 'KME A3 룸사인 290×420'],
    default_quantity_formula: '룸 수 + 안내 포인트 수',
  },
  {
    key: 'water_banner',
    label: '물통배너',
    description: '외부 역·승하차장 자립형 배너. 동선·장소 안내.',
    is_pending: false,
    priority: 2,
    typical_size_mm: { min_width: 600, max_width: 600, min_height: 1800, max_height: 1800 },
    match_keywords: ['물통배너', '물통 배너'],
    source_keywords: ['KME VIP 오찬 1개', '평창 셔틀 승하차장'],
    default_quantity_formula: '셔틀 정거장 수 × 1',
  },
  {
    key: 'vehicle_q_bang',
    label: '큐방 (차량용)',
    description: '셔틀버스 앞유리 부착 노선·행선지 표기.',
    is_pending: false,
    priority: 3,
    typical_size_mm: { min_width: 210, max_width: 297, min_height: 297, max_height: 420 },
    match_keywords: ['큐방', 'Q방', '차량 패트'],
    source_keywords: ['KME 인천 셔틀 2 / 오크우드 2 / 렌탈 1', '스마트국토 모나미 4'],
    default_quantity_formula: '셔틀 차량 수 × 1',
  },
  {
    key: 'floor_sticker',
    label: '바닥 스티커',
    description: '로비 바닥·대기줄 동선 유도·거리두기.',
    is_pending: false,
    priority: 3,
    typical_size_mm: { min_width: 350, max_width: 1800, min_height: 150, max_height: 1800 },
    match_keywords: ['바닥 스티커', '바닥캘지', '거리두기 스티커', '발자국 스티커'],
    source_keywords: ['KME 송도 로비바닥 1800×1800 7개', '코로나 시기 거리두기 다수'],
    default_quantity_formula: '동선 분기점 수 × 1',
  },
  {
    key: 'window_sticker',
    label: '시트지 (유리창)',
    description: '출입구 유리창 부착. 입구·출구·반입구 표시.',
    is_pending: false,
    priority: 3,
    typical_size_mm: { min_width: 1000, max_width: 1650, min_height: 600, max_height: 920 },
    match_keywords: ['시트지', '유리 시트지', '유리창 시트'],
    source_keywords: ['BCWW 입구·출구 다수'],
    default_quantity_formula: '문 수 × 2 (입·출)',
  },

  // ========== 신규 9종 후보 (pending — 5/14 의제) ==========
  {
    key: 'did_signage',
    label: 'DID / 디지털 사이니지',
    description: 'LED·LCD 디지털 사이니지. 동영상·인터랙티브 콘텐츠 가능.',
    is_pending: true,
    priority: 1,
    typical_size_mm: { min_width: 1200, max_width: 5500, min_height: 800, max_height: 3000 },
    match_keywords: ['DID', '디지털 사이니지', 'LED 배너', 'LCD 배너', '디지털 안내'],
    source_keywords: ['SPP DID A·B·C (3건)', 'APEC DID A·B·C·D (4건)', 'SPP 디지털 사이니지 패널', '행사장별 디지털 사이니지 (Agent 2 학습 22건)'],
    default_quantity_formula: '메인 동선 분기점 수 × 1 (행사장 기 보유 시 0)',
  },
  {
    key: 'photo_wall',
    label: '포토월 / 포토존',
    description: '행사 포토 영역. 키비주얼 배경 + 행사명.',
    is_pending: true,
    priority: 1,
    typical_size_mm: { min_width: 2500, max_width: 4500, min_height: 2000, max_height: 3000 },
    match_keywords: ['포토월', '포토존', 'photo wall', 'photo zone'],
    source_keywords: ['SPP 포토월 13번', 'KME 2019 포토존', 'Agent 2 학습 4건 (행사장 메인)'],
    default_quantity_formula: '메인 행사 시 × 1',
  },
  {
    key: 'award_board',
    label: '시상보드',
    description: '시상식 행사용 보드. 수상자·트로피 디스플레이.',
    is_pending: true,
    priority: 2,
    typical_size_mm: { min_width: 800, max_width: 1500, min_height: 600, max_height: 1000 },
    match_keywords: ['시상보드', '수상 보드', '시상식 보드'],
    source_keywords: ['SPP 시상보드 A·B'],
    default_quantity_formula: '시상 카테고리 수 × 1',
  },
  {
    key: 'stage_sidewing',
    label: '무대 사이드윙',
    description: '무대 좌·우 측면 배너. 키비주얼 + 행사 보조 정보.',
    is_pending: true,
    priority: 2,
    typical_size_mm: { min_width: 1500, max_width: 3000, min_height: 3000, max_height: 5000 },
    match_keywords: ['무대 사이드윙', '사이드윙', '무대 측면'],
    source_keywords: ['SPP 무대 사이드윙 A·B (3건)'],
    default_quantity_formula: '메인 무대 × 2 (좌·우)',
  },
  {
    key: 'badge_lanyard',
    label: '비표 / 명찰',
    description: '출입 관리 명찰·비표. RFID 가능.',
    is_pending: true,
    priority: 2,
    typical_size_mm: { min_width: 70, max_width: 100, min_height: 100, max_height: 150 },
    match_keywords: ['비표', '명찰', 'badge', 'lanyard'],
    source_keywords: ['SPP 비표'],
    default_quantity_formula: '참가자 수 × 1',
  },
  {
    key: 'table_number',
    label: '테이블 넘버링',
    description: '좌석 배치 안내. 테이블 번호·이름.',
    is_pending: true,
    priority: 3,
    typical_size_mm: { min_width: 100, max_width: 200, min_height: 100, max_height: 200 },
    match_keywords: ['테이블 넘버', '테이블 번호', 'table number'],
    source_keywords: ['SPP 테이블 넘버링'],
    default_quantity_formula: '테이블 수 × 1',
  },
  {
    key: 'name_plate',
    label: '네임 플레이트',
    description: '발표자·VIP 좌석 명패.',
    is_pending: true,
    priority: 3,
    typical_size_mm: { min_width: 200, max_width: 300, min_height: 80, max_height: 120 },
    match_keywords: ['네임 플레이트', 'name plate', '명패'],
    source_keywords: ['SPP 네임 플레이트'],
    default_quantity_formula: 'VIP·발표자 수 × 1',
  },
  {
    key: 'triangle_nameplate',
    label: '삼각 명패',
    description: '회의·간담회 좌석 삼각형 명패.',
    is_pending: true,
    priority: 3,
    typical_size_mm: { min_width: 200, max_width: 300, min_height: 80, max_height: 120 },
    match_keywords: ['삼각 명패', '삼각명패'],
    source_keywords: ['SPP 삼각 명패'],
    default_quantity_formula: '회의 참석자 수 × 1',
    parent_category: 'name_plate',  // 통합 검토 후보
  },
  {
    key: 'pop_special',
    label: 'POP 특수 (QR·드로잉·매칭 등)',
    description: 'A3·A4 안내 보드 특수 용도 (QR 결제·드로잉 체험·매칭 스케줄 등).',
    is_pending: true,
    priority: 3,
    typical_size_mm: { min_width: 210, max_width: 297, min_height: 297, max_height: 420 },
    match_keywords: ['QR 안내', '드로잉 체험', '매칭 스케줄', 'IR데이', '충전존'],
    source_keywords: ['SPP A3 POP QR·드로잉·매칭 (3건)', 'SPP A4 POP 7건'],
    default_quantity_formula: '특수 안내 포인트 수 × 1',
    parent_category: 'form_board_pop',  // 통합 검토 후보
  },
]

/** 카테고리 검색 - key */
export function findCategoryByKey(key: SignageCategoryKey): SignageCategoryV2 | undefined {
  return SIGNAGE_CATEGORIES_V2.find(c => c.key === key)
}

/** 자유 문자열 → 카테고리 매칭 (학습 데이터 정합화) */
export function classifyCategoryV2(text: string): SignageCategoryV2 | null {
  if (!text) return null
  const lower = text.toLowerCase().trim()
  for (const cat of SIGNAGE_CATEGORIES_V2) {
    if (cat.match_keywords.some(kw => lower.includes(kw.toLowerCase()))) {
      return cat
    }
  }
  return null
}

/** 확정 카테고리만 (15종, AI 추천에 사용) */
export function getConfirmedCategories(): SignageCategoryV2[] {
  return SIGNAGE_CATEGORIES_V2.filter(c => !c.is_pending)
}

/** Pending 카테고리만 (9종, 보고 의제·관리자 화면에 표시) */
export function getPendingCategories(): SignageCategoryV2[] {
  return SIGNAGE_CATEGORIES_V2.filter(c => c.is_pending)
}
