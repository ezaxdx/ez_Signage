// v3 AI 추천 로직 — 10 카테고리 SOT (2026-05-18)
//
// 출처: 5/18 PO 명시 본인 정리 §7-2 (v3 시드 10 카테고리)
// 변경: v2 15종 + pending 9 + pending 11 = 35 카테고리 → v3 10 카테고리
//
// 적용 절차:
//   1. recommendSignage.ts에서 v2 → v3 점진 교체
//   2. classifyCategoryV3로 10 카테고리 외 명칭 자동 매핑
//   3. 자동 누적 학습 사이클 (accumulatedContext.ts) 정합

import {
  SignageCategoryV3,
  SIGNAGE_CATEGORIES_V3,
  SignageCategoryKey,
  classifyCategoryV3,
  isExcludedCategory,
} from '@/lib/data/v3/signageCategoriesSeedV3'

// ========== 입력·출력 타입 ==========

export interface RecommendInputV3 {
  /** L1 행사장 키 */
  venue_key: string
  /** L2 상세 행사장·홀 (선택) */
  hall_key?: string
  /** 프로그램 파트 다중 (1순위 매칭 키) */
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
  /** 행사장 12항목 메타 */
  venue_specs?: {
    area_sqm?: number
    ceiling_height_m?: number
    allowed_categories?: SignageCategoryKey[]
    denied_categories?: SignageCategoryKey[]
    size_constraints?: string
  }
  /** 도면 분석 결과 */
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
  }
}

export interface RecommendItemV3 {
  category: SignageCategoryKey
  category_label: string
  program_part: string
  location: string
  size_mm: { width: number; height: number }
  quantity: number
  rationale: string
  safety_flags: {
    no_data_flag?: boolean
    facility_violation?: boolean
    size_out_of_range?: boolean
    is_fallback?: boolean
  }
  match_info: {
    part_match_rate: number
    facility_check: 'allowed' | 'denied' | 'unknown'
    quantity_formula: string
  }
}

export interface RecommendResultV3 {
  items: RecommendItemV3[]
  coverage: {
    venue_key: string
    filled_categories: SignageCategoryKey[]
    missing_categories: SignageCategoryKey[]
  }
  safety_summary: {
    total_items: number
    no_data_count: number
    violation_count: number
    fallback_used: boolean
  }
}

// ========== 프로그램 파트 → 카테고리 매핑 ==========

/** 노션 컴펌 본 §6-3 정합 — 손피켓 가로 기본 (5/7 결정) → a4_landscape·a3_landscape */
export const PROGRAM_PART_RECOMMENDATION: Record<string, Array<{ category: SignageCategoryKey; avg_quantity: number }>> = {
  '회의': [
    { category: 'podium', avg_quantity: 1 },
    { category: 'a4_landscape', avg_quantity: 20 },
    { category: 'a3_landscape', avg_quantity: 1 },
  ],
  '전시': [
    { category: 'x_banner', avg_quantity: 46 },
    { category: 'route_banner', avg_quantity: 15 },
  ],
  '비즈니스 매칭': [
    { category: 'podium', avg_quantity: 1 },
    { category: 'a4_landscape', avg_quantity: 12 },
  ],
  '비즈니스 프로그램': [
    { category: 'x_banner', avg_quantity: 10 },
    { category: 'a4_landscape', avg_quantity: 20 },
  ],
  '공식행사': [
    { category: 'chunchen_banner', avg_quantity: 1 },
    { category: 'podium', avg_quantity: 1 },
    { category: 'a4_landscape', avg_quantity: 20 },
    { category: 'a3_landscape', avg_quantity: 2 },
    { category: 'horizontal_banner', avg_quantity: 2 },
  ],
  '부대행사 - 공모전형': [
    { category: 'a3_landscape', avg_quantity: 4 },
    { category: 'x_banner', avg_quantity: 7 },
  ],
  '부대행사 - 체험형': [
    { category: 'x_banner', avg_quantity: 7 },
  ],
  '부대행사 - 투어형': [
    { category: 'horizontal_banner', avg_quantity: 7 },
    { category: 'a3_landscape', avg_quantity: 1 },
  ],
  '의전': [
    { category: 'horizontal_banner', avg_quantity: 2 },
    { category: 'a3_landscape', avg_quantity: 9 },
    { category: 'podium', avg_quantity: 1 },
  ],
  '등록': [
    { category: 'x_banner', avg_quantity: 10 },
    { category: 'route_banner', avg_quantity: 7 },
  ],
  '영접영송': [
    { category: 'a3_landscape', avg_quantity: 2 },
    { category: 'a4_landscape', avg_quantity: 6 },
  ],
  '홍보': [
    { category: 'x_banner', avg_quantity: 20 },
    { category: 'route_banner', avg_quantity: 10 },
    { category: 'i_banner', avg_quantity: 4 },
    { category: 'horizontal_banner', avg_quantity: 2 },
  ],
}

// ========== 추천 함수 ==========

