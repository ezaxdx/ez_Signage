// v9.42: AI 추천 파이프라인 4 step 블록 상수 (사용자 명시 — 2026-05-13)
// 사용자 인용: "추천 파이프라인 ... 부분 파이프라인이 아니라 프롬프트로 적용해줘
//             매번 바뀌는 부분은 블록 느낌으로 제공 향후 쉽게 편집하기 위함"
//
// SOT: 이 파일이 4 step 정의의 단일 진실 소스(SSOT).
// 사용처:
//   1) lib/ai/recommendSignage.ts — SYSTEM_INSTRUCTION 조립 시 4 블록을 순서대로 합쳐 사용
//   2) app/(dashboard)/admin/ai/AiPipelineCard.tsx — 어드민 시각화 카드 데이터 소스
//
// 편집 가이드:
//   - title 변경: 어드민 카드 + 프롬프트 양쪽에 즉시 반영됨
//   - body 변경: AI 프롬프트의 해당 step 내용만 변경 (어드민 카드 desc는 별도)
//   - 향후 admin_ai_pipeline_blocks 테이블로 이관 시 이 파일을 fallback으로 유지
//
// 표시명·desc는 어드민 시각화 카드용. body는 Gemini SYSTEM_INSTRUCTION 본문용.

export interface PipelineBlock {
  num: 1 | 2 | 3 | 4
  /** 어드민 카드 + 프롬프트 헤더 공통 표시명 */
  title: string
  /** 어드민 카드 한 줄 설명 (시각화 전용) */
  desc: string
  /** Gemini SYSTEM_INSTRUCTION에 합쳐지는 본문 (프롬프트 전용) */
  body: string
  /** 어드민 카드 상태 (active=현재 동작 / coming=향후 활성) */
  status: 'active' | 'coming'
}

export const PIPELINE_BLOCKS: Record<'step1' | 'step2' | 'step3' | 'step4', PipelineBlock> = {
  step1: {
    num: 1,
    title: '파트 후보 추출',
    desc: '선택된 프로그램 파트 다중 → 권장 환경장식물 ID 풀',
    body: `1순위: 프로그램 파트별 환경장식물 후보 추출
       (입력: 선택된 파트 다중)`,
    status: 'active',
  },
  step2: {
    num: 2,
    title: '시설 가이드 제약',
    desc: '행사장별 설치 불가 카테고리 후보 제외',
    body: `2순위: 행사장 시설 가이드 제약 — 못 설치 카테고리 후보 제외
       (입력: 행사 장소)`,
    status: 'active',
  },
  step3: {
    num: 3,
    title: '표준 수량 산정',
    desc: '행사장 시설 가이드 표준 규격·수량 적용',
    body: `3순위: 행사장 시설 가이드 표준 수량 — 각 후보 quantity 지정
       (입력: 행사 장소)`,
    status: 'active',
  },
  step4: {
    num: 4,
    title: '도면 Vision 보강',
    desc: '행사장 배치도 분석 → 동선·설치 위치 컨텍스트',
    body: `[보강] 행사장 배치도 Vision 분석 → 동선·설치 위치 컨텍스트`,
    status: 'active',
  },
}

/** 어드민 카드 등에서 순서대로 순회용 — step1 → step4 */
export const PIPELINE_BLOCK_LIST: PipelineBlock[] = [
  PIPELINE_BLOCKS.step1,
  PIPELINE_BLOCKS.step2,
  PIPELINE_BLOCKS.step3,
  PIPELINE_BLOCKS.step4,
]

/** SYSTEM_INSTRUCTION의 [추천 로직] 절을 4 블록 body 조립으로 생성 */
export function buildPipelineLogicSection(): string {
  return [
    '[추천 로직 — 3단계 우선순위]',
    PIPELINE_BLOCKS.step1.body,
    PIPELINE_BLOCKS.step2.body,
    PIPELINE_BLOCKS.step3.body,
    PIPELINE_BLOCKS.step4.body,
  ].join('\n')
}
