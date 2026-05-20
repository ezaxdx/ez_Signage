// δ 정책 (2026-05-20): 프로젝트 완료 처리 = 학습 풀 단일 진입점.
//   1) projects.status = '완료'
//   2) event_history UPSERT (signage_breakdown 자동 집계 + program_parts 포함)
//   3) event_history POST 성공 시에만 design_items.finalized_at 일괄 SET
//
// 호출처: ProjectCard.handleComplete, EditorLayout.handleMarkCompleted (단일 SOT).
// 엑셀·PPT export는 학습 신호가 아님 (1.5 정책 — ExportService에서 finalized_at SET 제거).

import type { SupabaseClient } from '@supabase/supabase-js'

export interface CompleteProjectInput {
  id: string
  name: string
  event_date: string | null
  event_venue: string | null
  program_parts?: string[] | null
}

export interface CompleteProjectResult {
  ok: boolean
  error?: string
  /** event_history POST 결과 (status·skipped) */
  history_status?: 'ok' | 'skipped' | 'error'
  /** finalized_at SET 여부 */
  finalized_set?: boolean
}

interface DesignItemRow {
  category: string | null
  quantity: number | null
  width_mm: number | null
  height_mm: number | null
}

export async function completeProject(
  supabase: SupabaseClient,
  project: CompleteProjectInput,
): Promise<CompleteProjectResult> {
  // ① status = '완료'
  const { error: statusErr } = await supabase
    .from('projects')
    .update({ status: '완료' })
    .eq('id', project.id)
  if (statusErr) {
    return { ok: false, error: statusErr.message }
  }

  // ② event_history UPSERT (signage_breakdown 자동 집계)
  let historyStatus: 'ok' | 'skipped' | 'error' = 'error'
  try {
    const { data: items } = await supabase
      .from('design_items')
      .select('category, quantity, width_mm, height_mm')
      .eq('project_id', project.id)

    const sigByCategory = new Map<string, { quantity: number; sizes: Set<string> }>()
    for (const it of (items ?? []) as DesignItemRow[]) {
      if (!it.category) continue
      const prev = sigByCategory.get(it.category) ?? { quantity: 0, sizes: new Set<string>() }
      prev.quantity += it.quantity ?? 1
      if (it.width_mm && it.height_mm) prev.sizes.add(`${it.width_mm}×${it.height_mm}`)
      sigByCategory.set(it.category, prev)
    }
    const signage_breakdown = Array.from(sigByCategory.entries())
      .map(([category, v]) => ({
        category,
        quantity: v.quantity,
        sizes: Array.from(v.sizes).join('·') || undefined,
      }))
      .sort((a, b) => b.quantity - a.quantity)

    const res = await fetch('/api/event-history', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        project_code: project.id.slice(0, 12),
        project_name: project.name,
        year: project.event_date
          ? new Date(project.event_date).getFullYear()
          : new Date().getFullYear(),
        venue: project.event_venue || '미정',
        program_parts: project.program_parts ?? [],   // δ 정책: 누락 fix
        signage_breakdown,
        analyzed_item_count: items?.length ?? 0,
        source: 'auto_project',
      }),
    })
    if (res.ok) {
      const body = await res.json().catch(() => null)
      if (body?.skipped) {
        // HOTFIX (2026-05-20): silent fail 회피 — skipped 사유 명시 로그
        console.error('[completeProject] event_history INSERT skipped:', body?.error, 'code:', body?.code)
        historyStatus = 'skipped'
      } else {
        historyStatus = 'ok'
      }
    } else {
      const errBody = await res.text().catch(() => '')
      console.error('[completeProject] event_history POST failed:', res.status, errBody)
      historyStatus = 'error'
    }
  } catch (e) {
    console.error('[completeProject] event-history POST exception:', e)
    historyStatus = 'error'
  }

  // ③ finalized_at 일괄 SET (event_history POST 성공 시에만 — atomic)
  let finalizedSet = false
  if (historyStatus === 'ok') {
    try {
      await supabase
        .from('design_items')
        .update({ finalized_at: new Date().toISOString() })
        .eq('project_id', project.id)
        .is('finalized_at', null)
      finalizedSet = true
    } catch (e) {
      console.warn('[completeProject] finalized_at UPDATE 실패:', e)
    }
  }

  return { ok: true, history_status: historyStatus, finalized_set: finalizedSet }
}
