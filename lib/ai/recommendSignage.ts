// Claude API로 행사 컨텍스트 → 환경장식물 추천 리스트 생성.
// 서버 사이드 전용 (ANTHROPIC_API_KEY 노출 금지).

import Anthropic from '@anthropic-ai/sdk'

export interface RecommendInput {
  eventName: string
  venue: string
  eventDate?: string         // "YYYY-MM-DD"
  purposes: string[]         // ['main_promo','registration','wayfinding','program_info','experience']
  notes?: string
}

export interface RecommendItem {
  no: string                 // "01", "02"…
  category: string           // x_banner / vertical_banner / l_board ...
  category_label: string     // "X배너", "세로 현수막"
  width_mm: number
  height_mm: number
  material: string
  location: string
  purpose: string
  quantity: number
  rationale: string          // 왜 추천하는지 (실무자 학습 효과)
}

export interface RecommendResult {
  items: RecommendItem[]
  summary: string
}

const SYSTEM = `당신은 한국 MICE(국제회의·전시) 행사 환경장식물(배너·현수막·사인물) 발주 가이드 전문가입니다.

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

수량은 행사 규모(장소가 큰 호텔·컨벤션이면 수량 ↑)와 동선 복잡도를 고려해 합리적으로 추정.
대규모 정상회의(예: APEC·정부 박람회) ≈ 30~80개, 중형 컨퍼런스 ≈ 10~30개, 소형 워크숍 ≈ 5~15개.

응답은 반드시 JSON 한 덩어리만 출력. 마크다운 펜스·해설 금지.
형식:
{
  "items": [
    {"no":"01","category":"x_banner","category_label":"X배너","width_mm":600,"height_mm":1800,"material":"PET","location":"행사장 입구","purpose":"main_promo","quantity":4,"rationale":"행사 메인 홍보 및 진입 동선 시인성"}
  ],
  "summary": "추천 의도 1~2문장"
}`

export async function recommendSignage(input: RecommendInput): Promise<RecommendResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY 미설정. .env.local 에 키를 추가해주세요.')
  }

  const client = new Anthropic({ apiKey })

  const userText = [
    `행사명: ${input.eventName}`,
    `장소: ${input.venue}`,
    input.eventDate ? `행사일: ${input.eventDate}` : '',
    `사용 목적: ${input.purposes.join(', ') || '미지정'}`,
    input.notes ? `추가 메모: ${input.notes}` : '',
  ].filter(Boolean).join('\n')

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2000,
    system: SYSTEM,
    messages: [{ role: 'user', content: userText }],
  })

  const block = response.content.find(b => b.type === 'text')
  if (!block || block.type !== 'text') {
    throw new Error('Claude 응답이 비어있습니다')
  }

  // 마크다운 펜스 제거 (혹시 모를 케이스 대비)
  const raw = block.text.replace(/```json|```/g, '').trim()
  let parsed: RecommendResult
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error('Claude 응답을 JSON으로 파싱하지 못했습니다: ' + raw.slice(0, 200))
  }

  if (!Array.isArray(parsed.items)) {
    throw new Error('items 배열이 없습니다')
  }
  return parsed
}
