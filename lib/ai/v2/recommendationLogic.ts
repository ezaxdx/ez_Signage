// v2 AI 추천 로직 — 3단계 우선순위 + 4단 안전망 (2026-05-15)
//
// 출처: 5/14 회의 결정 사항 (김연아 대리님·CCO·조기흠)
// SOT: docs/NEW_STRUCTURE_260514.md §4
//
// 적용 절차:
//   1. 컴펌 후 recommendSignage.ts에서 본 로직으로 교체
//   2. 추천 호출 시 입력: 행사장(L1) + 프로그램 파트(다중) + 도면(선택)
//   3. 출력: 환경장식물 추천 리스트 + safety_flags

import {
  SignageCategoryV2,
  SIGNAGE_CATEGORIES_V2,
  getConfirmedCategories,
  findCategoryByKey,
  SignageCategoryKey,
} from '@/lib/data/v2/signageCategoriesSeed'

// ========== 입력·출력 타입 ==========

export interface RecommendInputV2 {
  /** L1 행사장 키 */
  venue_key: string
  /** L2 상세 행사장/홀 (선택) */
  hall_key?: string
  /** 프로그램 파트 (다중) — 1순위 매칭 키 */
  program_parts: string[]
  /** 행사 메타 */
  event: {
    name: string
    date: string
    expected_attendees: number
    is_international?: boolean
    has_vip?: boolean
    session_count?: number
    shuttle_count?: number
  }
  /** 행사장 12항목 메타 (있으면 활용) */
  venue_specs?: {
    area_sqm?: number
    ceiling_height_m?: number
    allowed_categories?: SignageCategoryKey[]
    denied_categories?: SignageCategoryKey[]
    size_constraints?: string
  }
  /** 도면 분석 결과 (도면 첨부 시 ② 도면 분석 AI 출력) */
  floor_plan_analysis?: {
    entrance_locations: string[]
    main_route: string
    installable_areas: string[]
    forbidden_areas: string[]
  }
  /** 누적 학습 컨텍스트 (같은 행사장·파트 과거 사례) */
  accumulated_context?: {
    venue_history: Array<{ category: SignageCategoryKey; avg_quantity: number; usage_rate: number }>
    part_history: Array<{ category: SignageCategoryKey; avg_quantity: number; usage_rate: number }>
    series_history?: Array<{ event_code: string; year: number; categories: SignageCategoryKey[] }>
  }
}

export interface RecommendItemV2 {
  category: SignageCategoryKey
  category_label: string
  program_part: string
  location: string
  size_mm: { width: number; height: number }
  quantity: number
  rationale: string
  /** 안전망 플래그 */
  safety_flags: {
    /** 학습 데이터 부재로 인한 추천 없음 */
    no_data_flag?: boolean
    /** 행사장 시설 제약 위반 */
    facility_violation?: boolean
    /** 사이즈가 typical_size 범위 밖 */
    size_out_of_range?: boolean
    /** AI 응답 실패 fallback */
    is_fallback?: boolean
  }
  /** 우선순위 매칭 결과 */
  match_info: {
    /** 1순위: 프로그램 파트 매칭률 (0~100) */
    part_match_rate: number
    /** 2순위: 시설 가이드 위반 여부 */
    facility_check: 'allowed' | 'denied' | 'unknown'
    /** 3순위: 면적·참가자 기반 산출 공식 */
    quantity_formula: string
  }
}

export interface RecommendResultV2 {
  items: RecommendItemV2[]
  /** 행사장 × 카테고리 학습 보유 매트릭스 */
  coverage: {
    venue_key: string
    filled_categories: SignageCategoryKey[]
    missing_categories: SignageCategoryKey[]
  }
  /** 4단 안전망 결과 */
  safety_summary: {
    total_items: number
    no_data_items: number
    facility_violation_items: number
    fallback_used: boolean
  }
  /** 도면 분석 사용 여부 */
  floor_plan_used: boolean
}

// ========== 1순위: 프로그램 파트 매칭 ==========

