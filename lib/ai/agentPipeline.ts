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
  num: 1 | 2 | 3 | 4 | 5
  /** 어드민 카드 + 프롬프트 헤더 공통 표시명 */
  title: string
  /** 어드민 카드 한 줄 설명 (시각화 전용) */
  desc: string
  /** Gemini SYSTEM_INSTRUCTION에 합쳐지는 본문 (프롬프트 전용) */
  body: string
  /** 어드민 카드 상태 (active=현재 동작 / coming=향후 활성) */
  status: 'active' | 'coming'
}

export const PIPELINE_BLOCKS: Record<'step1' | 'step2' | 'step3' | 'step4' | 'step5', PipelineBlock> = {
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
  // 5/20 노션 §1 (AI 호출 3종) 정합 = 행사장 특징 분석 AI = 신규 행사장 등록 시 시설가이드 텍스트화
  step5: {
    num: 5,
    title: '행사장 특징 분석',
    desc: '신규 행사장 등록 시 시설 가이드·매뉴얼 텍스트화',
    body: `[행사장 등록] 신규 행사장 시설 가이드 PDF·매뉴얼 텍스트화 → venues.specs_text 저장`,
    status: 'coming',
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
//
// v9.51 (2026-05-14) — 4 step → 2 카드 통합 + 카드별 페르소나 오버라이드 추가:
//   - 카드 1 (recommend): step1·2·3 통합 — 항상 호출되는 추천 흐름 (파트 후보 → 시설 제약 → 표준 수량)
//     ★ "표준 수량 산정" = 김연아 대리님 명시 ′3번 AI 투입′ 영역 (카드 안에서 시각 강조)
//   - 카드 2 (floor_plan_vision): step4 단독 — 도면 첨부 시에만 별도 Gemini Vision 호출
//   - StepOverridesMap (step1~4)도 v9.46 호환 위해 보존. CardOverridesMap은 신규 키.
//   - 적용 우선순위: cardOverrides → stepOverrides(레거시) → 기본 PIPELINE_BLOCKS.

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

export type StepOverridesMap = Partial<Record<'step1' | 'step2' | 'step3' | 'step4' | 'step5', StepPersonaOverride>>

/** v9.51 — 카드 단위 키. recommend = step1+2+3 통합, floor_plan_vision = step4 단독 */
export type CardKey = 'recommend' | 'floor_plan_vision' | 'venue_text_analysis'

export type CardPersonaOverride = StepPersonaOverride
export type CardOverridesMap = Partial<Record<CardKey, CardPersonaOverride>>

/** v9.51 — 카드 메타 (어드민 시각화 용) */
export interface PipelineCard {
  key: CardKey
  /** 카드 헤더 표시명 */
  title: string
  /** 카드 한 줄 설명 (시각화 전용) */
  desc: string
  /** 카드 안내 메시지 (Gemini 호출 시점·역할) */
  notice: string
  /** 이 카드가 묶는 step 키들 (recommend = step1·2·3 / floor_plan_vision = step4) */
  steps: Array<keyof typeof PIPELINE_BLOCKS>
  /** 항상 호출 / 첨부 시만 호출 */
  trigger: 'always' | 'on_attachment'
  /**
   * v9.53 (2026-05-14) — 페르소나 textarea 비웠을 때 실제 적용되는 기본 동작 본문.
   * PIPELINE_BLOCKS의 묶인 step body를 그대로 join한 텍스트.
   * 어드민 화면에서 textarea placeholder로 노출 → "비우면 기본값 사용"의 실체 시각화.
   * SOT: PIPELINE_BLOCKS[stepKey].body. 이 필드를 직접 편집하지 말고 PIPELINE_BLOCKS만 수정하면
   *      buildDefaultPersonaForCard 헬퍼가 자동으로 동기화한 텍스트를 가짐.
   */
  default_persona: string
}

// v9.53 (2026-05-14): 카드별 default_persona 자동 산출 — PIPELINE_BLOCKS의 step body를 그대로 join.
//   사용자(조기흠 사원, AXDX팀, 2026-05-14) 명시: ′비워두면 기본 동작 그대로′의 ′기본 동작′이 무엇인지
//   placeholder에 명확히 노출. 가짜 예시 ′당신은 [card.title] 전문가입니다 ...′ → 실제 step body로 교체.
//   ′3번 AI 투입 = 3순위 표준 수량 산정′ 의미가 placeholder 본문에 그대로 노출되어 시각 강조 박스 없이도 의미 전달.
function buildDefaultPersonaForCard(stepKeys: Array<keyof typeof PIPELINE_BLOCKS>): string {
  return stepKeys
    .map(k => PIPELINE_BLOCKS[k].body.trim())
    .filter(b => b.length > 0)
    .join('\n')
}

// v9.52 (2026-05-14): 카드 부연·강조 텍스트 삭제 + 헤더 부연 단순화 (조기흠 사원 명시)
//   recommend 카드: notice 비움 + title ′추천 (항상 호출)′ → ′추천′ (배지가 이미 ′항상 호출′ 표시)
//   floor_plan_vision 카드: notice 비움 + title ′도면 분석 보강 (도면 첨부 시만)′ → ′도면 분석 보강′ (배지로 충분)
//   ′응? 금지′ + ′편집 도구 자체에 집중′ 룰 — 헤더 title과 배지가 같은 정보를 두 번 노출하던 중복 제거.
// v9.53 (2026-05-14): 각 카드에 default_persona 추가 — 어드민 placeholder가 실제 step body 노출.
export const PIPELINE_CARDS: Record<CardKey, PipelineCard> = {
  recommend: {
    key: 'recommend',
    title: '추천',
    desc: '파트 후보 추출 → 시설 제약 → 표준 수량 산정',
    notice: '',
    steps: ['step1', 'step2', 'step3'],
    trigger: 'always',
    default_persona: buildDefaultPersonaForCard(['step1', 'step2', 'step3']),
  },
  floor_plan_vision: {
    key: 'floor_plan_vision',
    title: '도면 분석 보강',
    desc: '행사장 배치도 Vision 분석 → 동선·설치 위치 컨텍스트',
    notice: '',
    steps: ['step4'],
    trigger: 'on_attachment',
    default_persona: buildDefaultPersonaForCard(['step4']),
  },
  // 5/20 노션 §1 (AI 호출 3종) 정합 = 행사장 특징 분석 AI
  venue_text_analysis: {
    key: 'venue_text_analysis',
    title: '행사장 특징 분석',
    desc: '신규 행사장 등록 시 시설가이드 PDF·매뉴얼 텍스트화',
    notice: '',
    steps: ['step5'],
    trigger: 'on_attachment',
    default_persona: buildDefaultPersonaForCard(['step5']),
  },
}

export const PIPELINE_CARD_LIST: PipelineCard[] = [
  PIPELINE_CARDS.recommend,
  PIPELINE_CARDS.floor_plan_vision,
  PIPELINE_CARDS.venue_text_analysis,
]

/**
 * v9.51 — 카드 오버라이드를 step 오버라이드로 펼침 (recommend → step1·2·3 일괄 적용)
 * 카드 페르소나 1개가 묶인 step body 전체를 치환합니다 (3 step 합쳐서 1 prompt).
 * 호환: stepOverrides (레거시 v9.46)도 그대로 받음. cardOverrides가 우선.
 */
export function expandCardOverrides(cardOverrides?: CardOverridesMap, legacyStepOverrides?: StepOverridesMap): StepOverridesMap {
  const merged: StepOverridesMap = { ...(legacyStepOverrides ?? {}) }
  if (cardOverrides) {
    for (const cardKey of ['recommend', 'floor_plan_vision'] as const) {
      const ov = cardOverrides[cardKey]
      if (!ov) continue
      const card = PIPELINE_CARDS[cardKey]
      const promptText = (ov.system_prompt ?? '').trim()
      // recommend 카드는 step1·2·3 모두 동일 페르소나로 치환 (3 step 합쳐서 1 prompt)
      // floor_plan_vision 카드는 step4만 치환
      // body 치환은 첫 step에만 페르소나 본문을 두고, 나머지는 빈 body로 두어 중복 방지
      // (buildPipelineLogicSectionWith가 본문을 join하므로 빈 step은 join 시 빈 줄 → SYSTEM_INSTRUCTION 무영향)
      if (card.steps.length === 1) {
        merged[card.steps[0]] = {
          model: ov.model,
          temperature: ov.temperature,
          system_prompt: promptText.length > 0 ? promptText : undefined,
        }
      } else {
        // 다중 step 묶음 — 첫 step에 페르소나 전체, 나머지는 빈 본문(공백 유지로 join 시 영향 X)
        card.steps.forEach((stepKey, idx) => {
          merged[stepKey] = {
            model: ov.model,
            temperature: ov.temperature,
            system_prompt: idx === 0 && promptText.length > 0
              ? promptText
              : (idx === 0 ? undefined : ''),
          }
        })
      }
    }
  }
  return merged
}

/** PIPELINE_BLOCKS에 step별 persona override를 적용한 새 블록 맵 반환 (원본 불변) */
export function applyPersonaOverrides(overrides?: StepOverridesMap): typeof PIPELINE_BLOCKS {
  if (!overrides) return PIPELINE_BLOCKS
  const next = { ...PIPELINE_BLOCKS }
  for (const k of ['step1', 'step2', 'step3', 'step4'] as const) {
    const ov = overrides[k]
    if (!ov) continue
    if (typeof ov.system_prompt !== 'string') continue
    const prompt = ov.system_prompt.trim()
    if (prompt.length > 0) {
      next[k] = { ...PIPELINE_BLOCKS[k], body: prompt }
    } else if (ov.system_prompt === '') {
      // v9.51: expandCardOverrides가 다중 step 묶음의 비-첫 step에 빈 문자열을 넣어 본문 제거 신호
      // → 빈 step은 join 시 빈 줄로 노출되지 않도록 body를 비움
      next[k] = { ...PIPELINE_BLOCKS[k], body: '' }
    }
  }
  return next
}

/** persona override를 반영해 [추천 로직] 절 빌드 (overrides 없으면 buildPipelineLogicSection과 동일) */
export function buildPipelineLogicSectionWith(overrides?: StepOverridesMap): string {
  const blocks = applyPersonaOverrides(overrides)
  // v9.51: 빈 body step은 join에서 제외하여 SYSTEM_INSTRUCTION 깔끔하게 유지
  const bodies = [blocks.step1.body, blocks.step2.body, blocks.step3.body, blocks.step4.body]
    .map(b => b.trim())
    .filter(b => b.length > 0)
  return ['[추천 로직 — 3단계 우선순위]', ...bodies].join('\n')
}

/** step별 temperature 오버라이드 중 평균을 반환. 단일 Gemini 호출 한도 내에서 보수적으로 적용. */
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

// ── v9.51 변수 토큰 — 페르소나에 인라인 삽입용 ─────────────────────────
// 사용자가 페르소나 textarea에 변수 chip을 끼워 넣으면 토큰(`{{venue}}` 등)으로 직렬화.
// recommendSignage.ts가 호출 시점에 실제 데이터로 치환.
//
// D-1 단순 적용 (v9.51): textarea + ′변수 삽입′ 드롭다운 (드래그 X, 커서 위치에 삽입).
// D-2 풀 Tiptap chip 드래그 (v9.52 후속): 의존성 추가(@tiptap/react MIT) + 시각 chip + 드래그.

export interface PersonaVariable {
  /** {{token}} 형식의 토큰 (recommendSignage가 치환) */
  token: string
  /** UI 표시 라벨 */
  label: string
  /** chip 색상 힌트 (Tailwind 클래스 prefix — bg-emerald, bg-indigo 등) */
  color: string
  /** 카드 제한 (이 카드에서만 사용 가능) — null이면 전체 */
  cardScope?: CardKey | null
  /** 도움말 (호버 시 노출) */
  hint: string
}

export const PERSONA_VARIABLES: PersonaVariable[] = [
  { token: '{{venue}}',          label: '행사 장소',         color: 'bg-indigo-100 text-indigo-800 border-indigo-200', cardScope: null,                hint: '입력된 행사 장소 (예: 코엑스 그랜드볼룸)' },
  { token: '{{parts}}',          label: '선택 파트',         color: 'bg-emerald-100 text-emerald-800 border-emerald-200', cardScope: null,             hint: '선택된 프로그램 파트 다중 (예: 회의·등록)' },
  { token: '{{floor_plan}}',     label: '도면 분석 결과',    color: 'bg-amber-100 text-amber-800 border-amber-200',     cardScope: 'floor_plan_vision', hint: '도면 첨부 시 Vision 분석 텍스트 (도면 카드 전용)' },
  { token: '{{past_events}}',    label: '과거 사례',         color: 'bg-violet-100 text-violet-800 border-violet-200',  cardScope: null,                hint: 'findSimilarPastEvents 결과 5건 요약' },
  { token: '{{facility_guide}}', label: '시설 가이드',       color: 'bg-sky-100 text-sky-800 border-sky-200',           cardScope: null,                hint: 'venueFacilityGuide 시드 + 어드민 마스터 합본' },
]

/**
 * 페르소나 텍스트의 {{token}} 토큰을 실제 데이터로 치환 (recommendSignage가 호출).
 * data 인자는 부분적으로만 채워질 수 있음 — 미주어진 토큰은 빈 문자열로 치환.
 */
export function substitutePersonaVariables(personaText: string, data: Partial<Record<string, string>>): string {
  if (!personaText) return personaText
  return personaText.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const v = data[key]
    return typeof v === 'string' && v.length > 0 ? v : ''
  })
}
