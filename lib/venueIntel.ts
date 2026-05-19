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

/**
 * 한국 행정구역 표준 라벨 (광역시 8 + 도 9 + 해외).
 * 사용자 피드백(2026-05-13, 조기흠 사원): "지방"이라는 두루뭉술 표기를
 * 정확한 도/광역시 이름으로 분류.
 */
export type VenueRegion =
  | '서울특별시' | '부산광역시' | '인천광역시' | '대구광역시'
  | '대전광역시' | '광주광역시' | '울산광역시' | '세종특별자치시'
  | '경기도' | '강원특별자치도' | '충청북도' | '충청남도'
  | '전북특별자치도' | '전라남도' | '경상북도' | '경상남도'
  | '제주특별자치도' | '해외'

/** optgroup·표 정렬용 순서 (광역시 → 도 → 해외, 행정 표준). */
export const REGION_ORDER: VenueRegion[] = [
  '서울특별시', '부산광역시', '인천광역시', '대구광역시',
  '대전광역시', '광주광역시', '울산광역시', '세종특별자치시',
  '경기도', '강원특별자치도', '충청북도', '충청남도',
  '전북특별자치도', '전라남도', '경상북도', '경상남도',
  '제주특별자치도', '해외',
]

export interface VenueInfo {
  key: string          // 매칭 키워드 (project.event_venue contains)
  displayName: string  // 표시명
  region: VenueRegion
  type: '컨벤션' | '호텔' | '전시장' | '공공시설' | '야외' | '기타'
  hasSamples: boolean  // 행사별 폴더에 샘플 있음
  /** 향후 폴더 분석 시 채울 필드 */
  typicalItemCount?: number
  mustHaveCategories?: string[]
  specialNotes?: string
}

