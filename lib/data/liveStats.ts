// 사용자가 실제로 만든 projects + design_items 데이터를 집계.
// SEED_PERFLIST(정적 17건) + 라이브 데이터를 합쳐 추천에 사용.
//
// 자동 진화: 데이터 누적 시 신뢰도 자동 상승.

import type { SupabaseClient } from '@supabase/supabase-js'
import type { PerfListEntry } from '@/lib/data/dashboardSeed'
import { resolveAliasSync, loadAliases } from '@/lib/services/aliasResolver'

interface LiveProject {
  id: string
  name: string
  client_name: string | null
  event_venue: string | null
  event_date: string | null
}

interface LiveItemAggregate {
  project_id: string
  item_count: number
  categories: string[]
}

export interface LiveStats {
  /** 라이브 프로젝트가 SEED 형식으로 변환된 것 */
  liveAsPerfList: PerfListEntry[]
  /** project_id → analyzed_item_count 매핑 */
  itemCountByProject: Record<string, number>
  /** 카테고리별 출현 빈도 (전체 라이브) */
  categoryFrequency: Record<string, number>
  /** 행사장별 평균 item 수 */
  avgItemCountByVenue: Record<string, number>
  /** v4.1: 프로그램 파트 코드별 출현 빈도 (사용자 핵심 지시 — 자동 누적) */
  programPartFrequency: Record<string, number>
  /** v4.1: 프로그램 파트 + 행사장 조합별 평균 item 수 (추천 정확도 강화용) */
  itemCountByPartVenue: Record<string, number>
  /** 마지막 갱신 시각 */
  fetchedAt: number
}

const cache = new Map<string, { data: LiveStats; expiry: number }>()
const TTL = 1000 * 60 * 5 // 5분

/**
 * 라이브 프로젝트 통계 집계.
 * 5분 캐시 유지 (모달 열 때마다 다시 조회 방지).
 */
