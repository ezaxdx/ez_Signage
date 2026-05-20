// PR#2 단위 2 (δ 정책): 프로그램 파트별 운영 누적 통계.
//   학습 관리자 program-parts 탭이 화면에 보여주는 평균 리스트를
//   동일 로직으로 추출하여 AI 프롬프트 컨텍스트로 재사용.
//
// SOT: SEED_EVENT_HISTORY (시드 44건) + event_history DB (운영 누적 — server 사용 시).
// 본 모듈은 client·server 양쪽에서 동작하는 순수 함수만 제공.
// AI 프롬프트 주입은 SEED 베이스로 산출 — 운영 누적은 venueProfile·seedHistoryBlock 경유.

import { SEED_EVENT_HISTORY, SEED_SYNONYMS, SEED_SIGNAGE_TYPES, estimateSignageBreakdown } from './dashboardSeed'

export interface ProgramPartStat {
  signage_name: string  // 12 카테고리 표준명
  avg_quantity: number  // 행사당 평균 수량 (소수 1째)
  event_count: number   // 해당 파트 사용 행사 수
}

// 동의어 → 표준명 정규화 헬퍼 (LearningManagerClient.tsx의 resolveCategoryName과 동등)
function normalizeAliasKey(s: string): string {
  return s.replace(/[\s\-_·\(\)\[\]]/g, '').toLowerCase()
}
const ALIAS_MAP = (() => {
  const m = new Map<string, string>()
  for (const a of SEED_SYNONYMS) m.set(normalizeAliasKey(a.alias), a.canonical_name)
  return m
})()
function resolveStandardName(raw: string): string {
  return ALIAS_MAP.get(normalizeAliasKey(raw)) ?? raw
}

// 12 카테고리 표준명 화이트리스트 (signage_types.name 기준)
const VALID_TYPE_NAMES = new Set(SEED_SIGNAGE_TYPES.map(t => t.name))

/**
 * 특정 프로그램 파트에 대한 환경장식물별 평균 사용량 (avg_quantity 내림차순).
 * 학습 관리자 program-parts 탭의 펼침 표와 동등한 결과.
 *
 * @param partCode '40.04' 같은 코드
 * @param extraEvents 추가 누적 데이터 (event_history DB 등). 비어있으면 SEED만 사용.
 */
export function getProgramPartStats(
  partCode: string,
  extraEvents: ReadonlyArray<{ program_parts?: string[] | null; signage_breakdown?: Array<{ category: string; quantity: number; sizes?: string }> | null; analyzed_item_count?: number | null }> = [],
): ProgramPartStat[] {
  const allEvents = [
    ...SEED_EVENT_HISTORY,
    ...extraEvents,
  ]
  // partCode를 포함하는 행사만
  const matched = allEvents.filter(e => (e.program_parts ?? []).includes(partCode))
  if (matched.length === 0) return []

  const sigQty = new Map<string, number>()    // 종류 → 총 수량
  let usedEventCount = 0
  for (const e of matched) {
    const breakdown = (e.signage_breakdown && e.signage_breakdown.length > 0)
      ? e.signage_breakdown
      : estimateSignageBreakdown(e.program_parts ?? [], e.analyzed_item_count ?? undefined)
    if (breakdown.length === 0) continue
    usedEventCount++
    for (const s of breakdown) {
      const standard = resolveStandardName(s.category)
      if (!VALID_TYPE_NAMES.has(standard)) continue
      sigQty.set(standard, (sigQty.get(standard) ?? 0) + s.quantity)
    }
  }

  if (usedEventCount === 0) return []

  return Array.from(sigQty.entries())
    .map(([signage_name, total]) => ({
      signage_name,
      avg_quantity: Math.round((total / matched.length) * 10) / 10,
      event_count: matched.length,
    }))
    .filter(s => s.avg_quantity > 0)
    .sort((a, b) => b.avg_quantity - a.avg_quantity)
}

/**
 * PR#2 단위 7 (δ 정책): 동선 배너 신규 공식 N 산출.
 *   모든 행사의 [동선 배너 수 ÷ 참가자 수] 역산 평균값.
 *   데이터 부족 시(<3건) fallback N=500.
 *
 * NOTE: SEED_EVENT_HISTORY는 참가자 수가 없어 정확한 N 산출 불가 — 보수적 fallback 500 사용.
 *   향후 event_history DB에 attendees 컬럼 추가되면 정확 산출.
 */
export function computeDongseonRatio(): number {
  // SEED 베이스로는 attendees가 없으므로 fallback 500 (PO 명시)
  // event_history DB 통합 시 server에서 별도 계산 후 주입 가능
  return 500
}

/**
 * AI 프롬프트용 텍스트 블록 — 선택된 파트들의 평균 리스트 화면에 보이는 그대로 전체 주입.
 * 중복 파트 입력 시 동일 블록 중복 출력 OK (PO 명시 의도).
 *
 * @param partCodes 사용자가 선택한 파트 코드 배열 (중복 가능)
 * @param partNameMap 코드 → 한글명 매핑 (예: PROGRAM_PART_BY_CODE)
 */
export function formatProgramPartStatsForPrompt(
  partCodes: string[],
  partNameMap: ReadonlyMap<string, { name: string }>,
): string {
  if (partCodes.length === 0) return ''
  const lines: string[] = [
    '',
    '[프로그램 파트별 운영 누적 통계]',
    `선택된 파트: ${partCodes.map(c => partNameMap.get(c)?.name ?? c).join(', ')}`,
    '파트별 평균 사용 수량 (행사장 무관 전체 집계):',
  ]
  for (const code of partCodes) {
    const name = partNameMap.get(code)?.name ?? code
    const stats = getProgramPartStats(code)
    lines.push('')
    lines.push(`[${name}]`)
    if (stats.length === 0) {
      lines.push('- (누적 데이터 없음)')
      continue
    }
    for (const s of stats) {
      lines.push(`- ${s.signage_name} ${s.avg_quantity}개 (${s.event_count}건)`)
    }
  }
  lines.push('')
  // HOTFIX (2026-05-20): ≥3건 → ≥1건 (PO 정책 = 1건도 학습 활용)
  lines.push('지침: 위 평균값을 기본 quantity로 활용. 누적 이벤트 ≥1건이면 학습 활용.')
  return lines.join('\n')
}
