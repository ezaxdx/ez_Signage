// v2 시드 통합 export — mice-design-guide 앱 활성화 진입점 (2026-05-15)
//
// 5/14 회의 결정 사항 반영 + 환경장식물 학습 데이터 적재 완료
// SOT: docs/NEW_STRUCTURE_260514.md
//
// 활성화 절차:
//   1. supabase/migration_v10_new_structure.sql 실행
//   2. 본 파일 import → 기존 lib/data/dashboardSeed.ts·signageCategoryStandards.ts 교체
//   3. lib/ai/v2/recommendationLogic.ts 활용 (recommendSignage.ts 교체)

export * from './signageCategoriesSeed'
export * from './venueListSeed'
export * from './eventSeriesSeed'
export * from './eventOrderListSeed'

// 통합 헬퍼
import { SIGNAGE_CATEGORIES_V2, getConfirmedCategories, getPendingCategories } from './signageCategoriesSeed'
import { VENUES_V2, getDataStatusCounts } from './venueListSeed'
import { EVENT_SERIES_V2 } from './eventSeriesSeed'
import { EVENT_ORDER_LISTS_V2, buildCoverageMatrix } from './eventOrderListSeed'

/** v2 시드 현황 요약 — 관리자 대시보드용 */
export function getV2SeedSummary() {
  const venueCounts = getDataStatusCounts()
  return {
    categories: {
      total: SIGNAGE_CATEGORIES_V2.length,
      confirmed: getConfirmedCategories().length,
      pending: getPendingCategories().length,
    },
    venues: venueCounts,
    event_series: {
      total: EVENT_SERIES_V2.length,
      recurring: EVENT_SERIES_V2.filter(s => s.is_recurring).length,
      one_time: EVENT_SERIES_V2.filter(s => !s.is_recurring).length,
    },
    event_orders: {
      total_events: EVENT_ORDER_LISTS_V2.length,
      total_order_rows: EVENT_ORDER_LISTS_V2.reduce((sum, e) => sum + e.order_rows.length, 0),
    },
    coverage_matrix_cells: Object.values(buildCoverageMatrix()).reduce(
      (sum, venue) => sum + Object.keys(venue).length,
      0
    ),
  }
}
