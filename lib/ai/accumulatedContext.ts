// 점진적 정확도 향상 — 핵심 철학 구현
// 사용자가 ′특정 장소 + 특정 행사 유형′을 선택하면,
// 앱이 누적해온 데이터(발주 완료된 프로젝트)를 모아
// AI(Gemini)에 컨텍스트로 주입한다.
//
// 5/21 사용자 결정 = 발주 완료(finalized_at)만 학습 신호로 사용.
//   이전 4단계 가중치(입력 10%·중간 30%·컨펌 70%·완료 100%)는 실제 운영 메커니즘이
//   불완전했음 — confirmed/finalized_at이 ExportService.ts:483에서 동시에 set 되어
//   70% 단계 분기가 dead code였고, input/mid는 location/purpose 입력 정황 추정이라
//   학습 신호로 신뢰 어려움. 정직 정합 = finalized_at만.

import { createClient } from '@/lib/supabase/server'
import { SEED_EVENT_HISTORY, estimateSignageBreakdown, SEED_SYNONYMS } from '@/lib/data/dashboardSeed'

// 5/22 사용자 명시 = 모든 영역 = 동의어 → 표준명 자동 변환. AI 프롬프트 영역 표준화 영역 적용.
function normalizeAliasKey(s: string): string {
  return s.replace(/[\s\-_·\(\)\[\]]/g, '').toLowerCase()
}
const ALIAS_MAP = (() => {
  const map = new Map<string, string>()
  for (const a of SEED_SYNONYMS) map.set(normalizeAliasKey(a.alias), a.canonical_name)
  return map
})()
function resolveCategoryStandard(raw: string): string {
  return ALIAS_MAP.get(normalizeAliasKey(raw)) ?? raw
}

export interface AccumulatedContextOptions {
  venue: string
  programParts?: string[]
  eventType?: string | null
  limit?: number   // 행사 단위 상한 (기본 5)
}

export interface AccumulatedItem {
  category: string
  width_mm: number | null
  height_mm: number | null
  material: string | null
  location: string | null
  purpose: string | null
  quantity: number | null
  // 5/21 = 발주 완료(finalized_at) 항목만 누적되므로 weight 항상 100. 호환 보존.
  weight: 100
}

// 시설 가이드 예외 패턴 — 알람 무시하고 완료한 케이스 (가이드 데이터가 틀렸을 신호)
export interface ExceptionPattern {
  rule: string
  field: string
  standard_value: string | null
  user_value: string | null
  count: number           // 같은 venue+rule 반복 횟수
  finalized_count: number // 이 중 실제 완료(finalized)된 건수
}

// v9.37 — 어드민 마스터 자동 주입 데이터
export interface AdminSignageType {
  name: string
  category: string | null
  default_width_mm: number | null
  default_height_mm: number | null
  default_material: string | null
  layout: string | null
  is_standard: boolean
  notes: string | null
}

export interface AdminSynonym {
  alias_name: string
  canonical_name: string
  kind: string | null
}

export interface AdminFacilityGuide {
  venue_id: string
  venue_name: string
  guide: unknown    // facility_guide_json — VenueFacilityGuide 호환 구조
}

export interface AccumulatedContext {
  matched_projects: number
  total_items: number
  // 5/21 = finalized만 사용. input/mid/confirmed는 표시용 0 유지(호환).
  by_stage: { input: number; mid: number; confirmed: number; finalized: number }
  category_distribution: Array<{ category: string; weighted_count: number }>
  top_items: AccumulatedItem[]   // 상위 8건 — 프롬프트 직접 주입
  exception_patterns: ExceptionPattern[]  // 시설 가이드 예외 누적 패턴
  // v9.37 — 어드민 마스터 자동 주입
  admin_signage_types: AdminSignageType[]
  admin_synonyms: AdminSynonym[]
  admin_facility_guide: AdminFacilityGuide | null
  note: string
}

function tokenize(s: string): string[] {
  return s.toLowerCase().split(/[\s,.,()/]+/).filter(Boolean)
}

function venueMatchScore(target: string, candidate: string | null): number {
  if (!candidate) return 0
  const ta = tokenize(target)
  const tb = tokenize(candidate)
  let s = 0
  for (const t of ta) if (tb.some(u => u.includes(t) || t.includes(u))) s++
  return s
}

