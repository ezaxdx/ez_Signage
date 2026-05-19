// 환경장식물 6대 표준 카테고리 정의 (v9.22 — 2026-05-13)
//
// 목적:
//   - goals/current.md TODO "카테고리별 학습 항목 표준화 (외벽/게이트/가로등/X배너/천정/부속시설)" 코드 정착
//   - venueFacilityGuide.ts의 자유 문자열 카테고리(`가로현수막 (외벽)` 등)를 6대 표준 그룹으로 묶기
//   - 행사장별로 어느 표준 카테고리에 학습 데이터가 있는지·없는지 일관 분류
//   - AI 추천 결과 후처리 시 "학습 데이터 없는 카테고리는 추천 없음" 룰 강제 (learnings.md 2026-05-11)
//
// 6대 표준 카테고리 선정 근거 (회의 결정 2026-05-11 / decisions.md):
//   1) 외벽 (대형 가로/세로 현수막) — 행사장별 표준 규격 매뉴얼에 명시
//   2) 게이트 (출입구 광고면) — 킨텍스 매뉴얼 §3 외부광고 파싱 성공 데이터
//   3) 가로등 (외부 동선) — D-30 이전 폴 예약 필수, 행사장별 클램프 규격 상이
//   4) X배너 (입구/등록) — 자체 스탠드, 거의 모든 행사장 allowed
//   5) 천정 (행잉) — 행사장별 리깅 가능 여부 차이 큼, 학습 데이터 가장 적음
//   6) 부속시설 (라운지·룸사인·포디움·A4/A3 POP) — 부속 공간 자동 인지 휴리스틱 대상
//
// 학습 데이터 부재 카테고리는 "추측" 대신 "[추천 없음]" 자동 표기 (learnings.md 정답지 노출 편향 방지).

import { findVenueKey, VENUE_FACILITY_GUIDE_SEED } from '@/lib/data/venueFacilityGuide'
import { SEED_CEILING_BANNER_PATTERNS } from '@/lib/data/dashboardSeed'
import { SIGNAGE_CATEGORIES_V3, classifyCategoryV3 } from '@/lib/data/v3/signageCategoriesSeedV3'
import rawVenueSignageMap from '@/lib/data/_venue_signage_map.json' assert { type: 'json' }

// 5/22 사용자 명시 = 6대 표준은 구 정보. v3 환경장식물 종류 12 카테고리로 일괄 변경
// type union = legacy 6 + v3 12 동시 보유 (다른 함수 호환·옛 데이터 처리)
export type StandardCategoryKey =
  // v3 12 카테고리 (SOT 5/22)
  | 'x_banner' | 'i_banner' | 'streetlight_banner' | 'horizontal_banner'
  | 'vertical_banner' | 'chunchen_banner' | 'podium'
  | 'a4_portrait' | 'a4_landscape' | 'a3_portrait' | 'a3_landscape'
  | 'route_banner'
  // legacy 6 (호환 유지·새 표시 영역 X)
  | 'outer_wall' | 'gate' | 'streetlight' | 'ceiling' | 'support'

export interface StandardCategoryDef {
  key: StandardCategoryKey
  label: string
  description: string
  /** venueFacilityGuide.ts의 install_allowed[].category 문자열을 이 표준 키에 매칭하는 키워드들 */
  match_keywords: string[]
  /** 학습 데이터 우선순위 (1 = 가장 중요 = 가장 많이 누락되면 안 됨) */
  priority: 1 | 2 | 3
  /** 대표 규격 (표준화 미달 시 fallback 안내용) */
  typical_size?: string
}

// 5/22 사용자 명시 = v3 SIGNAGE_CATEGORIES_V3 12 카테고리에서 자동 생성 (SOT 단일화)
// priority: 우선순위 1 = 행사장별 규격 차이 큰 외벽·천정 영역 (통천·가로현수막·세로현수막)
//          우선순위 2 = 외부 동선·게이트 (가로등 배너)
//          우선순위 3 = 거의 모든 행사장 표준 (X배너·I배너·포디움·A4·A3·동선)
const PRIORITY_MAP: Partial<Record<StandardCategoryKey, 1 | 2 | 3>> = {
  chunchen_banner: 1, horizontal_banner: 1, vertical_banner: 1,
  streetlight_banner: 2,
  x_banner: 3, i_banner: 3, podium: 3, route_banner: 3,
  a4_portrait: 3, a4_landscape: 3, a3_portrait: 3, a3_landscape: 3,
}

export const STANDARD_CATEGORIES: StandardCategoryDef[] = SIGNAGE_CATEGORIES_V3.map(c => ({
  key: c.key as StandardCategoryKey,
  label: c.label,
  description: c.description,
  match_keywords: c.match_keywords,
  priority: PRIORITY_MAP[c.key as StandardCategoryKey] ?? 3,
  typical_size: `${c.default_size_mm.width}×${c.default_size_mm.height}mm`,
}))

