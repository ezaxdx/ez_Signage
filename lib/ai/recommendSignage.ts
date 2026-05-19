// Gemini API로 행사 컨텍스트 → 환경장식물 추천 리스트 생성.
// 서버 사이드 전용 (GEMINI_API_KEY 노출 금지).
// .env.local 에 GEMINI_API_KEY=AIzaSy... 추가 필요.

import { findSimilarPastEvents, findCeilingBannerContext, getVenueSpecs, formatVenueSpecsContext } from '@/lib/data/dashboardSeed'
import { findSimilarVenueSignage, formatVenueSignageContext } from '@/lib/data/venueSignageHelper'
import { buildAccumulatedContext, formatAccumulatedContext, buildSeedEventHistoryContext } from '@/lib/ai/accumulatedContext'
import { buildVenueProfile } from '@/lib/ai/venueProfile'
import { buildAdminMasterContext } from '@/lib/ai/adminMasterContext'
import { analyzeFloorPlan } from '@/lib/ai/visionFloorPlan'
import {
  resolveCoverageForVenue,
  formatCoverageForPrompt,
  classifyCategory,
  type StandardCategoryKey,
} from '@/lib/data/signageCategoryStandards'
import { SIGNAGE_CATEGORIES_V3 } from '@/lib/data/v3/signageCategoriesSeedV3'
import { PROGRAM_PART_BY_CODE, PROGRAM_PART_SIGNAGE_HINTS, partsForFormat, programPartName } from '@/lib/programParts'
import {
  buildPipelineLogicSection,
  buildPipelineLogicSectionWith,
  pickEffectiveTemperature,
  expandCardOverrides,
  substitutePersonaVariables,
  type StepOverridesMap,
  type CardOverridesMap,
} from '@/lib/ai/agentPipeline'

export type EventType =
  | 'conference' | 'exhibition' | 'awards' | 'forum' | 'workshop'
  | 'experience' | 'ceremony' | 'fair' | 'launching' | 'other'

export type EventScale = 'small' | 'medium' | 'large' | 'mega'
export type EventLanguage = 'KOR' | 'EN' | 'EN/KOR' | 'multi'

export interface RecommendInput {
  eventName: string
  venue: string
  eventType?: EventType
  eventDate?: string
  setupDate?: string
  teardownDate?: string
  attendeesCount?: number
  durationDays?: number
  language?: EventLanguage
  clientName?: string
  hostOrganizer?: string
  keySpaces?: string
  mainEntrance?: string
  budgetConstrained?: boolean
  outdoorPortion?: boolean
  hasVip?: boolean
  isInternational?: boolean
  purposes: string[]
  /** v9.31: 프로그램 파트 코드 배열 (예: ['40.04', '40.19']) — 회의·등록 등 다중 선택. PROGRAM_PARTS 12종 코드.
   *  Gemini 프롬프트에 파트별 권장 환경장식물 매핑을 주입하고, 응답 후처리로 각 RecommendItem에 program_part를 자동 채움. */
  programParts?: string[]
  /** v9.33: 행사장 배치도(평면도) 이미지 URL — Gemini Vision으로 분석해 동선·설치 위치 컨텍스트로 1순위 보강 */
  floorPlanImageUrl?: string
  notes?: string
  /** v9.46 (2026-05-14): 어드민 화면(/admin/ai)에서 설정한 step별 모델·temperature·페르소나 오버라이드.
   *  제공 시 SYSTEM_INSTRUCTION의 4 step body가 페르소나 텍스트로 치환됨. 비어있으면 기본 PIPELINE_BLOCKS 사용.
   *  현 사이클은 클라이언트 localStorage(admin_ai_settings_v2)에서 읽어 API에 전달. 서버 영구화는 후속 사이클.
   *  v9.51 (2026-05-14): cardOverrides가 우선. stepOverrides는 v9.46 호환 위해 보존. */
  stepOverrides?: StepOverridesMap
  /** v9.51 (2026-05-14): 4 step → 2 카드 통합 후 신규 키.
   *  카드 1 (recommend) = step1·2·3 합본 / 카드 2 (floor_plan_vision) = step4 단독.
   *  어드민 /admin/ai 화면에서 카드별 페르소나·모델·온도 입력. 페르소나 textarea는 {{venue}} 등 변수 토큰을
   *  포함할 수 있으며 본 함수가 호출 시점에 실제 데이터로 치환. */
  cardOverrides?: CardOverridesMap
}