/** 프로그램 파트 → 권장 카테고리 매핑 (학습 데이터 + 회의 결정 기반) */
export const PART_CATEGORY_MAPPING: Record<string, SignageCategoryKey[]> = {
  // 회의·전시 파트
  '40.04': ['outer_wall', 'outer_curtain', 'vertical_pillar', 'x_banner_static', 'route_banner', 'podium_title', 'i_banner'],  // 회의
  '40.05': ['outer_wall', 'outer_curtain', 'ceiling_hanging', 'vertical_pillar', 'x_banner_static', 'route_banner', 'i_banner', 'gate'],  // 전시
  '40.06': ['x_banner_static', 'route_banner', 'form_board_pop', 'i_banner'],  // 비즈니스 매칭
  '40.07': ['outer_wall', 'x_banner_static', 'route_banner', 'podium_title'],  // 비즈니스 프로그램
  '40.08': ['outer_wall', 'outer_curtain', 'vertical_pillar', 'podium_title', 'photo_wall', 'x_banner_static'],  // 공식행사
  '40.09': ['x_banner_static', 'route_banner', 'form_board_pop'],  // 공모전형
  '40.10': ['x_banner_static', 'route_banner', 'form_board_pop', 'floor_sticker'],  // 체험형
  '40.11': ['x_banner_static', 'route_banner', 'gate', 'water_banner', 'vehicle_q_bang'],  // 투어형
  // 참가자 응대 파트
  '40.17': ['outer_curtain', 'podium_title', 'x_banner_static', 'photo_wall'],  // 의전
  '40.18': ['x_banner_static', 'route_banner', 'form_board_pop'],  // 등록
  '40.19': ['gate', 'water_banner', 'vehicle_q_bang', 'route_banner'],  // 영접영송
  // 홍보 파트
  '40.20': ['outer_wall', 'outer_curtain', 'streetlight', 'gate', 'photo_wall'],  // 홍보
}

/** 매칭 등급 (SOT §4.1 — 5/14 회의 결정 3분류) */
export type MatchTier = 'stable' | 'review' | 'excluded'

/**
 * 1순위: 프로그램 파트 매칭 — 사용자 선택 파트 다중 → 후보 카테고리 추출
 *
 * SOT §4.1 (5/14 회의 결정):
 *   - 매칭률 ≥ 70% = 안정 추천 (stable)
 *   - 30% ≤ 매칭률 < 70% = 검토 권고 (review)
 *   - 매칭률 < 30% = 제외 (excluded, 반환하지 않음)
 */
export function matchByPart(
  parts: string[]
): Array<{ category: SignageCategoryKey; match_rate: number; tier: MatchTier }> {
  const candidates = new Map<SignageCategoryKey, number>()  // category → 매칭된 파트 수

  for (const part of parts) {
    const cats = PART_CATEGORY_MAPPING[part] || []
    for (const cat of cats) {
      candidates.set(cat, (candidates.get(cat) || 0) + 1)
    }
  }

  // 매칭률 = (해당 카테고리를 권장한 파트 수) / (전체 선택 파트 수)
  const results: Array<{ category: SignageCategoryKey; match_rate: number; tier: MatchTier }> = []
  for (const [cat, count] of Array.from(candidates.entries())) {
    const rate = parts.length > 0 ? (count / parts.length) * 100 : 0
    if (rate < 30) continue  // SOT §4.1 — 30% 미만 = 제외 (반환 X)
    const tier: MatchTier = rate >= 70 ? 'stable' : 'review'
    results.push({ category: cat, match_rate: rate, tier })
  }

  // 매칭률 내림차순
  return results.sort((a, b) => b.match_rate - a.match_rate)
}

// ========== 2순위: 행사장 시설 가이드 위반 검사 ==========

/**
 * 2순위: 행사장 시설 가이드 제약 — 가능/불가/미학습 분류
 * @returns 'allowed' / 'denied' / 'unknown' (학습 데이터 부재)
 */
