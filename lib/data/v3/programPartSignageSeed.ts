// lib/data/v3/programPartSignageSeed.ts
// 12파트 환경장식물 표준 매핑 시드 (v10.4)
// SOT: C:\Users\EZPMP\Desktop\제작물 리스트 가이드_환경 제작물 파트별 구분_20260519-수정.xlsx
// 작성: 2026-05-19
// 의도 (Step 0):
//   표면 = "AI 추천이 파트별 권장 환경장식물 인지 안 함"
//   진짜 = 파트→종류 매핑 SOT 부재·EVENT_TYPE_RECOMMEND inline 산재
//   설계 = 단일 시드 파일·AI 프롬프트 자동 주입·UI 자동 체크 통일

export type ProgramPartCode =
  | 'meeting'                  // 1. 회의
  | 'exhibition'               // 2. 전시
  | 'business_matching'        // 3. 비즈니스 매칭
  | 'business_program'         // 4. 비즈니스 프로그램
  | 'official_event'           // 5. 공식행사
  | 'side_contest'             // 6. 부대행사 - 공모전형
  | 'side_experience'          // 7. 부대행사 - 체험형
  | 'side_tour'                // 8. 부대행사 - 투어형
  | 'registration'             // 9. 등록
  | 'misc_setup'               // 10. 기타 조성 (로비·외벽·입구)
  | 'reception'                // 11. 영접영송
  | 'promotion'                // 12. 홍보

export interface SignageRecommendation {
  category: string             // 노션 §6-2 12 카테고리 마스터 정합
  subUse?: string[]            // 상세 구분(참고) — 사용 위치·용도
  note?: string                // 비고 (폼포드 출력·야외용·게시 일자 등)
}

export interface PartSignageRecommend {
  partCode: ProgramPartCode
  partNo: number               // SOT 엑셀 NO. 1~12
  partName: string             // 한국어 명칭
  signages: SignageRecommendation[]
}

/**
 * 12파트 × 권장 환경장식물 마스터 시드 (61행 SOT 정합).
 *
 * 사용처:
 * - AI 추천 프롬프트 [파트별 권장 환경 제작물] 블록 자동 주입 (lib/ai/recommendSignage.ts)
 * - 신규 프로젝트 위자드 다중 파트 선택 → 자동 체크 (NewProjectButton·case-a)
 * - /admin/learning 환경장식물 종류 표 (LearningManagerClient)
 *
 * 주의:
 * - "구분" 값만 design_items.category로 사용. "상세 구분(참고)"는 비고·툴팁용.
 * - 비표준 입력은 SEED_SYNONYMS·signage_aliases로 표준 변환.
 * - 천장 배너(전시 #2) ≠ 통천 배너(공식행사 #5). 매핑 금지·별도 카테고리.
 */
