// 점진적 정확도 향상 — 핵심 철학 구현
// 사용자가 ′특정 장소 + 특정 행사 유형′을 선택하면,
// 앱이 누적해온 데이터(프로젝트 입력·중간수정·컨펌·발주완료)를 가중치별로 모아
// AI(Gemini)에 컨텍스트로 주입한다.
//
// 가중치 (decisions.md 2026-05-11 — 입력 데이터 축적: 단계별 분리 + 신뢰도 가중치):
//   ① 입력 단계    10% — 집계 통계만
//   ② 중간 수정    30% — 수정 패턴 추출
//   ③ 사용자 컨펌  70% — 항목별 추천 가중치
//   ④ 발주·다운로드 완료 100% — 정답 풀
//   시설 가이드 검증 통과 +20%

import { createClient } from '@/lib/supabase/server'

export interface AccumulatedContextOptions {
  venue: string
  programParts?: string[]
  eventType?: string | null
  limit?: number   // 행사 단위 상한 (기본 5)
}

export interface AccumulatedItem {
  category: string
  width_mm: number | null
  height_mm: number | null
  material: string | null
  location: string | null
  purpose: string | null
  quantity: number | null
  weight: number      // 누적 가중치 (10·30·70·100)
}

export interface AccumulatedContext {
  matched_projects: number
  total_items: number
  by_stage: { input: number; mid: number; confirmed: number; finalized: number }
  category_distribution: Array<{ category: string; weighted_count: number }>
  top_items: AccumulatedItem[]   // 상위 8건 — 프롬프트 직접 주입
  note: string
}

const STAGE_WEIGHT = { input: 10, mid: 30, confirmed: 70, finalized: 100 } as const

function tokenize(s: string): string[] {
  return s.toLowerCase().split(/[\s,.,()/]+/).filter(Boolean)
}

function venueMatchScore(target: string, candidate: string | null): number {
  if (!candidate) return 0
  const ta = tokenize(target)
  const tb = tokenize(candidate)
  let s = 0
  for (const t of ta) if (tb.some(u => u.includes(t) || t.includes(u))) s++
  return s
}

/**
 * 장소+행사 매칭 누적 데이터를 모아 AI 컨텍스트로 압축.
 * Supabase 조회 실패 시 빈 결과 반환 (seed 컨텍스트만으로 동작).
 */
export async function buildAccumulatedContext(
  opts: AccumulatedContextOptions
): Promise<AccumulatedContext> {
  const empty: AccumulatedContext = {
    matched_projects: 0,
    total_items: 0,
    by_stage: { input: 0, mid: 0, confirmed: 0, finalized: 0 },
    category_distribution: [],
    top_items: [],
    note: '누적 앱 사용 데이터 없음 — seed 데이터만 사용',
  }

  if (!opts.venue?.trim()) return empty

  try {
    const supabase = createClient()

    // 1) 같은 행사장(+가능하면 같은 program_parts)의 프로젝트들 식별
    const { data: projects, error: pErr } = await supabase
      .from('projects')
      .select('id, event_venue, program_parts, status')
      .limit(200)

    if (pErr || !projects) return empty

    const matched = projects
      .map(p => ({ ...p, score: venueMatchScore(opts.venue, p.event_venue) }))
      .filter(p => p.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, opts.limit ?? 5)

    if (matched.length === 0) return { ...empty, note: '같은 행사장 누적 데이터 없음 — seed 데이터만 사용' }

    // 2) 해당 프로젝트들의 design_items 모두 끌어오기
    const pids = matched.map(p => p.id)
    const { data: items, error: iErr } = await supabase
      .from('design_items')
      .select('project_id, category, width_mm, height_mm, material, location, purpose, quantity, confirmed, finalized_at')
      .in('project_id', pids)

    if (iErr || !items) return empty

    // 3) 단계 분류 + 가중치 부여
    type RawItem = {
      project_id: string
      category: string | null
      width_mm: number | null
      height_mm: number | null
      material: string | null
      location: string | null
      purpose: string | null
      quantity: number | null
      confirmed: boolean | null
      finalized_at: string | null
    }

    const stageCount = { input: 0, mid: 0, confirmed: 0, finalized: 0 }
    const weighted: AccumulatedItem[] = []

    for (const raw of items as RawItem[]) {
      let weight: number
      if (raw.finalized_at) { weight = STAGE_WEIGHT.finalized; stageCount.finalized++ }
      else if (raw.confirmed) { weight = STAGE_WEIGHT.confirmed; stageCount.confirmed++ }
      else if (raw.location || raw.purpose) { weight = STAGE_WEIGHT.mid; stageCount.mid++ }
      else { weight = STAGE_WEIGHT.input; stageCount.input++ }

      if (!raw.category) continue
      weighted.push({
        category: raw.category,
        width_mm: raw.width_mm,
        height_mm: raw.height_mm,
        material: raw.material,
        location: raw.location,
        purpose: raw.purpose,
        quantity: raw.quantity,
        weight,
      })
    }

    // 4) 카테고리별 가중치 합계 — Gemini가 ′이 행사장에선 어떤 게 자주 나오는지′ 파악
    const catMap = new Map<string, number>()
    for (const it of weighted) {
      catMap.set(it.category, (catMap.get(it.category) ?? 0) + it.weight)
    }
    const distribution = Array.from(catMap.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([category, weighted_count]) => ({ category, weighted_count }))

    // 5) 상위 8건 (가중치 높은 순)
    const topItems = weighted.sort((a, b) => b.weight - a.weight).slice(0, 8)

    return {
      matched_projects: matched.length,
      total_items: weighted.length,
      by_stage: stageCount,
      category_distribution: distribution,
      top_items: topItems,
      note: `누적 ${matched.length}개 프로젝트 · ${weighted.length}건 항목 (입력 ${stageCount.input}/중간 ${stageCount.mid}/컨펌 ${stageCount.confirmed}/완료 ${stageCount.finalized})`,
    }
  } catch {
    return empty
  }
}

/** Gemini 프롬프트용 텍스트 압축 */
export function formatAccumulatedContext(ctx: AccumulatedContext): string {
  if (ctx.matched_projects === 0) return ''
  const dist = ctx.category_distribution.slice(0, 10)
    .map(d => `${d.category}(${d.weighted_count})`).join(' / ')
  const tops = ctx.top_items.map((it, i) => {
    const size = it.width_mm && it.height_mm ? ` ${it.width_mm}×${it.height_mm}mm` : ''
    const mat = it.material ? ` / ${it.material}` : ''
    const loc = it.location ? ` @${it.location}` : ''
    return `${i + 1}. [${it.weight}%] ${it.category}${size}${mat}${loc}`
  }).join('\n')

  return [
    '',
    '[앱 누적 데이터 — 같은 행사장 사용 기록 (가중치 적용)]',
    `※ ${ctx.note}`,
    `카테고리 가중치 분포: ${dist}`,
    '상위 항목 (단계별 가중치 표기):',
    tops,
    '→ 가중치 70% 이상(컨펌·완료) 항목은 ′이 행사장에서 실제로 채택된′ 정답에 가까움. 우선 반영.',
    '→ 가중치 10~30%는 패턴 참고용. 동일 항목이 반복되면 채택률이 상승 중이라는 신호.',
  ].join('\n')
}