export function checkFacility(
  category: SignageCategoryKey,
  venueSpecs: RecommendInputV2['venue_specs']
): 'allowed' | 'denied' | 'unknown' {
  if (!venueSpecs) return 'unknown'

  if (venueSpecs.denied_categories?.includes(category)) return 'denied'
  if (venueSpecs.allowed_categories?.includes(category)) return 'allowed'

  return 'unknown'
}

// ========== 3순위: 수량 산출 공식 ==========

/**
 * 3순위: 행사장 면적 + 참가자 수 + 카테고리 기본 공식 → 수량 산출
 */
export function calculateQuantity(
  category: SignageCategoryV2,
  input: RecommendInputV2
): { quantity: number; formula: string } {
  const { event, venue_specs, floor_plan_analysis } = input
  const attendees = event.expected_attendees
  const area = venue_specs?.area_sqm || 0
  const sessions = event.session_count || 1
  const shuttles = event.shuttle_count || 0

  switch (category.key) {
    case 'outer_wall':
      return { quantity: 1, formula: '주출입구 수 × 1' }
    case 'outer_curtain':
      return { quantity: 1, formula: '외벽 전면 수 × 1' }
    case 'vertical_pillar': {
      const pillars = Math.max(4, Math.min(8, Math.floor(area / 1500)))
      return { quantity: pillars, formula: `로비 기둥 수 = max(4, min(8, area÷1500)) = ${pillars}` }
    }
    case 'streetlight': {
      const count = Math.min(50, Math.max(20, Math.floor(attendees / 50)))
      return { quantity: count, formula: `참가자 ÷ 50 (20~50 범위) = ${count}` }
    }
    case 'gate':
      return { quantity: floor_plan_analysis?.entrance_locations?.length || 2, formula: '게이트 수' }
    case 'x_banner_static': {
      // SOT §4.1: "참가자 ÷ 300 + 1 (최소 2)" — 5/14 회의 결정
      // 학습 결과 (BCWW·KME·SPP): 등록데스크 + 룸사인 = 참가자 300당 약 1개
      const desks = Math.max(2, Math.ceil(attendees / 300) + 1)
      return { quantity: desks, formula: `참가자÷300 + 1 (최소 2) = ${desks}` }
    }
    case 'route_banner': {
      // 학습 결과: 동선 비율 약 35% → 참가자 ÷ 200 + 홀 분리 가산
      const base = Math.ceil(attendees / 200)
      const hallSplit = (input.hall_key || '').split(',').length
      const total = base + hallSplit
      return { quantity: total, formula: `참가자÷200 + 홀 분리 수 = ${base} + ${hallSplit} = ${total}` }
    }
    case 'i_banner':
      return { quantity: 2, formula: '인포데스크 × 1~2 (기본 2)' }
    case 'ceiling_hanging': {
      if (!venue_specs?.ceiling_height_m || venue_specs.ceiling_height_m < 5) {
        return { quantity: 0, formula: '천장고 5m 미만 = 0' }
      }
      const count = Math.floor(area / 1000)
      return { quantity: count, formula: `홀 면적 ÷ 1000 (천장고 5m 이상) = ${count}` }
    }
    case 'podium_title':
      return { quantity: sessions * 2, formula: `세션 수 × 2 (사회자+연사) = ${sessions * 2}` }
    case 'form_board_pop':
      return { quantity: 10, formula: '룸 수 + 안내 포인트 수 (기본 10)' }
    case 'water_banner':
      return { quantity: Math.min(shuttles, 3), formula: '셔틀 정거장 수 × 1 (최대 3)' }
    case 'vehicle_q_bang':
      return { quantity: shuttles, formula: '셔틀 차량 수 × 1' }
    case 'floor_sticker':
      return { quantity: 6, formula: '동선 분기점 수 × 1 (기본 6)' }
    case 'window_sticker':
      return { quantity: 4, formula: '문 수 × 2 (입·출, 기본 2문)' }
    // pending 카테고리 (컴펌 후 활성화)
    case 'photo_wall':
      return { quantity: 1, formula: '메인 행사 × 1' }
    case 'did_signage':
      return { quantity: 0, formula: '행사장 기 보유 시 0 (확인 필요)' }
    case 'award_board':
      return { quantity: 0, formula: '시상 카테고리 수 (행사 유형에 따라)' }
    case 'stage_sidewing':
      return { quantity: 2, formula: '메인 무대 × 2 (좌·우)' }
    case 'badge_lanyard':
      return { quantity: attendees, formula: `참가자 수 × 1 = ${attendees}` }
    case 'table_number':
      return { quantity: 0, formula: '테이블 수 (행사 유형에 따라)' }
    case 'name_plate':
      return { quantity: sessions, formula: 'VIP·발표자 수 (세션 수 기준)' }
    case 'triangle_nameplate':
      return { quantity: 0, formula: '회의 참석자 수' }
    case 'pop_special':
      return { quantity: 0, formula: '특수 안내 포인트 수 (수동 입력)' }
    // 5/16 데이터허브 발견 11종 (pending — 이사님 결정 후 활성화)
    case 'ceiling_banner_oversized':
      return {
        quantity: venue_specs?.ceiling_height_m && (typeof venue_specs.ceiling_height_m === 'number' ? venue_specs.ceiling_height_m >= 8 : false) ? 2 : 0,
        formula: '천장고 8m 이상 시 메인 홀 × 2',
      }
    case 'truss':
      return { quantity: 1, formula: '메인 무대 × 1 (무대 폭 ÷ 4m 기본)' }
    case 'bridge':
      return { quantity: 1, formula: '메인 무대 × 1' }
    case 'podium_extended':
      return { quantity: sessions * 4, formula: `세션 수 × 4 (직급별 분리) = ${sessions * 4}` }
    case 'seating_chart_board':
      return { quantity: 2, formula: '주출입구 × 1 (기본 2)' }
    case 'operation_guide':
      return { quantity: 2, formula: '인포데스크 × 1 (기본 2)' }
    case 'award_board_extended':
      return { quantity: 0, formula: '시상 카테고리 × 1 (행사 유형에 따라)' }
    case 'welcome_board':
      return { quantity: event.has_vip ? 1 : 0, formula: 'VIP·해외 의전 행사 시 × 1' }
    case 'mou_banner':
      return { quantity: 0, formula: '협약 건수 × 1 (수동 입력)' }
    case 'newsroom_backboard':
      return { quantity: 1, formula: '기자회견 × 1' }
    case 'ambassador_curtain':
      return { quantity: event.is_international ? 1 : 0, formula: '국제 행사 + 홍보대사 활용 시 × 1' }
    default:
      return { quantity: 0, formula: '기본 공식 미정' }
  }
}

