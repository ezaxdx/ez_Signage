// 노션 컴펌 본 §4 전체 학습 요약 시드 (5/18·페이지 36148589-8ea1-81d7-8b55-d1bd771a40a1)
// 환경장식물 추천 시스템의 학습 누적 상태 표시용.
//
// 사용처:
//   - /admin/learning 또는 /data 페이지의 학습 누적 상태 카드
//   - 곽 이사 보고 자료의 학습 정량 근거
//
// 정합:
//   - 환경장식물 카테고리 = 노션 §6-2 표 12종 (제목 "10종" + A4·A3 가로/세로 분리 = 12)
//   - 미수집 7개 행사장 = HICO·THE SHILLA·시그니엘·라한·안동·조선팰리스·그랜드하얏트 그랜드볼룸
//   - 도면 분석 20건 = 미분류 CAD 잔존
//
// 갱신: 학습 데이터 누적 시 즉시 갱신 (월 1회 권장)

export interface LearningMeta {
  metric: string
  value: string
  category: 'venue' | 'signage' | 'order' | 'analysis' | 'gap'
  note?: string
}

export const LEARNING_META_SEED: LearningMeta[] = [
  { metric: 'L1 행사장 (건물·센터 단위)',         value: '43개',     category: 'venue',    note: '기존 30 + 신규 13' },
  { metric: 'L2 상세 행사장·홀 (L1 내부 세부)',   value: '약 100+개', category: 'venue' },
  { metric: '환경장식물 카테고리',                  value: '12종',     category: 'signage',  note: '노션 §6-2 표 12행 (A4·A3 가로/세로 분리)' },
  { metric: '실측 발주 사례 (행사 단위)',           value: '22+ 행사', category: 'order' },
  { metric: '발주 행 (행사 × 항목)',                value: '703행',    category: 'order' },
  { metric: '발주 수량 합 (실측)',                  value: '1,925건',  category: 'order' },
  { metric: '행사장 특징 12항목 평균 수집률',       value: '50%',      category: 'analysis', note: '§1 참조' },
  { metric: 'SPP 카탈로그 분석',                    value: '47종',     category: 'analysis' },
  { metric: '미수집 행사장',                        value: '7개',      category: 'gap',      note: 'HICO·THE SHILLA·시그니엘·라한·안동·조선팰리스·그랜드하얏트 그랜드볼룸' },
  { metric: '도면 분석 누적',                       value: '20건',     category: 'analysis', note: '미분류 CAD 잔존' },
]

/** 카테고리별 집계 */
export function groupLearningMetaByCategory(): Record<string, LearningMeta[]> {
  const grouped: Record<string, LearningMeta[]> = {}
  for (const m of LEARNING_META_SEED) {
    if (!grouped[m.category]) grouped[m.category] = []
    grouped[m.category].push(m)
  }
  return grouped
}

/** 노션 §1-2 호출당 예상 비용 정합 */
export const AI_CALL_COST = {
  recommend_won: 10,          // 추천 AI 약 10원
  floor_plan_won: 15,         // 도면 분석 AI 약 15원
  total_per_project_won: 25,  // 1 프로젝트당 약 25원
  model: 'Gemini 2.5 Flash',
  exchange_rate_krw_per_usd: 1400,
  notion_source: '36148589-8ea1-81d7-8b55-d1bd771a40a1 §1-2',
}
