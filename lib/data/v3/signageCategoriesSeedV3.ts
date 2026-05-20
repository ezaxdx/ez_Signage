// v3 카테고리 마스터 시드 — 12 카테고리 SOT
//
// 변경 이력:
//   - 5/14 회의록 = 14종 + 동선 배너 = 15종
//   - 5/18 노션 컴펌 본 = 12 카테고리 (A4·A3 가로/세로 분리·I배너 포함)
//   - 5/19 NIST AI RMF 4단계 (Govern·Map·Measure·Manage) 정합 표시
//   - 5/22 김연아 대리님 명시 = 엑셀 SOT `구분` 컬럼 12 영역만 영역 정합:
//     · 삭제 5건 = i_banner·a4_portrait·a4_landscape·a3_portrait·a3_landscape
//     · 신규 5건 = award_board·q_room·digital_signage·foam_board·picket_board
//     · 표준명 정합 = chunchen_banner '통천' → '통천 배너'·route_banner '동선 배너' → '동선 안내 배너'
//
// NIST AI RMF 4단 안전망 정합 (노션 §1-3):
//   1. Govern (입력 강제) = SignageCategoryKey union enum + JSON 스키마
//   2. Map (상태 확인) = isExcludedCategory·no_data_flag
//   3. Measure (후처리 검증) = classifyCategoryV3·findCategoryV3ByKey
//   4. Manage (실패 대체) = fallback 매핑 룰 (a4_landscape·a3_landscape 손피켓 가로 기본)
//
// 적용 절차:
//   1. signageCategoriesSeed.ts (v2 15종) → 본 파일 (v3 12 카테고리) 점진 교체
//   2. 매핑 룰 = 노션 §8-1 동의어 표 정합 (손피켓 가로 기본·5/7 결정 정합)
//   3. recommendationLogic.ts·UI enum 정합

// 5/22 김연아 대리님 명시 = 엑셀 SOT 12 카테고리만 영역
// 5/20 v10.9 = 정답지 13건 전수 조사 후 신규 5 카테고리 추가 = 총 17 카테고리
export type SignageCategoryKey =
  | 'x_banner'             // X배너
  | 'streetlight_banner'   // 가로등 배너
  | 'horizontal_banner'    // 가로 현수막
  | 'vertical_banner'      // 세로 현수막
  | 'chunchen_banner'      // 통천 배너
  | 'podium'               // 포디움 타이틀
  | 'route_banner'         // 동선 안내 배너 (5/14 회의 X배너 분리 결정)
  | 'award_board'          // 5/22 신규 = 시상보드
  | 'q_room'               // 5/22 신규 = Q방
  | 'digital_signage'      // 5/22 신규 = 디지털 사이니지
  | 'foam_board'           // 5/22 신규 = 폼보드
  | 'picket_board'         // 5/22 신규 = 피켓보드
  | 'bulletin_board'       // 5/20 v10.9 신규 = 블로틴 보드 (ICC WLCF 510×740·8건 빈도·유포지·PET)
  | 'console_banner'       // 5/20 v10.9 신규 = 콘솔 배너 (ICC 리더스포럼 4 hall = 8.6~17.2m)
  | 'partition_banner'     // 5/20 v10.9 신규 = 파티션 배너 (ICC 탐라홀 1800×11000·세로 6.1:1)
  | 'did_horizontal'       // 5/20 v10.9 신규 = DID 가로형 (ICC PDP송출 800×500)
  | 'podium_wide'          // 5/20 v10.9 신규 = 포디움 가로형 (ICC WGCA 2784×1019·hall 사이즈별 차이)

export type SignageLayout = 'horizontal' | 'vertical'

export interface SignageCategoryV3 {
  key: SignageCategoryKey
  label: string
  description: string
  layout: SignageLayout
  default_size_mm: {
    width: number
    height: number
  }
  material: string
  classification: string
  match_keywords: string[]
  /** 우측 패널 예시 이미지 URL (노션 §3 = 데이터허브 실사 이미지). 빈 값이면 placeholder 노출 */
  sample_image_url?: string
}