// ========== 4단 안전망 ==========

/**
 * ① 입력 강제 — Gemini 호출 시 responseSchema
 */
export const GEMINI_RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          category: { type: 'string', enum: SIGNAGE_CATEGORIES_V2.map(c => c.key) },
          program_part: { type: 'string' },
          location: { type: 'string' },
          size_mm: {
            type: 'object',
            properties: {
              width: { type: 'number' },
              height: { type: 'number' },
            },
            required: ['width', 'height'],
          },
          quantity: { type: 'number', minimum: 0 },
          rationale: { type: 'string' },
        },
        required: ['category', 'program_part', 'location', 'size_mm', 'quantity', 'rationale'],
      },
    },
  },
  required: ['items'],
}

/**
 * ② 후처리 검증 — AI 응답 검증·자동 정정
 */
export function validateAndFix(items: any[]): RecommendItemV2[] {
  return items
    .map((item: any) => {
      // 카테고리 키 검증
      const cat = findCategoryByKey(item.category)
      if (!cat) {
        return null  // 미매칭 카테고리는 제거
      }

      const flags: RecommendItemV2['safety_flags'] = {}

      // 사이즈 범위 검증
      const w = Number(item.size_mm?.width) || 0
      const h = Number(item.size_mm?.height) || 0
      if (
        w < cat.typical_size_mm.min_width ||
        w > cat.typical_size_mm.max_width ||
        h < cat.typical_size_mm.min_height ||
        h > cat.typical_size_mm.max_height
      ) {
        flags.size_out_of_range = true
      }

      // 수량 검증
      const q = Math.max(0, Math.floor(Number(item.quantity) || 0))

      const result: RecommendItemV2 = {
        category: cat.key,
        category_label: cat.label,
        program_part: String(item.program_part || ''),
        location: String(item.location || ''),
        size_mm: { width: w, height: h },
        quantity: q,
        rationale: String(item.rationale || ''),
        safety_flags: flags,
        match_info: {
          part_match_rate: 0,    // 후처리 단계에서 채움
          facility_check: 'unknown',
          quantity_formula: '',
        },
      }
      return result
    })
    .filter((x): x is RecommendItemV2 => x !== null)
}