/** 1순위: 프로그램 파트 → 카테고리 후보 추출 */
export function matchByPartV3(programParts: string[]): Array<{ category: SignageCategoryV3; avg_quantity: number; part: string }> {
  const results: Array<{ category: SignageCategoryV3; avg_quantity: number; part: string }> = []
  for (const part of programParts) {
    const recommendations = PROGRAM_PART_RECOMMENDATION[part]
    if (!recommendations) continue
    for (const rec of recommendations) {
      const cat = SIGNAGE_CATEGORIES_V3.find(c => c.key === rec.category)
      if (cat) {
        results.push({ category: cat, avg_quantity: rec.avg_quantity, part })
      }
    }
  }
  return results
}

/** 2순위: 시설 가이드 위반 검사 */
export function checkFacilityV3(
  category: SignageCategoryKey,
  venueSpecs?: RecommendInputV3['venue_specs']
): 'allowed' | 'denied' | 'unknown' {
  if (!venueSpecs) return 'unknown'
  if (venueSpecs.denied_categories?.includes(category)) return 'denied'
  if (venueSpecs.allowed_categories?.includes(category)) return 'allowed'
  return 'unknown'
}

/** 3순위: 수량 산출 공식 (face value·누적 학습으로 점진 정확) */
export function calculateQuantityV3(
  defaultQuantity: number,
  category: SignageCategoryKey,
  event: RecommendInputV3['event'],
  accumulated_context?: RecommendInputV3['accumulated_context']
): { quantity: number; formula: string } {
  // 누적 학습 데이터 우선
  if (accumulated_context?.venue_history) {
    const venueRec = accumulated_context.venue_history.find(h => h.category === category)
    if (venueRec && venueRec.usage_rate > 0.5) {
      return { quantity: Math.round(venueRec.avg_quantity), formula: `같은 행사장 누적 평균 (${venueRec.avg_quantity.toFixed(1)}·신뢰 ${(venueRec.usage_rate * 100).toFixed(0)}%)` }
    }
  }
  // X배너 = 참가자 ÷ 300 + 1 (5/14 회의 결정)
  if (category === 'x_banner' && event.expected_attendees) {
    const qty = Math.ceil(event.expected_attendees / 300) + 1
    return { quantity: qty, formula: `참가자 ${event.expected_attendees} ÷ 300 + 1 = ${qty}` }
  }
  // 기본값
  return { quantity: defaultQuantity, formula: `프로그램 파트 기본 평균 ${defaultQuantity}` }
}

/** 4단 안전망 - 출력 검증 + safety_flags 부착 */
export function validateAndFixV3(
  items: RecommendItemV3[],
  input: RecommendInputV3
): RecommendItemV3[] {
  return items.map(item => {
    const cat = SIGNAGE_CATEGORIES_V3.find(c => c.key === item.category)
    if (!cat) {
      return { ...item, safety_flags: { ...item.safety_flags, no_data_flag: true } }
    }
    const { width, height } = item.size_mm
    const { width: defW, height: defH } = cat.default_size_mm
    const tolerance = 0.3
    const sizeOk =
      Math.abs(width - defW) / defW <= tolerance &&
      Math.abs(height - defH) / defH <= tolerance
    return {
      ...item,
      safety_flags: {
        ...item.safety_flags,
        size_out_of_range: !sizeOk,
      },
    }
  })
}

/** 4단 안전망 - 실패 시 룰베이스 fallback */
export function buildFallbackRecommendationV3(input: RecommendInputV3): RecommendResultV3 {
  const items: RecommendItemV3[] = []
  for (const part of input.program_parts) {
    const recommendations = PROGRAM_PART_RECOMMENDATION[part] || []
    for (const rec of recommendations) {
      const cat = SIGNAGE_CATEGORIES_V3.find(c => c.key === rec.category)
      if (!cat) continue
      const { quantity, formula } = calculateQuantityV3(rec.avg_quantity, rec.category, input.event, input.accumulated_context)
      items.push({
        category: rec.category,
        category_label: cat.label,
        program_part: part,
        location: '미정 (도면 분석 미수행)',
        size_mm: cat.default_size_mm,
        quantity,
        rationale: `[Fallback] ${formula}`,
        safety_flags: { is_fallback: true },
        match_info: {
          part_match_rate: 100,
          facility_check: checkFacilityV3(rec.category, input.venue_specs),
          quantity_formula: formula,
        },
      })
    }
  }
  const allCategories = SIGNAGE_CATEGORIES_V3.map(c => c.key)
  const filled = Array.from(new Set(items.map(i => i.category)))
  const missing = allCategories.filter(k => !filled.includes(k))
  return {
    items,
    coverage: { venue_key: input.venue_key, filled_categories: filled, missing_categories: missing },
    safety_summary: {
      total_items: items.length,
      no_data_count: 0,
      violation_count: 0,
      fallback_used: true,
    },
  }
}

/** 10 카테고리 외 명칭 → 매핑 룰 적용 */
export function applyMappingRuleV3(rawCategoryName: string): SignageCategoryV3 | null {
  if (isExcludedCategory(rawCategoryName)) return null
  return classifyCategoryV3(rawCategoryName)
}