export const STANDARD_CATEGORY_BY_KEY: ReadonlyMap<StandardCategoryKey, StandardCategoryDef> =
  new Map(STANDARD_CATEGORIES.map(c => [c.key, c]))

/**
 * 자유 문자열 카테고리명을 6대 표준 카테고리로 매핑.
 * 매칭 안되면 null 반환 (호출 측에서 "기타" 처리).
 *
 * 예:
 *   "가로현수막 (외벽)" → "outer_wall"
 *   "X-배너" → "x_banner"
 *   "포디움 타이틀" → "support"
 *   "천정배너 (행잉)" → "ceiling"
 */
export function classifyCategory(categoryText: string | null | undefined): StandardCategoryKey | null {
  if (!categoryText) return null
  // 5/22 = v3 classifyCategoryV3 직접 사용 (12 카테고리 매칭 정합)
  const v3 = classifyCategoryV3(categoryText)
  return v3 ? (v3.key as StandardCategoryKey) : null
}

export interface VenueCategoryCoverage {
  venue_key: string
  venue_name: string
  /** 카테고리별 학습 데이터 보유 여부 (5/22 = 12 카테고리 + legacy 호환·Partial) */
  has_data: Partial<Record<StandardCategoryKey, boolean>>
  /** 채워진 카테고리 수 (0~6) */
  filled_count: number
  /** 우선순위 1 카테고리(외벽·천정) 누락 여부 */
  missing_priority_1: StandardCategoryKey[]
}

// v9.23: 발주엑셀 통합 맵 (_venue_signage_map.json) 정형화 — 행사장별 카테고리 합산용
interface VenueSignageMapEvent {
  event_name: string
  folder_path?: string
  excel_file?: string
  items: Array<{ category?: string; venue?: string }>
  summary: Record<string, number>
  venues_seen?: string[]
}
interface VenueSignageMap {
  events: VenueSignageMapEvent[]
}
const VENUE_SIGNAGE_MAP = rawVenueSignageMap as unknown as VenueSignageMap

/**
 * v9.25: 발주엑셀 venue 라벨 노이즈 필터 (goals/current.md v9.23 후속 작업).
 * _venue_signage_map.json에서 venue로 잘못 등록된 비행사장 항목을 제외.
 * 발견 노이즈 (실측): "미상"·"기타"·"-"·"차량"·"인천공항"·"등록데스크"·"안내소"·
 *   "통역부스"·"의무실"·"창고"·"대기실"·"운영사무국"·"본부"·"CP"·"방한용품배포대"·
 *   "물품보관소"·"음수대"·"쉼터"·"포디움"·"천장"·"플로어"·"로비" 등 비행사장 위치 표기.
 * 이 라벨들은 행사장이 아니라 행사 내부 부속 위치이므로 venue_key 매칭 대상에서 제외.
 */
const VENUE_LABEL_NOISE_EXACT = new Set([
  '미상', '기타', '-', '차량', '인천공항',
])
const VENUE_LABEL_NOISE_PATTERNS = [
  /등록데스크/, /안내소/, /통역부스/, /의무실/, /창고/,
  /대기실/, /운영사무국/, /연출팀/, /운영팀/, /본부$/, /\bCP\b/,
  /방한용품/, /물품보관소/, /음수대/, /쉼터/, /경호/,
  /포디움/, /^주차장$/, /^로비$/,
  // 행사장 내부 위치만 표기된 경우 (행사장명 없음)
  /^플로어$/, /^무대$/, /^천장$/, /^로비\s/,
  /운영요원/, /출연자대기실/, /출연진/,
]

function isVenueLabelNoise(label: string): boolean {
  if (!label) return true
  const trimmed = label.trim()
  if (VENUE_LABEL_NOISE_EXACT.has(trimmed)) return true
  if (trimmed.length <= 1) return true
  return VENUE_LABEL_NOISE_PATTERNS.some(re => re.test(trimmed))
}

/**
 * 발주엑셀 통합 맵에서 venue 단위로 카테고리 학습 보유 여부 추출.
 * fuzzy 매칭으로 venueFacilityGuide의 venue_key에 합산.
 * SignageType 빈도 ≥ 1이면 학습 데이터로 인정 (denied 아닌 실제 발주 기록).
 * v9.25: venue 라벨 노이즈 필터 추가 (isVenueLabelNoise).
 */