/**
 * ③ 실패 fallback — Gemini 응답 실패 시 기본 추천 풀
 */
export function buildFallbackRecommendation(input: RecommendInputV2): RecommendItemV2[] {
  const fallback: RecommendItemV2[] = []
  const partMatched = matchByPart(input.program_parts)

  for (const { category: catKey, match_rate } of partMatched) {
    const cat = findCategoryByKey(catKey)
    if (!cat || cat.is_pending) continue  // pending 제외

    const { quantity, formula } = calculateQuantity(cat, input)
    if (quantity === 0) continue

    fallback.push({
      category: cat.key,
      category_label: cat.label,
      program_part: input.program_parts[0] || '',
      location: '[매뉴얼 확인 — 자동 추천 fallback]',
      size_mm: {
        width: cat.typical_size_mm.max_width,
        height: cat.typical_size_mm.max_height,
      },
      quantity,
      rationale: `[fallback] AI 응답 실패. 파트 매칭률 ${match_rate.toFixed(0)}% + 기본 공식 적용. 매뉴얼 확인 권장.`,
      safety_flags: { is_fallback: true },
      match_info: {
        part_match_rate: match_rate,
        facility_check: 'unknown' as const,
        quantity_formula: formula,
      },
    })
  }

  return fallback
}

/**
 * ④ 모니터링 — KPI 산출용 메트릭
 */
export interface RecommendationMetrics {
  /** 잘못된 응답 누적률 (전체 호출 중 fallback·error 비율) */
  error_rate: number
  /** 카테고리별 오답률 (사용자 정정 비율) */
  category_correction_rates: Record<SignageCategoryKey, number>
  /** 행사장별 정확도 */
  venue_accuracy: Record<string, number>
  /** 페르소나 자동 보강 큐 (3회 누적 시 알림) */
  persona_revision_queue: Array<{
    rule: string
    count: number
    last_seen: string
  }>
}

// ========== 메인 추천 흐름 ==========

/**
 * 3단계 우선순위 추천 — 1순위(파트) → 2순위(시설) → 3순위(수량)
 */