export interface RecommendItem {
  no: string
  category: string
  category_label: string
  width_mm: number
  height_mm: number
  material: string
  location: string
  purpose: string
  quantity: number
  rationale: string
  /** v9.22: 6대 표준 카테고리 자동 분류 (외벽/게이트/가로등/X배너/천정/부속시설) */
  standard_category?: StandardCategoryKey | null
  /** v9.22: 학습 데이터 부재로 quantity=0 추천 처리되었는지 (UI에서 amber 표기) */
  no_data_flag?: boolean
  /** v9.31: 1차 매칭된 프로그램 파트 코드 (예: '40.04'). NewProjectButton·case-a 양쪽에서 노출.
   *  AI 응답에 program_part가 없으면 후처리로 partsForFormat() ∩ input.programParts 첫 매치로 자동 채움. */
  program_part?: string | null
  /** v9.31: 파트 한글명 (UI 노출용) — design_items.part 컬럼 후보 */
  program_part_name?: string | null
}

export interface RecommendResult {
  items: RecommendItem[]
  summary: string
  inferredScale?: EventScale
  /** v9.22: 학습 데이터 커버리지 (행사장별 6대 카테고리 학습 현황 요약) */
  coverage?: {
    venue_key: string | null
    filled: string[]
    missing: string[]
  }
}

const EVENT_TYPE_KO: Record<EventType, string> = {
  conference: '컨퍼런스',
  exhibition: '전시회',
  awards: '시상식',
  forum: '포럼',
  workshop: '워크숍',
  experience: '체험 행사',
  ceremony: '기념식',
  fair: '박람회',
  launching: '발표·런칭',
  other: '기타',
}

function inferScale(attendees?: number): EventScale {
  if (!attendees) return 'medium'
  if (attendees < 100) return 'small'
  if (attendees < 500) return 'medium'
  if (attendees < 2000) return 'large'
  return 'mega'
}

// v9.42 — SYSTEM_INSTRUCTION을 4 step 블록 상수(lib/ai/agentPipeline.ts) 조립으로 생성
// 사용자 인용(2026-05-13): "매번 바뀌는 부분은 블록 느낌으로 제공 향후 쉽게 편집하기 위함"
// 4 step body(파트 후보 → 시설 제약 → 표준 수량 → 도면 Vision 보강)는 PIPELINE_BLOCKS에서 import.
// 응답 형식·표준 12종 목록은 본 파일에서 유지 (Gemini 출력 스키마 — 자주 변경 안 됨).
// v9.46 (2026-05-14) — buildSystemInstruction(stepOverrides)로 함수화. step별 페르소나 치환 지원.
function buildSystemInstruction(stepOverrides?: StepOverridesMap): string {
  const logic = stepOverrides
    ? buildPipelineLogicSectionWith(stepOverrides)
    : buildPipelineLogicSection()
  const v3CategoryLines = SIGNAGE_CATEGORIES_V3
    .map(c => `- ${c.key} / ${c.label} / ${c.default_size_mm.width}*${c.default_size_mm.height} / ${c.material}`)
    .join('\n')
  return `당신은 MICE 환경장식물 발주 전문가입니다.

${logic}

[응답]
각 항목 program_part · standard_category 명시
2순위 제외 = "[설치 불가 — 행사장 제약]"
3순위 부재 = "[수량 미정 — 운영자 확정]"

표준 12 카테고리 (category 키 / 표시명 / 일반 규격mm / 재질) — 노션 컴펌 본 §6-2 정합:
${v3CategoryLines}

위 12 카테고리 외 명칭(백월·포토월·트러스·부스·DID 사이니지·폼보드 POP·시트지·바닥스티커) 추천 금지.
매핑 룰 (노션 §8-1 동의어 정합·5/7 손피켓 가로 기본):
- 명패·웰컴 피켓·큐방·셔틀버스 큐방시트 = a4_landscape
- 명패(대)·웰컴보드·시상보드·기념촬영보드·컨설팅폼보드·좌석배치도 안내사인 = a3_landscape
- 천장배너·천정배너·행잉·장폭_천정배너 = chunchen_banner
- 난간배너·드롭배너 = vertical_banner
- 빵빠레배너 = streetlight_banner
- MOU 현수막·투어용 현수막·상단 배너 = horizontal_banner
- 스프링배너·롤업배너·물통배너 = x_banner
- 스탠드POP = i_banner

[AI 이상 답변 방지 4단 안전망 — 노션 §1-3·NIST AI RMF 정합]
1. 입력 강제 (Govern) — 정해진 양식 요청 (위 JSON 형식 엄수·12 카테고리 enum 강제)
2. 후처리 검증 (Measure) — 잘못된 항목 자동 정정 (size·material 기본값 fallback·키 일관 검증)
3. 실패 대체 안내 (Manage) — 기본 추천 + 매뉴얼 확인 안내 ("[추천 없음 — 매뉴얼 확인]" 표기)
4. 상태 확인 (Map) — 누적률 관리자 페이지 표시 (학습 데이터 부족 시 quantity=0 + no_data_flag=true)

[가이드 예외 패턴 — 노션 §1-5]
- 같은 행사장 3회 누적 = 가이드 수치 재검토 신호 (admin/exception-monitor 자동 알림)
- 같은 패턴 (환경장식물 + 규격 + 파트) 전체 3회 누적 = 가이드 자체 수정 신호

응답은 반드시 JSON 한 덩어리만 출력. 마크다운 펜스·해설 금지.
형식:
{
  "items": [
    {"no":"01","category":"x_banner","category_label":"X배너","standard_category":"x_banner","width_mm":600,"height_mm":1800,"material":"PET","location":"행사장 메인 입구","purpose":"main_promo","quantity":4,"rationale":"근거 1~2문장","program_part":"40.04"}
  ],
  "summary": "추천 의도 1~2문장 (행사 규모·유형·핵심 포인트 명시)",
  "inferredScale": "medium"
}`
}

