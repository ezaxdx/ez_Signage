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

/** NIST AI RMF 4단계 정합 (5/19 추가) — 환경장식물 v3 4단 안전망 매핑 */
export interface NistRmfStage {
  stage: 'Govern' | 'Map' | 'Measure' | 'Manage'
  korean: string
  v3_implementation: string
}

export const NIST_RMF_STAGES: NistRmfStage[] = [
  {
    stage: 'Govern',
    korean: '입력 강제',
    v3_implementation: 'JSON 스키마 + 12 카테고리 enum 강제·SignageCategoryKey union·responseSchema (recommendV2WithGemini)',
  },
  {
    stage: 'Map',
    korean: '상태 확인',
    v3_implementation: 'no_data_flag·관리자 페이지 누적률 표시·LEARNING_META_SEED·VENUE_HISTORY_SEED',
  },
  {
    stage: 'Measure',
    korean: '후처리 검증',
    v3_implementation: 'validateAndFixV3·classifyCategoryV3·키 일관 검증 (size·material·layout)',
  },
  {
    stage: 'Manage',
    korean: '실패 대체 안내',
    v3_implementation: 'buildFallbackRecommendationV3·"[추천 없음 — 매뉴얼 확인]" 표기·매뉴얼 안내',
  },
]

/**
 * G드라이브 폴더 실측 메타 (2026-05-19 추가)
 * 출처: G:/내 드라이브/2026년_AXDX팀/01. AI 업무 파트너/05. 제작물 리스트 가이드/AI 학습자료/L1_행사장
 * 생성: scripts/scan_l1_venues_v5.mjs + extract_learning_seeds.mjs
 *
 * 노션 §4 시드(LEARNING_META_SEED)는 5/18 곽 이사 컴펌 본 SOT 유지.
 * 본 시드는 G드라이브 폴더 실측 = 코드 정합 갭 점검 + 학습 진척 추적 용도.
 */
export const FOLDER_LEARNING_META: LearningMeta[] = [
  { metric: 'L1 행사장 (G드라이브 폴더 SOT)',  value: '29개',    category: 'venue',    note: 'AI 학습자료/L1_행사장 폴더 실측 (2026-05-19)' },
  { metric: '행사 학습 인덱스 (자동 생성)',     value: '18건',    category: 'order',    note: 'eventLearningIndexSeed.ts (G드라이브 폴더 SOT)' },
  { metric: '학습 파일 (시안·실사·발주 엑셀)', value: '345건',   category: 'order',    note: '시안·이미지·발주 엑셀 등' },
  { metric: '기본 도면 파일',                    value: '427건',   category: 'analysis', note: '도면·_기본도면·회의실 도면 폴더 walk' },
  { metric: '안내·신청 서류',                    value: '210건',   category: 'analysis', note: '센터·전시장 안내서류·임대자료·제출서류' },
  { metric: '시설 가이드 등록 (코드 시드)',      value: '40건',    category: 'venue',    note: 'VENUE_FACILITY_GUIDE_SEED — 실측 19 + 골격 21 (2026-05-19 추가)' },
  { metric: 'VENUE_HALLS 등록 (코드 시드)',      value: '47건',    category: 'venue',    note: 'COEX 10·KINTEX 10·DDP 5·ICC JEJU 12·하얏트 4·플라자 1·BEXCO 6' },
  { metric: '시설 가이드 미등록 갭 (보강 전)',   value: '21건 → 0건', category: 'gap',  note: '2026-05-19 골격 시드 추가 후 0건 (운영팀 연락처 보강은 안내·임대자료 PDF 분석 후)' },
]

/** 카테고리별 집계 (노션 §4 + G드라이브 폴더 두 출처 합산) */
export function groupLearningMetaByCategory(): Record<string, LearningMeta[]> {
  const grouped: Record<string, LearningMeta[]> = {}
  for (const m of [...LEARNING_META_SEED, ...FOLDER_LEARNING_META]) {
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
