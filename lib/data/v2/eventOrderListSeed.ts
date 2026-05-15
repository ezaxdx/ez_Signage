// v2 행사 발주 리스트 학습 시드 — 7개 Excel 정형화 (2026-05-15)
//
// 출처: 학습_샘플/*.csv (UTF-8 변환 결과)
// 원본: 학습데이터_통합_260514 (각 행사장 폴더)
// SOT: docs/NEW_STRUCTURE_260514.md §7
//
// 적재 원칙:
//   - 행사 메타 + 카테고리별 발주 패턴 (수량·사이즈·위치)
//   - data_stage = 'finalized' (실제 발주 완료 = 정답에 가까움)
//   - weight = 100% (decisions.md 단계별 가중치 정합)
//
// AI 추천 시 활용:
//   - 같은 행사장 (venue_key) 누적 → 권장 카테고리·수량
//   - 같은 시리즈 (series_id) → 다음 회차 베이스
//   - 같은 파트 (program_part) → 파트별 표준 패턴

import { SignageCategoryKey } from './signageCategoriesSeed'

export interface EventOrderRowV2 {
  /** 행사 코드 YYNNNN */
  event_code: string
  /** 카테고리 (24종 마스터) */
  category: SignageCategoryKey
  /** 프로그램 파트 */
  program_part?: string
  /** 위치 자유 텍스트 */
  location?: string
  /** 사이즈 (mm) */
  size_width_mm?: number
  size_height_mm?: number
  /** 수량 */
  quantity: number
  /** 비고 */
  notes?: string
  /** 출처 행 */
  source_file: string
  source_row: number
}

export interface EventOrderListV2 {
  event_code: string
  event_name: string
  event_name_en?: string
  venue_key: string
  hall_keys?: string[]
  event_date: string                       // YYYY-MM
  series_id?: string
  expected_attendees?: number
  is_international: boolean
  has_vip: boolean
  program_parts: string[]
  /** 발주 리스트 행 (대표 패턴만 — 전체 데이터는 학습_샘플 CSV에 있음) */
  order_rows: EventOrderRowV2[]
  /** 발주처·협력사 */
  client?: string
  vendor?: string
  /** 카테고리별 총 수량 (집계) */
  category_totals: Partial<Record<SignageCategoryKey, number>>
  /** 메모 */
  notes?: string
}

// ============================================================
// 7개 Excel 학습 데이터
// ============================================================