/**
 * 장소+행사 매칭 누적 데이터를 모아 AI 컨텍스트로 압축.
 * Supabase 조회 실패 시 빈 결과 반환 (seed 컨텍스트만으로 동작).
 */
export async function buildAccumulatedContext(
  opts: AccumulatedContextOptions
): Promise<AccumulatedContext> {
  const empty: AccumulatedContext = {
    matched_projects: 0,
    total_items: 0,
    by_stage: { input: 0, mid: 0, confirmed: 0, finalized: 0 },
    category_distribution: [],
    top_items: [],
    exception_patterns: [],
    admin_signage_types: [],
    admin_synonyms: [],
    admin_facility_guide: null,
    note: '누적 앱 사용 데이터 없음 — seed 데이터만 사용',
  }

  // v9.37 — 어드민 마스터(환경장식물 종류·동의어·행사장 시설 가이드) 자동 조회
  // venue가 비어 있어도 종류·동의어는 주입한다.
  const adminMaster = await loadAdminMaster(opts.venue ?? '')
  Object.assign(empty, adminMaster)

  if (!opts.venue?.trim()) return empty

  try {
    const supabase = createClient()

    // 1) 같은 행사장(+가능하면 같은 program_parts)의 프로젝트들 식별
    const { data: projects, error: pErr } = await supabase
      .from('projects')
      .select('id, event_venue, program_parts, status')
      .limit(200)

    if (pErr || !projects) return empty

    const matched = projects
      .map(p => ({ ...p, score: venueMatchScore(opts.venue, p.event_venue) }))
      .filter(p => p.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, opts.limit ?? 5)

    if (matched.length === 0) return { ...empty, exception_patterns: [], note: '같은 행사장 누적 데이터 없음 — seed 데이터만 사용' }
    // (admin_master_* 필드는 empty에 이미 채워져 있음)

    // 2) 해당 프로젝트들의 design_items 중 발주 완료(finalized_at)만 끌어오기
    //    5/21 사용자 결정 = 미완료 데이터는 학습 풀에서 제외 (신뢰할 수 있는 신호만).
    const pids = matched.map(p => p.id)
    const { data: items, error: iErr } = await supabase
      .from('design_items')
      .select('project_id, category, width_mm, height_mm, material, location, purpose, quantity, finalized_at')
      .in('project_id', pids)
      .not('finalized_at', 'is', null)

    if (iErr || !items) return empty

    type RawItem = {
      project_id: string
      category: string | null
      width_mm: number | null
      height_mm: number | null
      material: string | null
      location: string | null
      purpose: string | null
      quantity: number | null
      finalized_at: string | null
    }

    const stageCount = { input: 0, mid: 0, confirmed: 0, finalized: 0 }
    const weighted: AccumulatedItem[] = []

    // 3) 발주 완료 항목만 누적 (weight 항상 100)
    for (const raw of items as RawItem[]) {
      if (!raw.finalized_at || !raw.category) continue
      stageCount.finalized++
      weighted.push({
        category: raw.category,
        width_mm: raw.width_mm,
        height_mm: raw.height_mm,
        material: raw.material,
        location: raw.location,
        purpose: raw.purpose,
        quantity: raw.quantity,
        weight: 100,
      })
    }

    // 4) 카테고리별 빈도 (가중치 모두 100이므로 빈도 카운트와 동일)
    const catMap = new Map<string, number>()
    for (const it of weighted) {
      catMap.set(it.category, (catMap.get(it.category) ?? 0) + it.weight)
    }
    const distribution = Array.from(catMap.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([category, weighted_count]) => ({ category, weighted_count }))

    // 5) 상위 8건
    const topItems = weighted.slice(0, 8)

    // 6) 시설 가이드 예외 패턴 수집 (같은 행사장 venue 기준 — 알람 무시 후 완료한 케이스)
    // 완료된 프로젝트의 exception이 "실제로 그렇게 해도 됐다"는 학습 신호 (결정 2026-05-12)
    let exceptionPatterns: ExceptionPattern[] = []
    try {
      const { data: exLogs } = await supabase
        .from('facility_exception_log')
        .select('rule, field, standard_value, user_value, item_id')
        .in('project_id', pids)

      if (exLogs && exLogs.length > 0) {
        // item_id → finalized 여부 매핑
        const finalizedSet = new Set(
          (items as RawItem[]).filter(it => !!it.finalized_at).map(it => it.project_id)
        )
        // rule + field 기준 집계
        const patternMap = new Map<string, ExceptionPattern>()
        for (const log of exLogs) {
          const key = `${log.rule}::${log.field}`
          const existing = patternMap.get(key)
          // item이 속한 project가 finalized인지 확인 (finalized_at 설정된 project)
          const isFinalizedProject = pids.some(pid =>
            finalizedSet.has(pid)
          )
          if (!existing) {
            patternMap.set(key, {
              rule: log.rule ?? '',
              field: log.field ?? '',
              standard_value: log.standard_value ?? null,
              user_value: log.user_value ?? null,
              count: 1,
              finalized_count: isFinalizedProject ? 1 : 0,
            })
          } else {
            existing.count++
            if (isFinalizedProject) existing.finalized_count++
          }
        }
        exceptionPatterns = Array.from(patternMap.values()).sort((a, b) => b.count - a.count)
      }
    } catch {
      // facility_exception_log 조회 실패 — 무시
    }

    return {
      matched_projects: matched.length,
      total_items: weighted.length,
      by_stage: stageCount,
      category_distribution: distribution,
      top_items: topItems,
      exception_patterns: exceptionPatterns,
      admin_signage_types: empty.admin_signage_types,
      admin_synonyms: empty.admin_synonyms,
      admin_facility_guide: empty.admin_facility_guide,
      note: `누적 ${matched.length}개 프로젝트 · 발주 완료 항목 ${weighted.length}건 (미완료 데이터 학습 제외)`,
    }
  } catch {
    return empty
  }
}