export function recommendV2(input: RecommendInputV2): RecommendResultV2 {
  const items: RecommendItemV2[] = []
  const allCategories = getConfirmedCategories()

  // 1순위: 프로그램 파트 매칭
  const partMatched = matchByPart(input.program_parts)

  for (const cat of allCategories) {
    const partMatch = partMatched.find(p => p.category === cat.key)
    const matchRate = partMatch?.match_rate || 0

    // 1순위 필터: 매칭률 30% 미만 = 제외
    if (matchRate < 30) continue

    // 2순위: 시설 가이드 검사
    const facilityCheck = checkFacility(cat.key, input.venue_specs)
    const flags: RecommendItemV2['safety_flags'] = {}
    let rationale = ''
    let location = ''

    if (facilityCheck === 'denied') {
      flags.facility_violation = true
      rationale = '[설치 불가 — 행사장 제약]'
    } else if (facilityCheck === 'unknown') {
      flags.no_data_flag = true
      rationale = '[추천 없음 — 학습 데이터 부재. 매뉴얼 확인 권장]'
    }

    // 3순위: 수량 산출
    const { quantity, formula } = calculateQuantity(cat, input)
    const finalQuantity = facilityCheck === 'denied' ? 0 : quantity

    // 도면 분석 결과 활용
    if (input.floor_plan_analysis && facilityCheck !== 'denied') {
      const fp = input.floor_plan_analysis
      switch (cat.key) {
        case 'x_banner_static':
        case 'route_banner':
          location = `로비·동선 분기점 (도면 분석: ${fp.main_route})`
          break
        case 'gate':
          location = fp.entrance_locations.join(', ')
          break
        case 'outer_wall':
        case 'outer_curtain':
          location = '행사장 외부 전면 (도면 분석 적용)'
          break
        default:
          location = fp.installable_areas[0] || '[수동 입력]'
      }
    } else {
      location = '[수동 입력 — 도면 첨부 시 자동 명세]'
    }

    items.push({
      category: cat.key,
      category_label: cat.label,
      program_part: input.program_parts[0] || '',
      location,
      size_mm: {
        width: Math.floor((cat.typical_size_mm.min_width + cat.typical_size_mm.max_width) / 2),
        height: Math.floor((cat.typical_size_mm.min_height + cat.typical_size_mm.max_height) / 2),
      },
      quantity: finalQuantity,
      rationale: rationale || `1순위 파트 매칭 ${matchRate.toFixed(0)}% + 3순위 ${formula}`,
      safety_flags: flags,
      match_info: {
        part_match_rate: matchRate,
        facility_check: facilityCheck,
        quantity_formula: formula,
      },
    })
  }

  // Coverage 계산
  const filled: SignageCategoryKey[] = (input.venue_specs?.allowed_categories || [])
  const missing: SignageCategoryKey[] = allCategories
    .map(c => c.key)
    .filter(k => !filled.includes(k))

  // Safety summary
  const safety_summary = {
    total_items: items.length,
    no_data_items: items.filter(i => i.safety_flags.no_data_flag).length,
    facility_violation_items: items.filter(i => i.safety_flags.facility_violation).length,
    fallback_used: items.some(i => i.safety_flags.is_fallback),
  }

  return {
    items,
    coverage: {
      venue_key: input.venue_key,
      filled_categories: filled,
      missing_categories: missing,
    },
    safety_summary,
    floor_plan_used: !!input.floor_plan_analysis,
  }
}

// ========== Gemini 통합 메인 함수 (5/14 회의 §4.1 흐름 정합) ==========

/**
 * 3단계 우선순위 + 4단 안전망 완전 통합 추천 — Gemini 2.5 Flash 호출
 *
 * 흐름:
 *   ① 입력 강제 (GEMINI_RESPONSE_SCHEMA + responseMimeType:'application/json')
 *   ② Gemini 호출 (3단계 우선순위를 SYSTEM_INSTRUCTION으로 주입)
 *   ③ 후처리 검증 (validateAndFix)
 *   ④ Gemini 실패 시 fallback (buildFallbackRecommendation)
 *
 * @param input 추천 입력
 * @param geminiApiKey 서버 측 GEMINI_API_KEY (process.env)
 */
