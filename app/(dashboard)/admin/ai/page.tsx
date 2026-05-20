import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/auth/role'
import { AdminAiClient } from './AdminAiClient'
import { STANDARD_CATEGORIES, computeVenueCategoryCoverage } from '@/lib/data/signageCategoryStandards'
import type { AccuracyRow } from './AccuracyTable'
import { computeAiAccuracy } from '@/lib/services/computeAiAccuracy'

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

  // 5/22 P4-C 사용자 명시 = silent fail 제거. RLS 차단·테이블 부재 시 console.error 명시.
  const logsRes = await supabase
    .from('usage_logs')
    .select('id, user_id, project_id, action, metadata, created_at')
    .in('action', ['recommend', 'export_excel', 'export_pptx'])
    .order('created_at', { ascending: false })
    .limit(5000)
  if (logsRes.error) {
    console.error('[admin/ai] usage_logs SELECT failed:', logsRes.error.message, logsRes.error.code, logsRes.error.details)
  }

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

  // 5/22 사용자 명시: 실제 비용 매핑 = Gemini usageMetadata 영역 토큰 합산 (평균 3500 추정 X).
  // metadata.total_tokens 있으면 실제값·없으면 (구버전 INSERT) 평균 3500 fallback.
  // input·output 영역 분리 합산 = 2.5 Flash 영역 정확 단가 적용.
  const TOKEN_AVG_FALLBACK = 3500
  const sumTokens = (logs: typeof recommendLogs, key: 'prompt_tokens' | 'output_tokens' | 'total_tokens', fallback = 0) =>
    logs.reduce((acc, l) => acc + ((l.metadata?.[key] as number) ?? fallback), 0)

  const todayLogs = recommendLogs.filter(l => l.created_at.startsWith(todayKey))
  const monthLogs = recommendLogs.filter(l => l.created_at.startsWith(monthKey))

  // 실제 토큰 합산 (metadata 없는 구버전 호출 = 평균 추정·신규 호출 = 실제값)
  const todayPromptTokens = sumTokens(todayLogs, 'prompt_tokens')
  const todayOutputTokens = sumTokens(todayLogs, 'output_tokens')
  const monthPromptTokens = sumTokens(monthLogs, 'prompt_tokens')
  const monthOutputTokens = sumTokens(monthLogs, 'output_tokens')

  // total_tokens 영역 = prompt + output 합산·없으면 fallback
  const todayTokens = todayPromptTokens + todayOutputTokens > 0
    ? todayPromptTokens + todayOutputTokens
    : sumTokens(todayLogs, 'total_tokens', TOKEN_AVG_FALLBACK)
  const monthTokens = monthPromptTokens + monthOutputTokens > 0
    ? monthPromptTokens + monthOutputTokens
    : sumTokens(monthLogs, 'total_tokens', TOKEN_AVG_FALLBACK)

  // 비용 산출 — Gemini 2.5 Flash 영역 실제 단가 (2025 영역·https://ai.google.dev/pricing):
  // - Input:  $0.30 / 1M tokens = $0.0003 / 1K
  // - Output: $2.50 / 1M tokens = $0.0025 / 1K
  // Gemini usageMetadata 영역 토큰 = 실측값·× 공식 단가 = 청구 산출값 = 실측 비용.
  // 무료 tier (AI Studio) 영역에서는 Google이 청구 X·근데 계산값 영역 자체 = 정확한 영역.
  const INPUT_USD_PER_1K = 0.0003
  const OUTPUT_USD_PER_1K = 0.0025
  const KRW_PER_USD = 1380

  // 분리 산출 (실제 토큰 영역 있으면)·없으면 total × input 단가 fallback
  const todayCostUsd = todayPromptTokens + todayOutputTokens > 0
    ? (todayPromptTokens / 1000) * INPUT_USD_PER_1K + (todayOutputTokens / 1000) * OUTPUT_USD_PER_1K
    : (todayTokens / 1000) * INPUT_USD_PER_1K
  const monthCostUsd = monthPromptTokens + monthOutputTokens > 0
    ? (monthPromptTokens / 1000) * INPUT_USD_PER_1K + (monthOutputTokens / 1000) * OUTPUT_USD_PER_1K
    : (monthTokens / 1000) * INPUT_USD_PER_1K

  // 5/22 사용자 명시: 무료 tier 0원 분기 영역 삭제 = 실제 단가 적용 비용 영역만 표시.
  // (무료 tier 영역 청구 0원 사실 영역은 사용자가 별도 인지·UI 영역은 토큰 × 단가 = 실측 영역)
  const todayCostKrw = todayCostUsd * KRW_PER_USD
  const monthCostKrw = monthCostUsd * KRW_PER_USD

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

  // ── PR#4 단위 5 (δ 정책): AI 추천 정확도 신규 정의 ────────────────
  // 기존 폐기: 학습 진행률 (stage.finalized / total) — "정확도" 라벨이지만 실제론 진행률
  // 신규: created_by_ai=TRUE AND finalized_at IS NOT NULL 항목에서 ai_initial_* vs 최종값 비교.
  //   완전 일치 +100·category만 +50·오답 0. N<10건이면 "측정 중"
  //   migration_v19 미적용 환경 → 빈 결과 → measuring (0/10건) 반환
  const accItemsRes = await supabase
    .from('design_items')
    .select('created_by_ai, finalized_at, category, quantity, width_mm, height_mm, ai_initial_category, ai_initial_quantity, ai_initial_width_mm, ai_initial_height_mm')
    .not('finalized_at', 'is', null)
    .limit(2000)
  type AccItem = {
    created_by_ai?: boolean | null; finalized_at?: string | null
    category?: string | null; quantity?: number | null; width_mm?: number | null; height_mm?: number | null
    ai_initial_category?: string | null; ai_initial_quantity?: number | null; ai_initial_width_mm?: number | null; ai_initial_height_mm?: number | null
  }
  const accItems = (accItemsRes.data ?? []) as AccItem[]
  const aiAccuracyResult = computeAiAccuracy(accItems)

  // 기존 accuracySummary는 backward compat (AdminAiClient에서 신규 prop 우선 사용)
  const validAcc = accuracyRows.map(r => r.avg_accuracy).filter((v): v is number => v !== null)
  const legacyVenueAvg = validAcc.length > 0 ? Math.round(validAcc.reduce((a, b) => a + b, 0) / validAcc.length) : null
  const accuracySummary = {
    // PR#4: 신규 정의 정확도 (legacy venueAvg는 무시·신규 값으로 일원화)
    venue_avg: aiAccuracyResult.value,
    part_avg: aiAccuracyResult.value,
    floor_plan_status: '—',
    // PR#4: measuring/ready 상태 + count (UI에서 "측정 중 N/10건" 분기)
    new_accuracy_status: aiAccuracyResult.status,
    new_accuracy_count: aiAccuracyResult.count,
    new_accuracy_breakdown: aiAccuracyResult.breakdown,
    legacy_venue_avg: legacyVenueAvg,
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
        // 5/22 사용자 명시: 실제 단가 적용 비용 영역 단일 표시 (무료 tier 분기 영역 삭제)
        todayCostUsd,
        monthCostUsd,
        todayCostKrw,
        monthCostKrw,
        todayPromptTokens,
        todayOutputTokens,
        monthPromptTokens,
        monthOutputTokens,
      }}
      dailyTrend={dailyTrend}
      abnormalUsers={abnormalUsers.slice(0, 20)}
    />
  )
}
