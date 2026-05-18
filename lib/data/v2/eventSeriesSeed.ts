// v2 행사 시리즈 시드 — 연도별 반복 행사 풀 (2026-05-15)
//
// 출처: 학습데이터_통합_260514 + 환경장식물_분석결과.md §H
// SOT: docs/NEW_STRUCTURE_260514.md §2.3
//
// 행사 코드: YYNNNN (YY = 연도, NNNN = 일련번호)
// 예: 183090 (2018 BCWW), 193700 (2019 스마트국토), 245006 (2024 SPP)

export interface EventSeriesV2 {
  series_id: string
  name: string
  /** 시리즈 영문명 */
  name_en?: string
  description: string
  /** 통상 개최 행사장 (없으면 가변) */
  default_venue_key?: string
  /** 통상 사용 홀 */
  default_hall_keys?: string[]
  /** 반복 여부 */
  is_recurring: boolean
  /** 학습 데이터에서 확인된 회차 */
  known_instances: Array<{
    code: string          // YYNNNN
    year: number
    venue_key?: string    // 회차별 행사장이 다를 경우
    area_sqm?: number
    notes?: string
  }>
  /** 통상 프로그램 파트 */
  typical_program_parts?: string[]
  /** 통상 환경장식물 카테고리 */
  typical_categories?: string[]
  /** 행사 격 */
  scale: 'mega' | 'large' | 'medium' | 'small'
  /** 국제성 */
  is_international: boolean
  /** 메모 */
  notes?: string
}