function computeMapCoverageByVenueKey(): Map<string, Record<StandardCategoryKey, boolean>> {
  const result = new Map<string, Record<StandardCategoryKey, boolean>>()
  for (const ev of VENUE_SIGNAGE_MAP.events) {
    const venues = (ev.venues_seen ?? []).filter(v => v && !isVenueLabelNoise(v))
    if (venues.length === 0) continue
    // 각 venue 후보에 대해 findVenueKey 매칭
    const matchedKeys = new Set<string>()
    for (const v of venues) {
      const k = findVenueKey(v)
      if (k) matchedKeys.add(k)
    }
    if (matchedKeys.size === 0) continue
    // summary 키워드를 6대 카테고리로 분류
    const seenKeys = new Set<StandardCategoryKey>()
    for (const catKey of Object.keys(ev.summary ?? {})) {
      const sc = classifyCategory(catKey)
      if (sc) seenKeys.add(sc)
    }
    // 매칭된 모든 venue_key에 합산 (Set 이터레이션은 Array.from으로 — CLAUDE.md §14)
    const seenKeysArr = Array.from(seenKeys) as StandardCategoryKey[]
    for (const venueKey of Array.from(matchedKeys)) {
      if (!result.has(venueKey)) {
        result.set(venueKey, {
          outer_wall: false, gate: false, streetlight: false,
          x_banner: false, ceiling: false, support: false,
          i_banner: false, streetlight_banner: false, horizontal_banner: false,
          vertical_banner: false, chunchen_banner: false, podium: false,
          a4_portrait: false, a4_landscape: false, a3_portrait: false, a3_landscape: false,
          route_banner: false,
        })
      }
      const entry = result.get(venueKey)!
      for (const sk of seenKeysArr) entry[sk] = true
    }
  }
  return result
}

/**
 * venueFacilityGuide + SEED_CEILING_BANNER_PATTERNS + 발주엑셀 통합 맵 기반으로
 * 행사장별 6대 카테고리 학습 데이터 보유 여부 계산.
 * v9.23: 발주엑셀 _venue_signage_map.json 합산 추가 — 실제 발주 기록 반영.
 */
export function computeVenueCategoryCoverage(): VenueCategoryCoverage[] {
  const ceilingByVenue = new Map<string, boolean>()
  for (const p of SEED_CEILING_BANNER_PATTERNS) {
    const hasRealData = !p.no_data && p.items.length > 0
    const venueKey = findVenueKey(p.venue_hall ?? p.venue) ?? p.venue
    if (hasRealData) ceilingByVenue.set(venueKey, true)
  }
  // v9.23: 발주엑셀 통합 맵에서 venue별 카테고리 학습 데이터 추출
  const mapCoverage = computeMapCoverageByVenueKey()

  return VENUE_FACILITY_GUIDE_SEED.map(guide => {
    const has: Partial<Record<StandardCategoryKey, boolean>> = {
      outer_wall: false, gate: false, streetlight: false,
      x_banner: false, ceiling: false, support: false,
    }
    for (const item of guide.install_allowed ?? []) {
      // 'denied' 상태도 명시적 학습 데이터로 인정 (불가도 정보)
      const key = classifyCategory(item.category)
      if (key) has[key] = true
    }
    // 천정배너 실측 데이터 별도 강화 (SEED_CEILING_BANNER_PATTERNS 우선)
    if (ceilingByVenue.get(guide.venue_key)) has.ceiling = true
    // 게이트는 venueFacilityGuide.special_notes에 게이트 규격이 있는 경우만 인정
    const hasGateNote = (guide.special_notes ?? []).some(n => /게이트|gate/i.test(n))
    if (hasGateNote) has.gate = true
    // v9.23: 발주엑셀 통합 맵 합산 (실제 발주 기록)
    const mapEntry = mapCoverage.get(guide.venue_key)
    if (mapEntry) {
      for (const k of Object.keys(mapEntry) as StandardCategoryKey[]) {
        if (mapEntry[k]) has[k] = true
      }
    }

    const filled = (Object.values(has) as boolean[]).filter(Boolean).length
    const missingP1: StandardCategoryKey[] = []
    if (!has.outer_wall) missingP1.push('outer_wall')
    if (!has.ceiling) missingP1.push('ceiling')

    return {
      venue_key: guide.venue_key,
      venue_name: guide.venue_name,
      has_data: has,
      filled_count: filled,
      missing_priority_1: missingP1,
    }
  })
}

/**
 * v9.23: 행사장명만 알고 venueFacilityGuide에 등록 안 된 경우의 fallback 커버리지.
 * 발주엑셀 통합 맵 단독으로 매칭되면 일부 카테고리는 학습 데이터로 인정.
 * 매칭 안되는 행사장은 "전부 미학습"으로 표기 (정답지 부정 편향 방지).
 */