/** 비율 라벨 (노션 §3 = "사이즈 비율 표시") */
export function getRatioLabel(cat: SignageCategoryV3): string {
  const { width, height } = cat.default_size_mm
  const g = gcd(width, height)
  return `${width / g} : ${height / g} (${width}×${height}mm)`
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b)
}

export const SIGNAGE_CATEGORIES_V3: SignageCategoryV3[] = [
  {
    key: 'x_banner',
    label: 'X배너',
    description: '입구·등록·룸사인·일반 안내. 자체 스탠드 사용.',
    layout: 'vertical',
    default_size_mm: { width: 600, height: 1800 },
    material: 'PET',
    classification: '입구·등록',
    match_keywords: ['x배너', 'X배너', 'x-배너', 'X-배너', '엑스배너', '스프링 배너', '스프링배너', '롤업배너', '배너스탠드', '철재스프링배너', 'A배너', '물통배너', '물통 배너', '기타 배너'],
  },
  {
    key: 'streetlight_banner',
    label: '가로등 배너',
    description: '외부 가로등 폴 부착. D-30 이전 폴 예약 필수. 행사장별 클램프 규격 상이.',
    layout: 'vertical',
    default_size_mm: { width: 600, height: 1800 },
    material: '현수막',
    classification: '외부 동선',
    match_keywords: ['가로등 배너', '가로등배너', '폴대', '폴배너', '폴 클램프', '빵빠레배너', '빵빠레 배너'],
  },
  {
    key: 'horizontal_banner',
    label: '가로 현수막',
    description: '메인·외벽 가로 부착. 행사 메인 타이틀 키비주얼 + MOU 협약식 + 행사 현수막.',
    layout: 'horizontal',
    default_size_mm: { width: 5000, height: 900 },
    material: '현수막',
    classification: '메인·외벽',
    match_keywords: ['가로현수막', '가로 현수막', '외벽', '행사 현수막', '대형 배너', '외부 광고', 'MOU 현수막', 'MOU', '투어용 현수막', '실사출력', '상단 배너'],
  },
  {
    key: 'vertical_banner',
    label: '세로 현수막',
    description: '로비·천장 세로 부착. 기둥·난간·계단 등 설치.',
    layout: 'vertical',
    default_size_mm: { width: 900, height: 5000 },
    material: '현수막',
    classification: '로비·천장',
    match_keywords: ['세로현수막', '세로 현수막', '기둥배너', '난간배너', '세로배너', '난간 배너', '드롭배너'],
  },
  {
    key: 'chunchen_banner',
    label: '통천 배너',
    description: '천장 매다는 대형. 외벽·천장 모두 사용. 매우 큰 사이즈, 키비주얼 + 행사명 + 일자.',
    layout: 'vertical',
    default_size_mm: { width: 1000, height: 5000 },
    material: '현수막',
    classification: '천장 대형',
    match_keywords: ['통천', '통천현수막', '통천배너', '통천 배너', '천장배너', '천정배너', '행잉', 'hanging', '장폭_천정배너_단면', '장폭_천정배너_양면', '행잉 배너', '출입구 천정 배너'],
  },
  {
    key: 'podium',
    label: '포디움 타이틀',
    description: '연단 전면 폼보드. 사회자용·연사용 분리 2개.',
    layout: 'horizontal',
    default_size_mm: { width: 600, height: 200 },
    material: '스티커',
    classification: '연단',
    match_keywords: ['포디움', '포디움 타이틀', '포디움타이틀', '연단', '포디움 1', '포디움 2', '1인용 포디움', '개막식 포디움'],
  },
  {
    key: 'route_banner',
    label: '동선 안내 배너',
    description: '실내 동선·유도·화살표 안내 전용. 5/14 회의 X배너 분리 결정.',
    layout: 'vertical',
    default_size_mm: { width: 600, height: 1500 },
    material: '현수막',
    classification: '실내 동선',
    match_keywords: ['동선 안내 배너', '동선 배너', '동선배너', '유도사인', '동선안내', '화살표', '방향 안내'],
  },
  // 5/22 김연아 대리님 명시 = 엑셀 SOT 영역 신규 5건
  {
    key: 'award_board',
    label: '시상보드',
    description: '공식행사·공모전형 영역 시상 영역. 폼보드 5T 재질.',
    layout: 'vertical',
    default_size_mm: { width: 1200, height: 1800 },
    material: '폼보드 5T',
    classification: '시상·공식행사',
    match_keywords: ['시상보드', '시상 보드', '기념촬영보드', '포토월', '포토 월'],
  },
  {
    key: 'q_room',
    label: 'Q방',
    description: '등록·대기 영역 안내 영역. 폼보드 재질.',
    layout: 'vertical',
    default_size_mm: { width: 600, height: 1800 },
    material: '폼보드',
    classification: '등록·안내',
    match_keywords: ['Q방', '큐방', '큐방시트', '셔틀버스 큐방시트', 'Q룸'],
  },
  {
    key: 'digital_signage',
    label: '디지털 사이니지',
    description: '로비·외벽 영역 디지털 영역. LED 패널.',
    layout: 'vertical',
    default_size_mm: { width: 1080, height: 1920 },
    material: 'LED',
    classification: '디지털·전광판',
    match_keywords: ['디지털 사이니지', '디지털사이니지', 'DID', 'LED 사이니지', '전광판'],
  },
  {
    key: 'foam_board',
    label: '폼보드',
    description: '부대시설 장소·POP 영역. 폼보드 5T 재질.',
    layout: 'vertical',
    default_size_mm: { width: 600, height: 900 },
    material: '폼보드 5T',
    classification: '부대시설 안내',
    match_keywords: ['폼보드', '폼포드', '안내폼보드', '컨설팅폼보드', '좌석배치도 안내사인', '웰컴보드', 'L보드', '안내사인', 'A4안내', 'A3안내', 'A3안내POP', '스탠드POP'],
  },
  {
    key: 'picket_board',
    label: '피켓보드',
    description: '영접영송 영역·입출국 일자 고려 영역. 폼보드 3T 재질.',
    layout: 'vertical',
    default_size_mm: { width: 300, height: 450 },
    material: '폼보드 3T',
    classification: '영접영송',
    match_keywords: ['피켓보드', '영접피켓', '입출국피켓', '피켓 A4', '피켓A4', '피켓(A4)', '피켓 A3', '피켓A3', '피켓(A3)', '영접A4', '명패', '웰컴 피켓', '명패 (대)', '명패(대)'],
  },
  // 5/20 v10.9 = 정답지 13건 전수 조사 후 신규 5 카테고리 (ICC WLCF·리더스포럼 실측 기반)
  {
    key: 'bulletin_board',
    label: '블로틴 보드',
    description: '행사장 사무실·라운지·VIP 접견실 안내 보드. ICC WLCF 정답지 8건 빈도. 유포지·PET 재질.',
    layout: 'vertical',
    default_size_mm: { width: 510, height: 740 },
    material: '유포지',
    classification: '사무실·라운지 안내',
    match_keywords: ['블로틴 보드', '블로틴', '블로틴보드', 'bulletin board', '사무실 안내', '라운지 보드', '접견실 보드', 'IUCN 사무국', '환경부 장관 사무실', '도지사 사무실'],
  },
  {
    key: 'console_banner',
    label: '콘솔 배너',
    description: '무대 콘솔·hall 단상 가로 배너. ICC 리더스포럼 4 hall = 8.6m·12.2m·16m·17.2m. H1.2~1.8m. 매우 큰 가로 비율.',
    layout: 'horizontal',
    default_size_mm: { width: 12000, height: 1200 },
    material: '현수막',
    classification: '무대 콘솔',
    match_keywords: ['콘솔', '콘솔 시안', '콘솔배너', '콘솔 배너', '무대 콘솔', 'console', '단상 가로', '탐라A 콘솔', '탐라B 콘솔', '탐라C 콘솔', '한라홀 콘솔'],
  },
  {
    key: 'partition_banner',
    label: '파티션 배너',
    description: '개회식 파티션 분할 배너. ICC 탐라홀 1800×11000 (세로 6.1:1·4건 분할·영문 1·국문 1·영문 1·국문 1). 매우 큰 세로 비율.',
    layout: 'vertical',
    default_size_mm: { width: 1800, height: 11000 },
    material: '현수막',
    classification: '개회식 파티션',
    match_keywords: ['파티션 배너', '파티션배너', '파티션', 'partition', '개회식 파티션', '탐라홀 파티션', 'WLCF 파티션'],
  },
  {
    key: 'did_horizontal',
    label: 'DID 가로형',
    description: '디지털 사이니지 가로형 송출 시안. ICC WLCF 2015 PDP송출 800×500. LED 또는 모니터 송출.',
    layout: 'horizontal',
    default_size_mm: { width: 800, height: 500 },
    material: 'LED·모니터',
    classification: '디지털·전광판 (가로)',
    match_keywords: ['DID 가로', 'DID배경', 'PDP송출', 'DID 송출', 'LED 가로', '전광판 가로', '모니터 송출', 'digital signage horizontal'],
  },
  {
    key: 'podium_wide',
    label: '포디움 가로형',
    description: '포디움 가로형 시안 (hall 사이즈별 차이). ICC WGCA 2022 = 2784×1019. 기존 포디움 600×200 외연 초과.',
    layout: 'horizontal',
    default_size_mm: { width: 2784, height: 1019 },
    material: '폼보드 5T·현수막',
    classification: '연단 (가로형)',
    match_keywords: ['포디움 가로', '포디움 배너', '포디움 시안', 'WGCA 포디움', 'podium banner', '포디움 (가로형)', '대형 포디움'],
  },
]