export async function fetchLiveStats(supabase: SupabaseClient): Promise<LiveStats> {
  const userKey = 'all'  // 추후 user_id별 분리 가능
  const cached = cache.get(userKey)
  if (cached && cached.expiry > Date.now()) return cached.data

  // 1) 프로젝트 목록 (사용자 권한 내)
  const { data: projects, error: pErr } = await supabase
    .from('projects')
    .select('id, name, client_name, event_venue, event_date')
    .order('event_date', { ascending: false })
    .limit(500)

  if (pErr || !projects) {
    return { liveAsPerfList: [], itemCountByProject: {}, categoryFrequency: {}, avgItemCountByVenue: {}, programPartFrequency: {}, itemCountByPartVenue: {}, fetchedAt: Date.now() }
  }

  // 별도 select로 program_parts 가져오기 (컬럼 미존재 시 안전)
  let projectsWithParts: { id: string; program_parts: string[] | null }[] = []
  try {
    const { data: pp } = await supabase.from('projects').select('id, program_parts').limit(500)
    projectsWithParts = (pp ?? []) as typeof projectsWithParts
  } catch { /* program_parts 컬럼 없음 (마이그레이션 v6 미적용) */ }
  const partsByProject = new Map<string, string[]>()
  for (const p of projectsWithParts) {
    if (p.program_parts && p.program_parts.length > 0) partsByProject.set(p.id, p.program_parts)
  }

  const ps = projects as LiveProject[]
  const projectIds = ps.map(p => p.id)

  // HOTFIX (2026-05-20 δ 정책): project_archive 호출 제거.
  //   PR#1에서 event_history를 학습 SOT로 단일화 (DeleteProjectButton이 design_items ≥3건 시 UPSERT).
  //   project_archive는 v4d 마이그레이션 미적용 라이브에서 404 노이즈만 발생.
  //   삭제 프로젝트 통계는 event_history.source='manual_delete' 경로로 이미 보존됨.

  // 2) design_items 집계 — 프로젝트별 item count + 카테고리 (동의어 정규화 적용)
  let aggregates: LiveItemAggregate[] = []
  if (projectIds.length > 0) {
    // 동의어 시드 + DB 정책 통합 로드 (한 번만)
    const aliases = await loadAliases(supabase)

    const { data: items } = await supabase
      .from('design_items')
      .select('project_id, category')
      .in('project_id', projectIds)

    const aggMap = new Map<string, { count: number; cats: Set<string> }>()
    for (const it of (items ?? []) as { project_id: string; category: string | null }[]) {
      if (!aggMap.has(it.project_id)) aggMap.set(it.project_id, { count: 0, cats: new Set() })
      const a = aggMap.get(it.project_id)!
      a.count += 1
      if (it.category) {
        // 동의어 → 표준명 정규화 (스프링배너 → X배너 등)
        const normalized = resolveAliasSync(it.category, aliases).canonical
        a.cats.add(normalized)
      }
    }
    aggregates = Array.from(aggMap.entries()).map(([pid, v]) => ({
      project_id: pid, item_count: v.count, categories: Array.from(v.cats),
    }))
  }

  const itemCountByProject: Record<string, number> = {}
  const categoryFrequency: Record<string, number> = {}
  const programPartFrequency: Record<string, number> = {}
  const itemCountByPartVenue: Record<string, number> = {}
  for (const a of aggregates) {
    itemCountByProject[a.project_id] = a.item_count
    for (const c of a.categories) {
      categoryFrequency[c] = (categoryFrequency[c] ?? 0) + 1
    }
    // v4.1: program_parts 누적 (사용자 핵심 지시)
    const parts = partsByProject.get(a.project_id) ?? []
    for (const code of parts) {
      programPartFrequency[code] = (programPartFrequency[code] ?? 0) + 1
    }
    // v4.1: program_part × venue 조합 평균 item 수
    const proj = ps.find(p => p.id === a.project_id)
    if (proj?.event_venue && parts.length > 0 && a.item_count > 0) {
      for (const code of parts) {
        const key = `${code}::${proj.event_venue}`
        // 단순 누계로 두고 평균은 호출 측에서 사용 — 여기서는 sum 저장
        itemCountByPartVenue[key] = ((itemCountByPartVenue[key] ?? 0) + a.item_count)
      }
    }
  }

  // 3) 행사장별 평균 item 수
  const venueCounts = new Map<string, { total: number; n: number }>()
  for (const p of ps) {
    if (!p.event_venue) continue
    const cnt = itemCountByProject[p.id] ?? 0
    if (cnt === 0) continue   // 항목 없는 프로젝트 제외
    const v = venueCounts.get(p.event_venue) ?? { total: 0, n: 0 }
    v.total += cnt
    v.n += 1
    venueCounts.set(p.event_venue, v)
  }
  const avgItemCountByVenue: Record<string, number> = {}
  for (const [venue, v] of Array.from(venueCounts.entries())) {
    avgItemCountByVenue[venue] = Math.round(v.total / v.n)
  }

  // 4) 라이브 프로젝트 → PerfListEntry 형식 변환 (SEED와 합치기 위해)
  // 활성 프로젝트 + 아카이브된 프로젝트 모두 포함 (삭제해도 통계 보존)
  const liveAsPerfList: PerfListEntry[] = ps.map(p => ({
    code: `live_${p.id.slice(0, 8)}`,
    pm_division: '',
    pm_team: '',
    pm_name: '',
    project_name: p.name,
    year: p.event_date ? new Date(p.event_date).getFullYear() : new Date().getFullYear(),
    start_date: p.event_date ?? '',
    end_date: p.event_date ?? '',
    region: '',
    venue: p.event_venue ?? '',
    client: p.client_name ?? '',
    event_category: '',
    industry: '',
    event_format: '',
    organizer: '',
    host: '',
  }))

  // HOTFIX (2026-05-20 δ 정책): 아카이브 통계 합산 로직 제거.
  //   project_archive 호출 제거에 따라 본 블록도 폐기. 삭제 프로젝트 통계는 event_history 경로로 일원화.

  const result: LiveStats = {
    liveAsPerfList,
    itemCountByProject,
    categoryFrequency,
    avgItemCountByVenue,
    programPartFrequency,
    itemCountByPartVenue,
    fetchedAt: Date.now(),
  }
  cache.set(userKey, { data: result, expiry: Date.now() + TTL })
  return result
}

/** 캐시 무효화 (프로젝트 생성 후 호출) */
export function invalidateLiveStatsCache() {
  cache.clear()
}
