// 발주엑셀 14개 통합 분석 데이터 (_venue_signage_map.json) 활용 helper
// 같은 행사장 + 비슷한 프로그램 파트 매칭만 Gemini 프롬프트에 주입.
// 전체 1,856건 항목을 통째로 넣지 않고 1~3건만 선별.

import rawMap from './_venue_signage_map.json' assert { type: 'json' }

interface SignageItem {
  category: string
  venue: string
  place1?: string
  place2?: string
  place3?: string
  size?: string
  qty?: number
  note?: string
}

interface VenueEvent {
  event_name: string
  folder_path?: string
  excel_file?: string
  items: SignageItem[]
  summary: Record<string, number>
  venues_seen?: string[]
}

interface VenueSignageMap {
  events: VenueEvent[]
}

const MAP = rawMap as unknown as VenueSignageMap

// 행사장 정규화 (한글·영문 매칭)
function normalizeVenue(s: string): string {
  return s.toLowerCase().replace(/\s+/g, '').replace(/제\d+전시장/g, '전시장')
}

// venue 키워드 추출 (예: '킨텍스 1전시장 5홀' → ['킨텍스', '1전시장', '5홀'])
function tokenize(s: string): string[] {
  return s.toLowerCase().split(/[\s,.,()/]+/).filter(t => t.length > 0)
}

function similarity(a: string, b: string): number {
  const ta = tokenize(a)
  const tb = tokenize(b)
  let score = 0
  for (const t of ta) {
    if (tb.some(u => u.includes(t) || t.includes(u))) score++
  }
  return score
}

export interface VenueSignageContext {
  event_name: string
  venue: string
  category_summary: string   // 예: "X배너:15 / 세로현수막:18 / 천정배너:10"
  top_items: string          // 예: "기둥현수막 12000x1000, 차량 게이트 8000x1500"
}

/**
 * 같은 행사장(+가능하면 비슷한 분야) 과거 발주 사례 N건 반환.
 * Gemini 프롬프트에 컨텍스트로 주입하기 위한 압축 데이터.
 *
 * @param targetVenue 추천 대상 행사장 (예: "킨텍스 제1전시장 5홀")
 * @param programParts 프로그램 파트 (예: ["전시", "공식행사"]) — 옵션
 * @param limit 최대 반환 건수 (기본 3)
 */
export function findSimilarVenueSignage(
  targetVenue: string | null | undefined,
  programParts: string[] = [],
  limit = 3
): VenueSignageContext[] {
  if (!targetVenue) return []

  const targetNorm = normalizeVenue(targetVenue)

  // 1) venue similarity 점수
  const scored = MAP.events.map(ev => {
    const venuesSeen = ev.venues_seen ?? []
    const venueText = [ev.event_name, ev.folder_path, ...venuesSeen].filter(Boolean).join(' ')

    let venueScore = similarity(targetVenue, venueText)
    // 정규화 후 정확 매칭이면 가산점
    if (venuesSeen.some(v => normalizeVenue(v) === targetNorm)) venueScore += 5

    // 프로그램 파트 매칭 (행사명·items의 카테고리 텍스트에서)
    let partScore = 0
    if (programParts.length > 0) {
      const eventText = `${ev.event_name} ${ev.items.map(i => i.category).join(' ')}`.toLowerCase()
      for (const part of programParts) {
        if (eventText.includes(part.toLowerCase())) partScore += 1
      }
    }

    return { ev, score: venueScore * 3 + partScore }
  })

  // 2) 점수 정렬 + 상위 limit건 + 점수 > 0만
  const top = scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)

  // 3) 컨텍스트 압축 (Gemini 프롬프트용)
  return top.map(({ ev }) => {
    const sumEntries = Object.entries(ev.summary).sort((a, b) => b[1] - a[1])
    const categorySummary = sumEntries.slice(0, 8).map(([c, q]) => `${c}:${q}`).join(' / ')

    // 대표 항목 1~3개 (규격 포함)
    const topItems = ev.items.slice(0, 3)
      .map(it => {
        const pos = [it.place2, it.place3].filter(Boolean).join(' ')
        return `${it.category}${pos ? ` (${pos})` : ''}${it.size ? ` ${it.size}` : ''}${it.qty ? ` x${it.qty}` : ''}`
      })
      .join(', ')

    return {
      event_name: ev.event_name,
      venue: ev.venues_seen?.[0] ?? '미상',
      category_summary: categorySummary,
      top_items: topItems,
    }
  })
}

/** Gemini 프롬프트용 텍스트로 직접 변환 (1줄 요약) */
export function formatVenueSignageContext(ctx: VenueSignageContext[]): string {
  if (ctx.length === 0) return ''
  const lines = ctx.map((c, i) =>
    `${i + 1}. ${c.event_name} (${c.venue})\n   카테고리: ${c.category_summary}\n   대표 항목: ${c.top_items}`
  )
  return '\n[같은 행사장 과거 발주 사례 — 자동 매칭]\n' + lines.join('\n')
}