export const SEED_PROGRAM_PART_SIGNAGE: PartSignageRecommend[] = [
  {
    partCode: 'meeting',
    partNo: 1,
    partName: '회의',
    signages: [
      { category: '포디움 타이틀', subUse: ['개회식', '세션', '토론', '시상식'] },
      { category: '세로 현수막', subUse: ['무대 배경', '세션장 입구', '회의장 내부'] },
      { category: '가로 현수막', subUse: ['무대 배경', '세션장 입구', '회의장 내부'] },
    ],
  },
  {
    partCode: 'exhibition',
    partNo: 2,
    partName: '전시',
    signages: [
      { category: 'X배너', subUse: ['전시존 안내', '참가기업 안내', '체험존 안내', '프로그램 안내', 'QR 코드 안내'] },
      { category: '동선 안내 배너', subUse: ['입구 유도', '출구 유도', '층별 이동'] },
      { category: '천장 배너', subUse: ['구역 표시', '메인 동선 표시'], note: '천장 매다는 형태·통천 배너와 별도' },
    ],
  },
  {
    partCode: 'business_matching',
    partNo: 3,
    partName: '비즈니스 매칭',
    signages: [
      { category: 'X배너', subUse: ['매칭존 안내', '상담 절차 안내', '대기 안내'] },
    ],
  },
  {
    partCode: 'business_program',
    partNo: 4,
    partName: '비즈니스 프로그램',
    signages: [
      { category: 'X배너' },
      { category: '동선 안내 배너' },
      { category: '포디움 타이틀', note: '폼포드로 출력' },
      { category: '시상보드', note: '폼포드로 출력' },
    ],
  },
  {
    partCode: 'official_event',
    partNo: 5,
    partName: '공식행사',
    signages: [
      { category: '포디움 타이틀', subUse: ['개회식', '환영사', '축사', '시상식', '토론'] },
      { category: '시상보드', note: '폼포드로 출력' },
      { category: 'X배너', subUse: ['프로그램 안내'] },
      { category: '가로 현수막', subUse: ['무대 배경', '행사장 입구', '무대 측면', '입구/로비'] },
      { category: '세로 현수막', subUse: ['무대 배경', '행사장 입구', '무대 측면', '입구/로비'] },
      { category: '통천 배너', subUse: ['무대 측면'], note: '대형 천 소재·천장 배너와 별도' },
    ],
  },
  {
    partCode: 'side_contest',
    partNo: 6,
    partName: '부대행사 - 공모전형',
    signages: [
      { category: '시상보드' },
      { category: 'X배너', subUse: ['공모전 안내', '시상식 안내'] },
      { category: '포디움 타이틀', note: '폼포드로 출력' },
      { category: '가로 현수막', subUse: ['시상식 무대'] },
      { category: '세로 현수막' },
    ],
  },
  {
    partCode: 'side_experience',
    partNo: 7,
    partName: '부대행사 - 체험형',
    signages: [
      { category: '가로 현수막' },
      { category: '세로 현수막' },
      { category: 'X배너' },
    ],
  },
  {
    partCode: 'side_tour',
    partNo: 8,
    partName: '부대행사 - 투어형',
    signages: [
      { category: '가로 현수막', note: '사진용' },
      { category: 'Q방', note: '규격·재질 미정·사용자 컴펌 필요' },
    ],
  },
  {
    partCode: 'registration',
    partNo: 9,
    partName: '등록',
    signages: [
      { category: 'X배너', subUse: ['입장 확인 QR 배너', '프로그램 안내 배너'] },
      { category: '동선 안내 배너' },
      { category: '가로 현수막', note: '야외용인 경우' },
    ],
  },
  {
    partCode: 'misc_setup',
    partNo: 10,
    partName: '기타 조성',
    signages: [
      { category: '빵빠레 배너' },
      { category: 'X배너', subUse: ['부대시설 장소 안내 (PCO사무국·발주처 사무국 등)'] },
      { category: '디지털 사이니지', subUse: ['부대시설 장소 안내'] },
      { category: '폼포드', subUse: ['부대시설 장소 안내'] },
      { category: '가로 현수막', subUse: ['외부 홍보', '입구 홍보'] },
      { category: '세로 현수막', subUse: ['외부 홍보', '입구 홍보'] },
      { category: '통천 배너', subUse: ['외벽 홍보', '로비 홍보'] },
    ],
  },
  {
    partCode: 'reception',
    partNo: 11,
    partName: '영접영송',
    signages: [
      { category: '피켓보드', note: '입출국 일자 고려하여 발주 필요' },
    ],
  },
  {
    partCode: 'promotion',
    partNo: 12,
    partName: '홍보',
    signages: [
      { category: 'X배너', note: '유관기관 오프라인 홍보 진행 시' },
      { category: '가로등 배너', subUse: ['행사 홍보', '장소 유도', '외부 홍보'], note: '게시 일자 고려하여 발주 필요' },
    ],
  },
]

/**
 * 파트 코드로 빠른 조회.
 */
export const PROGRAM_PART_BY_CODE: ReadonlyMap<ProgramPartCode, PartSignageRecommend> = new Map(
  SEED_PROGRAM_PART_SIGNAGE.map(p => [p.partCode, p])
)

/**
 * 선택된 파트 다수 → 권장 환경장식물 카테고리 추출 (중복 제거).
 *
 * @param partCodes - 사용자가 선택한 파트 코드 배열
 * @returns 권장 카테고리 명 배열 (등장 순서 보존)
 */
export function recommendCategoriesForParts(partCodes: ProgramPartCode[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const code of partCodes) {
    const part = PROGRAM_PART_BY_CODE.get(code)
    if (!part) continue
    for (const sig of part.signages) {
      if (!seen.has(sig.category)) {
        seen.add(sig.category)
        result.push(sig.category)
      }
    }
  }
  return result
}

/**
 * AI 추천 프롬프트용 텍스트 블록 생성.
 *
 * 출력 형식 (예: 회의 + 전시 선택 시):
 * [파트별 권장 환경 제작물]
 * 1. 회의
 *    - 포디움 타이틀 (개회식·세션·토론·시상식)
 *    - 세로 현수막 (무대 배경·세션장 입구·회의장 내부)
 *    - 가로 현수막 (무대 배경·세션장 입구·회의장 내부)
 * 2. 전시
 *    - X배너 (전시존 안내·참가기업 안내·체험존 안내·프로그램 안내·QR 코드 안내)
 *    ...
 */
export function formatPartSignageForPrompt(partCodes: ProgramPartCode[]): string {
  if (partCodes.length === 0) return ''
  const lines: string[] = ['[파트별 권장 환경 제작물]']
  for (const code of partCodes) {
    const part = PROGRAM_PART_BY_CODE.get(code)
    if (!part) continue
    lines.push(`${part.partNo}. ${part.partName}`)
    for (const sig of part.signages) {
      const sub = sig.subUse && sig.subUse.length > 0 ? ` (${sig.subUse.join('·')})` : ''
      const note = sig.note ? ` [${sig.note}]` : ''
      lines.push(`   - ${sig.category}${sub}${note}`)
    }
  }
  return lines.join('\n')
}
