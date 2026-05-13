import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/auth/role'
import { AdminOpsClient } from './AdminOpsClient'
import { PROGRAM_PART_BY_CODE } from '@/lib/programParts'

export const metadata = { title: '관리자 페이지 — 운영 대시보드 | 제작물 리스트 가이드' }

// v9.26: 운영 KPI ↔ 전체 프로젝트 현황 통합 (사용자 피드백 ① 반영)
// 명세: docs/ADMIN_REDESIGN_260513.md
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
  const weekStart = new Date(today)
  weekStart.setDate(today.getDate() - today.getDay()) // 이번 주 일요일

  // 진행 중 프로젝트
  const inProgressCount = projects.filter(p =>
    p.stage && ['발주완료', '시안검수', '수정중', '확정'].includes(p.stage)
  ).length

  // 이번 주 신규 프로젝트
  const thisWeekNew = projects.filter(p => {
    const c = new Date(p.created_at)
    return c >= weekStart
  }).length

  // 이번 주 발주 완료 (finalized_at 기준)
  const thisWeekFinalized = items.filter(it => {
    if (!it.finalized_at) return false
    const f = new Date(it.finalized_at)
    return f >= weekStart
  }).length

  // 발주서 완료율 — finalized_items / total_items
  const totalItems = items.length
  const finalizedItems = items.filter(it => !!it.finalized_at).length
  const finalizedRate = totalItems === 0 ? 0 : Math.round((finalizedItems / totalItems) * 100)

  // 추천 다운로드 전환율 — confirmed → finalized 비율
  const confirmedItems = items.filter(it => it.confirmed).length
  const conversionRate = confirmedItems === 0 ? 0 : Math.round((finalizedItems / confirmedItems) * 100)

  // AI 추천 정확도 (rolling) — 단계별 가중치 평균
  // input 10% / mid 30% / confirmed 70% / finalized 100%
  let totalWeight = 0
  let weighted = 0
  for (const it of items) {
    let w = 10
    if (it.finalized_at) w = 100
    else if (it.confirmed) w = 70
    else if (it.review_status === '확인필요' || it.review_status === '수정요청') w = 30
    weighted += w
    totalWeight += 100
  }
  const aiAccuracy = totalWeight === 0 ? 0 : Math.round((weighted / totalWeight) * 100)

  // 신호등 색상 (목표 70%)
  const accuracySignal: 'green' | 'amber' | 'red' =
    aiAccuracy >= 70 ? 'green' : aiAccuracy >= 50 ? 'amber' : 'red'

  // ── 전체 프로젝트 현황 — 테이블 데이터 가공 ───────────────────────────
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

  // ── 파트별 stage 분포 (Stacked Bar 데이터) ─────────────────────────────
  const partStageMap = new Map<string, { progress: number; done: number; rejected: number }>()
  for (const p of projects) {
    const partNames = (p.program_parts ?? []).length === 0
      ? ['미분류']
      : p.program_parts!.map(c => PROGRAM_PART_BY_CODE.get(c)?.name ?? c)
    for (const pn of partNames) {
      if (!partStageMap.has(pn)) partStageMap.set(pn, { progress: 0, done: 0, rejected: 0 })
      const s = partStageMap.get(pn)!
      const stage = p.stage ?? p.status
      if (stage === '납품완료' || stage === '완료') s.done++
      else if (stage === '수정요청') s.rejected++
      else s.progress++
    }
  }
  const partStageBars = Array.from(partStageMap.entries())
    .map(([part, v]) => ({ part, ...v, total: v.progress + v.done + v.rejected }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10)

  // ── 이번 달 일정 (D-14 ~ D+7) ─────────────────────────────────────────
  const calStart = new Date(today); calStart.setDate(today.getDate() - 14)
  const calEnd = new Date(today); calEnd.setDate(today.getDate() + 7)
  const calendarItems = projects
    .filter(p => {
      if (!p.event_date) return false
      const e = new Date(p.event_date)
      return e >= calStart && e <= calEnd
    })
    .map(p => {
      const e = new Date(p.event_date!)
      const diffMs = e.getTime() - today.getTime()
      const dday = Math.round(diffMs / (1000 * 60 * 60 * 24))
      return {
        id: p.id,
        name: p.name,
        event_date: p.event_date!,
        dday,
        venue: p.event_venue,
      }
    })
    .sort((a, b) => a.event_date.localeCompare(b.event_date))

  return (
    <AdminOpsClient
      kpi={{
        inProgress: inProgressCount,
        thisWeekNew,
        thisWeekFinalized,
        finalizedRate,
        conversionRate,
        aiAccuracy,
        accuracySignal,
      }}
      projects={projectsTable}
      partStageBars={partStageBars}
      calendar={calendarItems}
    />
  )
}