export const EVENT_SERIES_V2: EventSeriesV2[] = [
  // ========== 대형 국제 행사 (반복) ==========
  {
    series_id: 'bcww',
    name: '국제방송영상마켓',
    name_en: 'BCWW (Broadcast Worldwide)',
    description: '국제 방송 콘텐츠 마켓. 국내외 방송사·제작사 참여.',
    default_venue_key: 'coex',
    default_hall_keys: ['coex_hall_b'],
    is_recurring: true,
    known_instances: [
      { code: '183090', year: 2018, venue_key: 'coex', notes: 'BCWW 2018' },
      { code: '193800', year: 2019, venue_key: 'coex', notes: 'BCWW 2019' },
      { code: '203130', year: 2020, notes: 'BCWW + BCWW FORMATS 2020 (온오프라인)' },
    ],
    typical_program_parts: ['40.04', '40.05', '40.06', '40.07', '40.08'],
    typical_categories: ['outer_wall', 'outer_curtain', 'vertical_pillar', 'x_banner_static', 'route_banner', 'ceiling_hanging', 'i_banner'],
    scale: 'mega',
    is_international: true,
  },
  {
    series_id: 'kme',
    name: 'KOREA MICE EXPO',
    name_en: 'KME',
    description: '국제 MICE 산업 박람회. EZPMP 자체 행사. 송도 컨벤시아·아트센터 인천 활용.',
    default_venue_key: 'songdo_convensia',
    default_hall_keys: ['songdo_premier_ballroom', 'songdo_exhibition_hall_1_2'],
    is_recurring: true,
    known_instances: [
      { code: '183000-1', year: 2018, venue_key: 'songdo_convensia', notes: 'KME 2018 환영리셉션 별도 발주' },
      { code: '193100', year: 2019, venue_key: 'songdo_convensia', notes: 'KME 2019 — 송도 + 아트센터 인천' },
    ],
    typical_program_parts: ['40.04', '40.05', '40.06', '40.07', '40.08', '40.17', '40.18', '40.19'],
    typical_categories: ['outer_wall', 'outer_curtain', 'vertical_pillar', 'streetlight', 'x_banner_static', 'route_banner', 'podium_title', 'water_banner', 'vehicle_q_bang'],
    scale: 'mega',
    is_international: true,
    notes: 'EZPMP 자체 진행 행사 — 회사 표준 발주 패턴 학습 핵심',
  },
  {
    series_id: 'smart_country_expo',
    name: '스마트국토엑스포',
    name_en: 'Smart Geospatial Expo',
    description: '국토교통부 주최 스마트 국토·공간정보 박람회.',
    default_venue_key: 'coex',
    default_hall_keys: ['coex_hall_d2'],
    is_recurring: true,
    known_instances: [
      { code: '183080', year: 2018, venue_key: 'coex', notes: '코엑스 D2홀' },
      { code: '193700', year: 2019, venue_key: 'coex' },
      { code: '222020', year: 2022, venue_key: 'kintex', notes: '킨텍스 5홀 이동 (2022)' },
      { code: '252xxx', year: 2025, notes: '2025년 회차 (학습 데이터 미확보)' },
    ],
    typical_program_parts: ['40.04', '40.05', '40.08', '40.18'],
    typical_categories: ['outer_curtain', 'outer_wall', 'vertical_pillar', 'x_banner_static', 'route_banner', 'podium_title', 'i_banner'],
    scale: 'large',
    is_international: false,
  },
  {
    series_id: 'wsce',
    name: '월드 스마트시티 엑스포 / 위크',
    name_en: 'World Smart City Expo / Week',
    description: '국토부·LH 등 스마트시티 박람회. 격년 또는 연 1회.',
    is_recurring: true,
    known_instances: [
      { code: '182070', year: 2018, notes: '제2회 월드 스마트시티 위크' },
      { code: '222020', year: 2022, notes: '제6회 WSCE 2022' },
    ],
    typical_program_parts: ['40.04', '40.05', '40.08'],
    typical_categories: ['outer_wall', 'ceiling_hanging', 'x_banner_static', 'route_banner', 'i_banner'],
    scale: 'large',
    is_international: true,
  },
  {
    series_id: 'iucn_jeju',
    name: 'IUCN 제주 리더스포럼',
    name_en: 'IUCN Jeju Leaders Forum',
    description: '제주 IUCN 환경 리더스포럼. 격년.',
    default_venue_key: 'icc_jeju',
    is_recurring: true,
    known_instances: [
      { code: '223060', year: 2022, venue_key: 'icc_jeju' },
    ],
    typical_program_parts: ['40.04', '40.08', '40.17'],
    typical_categories: ['outer_curtain', 'podium_title', 'x_banner_static', 'photo_wall'],
    scale: 'large',
    is_international: true,
  },

  // ========== 회사 자체 진행 행사 (반복 가능) ==========
  {
    series_id: 'spp_content',
    name: 'SPP 국제콘텐츠마켓',
    name_en: 'SPP Content Market',
    description: '국제 콘텐츠 거래 마켓. 그랜드하얏트서울 진행.',
    default_venue_key: 'grand_hyatt_seoul',
    default_hall_keys: ['hyatt_grand_ballroom', 'hyatt_foyer', 'hyatt_salon', 'hyatt_namsan_hall'],
    is_recurring: true,
    known_instances: [
      { code: '245006', year: 2024, venue_key: 'grand_hyatt_seoul', notes: 'SPP 2024 — 47종 카탈로그 풀' },
    ],
    typical_program_parts: ['40.04', '40.06', '40.07', '40.18'],
    typical_categories: ['outer_curtain', 'vertical_pillar', 'x_banner_static', 'route_banner', 'podium_title', 'form_board_pop', 'photo_wall', 'did_signage', 'badge_lanyard', 'name_plate'],
    scale: 'large',
    is_international: true,
    notes: '47종 풀 카탈로그 = 호텔 행사 표준 시안 풀 후보 (14종 마스터 보강 의제)',
  },

  // ========== 1회성 대형 행사 ==========
  {
    series_id: 'mar_1_centennial',
    name: '제100주년 3.1절 중앙기념식',
    description: '광화문 광장 3.1절 100주년 행사.',
    default_venue_key: 'gwanghwamun_square',
    is_recurring: false,
    known_instances: [
      { code: '192000', year: 2019 },
    ],
    typical_program_parts: ['40.08', '40.20'],
    typical_categories: ['outer_curtain', 'streetlight', 'gate'],
    scale: 'mega',
    is_international: false,
    notes: '광화문광장 야외 대형 국가행사. 학습 데이터 59 파일',
  },
  {
    series_id: 'apec_sme',
    name: 'APEC 중소기업 장관회의',
    name_en: 'APEC SME Ministers Meeting',
    description: 'APEC 중소기업 장관회의 2025.',
    is_recurring: false,
    known_instances: [
      { code: '251004', year: 2025, area_sqm: 15218 },
    ],
    typical_program_parts: ['40.04', '40.08', '40.17'],
    typical_categories: ['outer_curtain', 'outer_wall', 'podium_title', 'x_banner_static'],
    scale: 'mega',
    is_international: true,
  },
  {
    series_id: 'ad_asia',
    name: '아시아광고대회',
    name_en: 'AdAsia',
    description: '아시아 광고 컨퍼런스. 3년 주기 한국 개최.',
    default_venue_key: 'coex',
    is_recurring: true,
    known_instances: [
      { code: '231004', year: 2023, venue_key: 'coex', notes: '제33차 AdAsia 2023 Seoul' },
    ],
    typical_program_parts: ['40.04', '40.08'],
    typical_categories: ['outer_curtain', 'vertical_pillar', 'x_banner_static', 'podium_title'],
    scale: 'mega',
    is_international: true,
  },
  {
    series_id: 'next_rise',
    name: 'NextRise',
    description: '스타트업·테크 컨퍼런스.',
    is_recurring: true,
    known_instances: [
      { code: '221030', year: 2022, notes: 'NextRise 2022 Seoul' },
    ],
    typical_program_parts: ['40.04', '40.05', '40.06'],
    typical_categories: ['outer_wall', 'x_banner_static', 'route_banner', 'photo_wall', 'did_signage'],
    scale: 'large',
    is_international: true,
  },
  {
    series_id: 'gov_innovation',
    name: '대한민국 정부혁신박람회',
    description: '행정안전부 주최 정부혁신 박람회.',
    is_recurring: true,
    known_instances: [
      { code: '191400', year: 2019, notes: '제1회' },
    ],
    typical_program_parts: ['40.05', '40.08', '40.18'],
    typical_categories: ['outer_wall', 'vertical_pillar', 'x_banner_static', 'route_banner', 'i_banner'],
    scale: 'large',
    is_international: false,
  },
  {
    series_id: 'webtoon_job_festa',
    name: '웹툰 잡 페스타',
    description: '한국콘텐츠진흥원 웹툰 산업 박람회.',
    default_venue_key: 'coex',
    is_recurring: true,
    known_instances: [
      { code: '232030', year: 2023, area_sqm: 1579, venue_key: 'coex' },
    ],
    typical_program_parts: ['40.05', '40.06'],
    typical_categories: ['x_banner_static', 'route_banner', 'form_board_pop', 'photo_wall'],
    scale: 'medium',
    is_international: false,
  },
  {
    series_id: 'content_ip_market',
    name: '콘텐츠 IP 마켓',
    description: '콘텐츠 지적재산권 마켓.',
    is_recurring: true,
    known_instances: [
      { code: '231009', year: 2023, area_sqm: 2149 },
    ],
    typical_program_parts: ['40.04', '40.06'],
    typical_categories: ['x_banner_static', 'route_banner', 'i_banner'],
    scale: 'medium',
    is_international: true,
  },
  {
    series_id: 'circular_economy_festa',
    name: '대한민국 순환경제 페스티벌',
    description: '환경부 주최 순환경제 박람회.',
    is_recurring: true,
    known_instances: [
      { code: '232033', year: 2023, area_sqm: 6729 },
    ],
    typical_program_parts: ['40.05', '40.08'],
    typical_categories: ['outer_wall', 'outer_curtain', 'x_banner_static', 'photo_wall'],
    scale: 'large',
    is_international: false,
  },
  {
    series_id: 'leaders_forum',
    name: '세계리더스보전포럼 (WLCF)',
    name_en: 'World Leaders Conservation Forum',
    description: '제주 세계리더스보전포럼. IUCN 연계.',
    default_venue_key: 'icc_jeju',
    is_recurring: true,
    known_instances: [
      { code: '183060', year: 2018, venue_key: 'icc_jeju', notes: '제2회 WLCF 2018' },
    ],
    typical_program_parts: ['40.04', '40.08'],
    typical_categories: ['outer_curtain', 'podium_title', 'x_banner_static'],
    scale: 'large',
    is_international: true,
  },
  {
    series_id: 'bixpo',
    name: 'BIXPO',
    description: '한국전력 빛가람 국제 전력기술 엑스포.',
    default_venue_key: 'kdj_convention',
    is_recurring: true,
    known_instances: [
      { code: '183300-1', year: 2018 },
    ],
    typical_program_parts: ['40.05', '40.04'],
    typical_categories: ['outer_curtain', 'outer_wall', 'x_banner_static', 'route_banner'],
    scale: 'large',
    is_international: true,
  },
  {
    series_id: 'lh_gbc',
    name: '글로벌 코리아 박람회 LH GBC',
    description: 'LH 전시부스·LH 로드쇼.',
    is_recurring: false,
    known_instances: [
      { code: '202140-1', year: 2020 },
    ],
    typical_program_parts: ['40.05'],
    typical_categories: ['x_banner_static', 'form_board_pop'],
    scale: 'medium',
    is_international: false,
  },
  {
    series_id: 'agri_int_coop',
    name: '국제농업협력 정책 홍보 행사',
    description: '농림축산식품부 국제농업협력 박람회.',
    is_recurring: false,
    known_instances: [
      { code: '242008', year: 2024 },
    ],
    typical_program_parts: ['40.05', '40.08', '40.20'],
    typical_categories: ['outer_wall', 'x_banner_static', 'photo_wall'],
    scale: 'medium',
    is_international: true,
  },
  {
    series_id: 'central_asia_forum',
    name: '제17차 한-중앙아 협력 포럼',
    description: '한-중앙아시아 협력 포럼.',
    is_recurring: false,
    known_instances: [
      { code: '241014', year: 2024 },
    ],
    typical_program_parts: ['40.04', '40.17'],
    typical_categories: ['outer_curtain', 'podium_title', 'x_banner_static'],
    scale: 'medium',
    is_international: true,
  },
  {
    series_id: 'asean_korea',
    name: '한아세안 특별정상회의 연계 국민참여행사',
    description: '한아세안 정상회의 연계 행사 (부산).',
    is_recurring: false,
    known_instances: [
      { code: '193970', year: 2019, notes: '부산 추정' },
    ],
    typical_program_parts: ['40.08', '40.10', '40.20'],
    typical_categories: ['outer_wall', 'outer_curtain', 'streetlight', 'photo_wall'],
    scale: 'mega',
    is_international: true,
  },
  {
    series_id: 'climate_2035',
    name: '2035 국가 온실가스 감축목표 대국민 공개 논의',
    description: '환경부 2035 NDC 대국민 공개 논의.',
    is_recurring: false,
    known_instances: [
      { code: '251015', year: 2025 },
    ],
    typical_program_parts: ['40.04', '40.18'],
    typical_categories: ['x_banner_static', 'photo_wall'],
    scale: 'small',
    is_international: false,
  },
  {
    series_id: 'env_diplomacy',
    name: '환경 협력 네트워크 구축 주한공관장 초청 간담회',
    description: '환경부 주한공관장 초청 간담회.',
    is_recurring: false,
    known_instances: [
      { code: '252016', year: 2025, area_sqm: 430.3 },
    ],
    typical_program_parts: ['40.17', '40.04'],
    typical_categories: ['podium_title', 'x_banner_static', 'name_plate', 'triangle_nameplate'],
    scale: 'small',
    is_international: true,
  },
  {
    series_id: 'fair_economy',
    name: '공정경제 전략회의',
    description: '공정거래위원회 공정경제 전략회의.',
    is_recurring: false,
    known_instances: [
      { code: '182090', year: 2018 },
    ],
    typical_program_parts: ['40.04', '40.17'],
    typical_categories: ['podium_title', 'x_banner_static', 'i_banner'],
    scale: 'small',
    is_international: false,
  },
  {
    series_id: 'korea_tourism_forum',
    name: '한반도관광포럼',
    description: '한국관광공사 한반도 관광 포럼.',
    is_recurring: false,
    known_instances: [
      { code: '193980', year: 2019 },
    ],
    typical_program_parts: ['40.04', '40.05'],
    typical_categories: ['x_banner_static', 'photo_wall'],
    scale: 'medium',
    is_international: true,
  },
]

/** 시리즈 검색 — 행사명 fuzzy 매칭 */
export function findEventSeries(eventName: string): EventSeriesV2 | null {
  const lower = eventName.toLowerCase().trim()

  // 영문명·한글명 매칭
  for (const series of EVENT_SERIES_V2) {
    if (lower.includes(series.name.toLowerCase())) return series
    if (series.name_en && lower.includes(series.name_en.toLowerCase())) return series
  }

  return null
}

/** 행사 코드로 회차 찾기 */
export function findInstanceByCode(code: string): { series: EventSeriesV2; instance: EventSeriesV2['known_instances'][0] } | null {
  for (const series of EVENT_SERIES_V2) {
    const inst = series.known_instances.find(i => i.code === code)
    if (inst) return { series, instance: inst }
  }
  return null
}

/** 같은 시리즈의 이전 회차 누적 컨텍스트 */
export function getSeriesContext(seriesId: string, currentYear: number): EventSeriesV2['known_instances'] {
  const series = EVENT_SERIES_V2.find(s => s.series_id === seriesId)
  if (!series) return []
  return series.known_instances.filter(i => i.year < currentYear).sort((a, b) => b.year - a.year)
}
