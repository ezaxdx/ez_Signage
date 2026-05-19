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
  // 5/22 김연아 대리님 명시 = APEC 251004 = 롯데호텔 제주 별도 L1 분리 영역
  { key: '롯데호텔 제주', displayName: '롯데호텔 제주', region: '제주특별자치도', type: '호텔', hasSamples: true, typicalItemCount: 25 },
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
  // 5/22 김연아 대리님 검토 = L1_행사장 영역 영역 17 건 영역 추가 학습
  { key: 'CECO', displayName: '창원컨벤션센터 (CECO)', region: '경상남도', type: '컨벤션', hasSamples: true, typicalItemCount: 30 },
  { key: 'DCC', displayName: '대전컨벤션센터 (DCC)', region: '대전광역시', type: '컨벤션', hasSamples: true, typicalItemCount: 35 },
  { key: 'EXCO', displayName: '대구 EXCO', region: '대구광역시', type: '컨벤션', hasSamples: true, typicalItemCount: 40 },
  { key: 'GSCO', displayName: '광주김대중컨벤션센터 (GSCO)', region: '광주광역시', type: '컨벤션', hasSamples: true, typicalItemCount: 30 },
  { key: 'GUMICO', displayName: '구미컨벤션센터 (GUMICO)', region: '경상북도', type: '컨벤션', hasSamples: true, typicalItemCount: 25 },
  { key: 'HICO', displayName: '경주화백컨벤션센터 (HICO)', region: '경상북도', type: '컨벤션', hasSamples: true, typicalItemCount: 30 },
  { key: 'KSPO DOME', displayName: 'KSPO DOME (올림픽공원)', region: '서울특별시', type: '공공시설', hasSamples: true, typicalItemCount: 30 },
  { key: 'SETEC', displayName: '서울무역전시컨벤션센터 (SETEC)', region: '서울특별시', type: '전시장', hasSamples: true, typicalItemCount: 25 },
  { key: 'THE_SHILLA', displayName: '서울신라호텔', region: '서울특별시', type: '호텔', hasSamples: true, typicalItemCount: 20 },
  { key: '신라호텔', displayName: '서울신라호텔', region: '서울특별시', type: '호텔', hasSamples: true, typicalItemCount: 20 },
  { key: 'UECO', displayName: '울산컨벤션센터 (UECO)', region: '울산광역시', type: '컨벤션', hasSamples: true, typicalItemCount: 25 },
  { key: '라한호텔', displayName: '라한호텔·라한셀렉트', region: '서울특별시', type: '호텔', hasSamples: true, typicalItemCount: 18 },
  { key: '소노캄', displayName: '소노캄 (리조트)', region: '강원특별자치도', type: '호텔', hasSamples: true, typicalItemCount: 20 },
  { key: '수원컨벤션', displayName: '수원컨벤션센터', region: '경기도', type: '컨벤션', hasSamples: true, typicalItemCount: 30 },
  { key: '시그니엘', displayName: '시그니엘 서울', region: '서울특별시', type: '호텔', hasSamples: true, typicalItemCount: 22 },
  { key: '안동컨벤션', displayName: '안동국제컨벤션센터', region: '경상북도', type: '컨벤션', hasSamples: true, typicalItemCount: 25 },
  { key: '여수엑스포', displayName: '여수엑스포컨벤션센터', region: '전라남도', type: '컨벤션', hasSamples: true, typicalItemCount: 30 },
  { key: '정부세종컨벤션', displayName: '정부세종컨벤션센터', region: '세종특별자치시', type: '컨벤션', hasSamples: true, typicalItemCount: 28 },
  { key: '제주신라', displayName: '제주신라호텔', region: '제주특별자치도', type: '호텔', hasSamples: true, typicalItemCount: 22 },
  { key: '조선팰리스', displayName: '조선팰리스 강남', region: '서울특별시', type: '호텔', hasSamples: true, typicalItemCount: 25 },
  // 해외
  { key: '벨렘', displayName: '브라질 벨렘', region: '해외', type: '기타', hasSamples: true },
  { key: '파리', displayName: '프랑스 파리', region: '해외', type: '기타', hasSamples: true },
]

// 5/22 사용자 명시 = 복합 venue 자동 분리. "코엑스 그랜드볼룸·아셈볼룸·오디토리움" → L1·L2 분리
export function extractL1L2FromComplexVenue(name: string): { l1: string; l2: string[]; l1Info: VenueInfo | null } {
  const matched = matchVenue(name)
  if (!matched) return { l1: name, l2: [], l1Info: null }
  // L1 키워드 제거 후 = 잔여 영역 = L2 후보
  const lower = name.toLowerCase()
  const keyLower = matched.key.toLowerCase()
  const idx = lower.indexOf(keyLower)
  let remainder = name
  if (idx >= 0) {
    remainder = (name.slice(0, idx) + name.slice(idx + matched.key.length)).trim()
  }
  // "·"·"/"·"외" 영역 분리
  const halls = remainder
    .replace(/외$/g, '')
    .split(/[·\/]+/)
    .map(s => s.trim())
    .filter(s => s.length > 0)
  return { l1: matched.displayName, l2: halls, l1Info: matched }
}

/** project.event_venue 문자열에서 알려진 행사장 매칭 */
export function matchVenue(eventVenue: string | null): VenueInfo | null {
  if (!eventVenue) return null
  return VENUE_LIST.find(v => eventVenue.includes(v.key)) ?? null
}

/**
 * 5/22 사용자 명시 = 사용자 프로젝트 venue → 기존 행사장 표준명 매칭.
 * "제주국제컨벤션센터" → "ICC JEJU"·"제주컨벤시아" → "ICC JEJU" 등 동일 venue 그룹핑.
 * 행사 관리 영역에서 같은 venue 자동 합산.
 */
