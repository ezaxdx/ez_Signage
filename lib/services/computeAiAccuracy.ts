// PR#4 단위 5 (δ 정책): AI 추천 정확도 신규 정의.
//
// 기존 폐기: 단계별 가중치 (10/30/70/100) — "AI 추천 정확도" 라벨이지만 실제론 "학습 진행률"
// 신규: (AI 추천값 그대로 발주 완료 + 0.5 × 부분 정답) ÷ (AI가 만든 전체 완료 항목 수)
//
// 판정 로직 (design_items.finalized_at IS NOT NULL 항목만):
//   - created_by_ai=FALSE → 측정 대상 외 (사용자 직접 추가)
//   - category·quantity·width·height 모두 ai_initial_*과 일치 → 정답 (+100)
//   - category만 일치, quantity/size 수정 → 부분 정답 (+50)
//   - category 변경됨 → 오답 (0)
//
// N < 10건 → "측정 중 (N/10건)"
// N >= 10건 → 실제 %

export interface AiAccuracyItem {
  created_by_ai?: boolean | null
  finalized_at?: string | null
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
  /** 0~100 정확도. measuring 상태일 때 null. */
  value: number | null
  /** 측정 대상 항목 수 (created_by_ai=TRUE AND finalized_at IS NOT NULL) */
  count: number
  /** measuring (count < 10) / ready (count >= 10) */
  status: 'measuring' | 'ready'
  /** 정답·부분정답·오답 분류 카운트 (디버그·세부 표시용) */
  breakdown: {
    full_match: number
    category_only: number
    mismatch: number
  }
}

const MIN_COUNT = 10

/**
 * AI 추천 정확도 계산 — design_items 배열에서.
 * 호출처: /admin/ai 화면, AccuracyTable 등.
 */
export function computeAiAccuracy(items: ReadonlyArray<AiAccuracyItem>): AiAccuracyResult {
  const aiItems = items.filter(
    it => it.created_by_ai === true && it.finalized_at != null,
  )
  const breakdown = { full_match: 0, category_only: 0, mismatch: 0 }

  if (aiItems.length < MIN_COUNT) {
    return { value: null, count: aiItems.length, status: 'measuring', breakdown }
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

/**
 * 표시용 텍스트: N < 10이면 "측정 중 (N/10건)", N >= 10이면 "NN%".
 */
export function formatAiAccuracy(result: AiAccuracyResult): string {
  if (result.status === 'measuring') {
    return `측정 중 (${result.count}/${MIN_COUNT}건)`
  }
  return `${result.value}%`
}
