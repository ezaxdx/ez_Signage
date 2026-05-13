import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/auth/role'
import { AdminAiClient } from './AdminAiClient'

export const metadata = { title: '관리자 페이지 — AI 관리 | 제작물 리스트 가이드' }

// v9.27: AI 관리 페이지 신설 (사용자 피드백 ③ 반영)
// — Gemini API 사용량 / 비용 추정 / 한도 알림 / 이상 사용자 / 환경 설정
// 명세: docs/ADMIN_REDESIGN_260513.md §1-4
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

  return (
    <AdminAiClient
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
