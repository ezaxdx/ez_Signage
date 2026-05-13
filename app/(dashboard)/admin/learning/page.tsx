import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/auth/role'
import { LearningManagerClient } from './LearningManagerClient'
import { SEED_SYNONYMS, SEED_EVENT_HISTORY } from '@/lib/data/dashboardSeed'
import { VENUE_FACILITY_GUIDE_SEED, findVenueKey } from '@/lib/data/venueFacilityGuide'
import { PROGRAM_PART_BY_CODE } from '@/lib/programParts'
import { loadSignageTypes } from '@/lib/data/signageTypeLoader'
import {
  computeVenueCategoryCoverage,
  buildCoverageForUnregisteredVenue,
  STANDARD_CATEGORY_BY_KEY,
  type StandardCategoryKey,
} from '@/lib/data/signageCategoryStandards'

export const metadata = { title: '데이터 학습 관리자 | 제작물 리스트 가이드' }

export default async function LearningManagerPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  if (!(await isAdmin(supabase))) redirect('/dashboard')

  // 초기 데이터 (병렬). v6 마이그레이션 미적용이면 빈 배열로 폴백.
  const [venuesRes, requestsRes, jobsRes, projectsRes, itemsRes, aliasesRes, loadedSignageTypes] = await Promise.all([
    supabase.from('venues').select('*').order('created_at', { ascending: false }).then(r => r, () => ({ data: [], error: null })),
    supabase.from('venue_requests').select('*').order('requested_at', { ascending: false }).then(r => r, () => ({ data: [], error: null })),
    supabase.from('learning_jobs').select('*').order('triggered_at', { ascending: false }).limit(50).then(r => r, () => ({ data: [], error: null })),
    supabase.from('projects').select('id, event_venue, program_parts').limit(500).then(r => r, () => ({ data: [], error: null })),
    supabase.from('design_items').select('project_id, category, confirmed, finalized_at, location, purpose').limit(5000).then(r => r, () => ({ data: [], error: null })),
    supabase.from('signage_aliases').select('id, alias_name, canonical_name, note').order('alias_name').then(r => r, () => ({ data: [], error: null })),
    loadSignageTypes(supabase),
  ])

  // venue별 단계 집계 (점진적 정확도 가시화)
  type Project = { id: string; event_venue: string | null; program_parts: string[] | null }
  type Item = { project_id: string; category: string | null; confirmed: boolean | null; finalized_at: string | null; location: string | null; purpose: string | null }
  const projectsList = (projectsRes.data ?? []) as Project[]
  const itemsList = (itemsRes.data ?? []) as Item[]
  const venueByPid = new Map<string, string>()
  const programPartsByPid = new Map<string, string[]>()
  for (const p of projectsList) {
    if (p.event_venue) venueByPid.set(p.id, p.event_venue)
    if (p.program_parts?.length) programPartsByPid.set(p.id, p.program_parts)
  }

  const venueStatusMap = new Map<string, { projects: Set<string>; input: number; mid: number; confirmed: number; finalized: number; missingCats: Set<string>; totalItems: number; programParts: Set<string> }>()
  for (const it of itemsList) {
    const v = venueByPid.get(it.project_id)
    if (!v) continue
    if (!venueStatusMap.has(v)) venueStatusMap.set(v, { projects: new Set(), input: 0, mid: 0, confirmed: 0, finalized: 0, missingCats: new Set(), totalItems: 0, programParts: new Set() })
    const s = venueStatusMap.get(v)!
    s.projects.add(it.project_id)
    s.totalItems++
    if (it.finalized_at) s.finalized++
    else if (it.confirmed) s.confirmed++
    else if (it.location || it.purpose) s.mid++
    else s.input++
    if (it.category) s.missingCats.add(it.category)
    // 프로그램 파트 집계
    const parts = programPartsByPid.get(it.project_id)
    if (parts) for (const pt of parts) s.programParts.add(pt)
  }

  // 시드 이벤트 히스토리 합산 — has_excel 이벤트를 venue별 학습 데이터로 반영
  for (const ev of SEED_EVENT_HISTORY) {
    if (!ev.has_excel) continue
    const vk = ev.venue
    if (!venueStatusMap.has(vk)) venueStatusMap.set(vk, { projects: new Set(), input: 0, mid: 0, confirmed: 0, finalized: 0, missingCats: new Set(), totalItems: 0, programParts: new Set() })
    const s = venueStatusMap.get(vk)!
    s.projects.add(ev.project_code ?? ev.project_name)
    const cnt = ev.analyzed_item_count
    if (cnt && cnt > 0) {
      s.finalized += cnt
      s.totalItems += cnt
    } else {
      // 엑셀은 있지만 미분석 — 1건 confirmed 계상
      s.confirmed += 1
      s.totalItems += 1
    }
  }

  // v9.22: 6대 표준 카테고리 학습 커버리지 계산 (시설 가이드 시드 + 천정배너 패턴)
  const categoryCoverageList = computeVenueCategoryCoverage()

  const venueLearningStatus = Array.from(venueStatusMap.entries())
    .map(([venue, s]) => {
      const total = s.totalItems
      const accuracy = total === 0 ? 0
        : Math.round(((s.finalized * 100 + s.confirmed * 70 + s.mid * 30 + s.input * 10) / total))
      const partNames = Array.from(s.programParts)
        .map(code => PROGRAM_PART_BY_CODE.get(code)?.name ?? code)

      // 6대 카테고리 커버리지 매칭 (venue 한글명 → venue_key)
      // v9.23: findVenueKey 매칭 실패 시 buildCoverageForUnregisteredVenue fallback —
      // 롯데호텔·평창 알펜시아 등 시설 가이드 미등록 행사장도 발주엑셀 통합 맵으로 커버리지 산출
      const venueKey = findVenueKey(venue)
      const cov = venueKey
        ? categoryCoverageList.find(c => c.venue_key === venueKey) ?? null
        : buildCoverageForUnregisteredVenue(venue)
      const categoryCoverage = cov
        ? {
            filled: (Object.entries(cov.has_data) as [StandardCategoryKey, boolean][])
              .filter(([, v]) => v)
              .map(([k]) => STANDARD_CATEGORY_BY_KEY.get(k)?.label ?? k),
            missing: (Object.entries(cov.has_data) as [StandardCategoryKey, boolean][])
              .filter(([, v]) => !v)
              .map(([k]) => STANDARD_CATEGORY_BY_KEY.get(k)?.label ?? k),
            priority_1_missing: cov.missing_priority_1.map(
              k => STANDARD_CATEGORY_BY_KEY.get(k)?.label ?? k
            ),
          }
        : undefined

      return {
        venue,
        project_count: s.projects.size,
        item_count: total,
        stage: { input: s.input, mid: s.mid, confirmed: s.confirmed, finalized: s.finalized },
        accuracy_estimate: accuracy,
        learned_categories: s.missingCats.size,
        program_parts: partNames,
        category_coverage: categoryCoverage,
      }
    })
    .sort((a, b) => b.item_count - a.item_count)

  // 시설 가이드 학습 현황 (§13-3 신규)
  const facilityGuideStatus = VENUE_FACILITY_GUIDE_SEED.map(g => {
    const completeness = [
      g.install_allowed && g.install_allowed.length > 0,
      g.mount_methods != null,
      g.rigging && g.rigging.available != null,
      g.safety != null,
      g.warnings && g.warnings.length > 0,
      g.digital_signage != null,
    ].filter(Boolean).length
    return {
      venue_key: g.venue_key,
      venue_name: g.venue_name,
      categories_count: g.install_allowed?.length ?? 0,
      warnings_count: g.warnings?.length ?? 0,
      completeness,            // 0~6 (정보 종류 채워진 개수)
      last_updated: g.last_updated,
    }
  })

  const signageTypesForClient = loadedSignageTypes.map(t => ({
    id: t.id, name: t.name, width_mm: t.width_mm, height_mm: t.height_mm,
    default_material: t.default_material, category: t.category, layout: t.layout,
  }))

  return (
    <LearningManagerClient
      userId={user.id}
      initialVenues={(venuesRes.data ?? []) as never[]}
      initialRequests={(requestsRes.data ?? []) as never[]}
      initialJobs={(jobsRes.data ?? []) as never[]}
      venueLearningStatus={venueLearningStatus}
      signageTypeCount={signageTypesForClient.length}
      synonyms={SEED_SYNONYMS}
      dbAliases={((aliasesRes.data ?? []) as Array<{ id: string; alias_name: string; canonical_name: string; note: string | null }>)}
      facilityGuideStatus={facilityGuideStatus}
      signageTypes={signageTypesForClient}
      isAdmin={true}
    />
  )
}