export const EVENT_ORDER_LISTS_V2: EventOrderListV2[] = [
  {
    event_code: '183080',
    event_name: '2018 스마트국토엑스포',
    event_name_en: '2018 Smart Geospatial Expo',
    venue_key: 'coex',
    hall_keys: ['coex_hall_d2', 'coex_conference_room_north', 'coex_grand_ballroom'],
    event_date: '2018-09',
    series_id: 'smart_country_expo',
    is_international: true,
    has_vip: true,
    program_parts: ['40.04', '40.05', '40.08', '40.17', '40.18'],
    client: '국토교통부',
    vendor: '라이브피알',
    order_rows: [
      { event_code: '183080', category: 'outer_curtain', program_part: '40.05', location: 'D2홀 하역장 위', size_width_mm: 1500, size_height_mm: 7000, quantity: 1, notes: '남색', source_file: '학습_샘플_스마트국토_180909.csv', source_row: 12 },
      { event_code: '183080', category: 'outer_curtain', program_part: '40.05', location: 'D2홀 오디토리움 벽면', size_width_mm: 24000, size_height_mm: 7000, quantity: 1, notes: '파란색 — 대형 키비주얼', source_file: '학습_샘플_스마트국토_180909.csv', source_row: 13 },
      { event_code: '183080', category: 'outer_curtain', program_part: '40.17', location: '인터컨티넨탈 코엑스 다이아몬드', size_width_mm: 7300, size_height_mm: 3000, quantity: 1, notes: '오만찬 배경 국/영문 타이틀', source_file: '학습_샘플_스마트국토_180909.csv', source_row: 7 },
      { event_code: '183080', category: 'x_banner_static', program_part: '40.18', location: '401호 앞 VIP룸 등록', size_width_mm: 600, size_height_mm: 1800, quantity: 4, notes: '등록데스크·개막식장 안내', source_file: '학습_샘플_스마트국토_180909.csv', source_row: 1 },
      { event_code: '183080', category: 'route_banner', program_part: '40.05', location: 'D2홀 ↔ 컨퍼런스룸 동선', size_width_mm: 600, size_height_mm: 1800, quantity: 4, notes: '동선 안내', source_file: '학습_샘플_스마트국토_180909.csv', source_row: 21 },
      { event_code: '183080', category: 'podium_title', program_part: '40.08', location: '401호 개막식 포디움', size_width_mm: 620, size_height_mm: 150, quantity: 2, notes: '사회자용 / 연사용', source_file: '학습_샘플_스마트국토_180909.csv', source_row: 3 },
      { event_code: '183080', category: 'i_banner', program_part: '40.05', location: 'D2홀 인포데스크', size_width_mm: 2500, size_height_mm: 2000, quantity: 1, notes: '일자별 무대 프로그램 일정', source_file: '학습_샘플_스마트국토_180909.csv', source_row: 17 },
      { event_code: '183080', category: 'vertical_pillar', program_part: '40.08', location: '401호 개막식 기둥', size_width_mm: 1500, size_height_mm: 6000, quantity: 4, notes: '행사 타이틀 (1.5m×6m + 1.5m×4m)', source_file: '학습_샘플_스마트국토_180909.csv', source_row: 4 },
      { event_code: '183080', category: 'form_board_pop', program_part: '40.19', location: '인천공항 리에종피켓', size_width_mm: 420, size_height_mm: 594, quantity: 4, notes: 'A2사이즈 영문, 여객터미널당 2개', source_file: '학습_샘플_스마트국토_180909.csv', source_row: 41 },
    ],
    category_totals: {
      x_banner_static: 22,
      route_banner: 8,
      outer_curtain: 4,
      vertical_pillar: 6,
      podium_title: 6,
      form_board_pop: 6,
      i_banner: 1,
    },
    notes: '코엑스 컨퍼런스룸·D2홀 + 인터컨티넨탈 코엑스 오만찬 + 인천공항 영접 — 5파트 융합 행사. 총 41행 발주.',
  },
  {
    event_code: '183090',
    event_name: 'BCWW 2018 (국제방송영상마켓)',
    event_name_en: 'BCWW 2018',
    venue_key: 'coex',
    hall_keys: ['coex_hall_b'],
    event_date: '2018-09',
    series_id: 'bcww',
    is_international: true,
    has_vip: true,
    program_parts: ['40.04', '40.05', '40.06', '40.07', '40.08', '40.17'],
    client: '한국콘텐츠진흥원',
    vendor: '라이브피알',
    order_rows: [
      { event_code: '183090', category: 'outer_wall', program_part: '40.20', location: '전시장 외부', size_width_mm: 10000, size_height_mm: 3000, quantity: 1, notes: 'BCWW 타이틀', source_file: 'BCWW_2018.csv', source_row: 19 },
      { event_code: '183090', category: 'outer_wall', program_part: '40.20', location: '전시장 외부', size_width_mm: 12000, size_height_mm: 1080, quantity: 1, notes: 'B2 입구 상단', source_file: 'BCWW_2018.csv', source_row: 23 },
      { event_code: '183090', category: 'ceiling_hanging', program_part: '40.05', location: 'Hall B 전시장 천정', size_width_mm: 6000, size_height_mm: 4000, quantity: 8, notes: 'CJ E&M / MBC / SBS', source_file: 'BCWW_2018.csv', source_row: 9 },
      { event_code: '183090', category: 'ceiling_hanging', program_part: '40.05', location: 'Hall B 전시장 천정 (대형)', size_width_mm: 5000, size_height_mm: 3750, quantity: 6, notes: 'KBS·MBC·SBS·BCWW 타이틀(영문)', source_file: 'BCWW_2018.csv', source_row: 11 },
      { event_code: '183090', category: 'vertical_pillar', program_part: '40.05', location: 'Hall B 전시장 내 기둥', size_width_mm: 1200, size_height_mm: 6000, quantity: 16, notes: '기업 로고 12 + BCWW 타이틀 4', source_file: 'BCWW_2018.csv', source_row: 13 },
      { event_code: '183090', category: 'x_banner_static', program_part: '40.06', location: '바이어 라운지·비즈니스 미팅룸', size_width_mm: 600, size_height_mm: 1800, quantity: 5, notes: '룸사인·안내사인', source_file: 'BCWW_2018.csv', source_row: 1 },
      { event_code: '183090', category: 'route_banner', program_part: '40.05', location: '전시장 외부 → Hall B', size_width_mm: 600, size_height_mm: 1800, quantity: 6, notes: '화살표 별첨', source_file: 'BCWW_2018.csv', source_row: 26 },
      { event_code: '183090', category: 'podium_title', program_part: '40.08', location: '네트워킹 리셉션 무대', size_width_mm: 700, size_height_mm: 400, quantity: 2, notes: 'BCWW 타이틀', source_file: 'BCWW_2018.csv', source_row: 18 },
      { event_code: '183090', category: 'form_board_pop', program_part: '40.06', location: '비즈니스 미팅룸', size_width_mm: 210, size_height_mm: 297, quantity: 5, notes: 'A4 안내사인 - 법률·지식재산권·금융·마케팅·창업', source_file: 'BCWW_2018.csv', source_row: 3 },
      { event_code: '183090', category: 'outer_curtain', program_part: '40.17', location: '인터컨티넨탈 코엑스 비너스룸(30F)', size_width_mm: 5000, size_height_mm: 900, quantity: 1, notes: 'VIP 오찬 배경', source_file: 'BCWW_2018.csv', source_row: 35 },
    ],
    category_totals: {
      x_banner_static: 14,
      route_banner: 6,
      outer_wall: 3,
      outer_curtain: 1,
      vertical_pillar: 16,
      ceiling_hanging: 14,
      podium_title: 2,
      form_board_pop: 6,
    },
    notes: '코엑스 Hall B + 인터컨티넨탈 코엑스 호텔 — 전시·바이어·VIP 융합. 총 36행. 천정 행잉 14개 (학습 데이터 최대치)',
  },
  {
    event_code: '193100',
    event_name: 'KOREA MICE EXPO 2019',
    event_name_en: 'KME 2019',
    venue_key: 'songdo_convensia',
    hall_keys: ['songdo_premier_ballroom', 'songdo_exhibition_hall_1', 'songdo_exhibition_hall_2'],
    event_date: '2019-06',
    series_id: 'kme',
    is_international: true,
    has_vip: true,
    program_parts: ['40.04', '40.05', '40.06', '40.07', '40.08', '40.17', '40.18', '40.19'],
    client: 'EZPMP',
    vendor: '모나미스테이션',
    order_rows: [
      { event_code: '193100', category: 'outer_curtain', program_part: '40.20', location: '컨벤시아 국기게양대 뒤 벽 전면', size_width_mm: 14400, size_height_mm: 6000, quantity: 1, notes: '외벽 키비주얼 — 대형', source_file: 'KME_2019.csv', source_row: 40 },
      { event_code: '193100', category: 'streetlight', program_part: '40.20', location: '컨벤시아 전면 가로등', size_width_mm: 600, size_height_mm: 1800, quantity: 20, notes: '인천시 30 + 송도컨벤시아 20 = 50개 발주', source_file: 'KME_2019.csv', source_row: 41 },
      { event_code: '193100', category: 'streetlight', program_part: '40.20', location: '컨벤시아 전면 양면 폴대 배너', size_width_mm: 1300, size_height_mm: 2500, quantity: 13, notes: '양면 폴대', source_file: 'KME_2019.csv', source_row: 42 },
      { event_code: '193100', category: 'ceiling_hanging', program_part: '40.05', location: '송도 컨벤시아 Hall 1·2 전시홀 천정', size_width_mm: 8000, size_height_mm: 8000, quantity: 6, notes: '천정 행잉 대형 6개', source_file: 'KME_2019.csv', source_row: 8 },
      { event_code: '193100', category: 'vertical_pillar', program_part: '40.08', location: '개막식 프리미어 볼룸(2F)', size_width_mm: 1000, size_height_mm: 7200, quantity: 6, notes: '세로 현수막 - 화살표 별첨', source_file: 'KME_2019.csv', source_row: 28 },
      { event_code: '193100', category: 'x_banner_static', program_part: '40.18', location: 'KME 라운지·전시장·등록데스크', size_width_mm: 600, size_height_mm: 1800, quantity: 19, notes: 'Buyer Desk·Information·Photo Zone 등', source_file: 'KME_2019.csv', source_row: 2 },
      { event_code: '193100', category: 'route_banner', program_part: '40.05', location: '비즈니스 라운지·KME 라운지 동선', size_width_mm: 600, size_height_mm: 1800, quantity: 9, notes: '화살표 별첨', source_file: 'KME_2019.csv', source_row: 10 },
      { event_code: '193100', category: 'podium_title', program_part: '40.08', location: '개막식·VIP 오찬·지역홍보', size_width_mm: 1000, size_height_mm: 180, quantity: 5, notes: '포디움 1·2 (사회자+연사)', source_file: 'KME_2019.csv', source_row: 31 },
      { event_code: '193100', category: 'form_board_pop', program_part: '40.19', location: '인천공항 영접 데스크', size_width_mm: 420, size_height_mm: 297, quantity: 4, notes: 'Welcome 영접 피켓 A3', source_file: 'KME_2019.csv', source_row: 1 },
      { event_code: '193100', category: 'vehicle_q_bang', program_part: '40.19', location: '아트센터 인천 셔틀버스', size_width_mm: 210, size_height_mm: 297, quantity: 12, notes: '인천 2 + 오크우드 2 + 렌탈 1 + 포스트 투어 4 + 셔틀 3', source_file: 'KME_2019.csv', source_row: 4 },
      { event_code: '193100', category: 'water_banner', program_part: '40.17', location: 'VIP 오찬 경원재', size_width_mm: 600, size_height_mm: 1800, quantity: 1, source_file: 'KME_2019.csv', source_row: 34 },
      { event_code: '193100', category: 'floor_sticker', program_part: '40.05', location: '송도 로비 바닥', size_width_mm: 1800, size_height_mm: 1800, quantity: 7, notes: '바닥캘지 안내사인', source_file: 'KME_2019.csv', source_row: 24 },
    ],
    category_totals: {
      x_banner_static: 19,
      route_banner: 9,
      outer_curtain: 1,
      streetlight: 33,
      ceiling_hanging: 6,
      vertical_pillar: 14,
      podium_title: 5,
      form_board_pop: 4,
      vehicle_q_bang: 12,
      water_banner: 1,
      floor_sticker: 7,
    },
    notes: '회사 자체 진행 핵심 행사. 송도 컨벤시아 + 아트센터 인천 + 경원재 + 인천공항 — 5장소 융합. 총 55행. EZPMP 발주 표준 패턴 학습 핵심.',
  },
  {
    event_code: '183000-1',
    event_name: 'KOREA MICE EXPO 2018 환영리셉션',
    event_name_en: 'KME 2018 Welcome Reception',
    venue_key: 'songdo_convensia',
    event_date: '2018-06',
    series_id: 'kme',
    is_international: true,
    has_vip: true,
    program_parts: ['40.05', '40.17', '40.18', '40.19'],
    client: 'EZPMP',
    order_rows: [
      { event_code: '183000-1', category: 'outer_curtain', location: '환영리셉션 배경', quantity: 1, source_file: 'KME_2018_환영.csv', source_row: 0 },
      { event_code: '183000-1', category: 'x_banner_static', quantity: 16, notes: '룸·안내 다수', source_file: 'KME_2018_환영.csv', source_row: 0 },
      { event_code: '183000-1', category: 'route_banner', quantity: 8, notes: '동선 안내', source_file: 'KME_2018_환영.csv', source_row: 0 },
    ],
    category_totals: { x_banner_static: 16, route_banner: 8, outer_curtain: 1 },
    notes: 'KME 2018 환영리셉션 별도 발주. 총 65행. 동선 33%·룸 33%·정적 33% 비율',
  },
  {
    event_code: '183060',
    event_name: '제2회 세계리더스보전포럼 (WLCF)',
    event_name_en: '2018 WLCF (World Leaders Conservation Forum)',
    venue_key: 'icc_jeju',
    event_date: '2018-09',
    series_id: 'leaders_forum',
    is_international: true,
    has_vip: true,
    program_parts: ['40.04', '40.08'],
    client: '제주국제컨벤션센터',
    order_rows: [
      { event_code: '183060', category: 'outer_curtain', quantity: 2, notes: '메인 행사 배경', source_file: 'WLCF_2018.csv', source_row: 0 },
      { event_code: '183060', category: 'x_banner_static', quantity: 2, notes: '룸 안내', source_file: 'WLCF_2018.csv', source_row: 0 },
      { event_code: '183060', category: 'route_banner', quantity: 1, source_file: 'WLCF_2018.csv', source_row: 0 },
      { event_code: '183060', category: 'podium_title', quantity: 4, source_file: 'WLCF_2018.csv', source_row: 0 },
    ],
    category_totals: { x_banner_static: 2, route_banner: 1, outer_curtain: 2, podium_title: 4 },
    notes: 'ICC 제주 국제 환경 포럼. 총 60행',
  },
  {
    event_code: '183060-2',
    event_name: '리더스 (제2회 세계리더스보전포럼 — 별도 자료)',
    venue_key: 'icc_jeju',
    event_date: '2018-09',
    series_id: 'leaders_forum',
    is_international: true,
    has_vip: true,
    program_parts: ['40.04', '40.08'],
    order_rows: [],
    category_totals: { x_banner_static: 12, route_banner: 6, outer_curtain: 3, podium_title: 6 },
    notes: '리더스_제작물 리스트_180911(이즈).xlsx — WLCF 2차 발주 추정. 총 39행',
  },
  {
    event_code: '191400',
    event_name: '제1회 대한민국 정부혁신박람회',
    event_name_en: '2019 Government Innovation Expo',
    venue_key: 'ddp',
    event_date: '2019-11',
    series_id: 'gov_innovation',
    is_international: false,
    has_vip: true,
    program_parts: ['40.05', '40.08', '40.18'],
    client: '행정안전부',
    vendor: '라이브피알',
    order_rows: [],
    category_totals: { x_banner_static: 8, route_banner: 4, outer_wall: 2, vertical_pillar: 6, i_banner: 1 },
    notes: 'DDP 추정. 총 32행. 정부 박람회 표준 패턴',
  },
]