/**
 * v9.37 — 어드민 마스터(환경장식물 종류·동의어·시설 가이드) 자동 로드.
 * 테이블 미존재·RLS 차단 등 모든 오류는 안전 폴백(빈 배열).
 */
async function loadAdminMaster(venueName: string): Promise<{
  admin_signage_types: AdminSignageType[]
  admin_synonyms: AdminSynonym[]
  admin_facility_guide: AdminFacilityGuide | null
}> {
  const fallback = {
    admin_signage_types: [] as AdminSignageType[],
    admin_synonyms: [] as AdminSynonym[],
    admin_facility_guide: null as AdminFacilityGuide | null,
  }
  try {
    const supabase = createClient()

    // 환경장식물 종류 — 표준 시드 우선
    const { data: stypes } = await supabase
      .from('signage_types')
      .select('name, category, default_width_mm, default_height_mm, default_material, layout, is_standard, notes')
      .order('sort_order', { ascending: true })
      .limit(50)

    // 동의어 매핑
    const { data: synonyms } = await supabase
      .from('signage_aliases')
      .select('alias_name, canonical_name, kind')
      .limit(200)

    // 시설 가이드 — venue 이름 부분 일치로 1건 선택
    let guide: AdminFacilityGuide | null = null
    if (venueName.trim()) {
      const { data: venues } = await supabase
        .from('venues')
        .select('id, name, facility_guide_json')
        .not('facility_guide_json', 'is', null)
        .limit(50)

      if (venues && venues.length > 0) {
        const ranked = venues
          .map(v => ({ ...v, score: venueMatchScore(venueName, v.name) }))
          .filter(v => v.score > 0)
          .sort((a, b) => b.score - a.score)
        const best = ranked[0]
        if (best) {
          guide = {
            venue_id: best.id,
            venue_name: best.name,
            guide: best.facility_guide_json,
          }
        }
      }
    }

    return {
      admin_signage_types: (stypes as AdminSignageType[] | null) ?? [],
      admin_synonyms: (synonyms as AdminSynonym[] | null) ?? [],
      admin_facility_guide: guide,
    }
  } catch {
    return fallback
  }
}

/**
 * 5/22 사용자 명시 = 행사 관리 5대 영역 SEED + DB 영역 통합. event_history 테이블 있으면 SELECT·없으면 SEED fallback.
 * venue + programParts 매칭 행사 영역 signage_breakdown 합산하여 AI 프롬프트에 추가.
 */