const GEMINI_ENDPOINT =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'

export async function recommendSignage(input: RecommendInput): Promise<RecommendResult> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY 미설정. .env.local 에 GEMINI_API_KEY=AIzaSy... 추가해주세요.')
  }

  const scale = inferScale(input.attendeesCount)
  const eventTypeKo = input.eventType ? EVENT_TYPE_KO[input.eventType] : '미지정'

  let durationDays = input.durationDays
  if (!durationDays && input.setupDate && input.teardownDate) {
    const d1 = new Date(input.setupDate).getTime()
    const d2 = new Date(input.teardownDate).getTime()
    if (!isNaN(d1) && !isNaN(d2) && d2 > d1) {
      durationDays = Math.round((d2 - d1) / (1000 * 60 * 60 * 24)) + 1
    }
  }

  // 과거 유사 행사 5건 추출 (명세 5번 — "과거 유사 행사 데이터 참조")
  const similarEvents = findSimilarPastEvents({
    venue: input.venue,
    client: input.clientName,
    category: input.eventType ? EVENT_TYPE_KO[input.eventType] : null,
    limit: 5,
  })
  const similarEventsBlock = similarEvents.length > 0
    ? '\n\n[과거 유사 행사 (수행실적 매핑)]\n' + similarEvents.map((e, i) =>
        `${i + 1}. ${e.project_name} (${e.year}) — ${e.venue} / 발주처: ${e.client} / 분류: ${e.event_category} / 형태: ${e.event_format}`
      ).join('\n') + '\n→ 위 과거 행사들의 행사장·발주처·분류 패턴을 참고하여 추천하세요.'
    : ''

  // v8: 같은 행사장 발주엑셀 통합 분석 데이터 (1~3건만 필터링 주입)
  // 전체 1,856건 항목 통째로 X — 같은 행사장 매칭만
  const venueSignageContext = findSimilarVenueSignage(input.venue, [], 3)
  const venueSignageBlock = venueSignageContext.length > 0
    ? formatVenueSignageContext(venueSignageContext) + '\n→ 같은 행사장의 실제 발주 패턴을 참고하여 카테고리·수량을 추정하세요.'
    : ''

  // v9: 점진적 정확도 향상 — 앱 누적 데이터 (단계별 가중치 부여)
  let accumulatedBlock = ''
  try {
    const accCtx = await buildAccumulatedContext({
      venue: input.venue,
      eventType: input.eventType ?? null,
      limit: 5,
    })
    accumulatedBlock = formatAccumulatedContext(accCtx)
  } catch { /* silent */ }

  // 5/22 사용자 명시 = 행사 관리 SOT → AI 컨텍스트 주입. venue·programParts 매칭 5건 signage_breakdown.
  const seedHistoryBlock = await buildSeedEventHistoryContext(input.venue, input.programParts)

  // v9.6: 회의록 ′학습해 가지고 텍스트 파일 형태로 이거는 어떤 행사장이다가 나올 거예요′
  // 행사장 메타(venues) + 시설 가이드 시드(venueFacilityGuide) + 예외 누적(facility_exception_log) 통합
  let venueProfileBlock = ''
  try {
    const profile = await buildVenueProfile(input.venue)
    if (profile.has_data) {
      venueProfileBlock = '\n\n' + profile.text + '\n→ 위 행사장 시설 기준을 추천 항목에 우선 반영. 설치 불가 카테고리는 제외하고, 조건부는 비고에 표기.'
    }
  } catch { /* silent */ }

  // v9.17: 천정배너 실측 패턴 주입 (docs/VENUE_LEARNING_INSIGHTS_260511.md §4)
  const ceilingBannerBlock = findCeilingBannerContext(input.venue)

  // v9.18: 행사장 규모 스펙 주입 (수량 스케일링 기준 — 면적/천장고/부스수/출입구)
  const venueSpecs = getVenueSpecs(input.venue)
  const venueSpecsBlock = venueSpecs
    ? '\n\n' + formatVenueSpecsContext(venueSpecs) + '\n→ 위 행사장 규모 기준으로 수량 스케일링 적용.'
    : ''

  // v9.22: 6대 표준 카테고리 학습 데이터 커버리지 주입
  // "이 행사장은 외벽·천정만 학습됨" → AI가 미학습 카테고리에 quantity=0 + 추천없음 표기하도록 명시
  const coverageBlock = formatCoverageForPrompt(input.venue)

  // v9.31: 프로그램 파트 매핑 컨텍스트 (1순위 — 사용자 선택 파트별 환경장식물 후보)
  const selectedParts = (input.programParts ?? []).filter(c => PROGRAM_PART_BY_CODE.has(c))
  const programPartsBlock = selectedParts.length === 0 ? '' :
    '\n\n[1순위 — 프로그램 파트 매핑] (사용자 선택 ' + selectedParts.length + '개)\n' +
    selectedParts.map(code => {
      const p = PROGRAM_PART_BY_CODE.get(code)!
      const hints = PROGRAM_PART_SIGNAGE_HINTS[code] ?? []
      return `- ${code} ${p.name} → 권장 환경장식물: ${hints.join(', ')}`
    }).join('\n') +
    '\n→ 위 파트별 권장 환경장식물을 1순위 후보로 사용. 각 추천 항목에 매칭된 파트 코드 1개를 program_part 필드에 명시.'

  // v9.40: 어드민 마스터 데이터 자동 주입 (signage_types 추가 + signage_aliases manual + venues.facility_guide_json)
  // 어드민이 학습 관리자에서 DB에 직접 적재한 추가 자료를 AI가 즉시 활용하도록 합침.
  // (기존 시드 13종·47건·7개 행사장은 dashboardSeed·venueFacilityGuide 경유로 이미 반영)
  let adminMasterBlock = ''
  try {
    const am = await buildAdminMasterContext(input.venue)
    if (am.has_data) adminMasterBlock = am.text
  } catch { /* silent */ }

  // v9.33: 행사장 배치도 Vision 분석 — 동선·설치 위치 컨텍스트 보강
  // 1순위(파트별 후보) 결과의 location 필드 정확도를 높이는 보조 컨텍스트.
  // v9.51: 도면 카드(floor_plan_vision)에 페르소나가 있으면 Vision 호출 후 페르소나에 {{floor_plan}} 토큰 치환하여 보강 절 작성
  let floorPlanBlock = ''
  let floorPlanRawText = ''
  if (input.floorPlanImageUrl) {
    try {
      const vision = await analyzeFloorPlan(input.floorPlanImageUrl)
      if (vision.text && !vision.error) {
        floorPlanRawText = vision.text.trim()
        const cardOv = input.cardOverrides?.floor_plan_vision
        const cardPrompt = (cardOv?.system_prompt ?? '').trim()
        if (cardPrompt.length > 0) {
          // 카드 페르소나에 {{floor_plan}} 토큰 치환 (다른 변수도 포함 가능)
          const persona = substitutePersonaVariables(cardPrompt, {
            floor_plan: floorPlanRawText,
            venue: input.venue,
            parts: (input.programParts ?? []).join(', '),
          })
          floorPlanBlock = '\n\n[보강 — 행사장 배치도 Vision 분석]\n' + persona +
            '\n\n[Vision 원문]\n' + floorPlanRawText
        } else {
          floorPlanBlock = '\n\n[보강 — 행사장 배치도 Vision 분석]\n' + floorPlanRawText +
            '\n→ 위 배치도 분석 결과를 각 항목 location 필드에 반영하여 동선·설치 위치를 구체화하세요.'
        }
      }
    } catch { /* silent — Vision 실패해도 추천 진행 */ }
  }

  const userText = [
    `행사명: ${input.eventName}`,
    input.eventType ? `행사 유형: ${eventTypeKo}` : '',
    `장소: ${input.venue}`,
    input.clientName ? `주최/발주처: ${input.clientName}` : '',
    input.hostOrganizer ? `주관 기관: ${input.hostOrganizer}` : '',
    input.eventDate ? `행사일: ${input.eventDate}` : '',
    input.setupDate ? `세팅 시작: ${input.setupDate}` : '',
    input.teardownDate ? `철거일: ${input.teardownDate}` : '',
    durationDays ? `행사 기간: ${durationDays}일` : '',
    input.attendeesCount ? `예상 참가자: ${input.attendeesCount}명 (자동 분류: ${scale})` : `규모 가정: ${scale}`,
    input.language ? `행사 언어: ${input.language}` : '',
    input.keySpaces ? `주요 공간: ${input.keySpaces}` : '',
    input.mainEntrance ? `메인 출입구: ${input.mainEntrance}` : '',
    input.outdoorPortion ? `야외 구간 포함: 예` : '',
    input.hasVip ? `VIP/정상급 참석: 예` : '',
    input.isInternational ? `국제 행사: 예 (영문 표기 필수)` : '',
    input.budgetConstrained ? `예산 제약: 있음 (비용 절감 우선)` : '',
    `사용 목적: ${input.purposes.join(', ') || '미지정 — 행사 유형 기준 자동 판단'}`,
    selectedParts.length > 0 ? `프로그램 파트: ${selectedParts.map(c => `${c} ${PROGRAM_PART_BY_CODE.get(c)!.name}`).join(', ')}` : '',
    input.notes ? `추가 메모: ${input.notes}` : '',
  ].filter(Boolean).join('\n') + similarEventsBlock + venueSignageBlock + accumulatedBlock + seedHistoryBlock + venueProfileBlock + ceilingBannerBlock + venueSpecsBlock + coverageBlock + adminMasterBlock + programPartsBlock + floorPlanBlock

  // v9.51 — 카드 오버라이드(우선) → step 오버라이드(레거시 호환) → PIPELINE_BLOCKS 기본 순.
  // 추천 카드 페르소나는 변수 토큰 치환을 한 번 거친 뒤 step1·2·3에 일괄 적용.
  let effectiveCardOverrides: CardOverridesMap | undefined = input.cardOverrides
  if (effectiveCardOverrides?.recommend?.system_prompt) {
    const personaWithVars = substitutePersonaVariables(effectiveCardOverrides.recommend.system_prompt, {
      venue: input.venue,
      parts: selectedParts.length > 0
        ? selectedParts.map(c => `${c} ${PROGRAM_PART_BY_CODE.get(c)?.name ?? ''}`.trim()).join(', ')
        : '',
      // floor_plan은 추천 카드에선 비어있을 수 있음 (보강 절은 별도)
      floor_plan: floorPlanRawText || '',
      past_events: similarEvents.map(e => `${e.project_name} (${e.year})`).join(', '),
      facility_guide: venueProfileBlock || '',
    })
    effectiveCardOverrides = {
      ...effectiveCardOverrides,
      recommend: {
        ...effectiveCardOverrides.recommend,
        system_prompt: personaWithVars,
      },
    }
  }
  const expandedStepOverrides = expandCardOverrides(effectiveCardOverrides, input.stepOverrides)
  const sysInstruction = buildSystemInstruction(expandedStepOverrides)
  const effectiveTemp = pickEffectiveTemperature(expandedStepOverrides, 0.4)

  const body = {
    systemInstruction: { parts: [{ text: sysInstruction }] },
    contents: [{ role: 'user', parts: [{ text: userText }] }],
    generationConfig: {
      temperature: effectiveTemp,
      maxOutputTokens: 8000,  // 추천 항목 30~80건 + summary + rationale → 3000은 부족
      responseMimeType: 'application/json',
    },
  }

  const res = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Gemini API 호출 실패 (${res.status}): ${errText.slice(0, 200)}`)
  }

  const data = await res.json() as {
    candidates?: { content?: { parts?: { text?: string }[] } }[]
    error?: { message?: string }
  }

  if (data.error) {
    throw new Error(`Gemini 오류: ${data.error.message}`)
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) {
    throw new Error('Gemini 응답이 비어있습니다')
  }

  const raw = text.replace(/```json|```/g, '').trim()
  let parsed: RecommendResult
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error('Gemini 응답을 JSON으로 파싱하지 못했습니다: ' + raw.slice(0, 200))
  }

  if (!Array.isArray(parsed.items)) {
    throw new Error('items 배열이 없습니다')
  }
  if (!parsed.inferredScale) parsed.inferredScale = scale

  // v9.22 + v9.23: 후처리 — 6대 표준 카테고리 분류 + 미학습 카테고리 자동 표기 강제
  // (SYSTEM_INSTRUCTION 텍스트 약속을 코드로 보강. 정답지 노출 편향 방지 — learnings.md 2026-05-11)
  // v9.23: venueFacilityGuide 미등록 행사장(aT센터·OSCO·롯데호텔 등)도 발주엑셀 통합 맵 fallback으로 후처리 동작
  const cov = resolveCoverageForVenue(input.venue)
  if (cov) {
    // 각 item에 standard_category 분류 + 미학습 시 no_data_flag 깃발 (quantity는 보존)
    // x_banner·support는 일반 룰 추천 허용 — venueFacilityGuide.ts에 거의 항상 allowed
    const COMMON_ALLOWED: StandardCategoryKey[] = ['x_banner', 'support']
    for (const item of parsed.items) {
      const sc = classifyCategory(item.category_label) || classifyCategory(item.category)
      item.standard_category = sc
      if (sc && !cov.has_data[sc] && !COMMON_ALLOWED.includes(sc) && item.quantity > 0) {
        // 미학습 카테고리인데 수량이 있음 — 학습 없는 추측 추천
        item.no_data_flag = true
        const prevRationale = item.rationale ?? ''
        item.rationale = `[추천 없음 — 학습 데이터 부재] ${prevRationale}`.trim()
        // quantity는 보존 (UI에서 amber로 표시하고 사용자가 결정)
        // → 0으로 강제하면 학습 시도 자체가 끊김. 깃발만 세워 사용자에게 알림.
      }
    }
    // 결과에 커버리지 요약 포함 (UI 안내 박스용)
    const filled: string[] = []
    const missing: string[] = []
    for (const [k, v] of Object.entries(cov.has_data) as [StandardCategoryKey, boolean][]) {
      if (v) filled.push(k)
      else missing.push(k)
    }
    parsed.coverage = { venue_key: cov.venue_key, filled, missing }
  }

  // v9.31: program_part 자동 채움 (Gemini가 안 채웠을 때 대비 + 한글명 부착)
  // 1차: AI 응답에 있으면 입력 selectedParts에 포함된 코드인지 검증 후 사용
  // 2차: AI 응답에 없으면 partsForFormat(category) ∩ selectedParts 첫 매치 사용
  // 3차: selectedParts 비어있으면 partsForFormat 첫 매치 (학습 데이터로서 의미)
  for (const item of parsed.items) {
    let code: string | null = null
    const aiCode = (item.program_part ?? '').trim()
    if (aiCode && PROGRAM_PART_BY_CODE.has(aiCode)) {
      if (selectedParts.length === 0 || selectedParts.includes(aiCode)) code = aiCode
    }
    if (!code) {
      const candidates = partsForFormat(item.category)
      if (selectedParts.length > 0) {
        // 선택된 파트 중 첫 매치 (입력 순서 우선)
        for (const c of selectedParts) if (candidates.includes(c)) { code = c; break }
      } else if (candidates.length > 0) {
        code = candidates[0]
      }
    }
    item.program_part = code
    item.program_part_name = programPartName(code)
  }

  return parsed
}
