// PR#4 단위 5 (δ 정책) + HOTFIX (2026-05-20): AI 추천 정확도 신규 정의.
//
// 기존 폐기: 단계별 가중치 (10/30/70/100) — "AI 추천 정확도" 라벨이지만 실제론 "학습 진행률"
// 신규: (AI 추천값 그대로 발주 완료 + 0.5 × 부분 정답) ÷ (AI가 만든 전체 완료 항목 수)
//
// HOTFIX (2026-05-20): "측정 중 (N/10건)" 분기 제거. N 무관 즉시 % 표시.
//   - count=0 → 0% (분모 0 → score 0 / 1 = 0)
//   - 채점 기준: created_by_ai=TRUE AND project_status='완료'
//     (이전: design_items.finalized_at IS NOT NULL — 호출 측에서 status='완료' JOIN 변경)
//
// 판정 로직:
//   - category·quantity·width·height 모두 ai_initial_*과 일치 → 정답 (+100)
//   - category만 일치, quantity/size 수정 → 부분 정답 (+50)
//   - category 변경됨 → 오답 (0)

export interface AiAccuracyItem {
  created_by_ai?: boolean | null
  finalized_at?: string | null
  /** HOTFIX: project_status='완료' JOIN 결과를 호출 측에서 채워서 전달 */
  project_status?: string | null
  category?: string | null
  quantity?: number | null
  width_mm?: number | null
  height_mm?: number | null
  ai_initial_category?: string | null
  ai_initial_quantity?: number | null
  ai_initial_width_mm?: number | null
  ai_initial_height_mm?: number | null
}

export interface AiAccuracyResult {
  /** 0~100 정확도. count=0이면 0. */
  value: number
  /** 측정 대상 항목 수 (created_by_ai=TRUE AND project_status='완료') */
  count: number
  /** 항상 'ready' (HOTFIX: measuring 분기 제거) */
  status: 'ready'
  /** 정답·부분정답·오답 분류 카운트 (디버그·세부 표시용) */
  breakdown: {
    full_match: number
    category_only: number
    mismatch: number
  }
}

/**
 * AI 추천 정확도 계산 — design_items 배열에서.
 * 호출처: /admin/ai 화면.
 *
 * HOTFIX: 채점 기준은 project_status='완료' OR finalized_at IS NOT NULL (둘 중 하나라도)
 *   호출 측에서 design_items + projects JOIN해서 project_status 전달 권장.
 */
export function computeAiAccuracy(items: ReadonlyArray<AiAccuracyItem>): AiAccuracyResult {
  // HOTFIX: 채점 대상 = created_by_ai=TRUE AND (project_status='완료' OR finalized_at IS NOT NULL)
  const aiItems = items.filter(
    it => it.created_by_ai === true &&
      (it.project_status === '완료' || it.finalized_at != null),
  )
  const breakdown = { full_match: 0, category_only: 0, mismatch: 0 }

  if (aiItems.length === 0) {
    return { value: 0, count: 0, status: 'ready', breakdown }
  }

  let score = 0
  for (const it of aiItems) {
    const catMatch = it.category === it.ai_initial_category && it.category != null
    const qtyMatch = it.quantity === it.ai_initial_quantity
    const sizeMatch =
      it.width_mm === it.ai_initial_width_mm && it.height_mm === it.ai_initial_height_mm
    if (catMatch && qtyMatch && sizeMatch) {
      score += 100
      breakdown.full_match++
    } else if (catMatch) {
      score += 50
      breakdown.category_only++
    } else {
      breakdown.mismatch++
    }
  }

  return {
    value: Math.round(score / aiItems.length),
    count: aiItems.length,
    status: 'ready',
    breakdown,
  }
}

/** 표시용 텍스트: 즉시 "NN%". HOTFIX로 measuring 분기 제거. */
export function formatAiAccuracy(result: AiAccuracyResult): string {
  return `${result.value}%`
}
