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
import rawVenueSignageMap from '@/lib/data/_venue_signage_map.json' assert { type: 'json' }

export type StandardCategoryKey =
  | 'outer_wall'      // 외벽 (가로현수막 외벽·통천 외벽 등 대형 외부 사인)
  | 'gate'            // 게이트 (출입구 광고면)
  | 'streetlight'     // 가로등 배너 (외부 동선)
  | 'x_banner'        // X배너 (입구·등록데스크)
  | 'ceiling'         // 천정배너 (행잉·통천 내부)
  | 'support'         // 부속시설 (포디움·룸사인·A4/A3 POP·라운지 안내)

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

export const STANDARD_CATEGORIES: StandardCategoryDef[] = [
  {
    key: 'outer_wall',
    label: '외벽',
    description: '가로현수막(외벽)·통천현수막·대형 외부 사인·기둥 부착·홍보탑. 행사장별 표준 규격 매뉴얼 명시.',
    // v9.23 보강 (발주엑셀 13건 실측 표기 추가):
    // 행사 현수막 100회 / 통천현수막 33회 / 가로현수막 26회 / 기둥현수막·홍보탑·무지배너
    match_keywords: [
      '외벽', '통천', '통천현수막', '가로현수막', '행사 현수막', '행사현수막',
      '대형 현수막', '외부 광고', '아치', '대형 배너', '기둥현수막', '기둥 현수막',
      '홍보탑', '무지배너',
    ],
    priority: 1,
    typical_size: '7600×2000mm (킨텍스 5홀) ~ 8000×5000mm (킨텍스 2전시장)',
  },
  {
    key: 'gate',
    label: '게이트',
    description: '출입구 광고면·게이트당 부착 사인·차량 게이트·공항 영접 게이트.',
    // v9.23 보강: 발주엑셀 실측 — "차량 게이트" / "인천공항" 영접 게이트
    match_keywords: [
      '게이트', 'gate', '출입구 광고', '입구 아치', '차량 게이트', '공항 게이트',
      '진입 아치',
    ],
    priority: 2,
    typical_size: '킨텍스 Gate1 38×1.5m / Gate2 36×1.5m / Gate4 30×1.5m',
  },
  {
    key: 'streetlight',
    label: '가로등 배너',
    description: '외부 가로등 폴 부착 세로현수막·폴대배너·물통배너. D-30 이전 폴 예약 필수.',
    // v9.23 보강: 세로현수막 233회 / 폴대배너 15회 / 물통배너 7회 — 외부 폴 부착 표기 일관화
    match_keywords: [
      '가로등', '폴대', '폴 배너', '폴대배너', '폴배너', '세로현수막',
      '폴 클램프', '셔틀', '주차장', '물통배너', '물통 배너',
    ],
    priority: 2,
    typical_size: '600×1800mm 표준 (조 단위 발주)',
  },
  {
    key: 'x_banner',
    label: 'X배너',
    description: 'X배너·롤업배너·롤배너·A배너·I배너. 자체 스탠드 사용, 거의 모든 행사장 allowed.',
    // v9.23 보강: X배너 114회 / A배너·롤배너·I배너 추가
    match_keywords: [
      'x배너', 'x-배너', '엑스배너', '롤업', '롤업배너', '롤배너',
      '스프링배너', '배너스탠드', 'a배너', 'i배너',
    ],
    priority: 3,
    typical_size: '600×1800mm',
  },
  {
    key: 'ceiling',
    label: '천정배너 (행잉)',
    description: '천장 매다는 대형 배너·구름다리·드롭배너. 행사장별 리깅 가능 여부 차이 큼.',
    // v9.23 보강: 천정배너 10회 + 드롭배너(천장 매다는 형태)
    match_keywords: [
      '천정', '천장', '행잉', '리깅', '구름다리', 'hanging', '드롭배너',
      '드롭 배너',
    ],
    priority: 1,
    typical_size: '5500×4000mm (킨텍스 5홀 메인) ~ 3500×3000mm (라운지·컨퍼런스장)',
  },
  {
    key: 'support',
    label: '부속시설',
    description: '포디움·룸사인·A4/A3 POP·라운지 안내·등록·바닥스티커·영접피켓·시상보드·포토월.',
    // v9.23 보강 (발주엑셀 실측 표기 대량 추가):
    // 거리두기 스티커 370회 / 발자국 스티커 60회 / 유도사인 32회 / 행사 룸사인 17회
    // 영접피켓 10회 / 큐방·Q방 / 시트지 / 안내 룸사인 / 현황판 / 개회식 배치도
    // 기념촬영보드 / 시상보드 / 포토월·포토존
    match_keywords: [
      '포디움', '룸사인', 'a4', 'a3', '폼보드', 'l보드', '라운지', '등록',
      '비표', 'pop', '유도사인', '명패', '거리두기 스티커', '발자국 스티커',
      '바닥스티커', '바닥 스티커', '바닥시트', '바닥 시트', '시트지',
      '안내 룸사인', '행사 룸사인', '현황판', '영접피켓', '영접 피켓',
      '큐방', 'q방', '스탠드 pop', '안내폼보드', '안내 폼보드',
      '개회식 배치도', '배치도', '기념촬영보드', '시상보드', '포토존', '포토월',
    ],
    priority: 3,
    typical_size: '포디움 600×200mm / A4 210×297mm / A3 297×420mm',
  },
]

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
  const t = categoryText.toLowerCase()
  // 외벽 우선 매칭 (천정·가로등·게이트와 키워드 겹칠 수 있음)
  const orderedKeys: StandardCategoryKey[] = ['gate', 'ceiling', 'streetlight', 'outer_wall', 'x_banner', 'support']
  for (const key of orderedKeys) {
    const def = STANDARD_CATEGORY_BY_KEY.get(key)!
    if (def.match_keywords.some(kw => t.includes(kw))) return key
  }
  return null
}

export interface VenueCategoryCoverage {
  venue_key: string
  venue_name: string
  /** 6대 카테고리별 학습 데이터 보유 여부 */
  has_data: Record<StandardCategoryKey, boolean>
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
 * 발주엑셀 통합 맵에서 venue 단위로 카테고리 학습 보유 여부 추출.
 * fuzzy 매칭으로 venueFacilityGuide의 venue_key에 합산.
 * SignageType 빈도 ≥ 1이면 학습 데이터로 인정 (denied 아닌 실제 발주 기록).
 */
function computeMapCoverageByVenueKey(): Map<string, Record<StandardCategoryKey, boolean>> {
  const result = new Map<string, Record<StandardCategoryKey, boolean>>()
  for (const ev of VENUE_SIGNAGE_MAP.events) {
    const venues = (ev.venues_seen ?? []).filter(v => v && v !== '미상' && v !== '-')
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
    const has: Record<StandardCategoryKey, boolean> = {
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

  const has: Record<StandardCategoryKey, boolean> = {
    outer_wall: false, gate: false, streetlight: false,
    x_banner: false, ceiling: false, support: false,
  }
  // 발주엑셀 통합 맵에서 venue 이름 fuzzy 매칭
  const target = venueName.replace(/\s/g, '').toLowerCase()
  for (const ev of VENUE_SIGNAGE_MAP.events) {
    const venues = (ev.venues_seen ?? []).filter(v => v && v !== '미상' && v !== '-')
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
