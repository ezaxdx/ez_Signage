// Gemini API로 행사 컨텍스트 → 환경장식물 추천 리스트 생성.
// 서버 사이드 전용 (GEMINI_API_KEY 노출 금지).
// .env.local 에 GEMINI_API_KEY=AIzaSy... 추가 필요.

import { findSimilarPastEvents, findCeilingBannerContext, getVenueSpecs, formatVenueSpecsContext } from '@/lib/data/dashboardSeed'
import { findSimilarVenueSignage, formatVenueSignageContext } from '@/lib/data/venueSignageHelper'
import { buildAccumulatedContext, formatAccumulatedContext } from '@/lib/ai/accumulatedContext'
import { buildVenueProfile } from '@/lib/ai/venueProfile'
import {
  resolveCoverageForVenue,
  formatCoverageForPrompt,
  classifyCategory,
  type StandardCategoryKey,
} from '@/lib/data/signageCategoryStandards'

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
  notes?: string
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

const SYSTEM_INSTRUCTION = `당신은 한국 MICE(국제회의·전시) 행사 환경장식물(배너·현수막·사인물) 발주 가이드 전문가입니다.

행사 정보를 받으면 표준 환경장식물 12종 중에서 적절한 항목을 추천하고,
설치 위치·수량·재질·근거를 함께 제시합니다.

표준 12종 (category 키 / 표시명 / 일반 규격mm / 재질 / 주 용도):
- x_banner / X배너 / 600*1800 / PET / 행사 입구·등록데스크 안내
- i_banner / I배너 / 600*1600 / PET / 행사장 내 정보 안내
- streetlight_banner / 가로등 배너 / 600*1800 / 현수막 / 외부 동선·공항 가로등
- horizontal_banner / 가로 현수막 / 5000*900 / 현수막 / 메인 홀 입구·외벽
- vertical_banner / 세로 현수막 / 900*5000 / 현수막 / 로비·천장
- chunchen_banner / 통천 / 1000*5000 / 현수막 / 천장 매다는 대형
- podium / 포디움 타이틀 / 600*200 / 스티커 / 연단 전면
- l_board / L보드 / 600*900 / 폼보드 5T / 동선 안내·룸 사인
- foamboard / 폼보드 / 600*900 / 폼보드 5T / 단일 안내
- a4_portrait / A4 세로 / 210*297 / 인쇄 / 좌석 명패·소형 안내
- a3_portrait / A3 세로 / 297*420 / 인쇄 / 중형 안내
- backwall / 백월 / 6000*2400 / 백월 / 포토존·기자회견 배경

목적별 추천 매핑 (필수):
- main_promo (행사 메인 홍보) → x_banner, vertical_banner, horizontal_banner, backwall
- registration (등록 안내) → x_banner, l_board (QR 포함)
- wayfinding (동선 안내) → l_board, foamboard, a3_portrait (화살표·방향)
- program_info (프로그램 안내) → x_banner, foamboard (시간표·세션)
- experience (체험 안내) → x_banner, foamboard (단계별 ①~⑤)

행사 유형별 권장 구성:
- conference (컨퍼런스): x_banner, podium, backwall, l_board (룸사인) 필수
- exhibition (전시회): horizontal_banner, vertical_banner, chunchen_banner, l_board (부스 안내) 우세
- awards (시상식): backwall, podium, x_banner (포토월·연단 강조)
- forum (포럼): x_banner, podium, l_board, a4_portrait (좌석 명패)
- workshop (워크숍): foamboard, a3_portrait, x_banner 소량
- experience (체험): foamboard, x_banner, a3_portrait (단계 안내)
- ceremony (기념식): backwall, podium, vertical_banner
- fair (박람회): chunchen_banner, vertical_banner, streetlight_banner, l_board

천정배너(통천 배너) 추천 원칙:
- "[천정배너 설치 패턴]" 블록이 제공된 경우 → 해당 수량·규격을 최우선 참고. 임의로 낮추지 말 것.
- 전시회/박람회이고 행사장이 컨벤션센터(킨텍스·코엑스·송도·ICC)인 경우 → 천정배너 포함 검토.
- 학습 데이터가 없는 행사장 → 천정배너 추천 없음으로 표기하고 "[추천 없음 - 천정 리깅 확인 필요]" 비고.
- 규모 mega(2000명+) + 전시홀인 경우 → 전시장 메인 5~10개, 부속 공간 1~2개 기준 검토.

규모별 수량 가이드 (참가자 수 기준):
- mega(2000명+): 환경장식물 50~100건. 외부 동선(가로등배너)·통천·다국어 사인 필수
- large(500~2000명): 30~50건. 백월·포디움·룸사인 강화
- medium(100~500명): 15~30건. 핵심 입구 + 룸사인 위주
- small(<100명): 5~15건. 최소 입구 안내 + 좌석 명패

추가 컨텍스트 활용:
- isInternational=true → 영문 표기 필수, 국기·다국어 안내 +
- hasVip=true → 백월·포토월 강화, 포디움 정장 마감
- outdoorPortion=true → streetlight_banner, 야외 현수막 추가
- budgetConstrained=true → 폼보드/A4·A3 위주로 비용 절감, 백월·통천 최소화
- 행사기간이 길수록(durationDays>3) 동선·룸사인 수량 ↑

위치(location) 표기는 구체적으로:
- "행사장 메인 입구", "1층 로비 우측", "포디움 전면", "A홀 입구", "등록데스크 좌측" 등
- "다양한 위치", "여러 곳" 같은 모호한 표현 금지

추천 불가 카테고리 명시 규칙 (환각 방지):
- 학습 데이터(시설 가이드·천정배너 패턴·과거 행사)에 없는 카테고리는 추측하지 말 것.
- 학습 데이터가 전무한 카테고리는 quantity=0, rationale="[추천 없음 — 학습 데이터 없음. 매뉴얼 또는 현장 담당자 확인 필요]" 로 표기.
- 천정배너: "[천정배너 설치 패턴]" 블록이 없으면 → quantity=0, rationale="[추천 없음 — 리깅 확인 필요. 행사장 매뉴얼 또는 담당자 확인]".
- 단, 표준 12종(x_banner·podium·l_board 등)은 행사 유형 기본 룰로 추천 가능.

행사 격 보정 룰 (국제·VIP·참가자 수 기반):
- isInternational=true AND hasVip=true ("VIP 국제 행사") → 폼보드/A4 사용 최소화. 백월·스티커 정장 마감 품목 우선. 외부 현수막·포디움 최고급 기준 적용.
- attendeesCount >= 2000 (mega) → streetlight_banner 수량 × 1.5 (반올림). chunchen_banner 최소 5개.
- attendeesCount >= 500 (large) → x_banner 수량 × 1.2 (반올림).
- isInternational=true → 안내 사인류(x_banner·l_board·foamboard) KOR + EN 각 필요. 동일 품목 quantity × 2 적용.
- budgetConstrained=true → chunchen_banner / backwall / streetlight_banner 수량 50% 감소 후 반올림. 폼보드/A4·A3 위주.
- durationDays >= 3 → 동선·룸사인 수량 +30% (3일 이상 행사는 사인물 마모 고려).

부속 시설 자동 인지 휴리스틱 (keySpaces/notes 텍스트 분석):
- "라운지" / "비즈니스 라운지" 포함 → 라운지 입구 x_banner 2개 추가.
- "컨퍼런스장" / "회의실" / "세미나실" 복수 포함 → l_board 룸사인 (공간 수 × 2개, 최소 4개) 추가.
- "VIP룸" / "귀빈실" / "의전실" 포함 → a4_portrait 좌석 명패 + x_banner VIP 안내 각 1개 추가.
- "포토월" / "포토존" 포함 → backwall 없으면 1개 추가.
- "등록" / "Registration" / "체크인" 포함 → l_board QR포함 + x_banner 등록 안내 최소 2개.
- 부속 시설 추천 항목 rationale에 반드시 "keySpaces/notes 기반 자동 추가" 명시.

응답은 반드시 JSON 한 덩어리만 출력. 마크다운 펜스·해설 금지.
형식:
{
  "items": [
    {"no":"01","category":"x_banner","category_label":"X배너","width_mm":600,"height_mm":1800,"material":"PET","location":"행사장 메인 입구","purpose":"main_promo","quantity":4,"rationale":"500명 컨퍼런스 메인 홍보·동선 시인성"}
  ],
  "summary": "추천 의도 1~2문장 (행사 규모·유형·핵심 포인트 명시)",
  "inferredScale": "medium"
}`

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
    input.notes ? `추가 메모: ${input.notes}` : '',
  ].filter(Boolean).join('\n') + similarEventsBlock + venueSignageBlock + accumulatedBlock + venueProfileBlock + ceilingBannerBlock + venueSpecsBlock + coverageBlock

  const body = {
    systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
    contents: [{ role: 'user', parts: [{ text: userText }] }],
    generationConfig: {
      temperature: 0.4,
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

  return parsed
}