export function buildCoverageForUnregisteredVenue(venueName: string): VenueCategoryCoverage | null {
  if (!venueName?.trim()) return null

  const has: Partial<Record<StandardCategoryKey, boolean>> = {
    outer_wall: false, gate: false, streetlight: false,
    x_banner: false, ceiling: false, support: false,
  }
  // 발주엑셀 통합 맵에서 venue 이름 fuzzy 매칭
  // v9.25: 노이즈 필터 적용 — 비행사장 라벨 제외
  const target = venueName.replace(/\s/g, '').toLowerCase()
  for (const ev of VENUE_SIGNAGE_MAP.events) {
    const venues = (ev.venues_seen ?? []).filter(v => v && !isVenueLabelNoise(v))
    const hit = venues.some(v => {
      const vn = v.replace(/\s/g, '').toLowerCase()
      return vn.includes(target) || target.includes(vn)
    })
    if (!hit) continue
    for (const catKey of Object.keys(ev.summary ?? {})) {
      const sc = classifyCategory(catKey)
      if (sc) has[sc] = true
    }
  }
  const filled = (Object.values(has) as boolean[]).filter(Boolean).length
  const missingP1: StandardCategoryKey[] = []
  if (!has.outer_wall) missingP1.push('outer_wall')
  if (!has.ceiling) missingP1.push('ceiling')

  // 전부 미학습이어도 venue가 있으면 빈 커버리지 반환 (UI에서 "전부 미학습" 표기 노출)
  return {
    venue_key: `unregistered::${target.slice(0, 32)}`,
    venue_name: venueName,
    has_data: has,
    filled_count: filled,
    missing_priority_1: missingP1,
  }
}

/**
 * 특정 venue의 카테고리 커버리지 한 줄 요약 (학습 관리자 페이지·AI 프롬프트 양쪽 사용).
 * 예: "외벽·천정·X배너·부속 학습됨 / 게이트·가로등 미학습"
 */
export function summarizeCoverage(coverage: VenueCategoryCoverage): {
  filled: string[]
  missing: string[]
  text: string
} {
  const filled: string[] = []
  const missing: string[] = []
  for (const def of STANDARD_CATEGORIES) {
    if (coverage.has_data[def.key]) filled.push(def.label)
    else missing.push(def.label)
  }
  const text = filled.length === 0
    ? `학습 데이터 없음 (${missing.join('·')} 전부 미학습)`
    : missing.length === 0
      ? `전체 학습 완료 (${filled.join('·')})`
      : `${filled.join('·')} 학습됨 / ${missing.join('·')} 미학습`
  return { filled, missing, text }
}

/**
 * v9.23: AI 추천 후처리에서 사용 — venue가 등록 행사장이면 등록 커버리지, 아니면 fallback 반환.
 * recommendSignage.ts에서 일관된 분기 처리에 활용.
 */
export function resolveCoverageForVenue(venueName: string): VenueCategoryCoverage | null {
  if (!venueName?.trim()) return null
  const venueKey = findVenueKey(venueName)
  if (venueKey) {
    const all = computeVenueCategoryCoverage()
    return all.find(c => c.venue_key === venueKey) ?? null
  }
  // 미등록 행사장 — 발주엑셀 통합 맵 단독으로 fallback
  return buildCoverageForUnregisteredVenue(venueName)
}

/**
 * AI 추천 프롬프트에 주입할 텍스트 블록 생성.
 * "이 행사장은 X·Y만 학습됨 — 나머지 카테고리는 추측 금지"를 Gemini에 명시.
 * v9.23: venueFacilityGuide에 없는 행사장도 발주엑셀 통합 맵으로 fallback 처리.
 */
export function formatCoverageForPrompt(venueName: string): string {
  const cov = resolveCoverageForVenue(venueName)
  if (!cov) return ''
  const sum = summarizeCoverage(cov)
  const missingLabels = sum.missing
  if (missingLabels.length === 0) {
    return `\n\n[학습 데이터 커버리지 — ${cov.venue_name}]\n전체 6대 표준 카테고리 모두 학습 완료. 정상 추천 가능.`
  }
  // unregistered 행사장은 별도 안내 (학습 매뉴얼 없음 명시)
  const isUnregistered = cov.venue_key.startsWith('unregistered::')
  const headerNote = isUnregistered
    ? `※ 이 행사장은 시설 가이드 미등록. 발주엑셀 기록만으로 추출한 학습 데이터입니다.`
    : ''
  return [
    '',
    `[학습 데이터 커버리지 — ${cov.venue_name}]`,
    headerNote,
    `학습됨(${sum.filled.length}/6): ${sum.filled.join(' · ') || '없음'}`,
    `미학습(${missingLabels.length}/6): ${missingLabels.join(' · ')}`,
    '→ 미학습 카테고리는 추측으로 추천하지 말 것. quantity 유지하되 rationale 앞에 "[추천 없음 — 학습 데이터 부재. 매뉴얼 또는 운영팀 확인 필요]" prepend 필수.',
  ].filter(Boolean).join('\n')
}