interface EventHistoryDb {
  project_code: string | null
  project_name: string
  year: number | null
  venue: string
  program_parts: string[]
  signage_breakdown: Array<{ category: string; quantity: number; sizes?: string }>
  analyzed_item_count: number | null
  is_seed: boolean
  source: string
}

export async function buildSeedEventHistoryContext(venue: string, programParts?: string[]): Promise<string> {
  const venueNorm = venue.toLowerCase().replace(/\s/g, '')

  // 1. DB 영역 SELECT (event_history 테이블 있으면)
  let dbMatched: EventHistoryDb[] = []
  try {
    const supabase = createClient()
    const { data } = await supabase
      .from('event_history')
      .select('project_code, project_name, year, venue, program_parts, signage_breakdown, analyzed_item_count, is_seed, source')
      .is('deleted_at', null)
      .limit(500)
    if (data) {
      dbMatched = (data as EventHistoryDb[]).filter(e => {
        const evNorm = (e.venue ?? '').toLowerCase().replace(/\s/g, '')
        const venueMatch = evNorm.includes(venueNorm) || venueNorm.includes(evNorm)
        const partsMatch = !programParts?.length || (e.program_parts ?? []).some(p => programParts.includes(p))
        return venueMatch && partsMatch
      }).slice(0, 5)
    }
  } catch {
    // event_history 테이블 부재 영역 = SEED fallback
  }

  // 2. SEED fallback (DB 영역 빈 영역 or 부재)
  let matched: Array<EventHistoryDb & { is_db?: boolean }> = []
  if (dbMatched.length > 0) {
    matched = dbMatched.map(e => ({ ...e, is_db: true }))
  } else {
    matched = SEED_EVENT_HISTORY.filter(e => {
      const evNorm = e.venue.toLowerCase().replace(/\s/g, '')
      const venueMatch = evNorm.includes(venueNorm) || venueNorm.includes(evNorm)
      const partsMatch = !programParts?.length || (e.program_parts ?? []).some(p => programParts.includes(p))
      return venueMatch && partsMatch
    }).slice(0, 5).map(e => ({
      project_code: e.project_code,
      project_name: e.project_name,
      year: e.year,
      venue: e.venue,
      program_parts: e.program_parts ?? [],
      signage_breakdown: e.signage_breakdown ?? [],
      analyzed_item_count: e.analyzed_item_count ?? null,
      is_seed: true,
      source: 'seed',
    }))
  }

  if (matched.length === 0) return ''
  const lines: string[] = ['', '[행사 관리 SOT — 같은 행사장·파트 매칭 5건]']
  for (const e of matched) {
    const breakdown = e.signage_breakdown && e.signage_breakdown.length > 0
      ? e.signage_breakdown
      : estimateSignageBreakdown(e.program_parts, e.analyzed_item_count ?? undefined)
    if (breakdown.length === 0) continue
    const totalQty = breakdown.reduce((s, b) => s + b.quantity, 0)
    // 5/22 사용자 명시 = 동의어 매핑 → 표준명 자동 변환·AI 영역 표준화
    const top = breakdown.slice(0, 5).map(b => `${resolveCategoryStandard(b.category)}(${b.quantity}${b.sizes ? `·${b.sizes}` : ''})`).join(' / ')
    const sourceTag = e.source === 'manual' ? ' [사용자 추가]' : e.source === 'auto_project' ? ' [자동 누적]' : ' [SEED]'
    lines.push(`  - ${e.project_name} (${e.year ?? '?'}·${e.venue})${sourceTag}: 총 ${totalQty}건·${top}`)
    // 5/22 사용자 명시 = 프로그램 파트 영역 같은 형식·AI 영역에 동일 영역 정합
    if (e.program_parts && e.program_parts.length > 0) {
      lines.push(`     프로그램 파트: ${e.program_parts.join(', ')}`)
    }
  }
  lines.push('→ 위 데이터 = 행사장·파트 매칭 과거 사례. 추천 수량·종류·규격 산정 시 참고.')
  return lines.join('\n')
}

