// v3 카테고리 마스터 시드 — 12 카테고리 SOT (2026-05-18·5/19 NIST 4단계 정합)
//
// 출처: 5/18 노션 컴펌 본 = 노션 페이지 36148589-8ea1-81d7-8b55-d1bd771a40a1 §6-2
//       "환경장식물 마스터" 표 12행 (A4·A3 가로·세로 분리)
//
// 변경 이력:
//   - 5/14 회의록 = 14종 + 동선 배너 = 15종
//   - 5/18 노션 컴펌 본 = 12 카테고리 (A4 가로·A4 세로·A3 가로·A3 세로 분리)
//   - 5/19 NIST AI RMF 4단계 (Govern·Map·Measure·Manage) 정합 표시
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

export type SignageCategoryKey =
  | 'x_banner'             // X배너
  | 'i_banner'             // I배너
  | 'streetlight_banner'   // 가로등 배너
  | 'horizontal_banner'    // 가로 현수막
  | 'vertical_banner'      // 세로 현수막
  | 'chunchen_banner'      // 통천
  | 'podium'         // 포디움 타이틀
  | 'a4_portrait'          // A4 세로
  | 'a4_landscape'         // A4 가로 (손피켓 가로 기본·5/7 결정)
  | 'a3_portrait'          // A3 세로
  | 'a3_landscape'         // A3 가로 (손피켓 가로 기본·5/7 결정)
  | 'route_banner'         // 동선 배너 (5/14 회의 X배너 분리 결정)

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
    key: 'i_banner',
    label: 'I배너',
    description: '인포메이션·실내 안내. 셔틀버스·운영시간·프로그램 시간표.',
    layout: 'vertical',
    default_size_mm: { width: 600, height: 1600 },
    material: 'PET',
    classification: '실내 안내',
    match_keywords: ['i배너', 'I배너', 'i-배너', 'I-배너', '아이배너', '인포', 'information', '스탠드POP'],
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
    label: '통천',
    description: '천장 매다는 대형. 외벽·천장 모두 사용. 매우 큰 사이즈, 키비주얼 + 행사명 + 일자.',
    layout: 'vertical',
    default_size_mm: { width: 1000, height: 5000 },
    material: '현수막',
    classification: '천장 대형',
    match_keywords: ['통천', '통천현수막', '통천배너', '천장배너', '천정배너', '행잉', 'hanging', '장폭_천정배너_단면', '장폭_천정배너_양면', '행잉 배너', '출입구 천정 배너'],
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
    key: 'a4_portrait',
    label: 'A4 세로',
    description: '소형 안내·세로형. 보통 폼보드 재질로 발주.',
    layout: 'vertical',
    default_size_mm: { width: 210, height: 297 },
    material: '인쇄 (발주 시 보통 폼보드)',
    classification: '소형 안내',
    match_keywords: ['A4 세로', 'A4세로'],
  },
  {
    key: 'a4_landscape',
    label: 'A4 가로',
    description: '소형 안내·가로형. 손피켓 가로 기본 (5/7 결정). 보통 폼보드 재질로 발주.',
    layout: 'horizontal',
    default_size_mm: { width: 297, height: 210 },
    material: '인쇄 (발주 시 보통 폼보드)',
    classification: '소형 안내',
    match_keywords: ['A4 가로', 'A4가로', 'A4', 'a4', '피켓 A4', '피켓A4', '피켓(A4)', '영접A4', 'A4안내', '명패', '웰컴 피켓', '큐방', '큐방시트', '셔틀버스 큐방시트'],
  },
  {
    key: 'a3_portrait',
    label: 'A3 세로',
    description: '중형 안내·세로형. 보통 폼보드 재질로 발주.',
    layout: 'vertical',
    default_size_mm: { width: 297, height: 420 },
    material: '인쇄 (발주 시 보통 폼보드)',
    classification: '중형 안내',
    match_keywords: ['A3 세로', 'A3세로'],
  },
  {
    key: 'a3_landscape',
    label: 'A3 가로',
    description: '중형 안내·가로형. 손피켓 가로 기본 (5/7 결정). 보통 폼보드 재질로 발주.',
    layout: 'horizontal',
    default_size_mm: { width: 420, height: 297 },
    material: '인쇄 (발주 시 보통 폼보드)',
    classification: '중형 안내',
    match_keywords: ['A3 가로', 'A3가로', 'A3', 'a3', '피켓 A3', '피켓A3', '피켓(A3)', 'A3안내', 'A3안내POP', '명패 (대)', '명패(대)', '웰컴보드', '시상보드', '시상 보드', '컨설팅폼보드', '좌석배치도 안내사인', '기념촬영보드', '안내폼보드', 'L보드', '안내사인'],
  },
  {
    key: 'route_banner',
    label: '동선 배너',
    description: '실내 동선·유도·화살표 안내 전용. 5/14 회의 X배너 분리 결정.',
    layout: 'vertical',
    default_size_mm: { width: 600, height: 1500 },
    material: '현수막',
    classification: '실내 동선',
    match_keywords: ['동선 배너', '동선배너', '유도사인', '동선안내', '화살표', '방향 안내'],
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
