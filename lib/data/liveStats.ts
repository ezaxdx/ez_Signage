// 사용자가 실제로 만든 projects + design_items 데이터를 집계.
// SEED_PERFLIST(정적 17건) + 라이브 데이터를 합쳐 추천에 사용.
//
// 자동 진화: 데이터 누적 시 신뢰도 자동 상승.

import type { SupabaseClient } from '@supabase/supabase-js'
import type { PerfListEntry } from '@/lib/data/dashboardSeed'

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
    return { liveAsPerfList: [], itemCountByProject: {}, categoryFrequency: {}, avgItemCountByVenue: {}, fetchedAt: Date.now() }
  }

  const ps = projects as LiveProject[]
  const projectIds = ps.map(p => p.id)

  // 2) design_items 집계 — 프로젝트별 item count + 카테고리
  let aggregates: LiveItemAggregate[] = []
  if (projectIds.length > 0) {
    const { data: items } = await supabase
      .from('design_items')
      .select('project_id, category')
      .in('project_id', projectIds)

    const aggMap = new Map<string, { count: number; cats: Set<string> }>()
    for (const it of (items ?? []) as { project_id: string; category: string | null }[]) {
      if (!aggMap.has(it.project_id)) aggMap.set(it.project_id, { count: 0, cats: new Set() })
      const a = aggMap.get(it.project_id)!
      a.count += 1
      if (it.category) a.cats.add(it.category)
    }
    aggregates = Array.from(aggMap.entries()).map(([pid, v]) => ({
      project_id: pid, item_count: v.count, categories: Array.from(v.cats),
    }))
  }

  const itemCountByProject: Record<string, number> = {}
  const categoryFrequency: Record<string, number> = {}
  for (const a of aggregates) {
    itemCountByProject[a.project_id] = a.item_count
    for (const c of a.categories) {
      categoryFrequency[c] = (categoryFrequency[c] ?? 0) + 1
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

  const result: LiveStats = {
    liveAsPerfList,
    itemCountByProject,
    categoryFrequency,
    avgItemCountByVenue,
    fetchedAt: Date.now(),
  }
  cache.set(userKey, { data: result, expiry: Date.now() + TTL })
  return result
}

/** 캐시 무효화 (프로젝트 생성 후 호출) */
export function invalidateLiveStatsCache() {
  cache.clear()
}
