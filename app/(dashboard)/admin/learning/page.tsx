import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/auth/role'
import { LearningManagerClient } from './LearningManagerClient'
import { SEED_SYNONYMS, SEED_EVENT_HISTORY } from '@/lib/data/dashboardSeed'
import { VENUE_FACILITY_GUIDE_SEED, findVenueKey } from '@/lib/data/venueFacilityGuide'
import { normalizeVenueName } from '@/lib/venueIntel'
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
  // 5/22 영역 A1 = event_history DB SSR fetch 추가 (sigage_breakdown·program_parts 영역 SSR 영역 = 라이브 즉시 표시)
  const [venuesRes, requestsRes, jobsRes, projectsRes, itemsRes, aliasesRes, eventHistoryRes, loadedSignageTypes] = await Promise.all([
    supabase.from('venues').select('*').order('created_at', { ascending: false }).then(r => r, () => ({ data: [], error: null })),
    supabase.from('venue_requests').select('*').order('requested_at', { ascending: false }).then(r => r, () => ({ data: [], error: null })),
    supabase.from('learning_jobs').select('*').order('triggered_at', { ascending: false }).limit(50).then(r => r, () => ({ data: [], error: null })),
    supabase.from('projects').select('id, name, event_venue, event_date, program_parts, status, created_at, last_edited_by').limit(500).order('created_at', { ascending: false }).then(r => r, () => ({ data: [], error: null })),
    supabase.from('design_items').select('project_id, category, confirmed, finalized_at, location, purpose, quantity, width_mm, height_mm').limit(5000).then(r => r, () => ({ data: [], error: null })),
    supabase.from('signage_aliases').select('id, alias_name, canonical_name, note').order('alias_name').then(r => r, () => ({ data: [], error: null })),
    supabase.from('event_history').select('*').is('deleted_at', null).limit(500).then(r => r, () => ({ data: [], error: null })),
    loadSignageTypes(supabase),
  ])

  // venue별 단계 집계 (점진적 정확도 가시화)
  type Project = { id: string; name: string; event_venue: string | null; event_date: string | null; program_parts: string[] | null; status: string | null; created_at: string; last_edited_by: string | null }
  type Item = { project_id: string; category: string | null; confirmed: boolean | null; finalized_at: string | null; location: string | null; purpose: string | null; quantity?: number | null; width_mm?: number | null; height_mm?: number | null }
  const projectsList = (projectsRes.data ?? []) as Project[]
  const itemsList = (itemsRes.data ?? []) as Item[]

  // 5/22 사용자 명시 = 데이터 학습 관리자 = 사용자 프로젝트별 정보 추가
  // 회의록 5/21 김연아 대리님 명시 = "학습 시킨 프로젝트가 뭔지 정확하지 않으면 더 학습 가이드를 줄 수 없거든요"
  const userProjectIndex = projectsList.map(p => {
    const pItems = itemsList.filter(it => it.project_id === p.id)
    const total = pItems.length
    const finalized = pItems.filter(it => it.finalized_at).length
    return {
      id: p.id,
      name: p.name,
      event_venue: p.event_venue,
      event_date: p.event_date,
      status: p.status ?? '준비중',
      total_items: total,
      finalized_items: finalized,
      completion_rate: total > 0 ? Math.round((finalized / total) * 100) : 0,
      program_parts: p.program_parts ?? [],
      created_at: p.created_at,
      last_edited_by: p.last_edited_by,
    }
  })

  // PR#1 단위 8 (δ 정책): userEventHistory 누적 조건 강화 (lazy union 패턴).
  //   ① 완료 status — 완료 버튼이 event_history POST 실패해도 lazy union으로 합쳐서 표시
  //   ② 행사일 + 7일 경과 — 자동 누적 (별도 cron 없음, 화면 진입 시점에 합성)
  //   AND design_items ≥3건 (1~2건 노이즈 제거)
  //   AND event_history DB에 미수록 (project_code slice(0,12) 매칭 — completeProject 헬퍼와 정합)
  //   source 태그로 시드·완료수동·자동 D+7 구분.
  const eventHistoryDbCodes = new Set(
    ((eventHistoryRes.data ?? []) as Array<{ project_code: string | null }>).map(e => e.project_code).filter(Boolean) as string[]
  )
  // HOTFIX (2026-05-20 옵션 A): D-7 lazy union 제거 — 완료 status만 트리거
  // HOTFIX (2026-05-20 옵션 A): PO 정책 — 모든 완료 행사 표시.
  //   기존 필터 (event_venue·design_items ≥3·행사일+7일) 제거.
  //   완료 status 한 가지만 트리거. 테스트·미정·짧은 이름 행사도 모두 표시.
  //   향후 PO가 직접 정리 예정.
  const userEventHistory = projectsList
    .map(p => {
      const pItems = itemsList.filter(it => it.project_id === p.id)
      // 옵션 A: 완료 status 한 가지만 필요 조건
      const isCompleted = p.status === '완료'
      if (!isCompleted) return null
      // 중복 방지: event_history DB에 이미 수록된 project_code skip
      const code12 = p.id.slice(0, 12)
      if (eventHistoryDbCodes.has(code12)) return null

      const sigByCategory = new Map<string, { quantity: number; sizes: Set<string> }>()
      for (const it of pItems) {
        if (!it.category) continue
        const prev = sigByCategory.get(it.category) ?? { quantity: 0, sizes: new Set() }
        prev.quantity += it.quantity ?? 1
        if (it.width_mm && it.height_mm) prev.sizes.add(`${it.width_mm}×${it.height_mm}`)
        sigByCategory.set(it.category, prev)
      }
      const signage_breakdown = Array.from(sigByCategory.entries())
        .map(([category, v]) => ({ category, quantity: v.quantity, sizes: Array.from(v.sizes).join('·') || undefined }))
        .sort((a, b) => b.quantity - a.quantity)
      return {
        project_name: p.name,
        project_code: code12,
        year: p.event_date ? new Date(p.event_date).getFullYear() : new Date(p.created_at).getFullYear(),
        // HOTFIX: event_venue nullish 방어 — 옵션 A로 venue='미정'도 표시
        venue: (p.event_venue ? normalizeVenueName(p.event_venue) : null) || '미정',
        category_tag: '일반' as const,
        has_excel: pItems.some(it => it.finalized_at != null),
        has_image: false,
        analyzed_item_count: pItems.length,
        program_parts: p.program_parts ?? [],
        signage_breakdown: signage_breakdown.length > 0 ? signage_breakdown : undefined,
        is_user_project: true,
        // 옵션 A: 완료 status만 트리거 → 모두 'auto_project'
        source: 'auto_project' as const,
      }
    })
    .filter((p): p is NonNullable<typeof p> => p !== null)
  const venueByPid = new Map<string, string>()
  const programPartsByPid = new Map<string, string[]>()
  for (const p of projectsList) {
    if (p.event_venue) venueByPid.set(p.id, p.event_venue)
    if (p.program_parts?.length) programPartsByPid.set(p.id, p.program_parts)
  }

  // 5/22 사용자 명시 = 행사장 학습 현황에 환경장식물별 사용 정보 추가
  const venueStatusMap = new Map<string, { projects: Set<string>; input: number; mid: number; confirmed: number; finalized: number; missingCats: Set<string>; totalItems: number; programParts: Set<string>; signageByCategory: Map<string, number> }>()
  for (const it of itemsList) {
    const v = venueByPid.get(it.project_id)
    if (!v) continue
    if (!venueStatusMap.has(v)) venueStatusMap.set(v, { projects: new Set(), input: 0, mid: 0, confirmed: 0, finalized: 0, missingCats: new Set(), totalItems: 0, programParts: new Set(), signageByCategory: new Map() })
    const s = venueStatusMap.get(v)!
    s.projects.add(it.project_id)
    s.totalItems++
    if (it.category) {
      s.signageByCategory.set(it.category, (s.signageByCategory.get(it.category) ?? 0) + (it.quantity ?? 1))
    }
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
    if (!venueStatusMap.has(vk)) venueStatusMap.set(vk, { projects: new Set(), input: 0, mid: 0, confirmed: 0, finalized: 0, missingCats: new Set(), totalItems: 0, programParts: new Set(), signageByCategory: new Map() })
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
    // 5/22 사용자 명시 = SEED signage_breakdown도 venue별 합산 (행사장 학습 현황에 환경장식물별 사용 정보 추가)
    const breakdown = ev.signage_breakdown ?? []
    for (const b of breakdown) {
      s.signageByCategory.set(b.category, (s.signageByCategory.get(b.category) ?? 0) + b.quantity)
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

      // 5/22 사용자 명시 = 환경장식물별 사용 정보 (행사장 학습 현황에 표시)
      const signageBreakdown = Array.from(s.signageByCategory.entries())
        .map(([category, quantity]) => ({ category, quantity }))
        .sort((a, b) => b.quantity - a.quantity)

      return {
        venue,
        project_count: s.projects.size,
        item_count: total,
        stage: { input: s.input, mid: s.mid, confirmed: s.confirmed, finalized: s.finalized },
        accuracy_estimate: accuracy,
        learned_categories: s.missingCats.size,
        program_parts: partNames,
        category_coverage: categoryCoverage,
        signage_breakdown: signageBreakdown,
      }
    })
    .sort((a, b) => b.item_count - a.item_count)

  // 시설 가이드 학습 현황 (§13-3 신규)
  // 5/22 사용자 명시 = 3 댑스 (L1 venue → L2 halls/세부 → L3 학습 내용)
  // 시드(VENUE_FACILITY_GUIDE_SEED) + venues.facility_guide_json (사용자 편집 영역) 합산
  type VenuesRow = { id?: string; name?: string; facility_guide_json?: unknown; updated_at?: string }
  const venuesWithGuide = ((venuesRes.data ?? []) as VenuesRow[]).filter(v => v && v.facility_guide_json)

  const facilityGuideStatus = [
    ...VENUE_FACILITY_GUIDE_SEED.map(g => {
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
        completeness,
        last_updated: g.last_updated,
        source: 'seed' as const,
        // 5/22 = L3 raw 데이터 (3 댑스 펼침 영역)
        install_allowed: g.install_allowed ?? [],
        warnings: g.warnings ?? [],
        mount_methods: g.mount_methods ?? null,
        rigging: g.rigging ?? null,
        safety: g.safety ?? null,
        digital_signage: g.digital_signage ?? null,
        special_notes: g.special_notes ?? [],
      }
    }),
    // venues.facility_guide_json (사용자 추가 영역)
    ...venuesWithGuide.map(v => {
      const j = (v.facility_guide_json ?? {}) as {
        install_allowed?: Array<{ category?: string; status?: string; note?: string }>
        warnings?: Array<{ type?: string; description?: string }>
        mount_methods?: unknown
        rigging?: { available?: boolean; note?: string }
        safety?: unknown
        digital_signage?: unknown
        special_notes?: string[]
      }
      const ia = Array.isArray(j.install_allowed) ? j.install_allowed : []
      const wn = Array.isArray(j.warnings) ? j.warnings : []
      const completeness = [
        ia.length > 0,
        j.mount_methods != null,
        j.rigging?.available != null,
        j.safety != null,
        wn.length > 0,
        j.digital_signage != null,
      ].filter(Boolean).length
      return {
        venue_key: `db_${v.id ?? v.name ?? ''}`,
        venue_name: v.name ?? '미상',
        categories_count: ia.length,
        warnings_count: wn.length,
        completeness,
        last_updated: v.updated_at ?? null,
        source: 'db' as const,
        install_allowed: ia,
        warnings: wn,
        mount_methods: j.mount_methods ?? null,
        rigging: j.rigging ?? null,
        safety: j.safety ?? null,
        digital_signage: j.digital_signage ?? null,
        special_notes: Array.isArray(j.special_notes) ? j.special_notes : [],
      }
    }),
  ]

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
      userProjectIndex={userProjectIndex}
      userEventHistory={userEventHistory}
      serverEventHistory={((eventHistoryRes.data ?? []) as typeof SEED_EVENT_HISTORY)}
    />
  )
}
