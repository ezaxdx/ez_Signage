/**
 * v4.1 단위 8 — parse_signage_lists_v4.mjs 결과 lookup 헬퍼
 *
 * 시드 SEED_EVENT_HISTORY를 직접 수정하지 않고 별도 매핑 제공.
 * (시드는 정형 데이터, v4 분석 결과는 동적 추출 결과 — 분리 보존)
 *
 * 사용:
 *   - 학습 큐 정렬 (도면 보유 우선) — /admin/learning
 *   - 행사장 카드 도면 보유 뱃지
 */

import analysisV4 from './_signage_analysis_v4.json'

interface V4Event {
  name: string
  has_floor_plan: boolean
  floor_plan_count: number
  program_parts: string[]
}

interface V4Analysis {
  generated_at: string
  total_events: number
  events_with_floor_plan: number
  events: V4Event[]
}

const data = analysisV4 as unknown as V4Analysis

// 행사명 정규화 (공백·기호 제거)
function normalize(s: string): string {
  return s.replace(/\s+/g, '').toLowerCase()
}

const indexByName = new Map<string, V4Event>()
for (const ev of data.events) {
  indexByName.set(normalize(ev.name), ev)
}

/** 행사명으로 도면 보유 여부 조회 (부분 매칭) */
export function hasFloorPlanForEvent(eventName: string | null | undefined): boolean {
  if (!eventName) return false
  const key = normalize(eventName)
  if (indexByName.has(key)) return indexByName.get(key)!.has_floor_plan
  // 부분 매칭 (포함 관계)
  for (const [name, ev] of Array.from(indexByName.entries())) {
    if (name.includes(key) || key.includes(name)) {
      return ev.has_floor_plan
    }
  }
  return false
}

/** 행사명으로 program_parts 조회 (폴더명 기반 추론) */
export function getProgramPartsFromV4(eventName: string | null | undefined): string[] {
  if (!eventName) return []
  const key = normalize(eventName)
  if (indexByName.has(key)) return indexByName.get(key)!.program_parts
  for (const [name, ev] of Array.from(indexByName.entries())) {
    if (name.includes(key) || key.includes(name)) return ev.program_parts
  }
  return []
}

/** 전체 통계 (개요용) */
export function getV4Summary() {
  return {
    total: data.total_events,
    withFloorPlan: data.events_with_floor_plan,
    floorPlanRatio: data.total_events > 0
      ? Math.round((data.events_with_floor_plan / data.total_events) * 100)
      : 0,
    generatedAt: data.generated_at,
  }
}
