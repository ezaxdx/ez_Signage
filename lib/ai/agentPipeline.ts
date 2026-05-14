// v9.42: AI 추천 파이프라인 4 step 블록 상수 (사용자 명시 — 2026-05-13)
// 사용자 인용: "추천 파이프라인 ... 부분 파이프라인이 아니라 프롬프트로 적용해줘
//             매번 바뀌는 부분은 블록 느낌으로 제공 향후 쉽게 편집하기 위함"
//
// SOT: 이 파일이 4 step 정의의 단일 진실 소스(SSOT).
// 사용처:
//   1) lib/ai/recommendSignage.ts — SYSTEM_INSTRUCTION 조립 시 4 블록을 순서대로 합쳐 사용 (현재 유일 활성 사용처)
//   2) app/(dashboard)/admin/ai/AiPipelineCard.tsx — v9.43에서 어드민 화면에선 제거됨 (파일은 보존, 사용 안 함)
//
// 편집 가이드:
//   - title·body 변경 시 recommendSignage SYSTEM_INSTRUCTION에 즉시 반영
//   - 향후 admin_ai_pipeline_blocks 테이블로 이관 시 이 파일을 fallback으로 유지
//   - v9.44 정밀 점검: AiPipelineCard는 import 끊긴 dead component이지만 파일 보존 (사용자 명시)
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

// ── v9.46 (2026-05-14): step별 페르소나·모델·온도 오버라이드 ───────────────
// 사용자(김연아 대리님 카톡, 조기흠 사원 전달): "관리자페이지 AI 관리에 3번 AI 투입되는 부분에서
//   투입되는 AI를 설정하고 페르소나를 수정할 수 있는 기능을 추가"
//
// SOT: 어드민 화면(/admin/ai)에서 step별 모델·temperature·system_prompt를 입력 → localStorage
//   admin_ai_settings_v2 에 저장 → case-a에서 추천 호출 시 본 모듈을 통해 SYSTEM_INSTRUCTION에 주입.
//
// 적용 규칙:
//   - persona(system_prompt) 비어있지 않으면 해당 step body를 persona 텍스트로 치환
//   - 비어있으면 PIPELINE_BLOCKS의 기본 body 유지 (step별 비활성 = 전역 fallback)
//   - model·temperature 값은 본 모듈에선 메타정보로만 보관 (실제 호출 분기는 recommendSignage가 수행)
//
// v9.46 1차: Gemini 단일 호출 유지 + 모델 select는 정보성. 후속 사이클에서 GPT/Claude 어댑터 도입 시
//   모델별 라우팅을 활성화. (현 시점 의존성 추가 금지)

export type AiModelKey =
  | 'gemini-2.5-flash'
  | 'gemini-2.5-pro'
  | 'gpt-4o'
  | 'gpt-4o-mini'
  | 'claude-3-5-sonnet'
  | 'claude-3-7-sonnet'

export interface StepPersonaOverride {
  /** 호출 모델 키 (현 사이클은 Gemini만 실제 호출. 그 외는 메타정보로 저장.) */
  model?: AiModelKey
  /** 0.0 ~ 1.0 — 비어있으면 전역 temperature 사용 */
  temperature?: number
  /** step body를 이 텍스트로 치환. 비어있으면 PIPELINE_BLOCKS 기본 body 유지. */
  system_prompt?: string
}

export type StepOverridesMap = Partial<Record<'step1' | 'step2' | 'step3' | 'step4', StepPersonaOverride>>

/** PIPELINE_BLOCKS에 step별 persona override를 적용한 새 블록 맵 반환 (원본 불변) */
export function applyPersonaOverrides(overrides?: StepOverridesMap): typeof PIPELINE_BLOCKS {
  if (!overrides) return PIPELINE_BLOCKS
  const next = { ...PIPELINE_BLOCKS }
  for (const k of ['step1', 'step2', 'step3', 'step4'] as const) {
    const ov = overrides[k]
    if (!ov) continue
    const prompt = (ov.system_prompt ?? '').trim()
    if (prompt.length > 0) {
      next[k] = { ...PIPELINE_BLOCKS[k], body: prompt }
    }
  }
  return next
}

/** persona override를 반영해 [추천 로직] 절 빌드 (overrides 없으면 buildPipelineLogicSection과 동일) */
export function buildPipelineLogicSectionWith(overrides?: StepOverridesMap): string {
  const blocks = applyPersonaOverrides(overrides)
  return [
    '[추천 로직 — 3단계 우선순위]',
    blocks.step1.body,
    blocks.step2.body,
    blocks.step3.body,
    blocks.step4.body,
  ].join('\n')
}

/** step별 temperature 오버라이드 중 최댓값을 반환 (비면 null). 단일 Gemini 호출 한도 내에서 보수적으로 적용. */
export function pickEffectiveTemperature(overrides?: StepOverridesMap, fallback = 0.4): number {
  if (!overrides) return fallback
  const vals: number[] = []
  for (const k of ['step1', 'step2', 'step3', 'step4'] as const) {
    const t = overrides[k]?.temperature
    if (typeof t === 'number' && t >= 0 && t <= 1) vals.push(t)
  }
  if (vals.length === 0) return fallback
  // 평균 (한 호출에 합치기 때문에 보수적으로 평균값)
  return vals.reduce((a, b) => a + b, 0) / vals.length
}
