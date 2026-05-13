// 시설 가이드 예외 빈도 모니터 (§v9.16)
// venue + rule 기준 3회 이상 예외 집계 → 가이드 데이터 검토 필요 flag
//
// v9.44 (2026-05-13): isAdmin 헬퍼 사용으로 통일 — 다른 admin route들과 가드 일관성 유지.

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/auth/role'

export const runtime = 'nodejs'

export interface ExceptionAlert {
  venue: string
  rule: string
  field: string
  standard_value: string | null
  user_value: string | null
  count: number
  finalized_count: number  // 실제 완료된 건수
  needs_review: boolean    // 3회 이상이면 true
}

export async function GET() {
  try {
    const supabase = createClient()
    if (!(await isAdmin(supabase))) {
      return NextResponse.json({ error: '관리자 권한 필요' }, { status: 403 })
    }

    // facility_exception_log 전체 집계 (admin만 접근)
    const { data: logs, error } = await supabase
      .from('facility_exception_log')
      .select('venue, rule, field, standard_value, user_value, item_id, project_id')

    if (error || !logs) {
      return NextResponse.json({ alerts: [], error: error?.message ?? 'query failed' })
    }

    // finalized_at이 있는 design_items의 project_id 집합 조회
    const { data: finalizedItems } = await supabase
      .from('design_items')
      .select('project_id')
      .not('finalized_at', 'is', null)

    const finalizedProjectIds = new Set((finalizedItems ?? []).map(it => it.project_id))

    // venue + rule 기준 집계
    const map = new Map<string, ExceptionAlert>()
    for (const log of logs) {
      const venue = log.venue ?? '(미지정)'
      const rule  = log.rule  ?? '(unknown)'
      const key   = `${venue}::${rule}::${log.field ?? ''}`
      const isFinalizedProject = finalizedProjectIds.has(log.project_id)

      const existing = map.get(key)
      if (!existing) {
        map.set(key, {
          venue,
          rule,
          field: log.field ?? '',
          standard_value: log.standard_value ?? null,
          user_value: log.user_value ?? null,
          count: 1,
          finalized_count: isFinalizedProject ? 1 : 0,
          needs_review: false,
        })
      } else {
        existing.count++
        if (isFinalizedProject) existing.finalized_count++
      }
    }

    const alerts: ExceptionAlert[] = Array.from(map.values())
      .map(a => ({ ...a, needs_review: a.count >= 3 }))
      .sort((a, b) => b.count - a.count)

    return NextResponse.json({ alerts })
  } catch (e) {
    return NextResponse.json({ alerts: [], error: String(e) })
  }
}