export async function recommendV2WithGemini(
  input: RecommendInputV2,
  geminiApiKey: string
): Promise<RecommendResultV2> {
  // ① 룰베이스 기본값 — Gemini 실패 시 사용
  const ruleBased = recommendV2(input)

  if (!geminiApiKey) {
    // API 키 부재 → 룰베이스 그대로
    return {
      ...ruleBased,
      safety_summary: { ...ruleBased.safety_summary, fallback_used: true },
    }
  }

  // ② Gemini SYSTEM_INSTRUCTION — SOT §4.1 3단계 우선순위 그대로 주입
  const systemInstruction = `당신은 MICE 환경장식물 발주 전문가입니다. 5/14 회의 결정 사항에 따라 다음 3단계 우선순위로 추천하세요.

[1순위] 프로그램 파트 매칭
- 사용자 선택 파트(${input.program_parts.join(', ')})에 맞는 환경장식물만 추천
- 매칭률 ≥ 70% = 안정 추천 / 30% ≤ 매칭률 < 70% = 검토 권고 / 30% 미만 = 제외

[2순위] 행사장 시설 가이드 위반 여부
- 행사장 ${input.venue_key} 시설 제약 적용
- 위반 시 quantity=0 + "[설치 불가 — 행사장 제약]" rationale
- 학습 데이터 부재 시 quantity=0 + "[추천 없음 — 학습 데이터 부재]"

[3순위] 행사장 면적 + 참가자 수 기반 수량 산출
- X배너 = 참가자 ÷ 300 + 1 (최소 2)
- 포디움 타이틀 = 세션 수 × 2 (사회자+연사)
- 가로등 배너 = 참가자 ÷ 50 (20~50 범위)
- 천정 행잉 = 천장고 5m 이상 시 홀 면적 ÷ 1000

응답은 반드시 JSON 형식 — items 배열 안에 각 항목 {category, program_part, location, size_mm, quantity, rationale}.
카테고리 키는 24종 마스터(${SIGNAGE_CATEGORIES_V2.map(c => c.key).join(', ')}) 중에서만.`

  const userText = JSON.stringify({
    venue: input.venue_key,
    hall: input.hall_key,
    program_parts: input.program_parts,
    event: input.event,
    venue_specs: input.venue_specs,
    floor_plan_analysis: input.floor_plan_analysis,
    accumulated_context: input.accumulated_context,
    rule_based_baseline: ruleBased.items.map(i => ({
      category: i.category,
      quantity: i.quantity,
      formula: i.match_info.quantity_formula,
    })),
  })

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemInstruction }] },
          contents: [{ parts: [{ text: userText }] }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 4096,
            responseMimeType: 'application/json',
            responseSchema: GEMINI_RESPONSE_SCHEMA,
          },
        }),
      }
    )

    if (!response.ok) {
      throw new Error(`Gemini API ${response.status}: ${await response.text()}`)
    }

    const data = await response.json()
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
    if (!text) throw new Error('Gemini empty response')

    const parsed = JSON.parse(text)
    if (!Array.isArray(parsed.items)) throw new Error('Gemini items not array')

    // ③ 후처리 검증
    let validated = validateAndFix(parsed.items)

    // match_info 보강 — Gemini 응답에는 없음
    const partMatched = matchByPart(input.program_parts)
    validated = validated.map(item => {
      const partMatch = partMatched.find(p => p.category === item.category)
      const facility = checkFacility(item.category, input.venue_specs)
      const cat = findCategoryByKey(item.category)
      const formulaResult = cat ? calculateQuantity(cat, input) : { formula: '' }
      return {
        ...item,
        match_info: {
          part_match_rate: partMatch?.match_rate || 0,
          facility_check: facility,
          quantity_formula: formulaResult.formula,
        },
        safety_flags: {
          ...item.safety_flags,
          ...(facility === 'denied' ? { facility_violation: true } : {}),
          ...(facility === 'unknown' ? { no_data_flag: true } : {}),
        },
      }
    })

    return {
      items: validated,
      coverage: ruleBased.coverage,
      safety_summary: {
        total_items: validated.length,
        no_data_items: validated.filter(i => i.safety_flags.no_data_flag).length,
        facility_violation_items: validated.filter(i => i.safety_flags.facility_violation).length,
        fallback_used: false,
      },
      floor_plan_used: !!input.floor_plan_analysis,
    }
  } catch (err) {
    // ④ Gemini 실패 → fallback
    console.error('[recommendV2WithGemini] fallback:', err)
    const fallback = buildFallbackRecommendation(input)
    return {
      items: fallback.length > 0 ? fallback : ruleBased.items,
      coverage: ruleBased.coverage,
      safety_summary: {
        total_items: fallback.length || ruleBased.items.length,
        no_data_items: 0,
        facility_violation_items: 0,
        fallback_used: true,
      },
      floor_plan_used: false,
    }
  }
}