const VENUE_ALIAS_MAP: Record<string, string> = {
  '제주국제컨벤션센터': 'ICC JEJU',
  '제주컨벤시아': 'ICC JEJU',
  'icc jeju': 'ICC JEJU',
  '코엑스컨벤션센터': '코엑스',
  'coex': '코엑스',
  '코엑스 컨벤션센터': '코엑스',
  '킨텍스 제1전시장': '킨텍스',
  '킨텍스 제2전시장': '킨텍스',
  'kintex': '킨텍스',
  '송도컨벤시아': '송도컨벤시아',
  '인천 송도컨벤시아': '송도컨벤시아',
  '동대문디자인플라자': 'DDP',
  '동대문 디자인 플라자': 'DDP',
  'ddp': 'DDP',
  '롯데호텔 서울': '롯데호텔 서울',
  // 5/22 김연아 대리님 = 롯데호텔 제주 별도 L1·매칭 강화
  '롯데호텔 제주': '롯데호텔 제주',
  '롯데시티호텔 제주': '롯데호텔 제주',
  '제주 롯데호텔': '롯데호텔 제주',
  '그랜드 하얏트 서울': '그랜드하얏트',
  '웨스틴 조선 서울': '웨스틴조선',
  '광주 김대중컨벤션센터': '김대중컨벤션센터',
  '김대중컨벤션센터(광주)': '김대중컨벤션센터',
  'aT 센터': 'aT센터',
}

export function normalizeVenueName(raw: string | null | undefined): string {
  if (!raw) return ''
  const trimmed = raw.trim()
  if (!trimmed) return ''
  // exact 매칭 영역
  if (VENUE_ALIAS_MAP[trimmed]) return VENUE_ALIAS_MAP[trimmed]
  const lower = trimmed.toLowerCase()
  if (VENUE_ALIAS_MAP[lower]) return VENUE_ALIAS_MAP[lower]
  // 부분 매칭 영역 (긴 영역 우선 영역)
  const aliasKeys = Object.keys(VENUE_ALIAS_MAP).sort((a, b) => b.length - a.length)
  for (const k of aliasKeys) {
    if (trimmed.includes(k) || lower.includes(k.toLowerCase())) return VENUE_ALIAS_MAP[k]
  }
  // VENUE_LIST 영역 fuzzy 매칭 (예: "ICC JEJU" 영역 = displayName 영역 매칭)
  for (const v of VENUE_LIST) {
    if (trimmed.includes(v.key) || trimmed.includes(v.displayName)) return v.displayName
  }
  return trimmed
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
  // ICC JEJU (제주국제컨벤션센터) — G드라이브 L1_행사장/ICC 제주 폴더 기반 (2026-05-19)
  // 사용자 결정: 오설록(협력사 부스)·인천공항(영접) = 별도 L2 X·"공용" L2에 통합
  { parent_key: 'ICC JEJU', name: '탐라홀' },
  { parent_key: 'ICC JEJU', name: '삼다홀' },
  { parent_key: 'ICC JEJU', name: '이벤트홀' },
  { parent_key: 'ICC JEJU', name: '영주홀' },
  { parent_key: 'ICC JEJU', name: '백록홀' },
  { parent_key: 'ICC JEJU', name: '한라홀' },
  { parent_key: 'ICC JEJU', name: '대회의실' },
  { parent_key: 'ICC JEJU', name: '중회의실' },
  { parent_key: 'ICC JEJU', name: '소회의실' },
  { parent_key: 'ICC JEJU', name: '전시장' },
  { parent_key: 'ICC JEJU', name: '공용' },                          // 오설록·인천공항·기둥배너·에스컬레이터 등 행사 운영 공용 영역 (사용자 결정·2026-05-19)
  // 5/22 김연아 대리님 = 롯데호텔 제주 = 별도 L1 분리·ICC JEJU 하위 영역 제거
  // 그랜드하얏트 서울 — G드라이브 L2_그랜드볼룸_포이어_살롱_남산홀 기반
  { parent_key: '그랜드하얏트 서울', name: '그랜드볼룸' },
  { parent_key: '그랜드하얏트 서울', name: '포이어' },
  { parent_key: '그랜드하얏트 서울', name: '살롱' },
  { parent_key: '그랜드하얏트 서울', name: '남산홀' },
  // 더플라자 호텔 서울 — G드라이브 L2_그랜드볼룸 기반
  { parent_key: '더플라자 호텔 서울', name: '그랜드볼룸' },
  // BEXCO — G드라이브 도면 폴더 기반 (누리마루·오디토리움·전시장·컨벤션홀·하이브리드)
  { parent_key: 'BEXCO', name: '제1전시장' },
  { parent_key: 'BEXCO', name: '제2전시장' },
  { parent_key: 'BEXCO', name: '오디토리움' },
  { parent_key: 'BEXCO', name: '컨벤션홀·회의실' },
  { parent_key: 'BEXCO', name: '하이브리드행사장' },
  { parent_key: 'BEXCO', name: '누리마루 APEC하우스' },
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
  // 2026-05-19 신규 (폴더 L2 기반)
  'ICC JEJU': 'ICC JEJU',
  'ICC 제주': 'ICC JEJU',
  '제주국제컨벤션센터': 'ICC JEJU',
  '그랜드하얏트 서울': '그랜드하얏트 서울',
  '그랜드하얏트서울': '그랜드하얏트 서울',
  '더플라자 호텔 서울': '더플라자 호텔 서울',
  '더 플라자 호텔 서울': '더플라자 호텔 서울',
  'BEXCO': 'BEXCO',
  '벡스코': 'BEXCO',
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