/** 카테고리 검색 - key */
export function findCategoryV3ByKey(key: SignageCategoryKey): SignageCategoryV3 | undefined {
  return SIGNAGE_CATEGORIES_V3.find(c => c.key === key)
}

/** 자유 문자열 → 12 카테고리 매칭 (학습 데이터 정합화·매핑 룰 통합)
 *  매칭 우선순위: 가로·세로 명시 키워드 > 일반 키워드. A4·A3 단독 표기 = 가로 기본 (노션 §8-1 손피켓 가로 5/7 결정)
 */
export function classifyCategoryV3(text: string): SignageCategoryV3 | null {
  if (!text) return null
  const lower = text.toLowerCase().trim()
  // 우선순위 1: 가로·세로 명시 키워드
  for (const cat of SIGNAGE_CATEGORIES_V3) {
    if (cat.match_keywords.some(kw => lower.includes(kw.toLowerCase()) && (kw.includes('가로') || kw.includes('세로')))) {
      return cat
    }
  }
  // 우선순위 2: 일반 키워드
  for (const cat of SIGNAGE_CATEGORIES_V3) {
    if (cat.match_keywords.some(kw => lower.includes(kw.toLowerCase()))) {
      return cat
    }
  }
  return null
}

/** 12 카테고리 외 명칭 → 제거 영역 (12종 외 = 발주 영역 X) */
export const EXCLUDED_NAMES = [
  '백월', '포토월', '트러스', '부스', '등록 데스크 부스', 'DID 사이니지', '폼보드 POP', '시트지', '바닥스티커', '바닥시트', '화이트보드판',
]

/** 명칭이 12 카테고리 외 영역인지 검사 */
export function isExcludedCategory(text: string): boolean {
  if (!text) return false
  return EXCLUDED_NAMES.some(name => text.includes(name))
}
