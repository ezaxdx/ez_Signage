import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/auth/role'
import { AdminAiClient } from './AdminAiClient'
import { STANDARD_CATEGORIES, computeVenueCategoryCoverage } from '@/lib/data/signageCategoryStandards'
import type { AccuracyRow } from './AccuracyTable'

export const metadata = { title: '관리자 페이지 — AI 관리 | 제작물 리스트 가이드' }
// 5/22 사용자 진단 #4 = 정적 prerender 회피·매 요청마다 usage_logs fresh fetch
export const dynamic = 'force-dynamic'
export const revalidate = 0

// v9.39: 명세 재구조화 — KPI 3 (호출·토큰·비용) + AI 파이프라인 4 step + 카테고리 정확도 테이블
// 명세: docs/ADMIN_REDESIGN_260513.md §1-4
//   기존 풍부한 사용량/예산/30일 추이/이상 사용자/환경 설정 폼은 하단에 그대로 보존
export default async function AdminAiPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  if (!(await isAdmin(supabase))) redirect('/dashboard')

  // usage_logs에서 추천·다운로드 액션 조회 (Gemini 호출 추적)
  const [logsRes] = await Promise.all([
    supabase
      .from('usage_logs')
      .select('id, user_id, project_id, action, metadata, created_at')
      .in('action', ['recommend', 'export_excel', 'export_pptx'])
      .order('created_at', { ascending: false })
      .limit(5000)
      .then(r => r, () => ({ data: [], error: null })),
  ])

  type Log = {
    id: string
    user_id: string | null
    project_id: string | null
    action: string
    metadata: Record<string, unknown> | null
    created_at: string
  }

  const logs = (logsRes.data ?? []) as Log[]

  // ── 일일·월간 누계 ──────────────────────────────────────────
  const now = new Date()
  const todayKey = now.toISOString().slice(0, 10)
  const monthKey = todayKey.slice(0, 7)

  const recommendLogs = logs.filter(l => l.action === 'recommend')
  const todayCalls = recommendLogs.filter(l => l.created_at.startsWith(todayKey)).length
  const monthCalls = recommendLogs.filter(l => l.created_at.startsWith(monthKey)).length

  // 토큰 사용량 추정 (metadata.tokens 있으면 사용, 없으면 평균 3500 토큰)
  const TOKEN_AVG = 3500
  const todayTokens = recommendLogs
    .filter(l => l.created_at.startsWith(todayKey))
    .reduce((acc, l) => acc + ((l.metadata?.tokens as number) ?? TOKEN_AVG), 0)
  const monthTokens = recommendLogs
    .filter(l => l.created_at.startsWith(monthKey))
    .reduce((acc, l) => acc + ((l.metadata?.tokens as number) ?? TOKEN_AVG), 0)

  // 비용 추정 — Gemini 2.5 Flash 단가: $0.00015 / 1K tokens (input avg, ~05/2025)
  const COST_USD_PER_1K = 0.00015
  const KRW_PER_USD = 1380
  const todayCostUsd = (todayTokens / 1000) * COST_USD_PER_1K
  const monthCostUsd = (monthTokens / 1000) * COST_USD_PER_1K

  // ── 일자별 추이 (최근 30일) ────────────────────────────────
  const dailyMap = new Map<string, number>()
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(now.getDate() - i)
    dailyMap.set(d.toISOString().slice(0, 10), 0)
  }
  for (const l of recommendLogs) {
    const k = l.created_at.slice(0, 10)
    if (dailyMap.has(k)) dailyMap.set(k, (dailyMap.get(k) ?? 0) + 1)
  }
  const dailyTrend = Array.from(dailyMap.entries()).map(([date, count]) => ({ date, count }))

  // ── 이상 사용자 (동일 프로젝트 5회 이상 재호출) ──────────
  const userProjectCount = new Map<string, Map<string, number>>()
  for (const l of recommendLogs) {
    if (!l.user_id || !l.project_id) continue
    if (!userProjectCount.has(l.user_id)) userProjectCount.set(l.user_id, new Map())
    const pm = userProjectCount.get(l.user_id)!
    pm.set(l.project_id, (pm.get(l.project_id) ?? 0) + 1)
  }
  const abnormalUsers: Array<{ user_id: string; project_id: string; count: number }> = []
  for (const [uid, pm] of Array.from(userProjectCount.entries())) {
    for (const [pid, count] of Array.from(pm.entries())) {
      if (count >= 5) abnormalUsers.push({ user_id: uid, project_id: pid, count })
    }
  }
  abnormalUsers.sort((a, b) => b.count - a.count)

  // ── v9.39: 카테고리별 정확도 테이블 데이터 ────────────────────
  // 6대 표준 카테고리 × 학습 보유 행사장 수 + 평균 정확도
  // 정확도는 design_items 단계별 가중치 평균 (해당 카테고리 항목만)
  const itemsRes = await supabase
    .from('design_items')
    .select('category, confirmed, finalized_at, review_status')
    .limit(20000)
    .then(r => r, () => ({ data: [], error: null }))
  type Item = {
    category: string | null
    confirmed: boolean | null
    finalized_at: string | null
    review_status: string | null
  }
  const items = (itemsRes.data ?? []) as Item[]

  // 카테고리별 행사장 학습 보유 카운트 (시드 기반)
  const venueCoverages = computeVenueCategoryCoverage()
  const trainedByCat = new Map<string, number>()
  for (const cov of venueCoverages) {
    for (const k of Object.keys(cov.has_data) as Array<keyof typeof cov.has_data>) {
      if (cov.has_data[k]) trainedByCat.set(k, (trainedByCat.get(k) ?? 0) + 1)
    }
  }

  // 카테고리별 design_items 평균 정확도 (입력 10·중간 30·컨펌 70·완료 100)
  // classifyCategory를 클라이언트가 알 수 없으므로 page에서 직접 fuzzy 분류
  const accByCat = new Map<string, { sum: number; n: number }>()
  for (const it of items) {
    const cat = it.category ?? ''
    // 자유 문자열 → 6대 키 매칭 (signageCategoryStandards.match_keywords 기반)
    const matched = STANDARD_CATEGORIES.find(sc =>
      sc.match_keywords.some(kw => cat.includes(kw))
    )
    if (!matched) continue
    let w = 10
    if (it.finalized_at) w = 100
    else if (it.confirmed) w = 70
    else if (it.review_status === '확인필요' || it.review_status === '수정요청') w = 30
    const cur = accByCat.get(matched.key) ?? { sum: 0, n: 0 }
    cur.sum += w
    cur.n += 1
    accByCat.set(matched.key, cur)
  }

  const accuracyRows: AccuracyRow[] = STANDARD_CATEGORIES.map(sc => {
    const trained = trainedByCat.get(sc.key) ?? 0
    const acc = accByCat.get(sc.key)
    const avg = acc && acc.n > 0 ? Math.round(acc.sum / acc.n) : null
    const isFloorPlanRelated = sc.key === 'gate' || sc.key === 'streetlight'
    const comment = isFloorPlanRelated && trained === 0
      ? '도면 학습 — 커밍순'
      : trained === 0
      ? '학습 데이터 부재'
      : undefined
    return {
      category_key: sc.key,
      category_label: sc.label,
      trained_venues: trained,
      avg_accuracy: avg,
      comment,
    }
  })

  // ── v9.47: IA SOT 정렬 — KPI 3 카드 데이터 ────────────────
  // ① ai 추천 정확도: AccuracyTable 행 평균 (행사장·파트별 동일 데이터 사용, 도면은 ′커밍순′)
  const validAcc = accuracyRows.map(r => r.avg_accuracy).filter((v): v is number => v !== null)
  const venueAvg = validAcc.length > 0 ? Math.round(validAcc.reduce((a, b) => a + b, 0) / validAcc.length) : null
  const accuracySummary = {
    venue_avg: venueAvg,
    part_avg: venueAvg, // 현 사이클은 동일 데이터 (파트별 분리는 후속 사이클)
    floor_plan_status: '—', // 5/22 사용자 명시 = "커밍순" 워딩 빼고 "—"
  }

  // ② 총 API 호출 수 — usage_logs 전체 recommend 카운트 (월 한정 X, IA의 ′총′ 의미)
  const totalApiCalls = recommendLogs.length

  return (
    <AdminAiClient
      accuracySummary={accuracySummary}
      totalApiCalls={totalApiCalls}
      accuracyRows={accuracyRows}
      stats={{
        todayCalls,
        monthCalls,
        todayTokens,
        monthTokens,
        todayCostUsd,
        monthCostUsd,
        todayCostKrw: todayCostUsd * KRW_PER_USD,
        monthCostKrw: monthCostUsd * KRW_PER_USD,
      }}
      dailyTrend={dailyTrend}
      abnormalUsers={abnormalUsers.slice(0, 20)}
    />
  )
}
