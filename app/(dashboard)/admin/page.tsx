import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/auth/role'
import { AdminOpsClient } from './AdminOpsClient'
import { PROGRAM_PART_BY_CODE } from '@/lib/programParts'

export const metadata = { title: '관리자 페이지 — 운영 대시보드 | 제작물 리스트 가이드' }

// v9.26: 운영 KPI ↔ 전체 프로젝트 현황 통합 (사용자 피드백 ① 반영)
// 명세: docs/ADMIN_REDESIGN_260513.md
// v9.49 (2026-05-14): IA SOT 외 영역 2개 삭제 — partStageBars(파트별 Stacked Bar) + calendarItems(D-14~D+7 캘린더)
//   사용자(조기흠 사원) IA SOT (김연아 대리님 스크린샷) = 운영 대시보드에 ′KPI 4 + 프로젝트 등록 현황′만 존재
//   → partStageMap·calStart·calEnd·calendarItems 계산 로직 일괄 제거 + AdminOpsClient prop에서 제외
export default async function AdminOpsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  if (!(await isAdmin(supabase))) redirect('/dashboard')

  // ── 데이터 병렬 로드 (RLS 적용 — admin은 모든 프로젝트 조회 가능) ───────────────
  const [projectsRes, itemsRes, profilesRes] = await Promise.all([
    supabase
      .from('projects')
      .select('id, name, event_venue, event_date, stage, status, owner_id, program_parts, created_at, allowed_users')
      .order('created_at', { ascending: false })
      .limit(1000)
      .then(r => r, () => ({ data: [], error: null })),
    supabase
      .from('design_items')
      .select('project_id, category, confirmed, finalized_at, last_edited_by, review_status')
      .limit(20000)
      .then(r => r, () => ({ data: [], error: null })),
    supabase
      .from('profiles')
      .select('id, email, display_name')
      .limit(1000)
      .then(r => r, () => ({ data: [], error: null })),
  ])

  type Project = {
    id: string
    name: string
    event_venue: string | null
    event_date: string | null
    stage: string | null
    status: string | null
    owner_id: string
    program_parts: string[] | null
    created_at: string
    allowed_users: string[] | null
  }
  type Item = {
    project_id: string
    category: string | null
    confirmed: boolean | null
    finalized_at: string | null
    last_edited_by: string | null
    review_status: string | null
  }

  const projects = (projectsRes.data ?? []) as Project[]
  const items = (itemsRes.data ?? []) as Item[]
  const profiles = (profilesRes.data ?? []) as Array<{ id: string; email: string; display_name: string | null }>
  const profileById = new Map(profiles.map(p => [p.id, p]))

  // ── KPI 계산 ───────────────────────────────────────────────────────────
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // 진행 프로젝트
  const inProgressCount = projects.filter(p =>
    p.stage && ['발주완료', '시안검수', '수정중', '확정'].includes(p.stage)
  ).length

  // 신규 프로젝트 (최근 일주일 = 7일 전부터 today)
  // v9.47: IA SOT 명시 ′최근 일주일′ — weekStart(이번 주 일요일) 대신 7일 전 기준으로 변경
  const sevenDaysAgo = new Date(today)
  sevenDaysAgo.setDate(today.getDate() - 7)
  const thisWeekNew = projects.filter(p => {
    const c = new Date(p.created_at)
    return c >= sevenDaysAgo
  }).length

  // 전체 프로젝트 수 (v9.47 신규 — 누적 카운트)
  const totalProjects = projects.length

  // 발주서 완료율 — finalized_items / total_items
  // v9.47: IA의 ′완료 프로젝트 수(완료율)′ 의미 — 발주 단계 완료 비율로 매핑
  const totalItems = items.length
  const finalizedItems = items.filter(it => !!it.finalized_at).length
  const finalizedRate = totalItems === 0 ? 0 : Math.round((finalizedItems / totalItems) * 100)

  // v9.47: ′이번 주 발주 완료(thisWeekFinalized)′·′추천 전환율(conversionRate)′ 카드는 IA에서 제외 → 계산 제거
  // v9.49: weekStart 변수도 더 이상 필요 없음 (이전 보존 사유 사라짐) — 함께 제거

  // ── 프로젝트 등록 현황 — 테이블 데이터 가공 ───────────────────────────
  const itemsByPid = new Map<string, Item[]>()
  for (const it of items) {
    if (!itemsByPid.has(it.project_id)) itemsByPid.set(it.project_id, [])
    itemsByPid.get(it.project_id)!.push(it)
  }

  const projectsTable = projects.map((p, idx) => {
    const pItems = itemsByPid.get(p.id) ?? []
    const pTotal = pItems.length
    const pConfirmed = pItems.filter(it => it.confirmed).length
    const pFinalized = pItems.filter(it => !!it.finalized_at).length
    const confirmRate = pTotal === 0 ? 0 : Math.round((pConfirmed / pTotal) * 100)

    // 프로젝트별 AI 정확도 추정
    let pWeighted = 0
    for (const it of pItems) {
      if (it.finalized_at) pWeighted += 100
      else if (it.confirmed) pWeighted += 70
      else if (it.review_status === '확인필요' || it.review_status === '수정요청') pWeighted += 30
      else pWeighted += 10
    }
    const pAccuracy = pTotal === 0 ? 0 : Math.round(pWeighted / pTotal)

    // PM (소유자 email/display_name)
    const owner = profileById.get(p.owner_id)
    const pmName = owner?.display_name ?? owner?.email?.split('@')[0] ?? '—'

    // 파트 (program_parts 한글)
    const partLabels = (p.program_parts ?? [])
      .map(code => PROGRAM_PART_BY_CODE.get(code)?.name ?? code)
      .join(', ')

    // 발주일 — 가장 빠른 finalized_at
    const finalizedDates = pItems
      .filter(it => it.finalized_at)
      .map(it => it.finalized_at!)
      .sort()
    const orderDate = finalizedDates[0] ?? null

    // 담당자 — 마지막 편집자
    const lastEditor = pItems
      .filter(it => it.last_edited_by)
      .map(it => it.last_edited_by!)
      .pop()
    const lastEditorName = lastEditor ? lastEditor.split('@')[0] : '—'

    return {
      no: String(idx + 1).padStart(2, '0'),
      id: p.id,
      part: partLabels || '—',
      pm: pmName,
      event_name: p.name,
      event_venue: p.event_venue ?? '—',
      stage: p.stage ?? p.status ?? '준비중',
      order_date: orderDate ? new Date(orderDate).toISOString().slice(0, 10) : '—',
      confirm_rate: confirmRate,
      item_count: pTotal,
      ai_accuracy: pAccuracy,
      manager: lastEditorName,
      note: pFinalized === pTotal && pTotal > 0 ? '발주 완료' : '',
      event_date: p.event_date,
    }
  })

  // v9.49 (2026-05-14): IA SOT 외 영역 2개 계산 로직 삭제
  //   ① ′파트별 상태 분포 (Stacked Bar)′ — partStageMap·partStageBars 산출 제거
  //   ② ′이번 달 일정 (D-14 ~ D+7)′ — calStart·calEnd·calendarItems 산출 제거
  //   사용자 IA SOT 명시: 운영 대시보드 = KPI 4 + 프로젝트 등록 현황만

  return (
    <AdminOpsClient
      kpi={{
        inProgress: inProgressCount,
        thisWeekNew,
        totalProjects,
        finalizedRate,
      }}
      projects={projectsTable}
    />
  )
}
