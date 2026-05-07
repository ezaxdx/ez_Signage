/**
 * 행사장 인텔리전스 — 행사별 폴더(34개) 기반
 *
 * 현재: 정적 매핑 (행사별 폴더에서 추출한 이름)
 * 향후: 폴더 내 엑셀/이미지 분석으로 품목 수, 권장 규격, 표준 구성 자동화
 *
 * 체크 로직 설계:
 *   1. matchVenue(event_venue) → VenueInfo
 *   2. VenueInfo.typicalItemCount → 현재 design_items.count 비교 → 부족하면 경고
 *   3. VenueInfo.mustHaveCategories → 항목 category 목록과 대조 → 누락 시 알림
 *   4. VenueInfo.specialNotes → 현장 특이사항 (층 이동 화살표 필수 등)
 */

export interface VenueInfo {
  key: string          // 매칭 키워드 (project.event_venue contains)
  displayName: string  // 표시명
  region: '서울' | '수도권' | '지방' | '제주' | '해외'
  type: '컨벤션' | '호텔' | '전시장' | '공공시설' | '야외' | '기타'
  hasSamples: boolean  // 행사별 폴더에 샘플 있음
  /** 향후 폴더 분석 시 채울 필드 */
  typicalItemCount?: number
  mustHaveCategories?: string[]
  specialNotes?: string
}

export const VENUE_LIST: VenueInfo[] = [
  // 컨벤션센터
  { key: '코엑스', displayName: '코엑스 (COEX)', region: '서울', type: '컨벤션', hasSamples: true },
  { key: '킨텍스', displayName: '킨텍스 (KINTEX)', region: '수도권', type: '전시장', hasSamples: true },
  { key: '송도컨벤시아', displayName: '송도컨벤시아', region: '수도권', type: '컨벤션', hasSamples: true },
  { key: 'ICC JEJU', displayName: 'ICC JEJU', region: '제주', type: '컨벤션', hasSamples: true },
  { key: '제주국제컨벤션', displayName: '제주국제컨벤션센터', region: '제주', type: '컨벤션', hasSamples: true },
  { key: '광주 김대중', displayName: '광주 김대중컨벤션센터', region: '지방', type: '컨벤션', hasSamples: true },
  { key: 'aT센터', displayName: 'aT센터', region: '서울', type: '컨벤션', hasSamples: true },
  // 호텔
  { key: '롯데호텔 서울', displayName: '롯데호텔 서울', region: '서울', type: '호텔', hasSamples: true },
  { key: '그랜드하얏트', displayName: '그랜드하얏트 서울', region: '서울', type: '호텔', hasSamples: true },
  { key: '더플라자', displayName: '더플라자 호텔 서울', region: '서울', type: '호텔', hasSamples: true },
  { key: '웨스틴 조선', displayName: '웨스틴 조선 서울', region: '서울', type: '호텔', hasSamples: true },
  // 공공시설
  { key: '국립중앙박물관', displayName: '국립중앙박물관', region: '서울', type: '공공시설', hasSamples: true },
  { key: '동대문디자인플라자', displayName: '동대문디자인플라자 (DDP)', region: '서울', type: '공공시설', hasSamples: true },
  { key: 'DDP', displayName: '동대문디자인플라자 (DDP)', region: '서울', type: '공공시설', hasSamples: true },
  { key: '광화문', displayName: '광화문 광장', region: '서울', type: '야외', hasSamples: true },
  { key: '서울스퀘어', displayName: '서울스퀘어', region: '서울', type: '공공시설', hasSamples: true },
  { key: '경남도청', displayName: '경남도청 대회의실', region: '지방', type: '공공시설', hasSamples: true },
  { key: '경주', displayName: '경주', region: '지방', type: '기타', hasSamples: true },
  { key: '광주비엔날레', displayName: '광주비엔날레전시관', region: '지방', type: '전시장', hasSamples: true },
  { key: '평창', displayName: '평창올림픽스타디움', region: '지방', type: '야외', hasSamples: true },
  { key: '오스코', displayName: '오스코 (OSCO)', region: '서울', type: '기타', hasSamples: true },
  // 해외
  { key: '벨렘', displayName: '브라질 벨렘', region: '해외', type: '기타', hasSamples: true },
  { key: '파리', displayName: '프랑스 파리', region: '해외', type: '기타', hasSamples: true },
]

/** project.event_venue 문자열에서 알려진 행사장 매칭 */
export function matchVenue(eventVenue: string | null): VenueInfo | null {
  if (!eventVenue) return null
  return VENUE_LIST.find(v => eventVenue.includes(v.key)) ?? null
}

/**
 * 향후 구현될 행사장 기반 체크 로직 설계
 *
 * 1단계 (현재): matchVenue → 알려진 행사장 여부 뱃지 표시
 * 2단계 (예정): 폴더 내 Ezpmp_수행실적리스트.xlsx 파싱 → 행사장별 평균 제작물 수 도출
 *              → design_items.count < 평균*0.7 이면 "항목이 부족할 수 있습니다" 경고
 * 3단계 (예정): 폴더 내 이미지/엑셀 AI 분석 → 행사장별 mustHaveCategories 자동 추출
 *              → 현재 프로젝트에 해당 category 없으면 "○○ 항목 추가를 고려하세요" 제안
 *
 * 체크 점수 산식 (초안):
 *   score = (completed_items / total_items) * 40
 *         + (has_image ? 20 : 0)
 *         + (no_high_revision ? 20 : 0)       // revision_count < 3
 *         + (venue_items_sufficient ? 20 : 0)  // count >= venue.typicalItemCount
 */
export function getVenueCheckScore(_projectItemCount: number, _venueInfo: VenueInfo | null): number {
  // Placeholder — full implementation in 2단계
  return -1
}

/** 지역별 그룹화 */
export function groupVenuesByRegion(): Record<string, VenueInfo[]> {
  const seen = new Set<string>()
  const groups: Record<string, VenueInfo[]> = {}
  for (const v of VENUE_LIST) {
    if (seen.has(v.displayName)) continue
    seen.add(v.displayName)
    ;(groups[v.region] ??= []).push(v)
  }
  return groups
}