// ============================================================
// 헬퍼
// ============================================================

/** 행사 코드로 조회 */
export function findOrderListByEvent(eventCode: string): EventOrderListV2 | undefined {
  return EVENT_ORDER_LISTS_V2.find(o => o.event_code === eventCode)
}

/** 같은 행사장 누적 — AI 추천 시 venue 컨텍스트 */
export function getVenueOrderHistory(venueKey: string): EventOrderListV2[] {
  return EVENT_ORDER_LISTS_V2.filter(o => o.venue_key === venueKey)
}

/** 같은 시리즈 이전 회차 — 다음 회차 추천 베이스 */
export function getSeriesOrderHistory(seriesId: string): EventOrderListV2[] {
  return EVENT_ORDER_LISTS_V2.filter(o => o.series_id === seriesId)
}

/** 카테고리별 누적 평균 수량 — AI 3순위 수량 산출 보강 */
export function getCategoryAverageQuantity(
  venueKey: string,
  category: SignageCategoryKey
): { avg: number; count: number; samples: number[] } {
  const events = getVenueOrderHistory(venueKey)
  const quantities = events
    .map(e => e.category_totals[category])
    .filter((q): q is number => typeof q === 'number' && q > 0)

  if (quantities.length === 0) return { avg: 0, count: 0, samples: [] }

  const sum = quantities.reduce((a, b) => a + b, 0)
  return {
    avg: Math.round(sum / quantities.length),
    count: quantities.length,
    samples: quantities,
  }
}

/** 행사장 × 카테고리 학습 보유 매트릭스 — 30 venues × 24 categories = 720 셀 */
export function buildCoverageMatrix(): Record<string, Partial<Record<SignageCategoryKey, number>>> {
  const matrix: Record<string, Partial<Record<SignageCategoryKey, number>>> = {}

  for (const event of EVENT_ORDER_LISTS_V2) {
    if (!matrix[event.venue_key]) matrix[event.venue_key] = {}
    for (const [cat, qty] of Object.entries(event.category_totals)) {
      const key = cat as SignageCategoryKey
      matrix[event.venue_key][key] = (matrix[event.venue_key][key] || 0) + (qty || 0)
    }
  }

  return matrix
}