/** Gemini 프롬프트용 텍스트 압축 */
export function formatAccumulatedContext(ctx: AccumulatedContext): string {
  // v9.37 — 어드민 마스터 블록을 먼저 조립한다(누적 프로젝트가 0건이어도 노출).
  const adminBlock = formatAdminMaster(ctx)
  if (ctx.matched_projects === 0) return adminBlock
  const dist = ctx.category_distribution.slice(0, 10)
    .map(d => `${d.category}(${d.weighted_count})`).join(' / ')
  const tops = ctx.top_items.map((it, i) => {
    const size = it.width_mm && it.height_mm ? ` ${it.width_mm}×${it.height_mm}mm` : ''
    const mat = it.material ? ` / ${it.material}` : ''
    const loc = it.location ? ` @${it.location}` : ''
    return `${i + 1}. ${it.category}${size}${mat}${loc}`
  }).join('\n')

  const lines = [
    '',
    '[앱 누적 데이터 — 같은 행사장 발주 완료 기록]',
    `※ ${ctx.note}`,
    `카테고리 빈도 분포: ${dist}`,
    '상위 항목 (실제 발주 완료):',
    tops,
    '→ 모든 항목 = 실제로 다운로드·발주가 완료된 정답 신호. 우선 반영.',
  ]

  // 시설 가이드 예외 패턴 — 완료된 예외는 "실제로 허용된 것"으로 추천 시 반영
  // 제작 완료 > 시설 가이드 규칙 (decisions.md 2026-05-12)
  if (ctx.exception_patterns.length > 0) {
    lines.push('')
    lines.push('[시설 가이드 예외 패턴 — 이 행사장에서 가이드 외로 완료된 케이스]')
    lines.push('※ 아래 항목은 시설 가이드 경고가 있었으나 실제 발주·제작이 완료됨. 추천 시 이 패턴을 가이드보다 우선 반영할 것.')
    for (const p of ctx.exception_patterns.slice(0, 5)) {
      const finalNote = p.finalized_count > 0 ? ` (완료 ${p.finalized_count}회)` : ''
      lines.push(`  - rule:${p.rule} / field:${p.field} | 표준:${p.standard_value ?? '?'} → 실제사용:${p.user_value ?? '?'} | 총 ${p.count}회${finalNote}`)
    }
  }

  return [adminBlock, lines.join('\n')].filter(Boolean).join('\n')
}

/** v9.37 — 어드민 마스터(환경장식물 종류·동의어·시설 가이드) 블록 */
function formatAdminMaster(ctx: AccumulatedContext): string {
  const blocks: string[] = []

  // 환경장식물 종류
  if (ctx.admin_signage_types.length > 0) {
    const top = ctx.admin_signage_types.slice(0, 30).map(t => {
      const size = (t.default_width_mm && t.default_height_mm)
        ? ` ${t.default_width_mm}×${t.default_height_mm}mm`
        : ''
      const mat  = t.default_material ? ` / ${t.default_material}` : ''
      const lay  = t.layout ? ` (${t.layout})` : ''
      const std  = t.is_standard ? ' ★표준' : ''
      return `- ${t.name}${size}${mat}${lay}${std}`
    }).join('\n')
    blocks.push(`[환경장식물 종류 — 어드민 마스터(${ctx.admin_signage_types.length}종)]\n${top}`)
  }

  // 동의어
  if (ctx.admin_synonyms.length > 0) {
    const pairs = ctx.admin_synonyms.slice(0, 40)
      .map(s => `${s.alias_name} → ${s.canonical_name}`)
      .join(' / ')
    blocks.push(`[동의어 매핑 — 어드민 마스터(${ctx.admin_synonyms.length}건)]\n※ 사용자가 비표준 표기를 입력했을 때 표준명으로 정규화.\n${pairs}`)
  }

  // 시설 가이드
  if (ctx.admin_facility_guide) {
    const g = ctx.admin_facility_guide
    let body = ''
    try {
      body = JSON.stringify(g.guide, null, 0)
      if (body.length > 1200) body = body.slice(0, 1200) + '…'
    } catch {
      body = '(guide JSON 직렬화 실패)'
    }
    blocks.push(`[시설 가이드 — ${g.venue_name}]\n※ 행사장 시설 제약·표준 수량·금지 항목. 추천 후처리에서 강제 반영할 것.\n${body}`)
  }

  return blocks.length > 0 ? '\n' + blocks.join('\n\n') : ''
}