// typicalItemCount: 행사별 폴더 8개 / 281개 제작물 분석 결과 평균 ≈ 35건.
// 컨벤션·전시장은 동선 복잡 → 평균 이상, 호텔·공공시설은 단일 공간 → 평균 이하 가정.
export const VENUE_LIST: VenueInfo[] = [
  // 컨벤션센터 — 평균 이상
  { key: '코엑스', displayName: '코엑스 (COEX)', region: '서울특별시', type: '컨벤션', hasSamples: true, typicalItemCount: 45 },
  { key: '킨텍스', displayName: '킨텍스 (KINTEX)', region: '경기도', type: '전시장', hasSamples: true, typicalItemCount: 50 },
  { key: '송도컨벤시아', displayName: '송도컨벤시아', region: '인천광역시', type: '컨벤션', hasSamples: true, typicalItemCount: 40 },
  { key: 'ICC JEJU', displayName: 'ICC JEJU', region: '제주특별자치도', type: '컨벤션', hasSamples: true, typicalItemCount: 35 },
  { key: '제주국제컨벤션', displayName: '제주국제컨벤션센터', region: '제주특별자치도', type: '컨벤션', hasSamples: true, typicalItemCount: 35 },
  { key: '광주 김대중', displayName: '광주 김대중컨벤션센터', region: '광주광역시', type: '컨벤션', hasSamples: true, typicalItemCount: 30 },
  { key: 'aT센터', displayName: 'aT센터', region: '서울특별시', type: '컨벤션', hasSamples: true, typicalItemCount: 30 },
  // 호텔 — 평균 이하
  { key: '롯데호텔 서울', displayName: '롯데호텔 서울', region: '서울특별시', type: '호텔', hasSamples: true, typicalItemCount: 20 },
  { key: '그랜드하얏트', displayName: '그랜드하얏트 서울', region: '서울특별시', type: '호텔', hasSamples: true, typicalItemCount: 25 },
  { key: '더플라자', displayName: '더플라자 호텔 서울', region: '서울특별시', type: '호텔', hasSamples: true, typicalItemCount: 20 },
  { key: '웨스틴 조선', displayName: '웨스틴 조선 서울', region: '서울특별시', type: '호텔', hasSamples: true, typicalItemCount: 20 },
  // 공공시설
  { key: '국립중앙박물관', displayName: '국립중앙박물관', region: '서울특별시', type: '공공시설', hasSamples: true },
  { key: '동대문디자인플라자', displayName: '동대문디자인플라자 (DDP)', region: '서울특별시', type: '공공시설', hasSamples: true },
  { key: 'DDP', displayName: '동대문디자인플라자 (DDP)', region: '서울특별시', type: '공공시설', hasSamples: true },
  { key: '광화문', displayName: '광화문 광장', region: '서울특별시', type: '야외', hasSamples: true },
  { key: '서울스퀘어', displayName: '서울스퀘어', region: '서울특별시', type: '공공시설', hasSamples: true },
  { key: '경남도청', displayName: '경남도청 대회의실', region: '경상남도', type: '공공시설', hasSamples: true },
  { key: '경주', displayName: '경주', region: '경상북도', type: '기타', hasSamples: true },
  { key: '광주비엔날레', displayName: '광주비엔날레전시관', region: '광주광역시', type: '전시장', hasSamples: true },
  { key: '평창', displayName: '평창올림픽스타디움', region: '강원특별자치도', type: '야외', hasSamples: true },
  { key: '오스코', displayName: '오스코 (OSCO)', region: '서울특별시', type: '기타', hasSamples: true },
  // 5/22 사용자 명시 = 벡스코 오디토리움이 "지방" 그룹으로 떨어지는 문제 정정. BEXCO·BPEX 부산광역시 산하
  { key: '벡스코', displayName: '벡스코 (BEXCO)', region: '부산광역시', type: '컨벤션', hasSamples: false, typicalItemCount: 40 },
  { key: 'BEXCO', displayName: '벡스코 (BEXCO)', region: '부산광역시', type: '컨벤션', hasSamples: false, typicalItemCount: 40 },
  { key: 'BPEX', displayName: 'BPEX 부산', region: '부산광역시', type: '컨벤션', hasSamples: false },
  { key: '누리마루', displayName: '누리마루 APEC하우스', region: '부산광역시', type: '공공시설', hasSamples: false },
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
 * L2 (상세 행사장 / 홀) — 노션 페이지 1 §9 시드.
 *
 * 출처: 노션 페이지 36148589-8ea1-81a3-b3e8-dd4a833c914c §9 행사장 관리.
 * 5/14 회의 결정 = "구역·홀 단위로 묶기 (계층 구조)".
 *
 * 현재 = 정적 시드. 향후 = Supabase venue_halls 테이블 (v6 마이그레이션) + 관리자 UI 추가/수정/삭제.
 */
export interface VenueHall {
  /** 부모 VenueInfo.key */
  parent_key: string
  /** 홀 이름 (예: "그랜드볼룸", "제1전시장 1·2홀") */
  name: string
  /** 비고 (정식 명칭 확인·면적·운영실 별도 등) */
  note?: string
}

export const VENUE_HALLS: VenueHall[] = [
  // COEX (코엑스) — 그랜드볼룸·아셈볼룸·오디토리움·컨퍼런스룸(북·남)·A~E홀
  { parent_key: '코엑스', name: '그랜드볼룸' },
  { parent_key: '코엑스', name: '아셈볼룸' },
  { parent_key: '코엑스', name: '오디토리움' },
  { parent_key: '코엑스', name: '컨퍼런스룸 (북)' },
  { parent_key: '코엑스', name: '컨퍼런스룸 (남)' },
  { parent_key: '코엑스', name: 'A홀' },
  { parent_key: '코엑스', name: 'B홀' },
  { parent_key: '코엑스', name: 'C홀' },
  { parent_key: '코엑스', name: 'D홀' },
  { parent_key: '코엑스', name: 'E홀' },
  // KINTEX (킨텍스) — 제1전시장 / 제2전시장 / 그랜드볼룸
  { parent_key: '킨텍스', name: '제1전시장 1·2홀' },
  { parent_key: '킨텍스', name: '제1전시장 3·4·5홀' },
  { parent_key: '킨텍스', name: '제1전시장 6·7·8홀' },
  { parent_key: '킨텍스', name: '제1전시장 9·10홀' },
  { parent_key: '킨텍스', name: '제2전시장 7A홀' },
  { parent_key: '킨텍스', name: '제2전시장 8홀' },
  { parent_key: '킨텍스', name: '제2전시장 9A홀' },
  { parent_key: '킨텍스', name: '제2전시장 9B홀' },
  { parent_key: '킨텍스', name: '제2전시장 10홀' },
  { parent_key: '킨텍스', name: '그랜드볼룸' },
  // DDP (동대문디자인플라자)
  { parent_key: 'DDP', name: '알림1관' },
  { parent_key: 'DDP', name: '알림2관' },
  { parent_key: 'DDP', name: '디자인올레' },
  { parent_key: 'DDP', name: '디자인전시관' },
  { parent_key: 'DDP', name: '어울림광장' },
]

/** parent_key 기준 L2 홀 목록 조회 */
export function getHallsByVenueKey(parentKey: string): VenueHall[] {
  return VENUE_HALLS.filter(h => h.parent_key === parentKey)
}

/** venue.name (한글·영문 혼합) → L2 홀 목록. 학습된 행사장 표·시설 가이드 등에 사용. */
const VENUE_NAME_TO_HALL_KEY: Record<string, string> = {
  'COEX': '코엑스',
  '코엑스': '코엑스',
  'KINTEX': '킨텍스',
  '킨텍스': '킨텍스',
  'DDP': 'DDP',
  '동대문디자인플라자': 'DDP',
}

export function getHallsByVenueName(venueName: string): VenueHall[] {
  const key = VENUE_NAME_TO_HALL_KEY[venueName]
    ?? (Object.keys(VENUE_NAME_TO_HALL_KEY).find(k => venueName.includes(k)))
    ?? venueName
  return VENUE_HALLS.filter(h => h.parent_key === (VENUE_NAME_TO_HALL_KEY[key] ?? key))
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

/**
 * 지역별 그룹화 — 광역시·도 행정 순서(REGION_ORDER) 유지.
 * 결과 키는 정확한 도/광역시 이름(예: '광주광역시', '경상남도').
 */
export function groupVenuesByRegion(): Record<string, VenueInfo[]> {
  const seen = new Set<string>()
  const groups: Record<string, VenueInfo[]> = {}
  for (const v of VENUE_LIST) {
    if (seen.has(v.displayName)) continue
    seen.add(v.displayName)
    ;(groups[v.region] ??= []).push(v)
  }
  // REGION_ORDER 기준으로 키 정렬 (선언 순 보존을 위해 새 객체 생성)
  const ordered: Record<string, VenueInfo[]> = {}
  for (const r of REGION_ORDER) {
    if (groups[r]) ordered[r] = groups[r]
  }
  return ordered
}
