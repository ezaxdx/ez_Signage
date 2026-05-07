/**
 * 동선배너 수량 산정 로직 (v4.1 갱신-B-2)
 *
 * 회의 결정 (260507):
 *   - 도면 + 프로그램표 동시 입력 → 정교한 추천 (다음 사이클)
 *   - 이번 사이클: 룰 베이스 fallback만 (인원/200 + 주출입구 메모 가산)
 *
 * 입력:
 *   - venue: VenueInfo 또는 신규 venues 테이블 row (도면 메모 포함)
 *   - attendeesEstimate: 예상 인원
 *   - selectedHallNames: 선택된 홀 이름 (홀 분리 행사장일 때)
 *
 * 출력:
 *   - count: 추천 동선배너 수량
 *   - positions: 배치 위치 추천 (도면 분석 결과 또는 fallback 텍스트)
 *   - rationale: 산정 근거 (사용자 표시용)
 */

export interface VenueInfoForRecommendation {
  name: string
  has_floor_plan?: boolean
  has_hall_split?: boolean
  main_entrance_note?: string | null
  area_sqm?: number | null
  venue_type?: string | null
}

export interface DongseonBannerRecommendation {
  count: number
  positions: string[]
  rationale: string
  source: 'rule_based' | 'floor_plan_analyzed' | 'historical_average'
}

const DEFAULT_RATIO = 200            // 200명당 1개 (회의록 명시)
const MIN_COUNT = 4                  // 최소 4개 (회의록 명시)
const HALL_BONUS = 1                 // 홀 분리 행사장은 홀당 +1
const ENTRANCE_BONUS_BASE = 1        // 주출입구 메모 있으면 +1
const LARGE_VENUE_THRESHOLD = 3000   // 면적 3000㎡ 이상이면 추가 가산

/**
 * 룰 베이스 1차 산정.
 * Vision API 기반 도면 분석은 다음 사이클 (source: 'floor_plan_analyzed' 진입점만 마련).
 */
export function recommendDongseonBannerCount(
  venue: VenueInfoForRecommendation | null,
  attendeesEstimate: number,
  selectedHallNames: string[] = [],
): DongseonBannerRecommendation {
  // 1) 인원 기반 fallback
  const fromAttendees = attendeesEstimate > 0
    ? Math.max(MIN_COUNT, Math.ceil(attendeesEstimate / DEFAULT_RATIO))
    : MIN_COUNT

  // 도면도 venue 정보도 없는 경우
  if (!venue) {
    return {
      count: fromAttendees,
      positions: ['행사장 입구', '메인 동선 분기점'],
      rationale: `예상 인원 ${attendeesEstimate || '미입력'} / ${DEFAULT_RATIO}명당 1개 (최소 ${MIN_COUNT}개)`,
      source: 'rule_based',
    }
  }

  // 2) 가산점
  let bonus = 0
  const reasons: string[] = [`예상인원 ${attendeesEstimate || 0}/${DEFAULT_RATIO}명 = ${fromAttendees}개`]

  if (venue.has_hall_split && selectedHallNames.length > 0) {
    const hallAdd = selectedHallNames.length * HALL_BONUS
    bonus += hallAdd
    reasons.push(`홀 ${selectedHallNames.length}개 +${hallAdd}`)
  }

  if (venue.main_entrance_note) {
    // 주출입구가 여러 개로 명시되어 있으면 콤마 분리해서 추가
    const entrances = venue.main_entrance_note.split(/[,，]/).filter(s => s.trim().length > 0)
    const entranceAdd = Math.max(ENTRANCE_BONUS_BASE, entrances.length - 1)
    bonus += entranceAdd
    reasons.push(`주출입구 ${entrances.length}곳 +${entranceAdd}`)
  }

  if (venue.area_sqm && venue.area_sqm >= LARGE_VENUE_THRESHOLD) {
    bonus += 2
    reasons.push(`대형 행사장 ${venue.area_sqm}㎡ +2`)
  }

  const count = fromAttendees + bonus

  // 3) 배치 위치 추천 텍스트 (룰 베이스)
  const positions: string[] = []
  positions.push(`${venue.name} 주출입구`)
  if (venue.has_hall_split && selectedHallNames.length > 0) {
    for (const hall of selectedHallNames) positions.push(`${hall} 입구`)
  }
  positions.push('등록 데스크 ↔ 메인 행사장 동선')
  positions.push('엘리베이터·계단 분기점')
  if (venue.area_sqm && venue.area_sqm >= LARGE_VENUE_THRESHOLD) {
    positions.push('화장실 동선 진입부')
  }

  return {
    count,
    positions: positions.slice(0, count),
    rationale: reasons.join(' + '),
    source: venue.has_floor_plan ? 'historical_average' : 'rule_based',
  }
}

/**
 * 향후 (다음 사이클) — Vision API 기반 도면 분석 후 호출.
 * 현재는 미사용, 시그니처만 정의.
 */
export interface FloorPlanAnalysisResult {
  detected_entrances: { x: number; y: number; label: string }[]
  detected_corridors: { from: string; to: string; length_estimate: number }[]
  bottleneck_points: string[]
}

export function recommendDongseonBannerFromFloorPlan(
  _analysis: FloorPlanAnalysisResult,
  _attendeesEstimate: number,
): DongseonBannerRecommendation {
  // TODO: 다음 사이클 — 도면 분석 결과를 받아 정밀 좌표 기반 추천
  throw new Error('floor plan based recommendation not implemented in this cycle')
}
