/**
 * 프로그램 파트 정의 (v4.1 갱신-A)
 *
 * EZ 프로젝트 폴더링 가이드 40.04~40.20 Work 카테고리 기준.
 * 행사 유형 단일 선택을 대체하는 다중선택 분류.
 *
 * 사용처:
 *   - 신규 프로젝트 폼 (체크박스 그리드)
 *   - projects.program_parts text[] 컬럼 (코드 배열로 저장)
 *   - 추천 로직 (선택된 코드별 환경장식물 매칭)
 *   - parse_signage_lists_v4.mjs (폴더명 → program_part 추론)
 */

export type ProgramPartGroup = 'program' | 'attendee' | 'promotion'

export interface ProgramPart {
  code: string
  name: string
  group: ProgramPartGroup
  hint?: string
}

export const PROGRAM_PARTS: ReadonlyArray<ProgramPart> = [
  // 코어 프로그램형 (40.04~40.11)
  { code: '40.04', name: '회의',                group: 'program', hint: '컨퍼런스·세미나·포럼·심포지엄' },
  { code: '40.05', name: '전시',                group: 'program', hint: '부스 전시·기업관·테마관' },
  { code: '40.06', name: '비즈니스 매칭',       group: 'program', hint: '1:1 미팅·바이어 매칭' },
  { code: '40.07', name: '비즈니스 프로그램',   group: 'program', hint: '김승이 진행·정책 발표·기업 IR' },
  { code: '40.08', name: '공식행사',            group: 'program', hint: '개막식·폐막식·MOU·시상' },
  { code: '40.09', name: '부대행사 - 공모전형', group: 'program', hint: '경진대회·아이디어 공모' },
  { code: '40.10', name: '부대행사 - 체험형',   group: 'program', hint: '체험존·VR·시연' },
  { code: '40.11', name: '부대행사 - 투어형',   group: 'program', hint: '시찰·산업 투어·문화 체험' },
  // 참가자 응대 (환경장식물 영향 큼)
  { code: '40.18', name: '의전',                group: 'attendee', hint: 'VIP·공항 영접·수송' },
  { code: '40.19', name: '등록',                group: 'attendee', hint: '현장 등록 데스크·체크인' },
  { code: '40.20', name: '영접영송',            group: 'attendee', hint: '입퇴장 안내·동선 사인' },
  // 홍보 (외부 사인 영향)
  { code: '40.17', name: '홍보',                group: 'promotion', hint: '옥외 광고·외부 사인·SNS 콘텐츠' },
] as const

export const PROGRAM_PART_BY_CODE: ReadonlyMap<string, ProgramPart> = new Map(
  PROGRAM_PARTS.map(p => [p.code, p])
)

export const PROGRAM_PART_GROUPS: { group: ProgramPartGroup; label: string }[] = [
  { group: 'program', label: '프로그램' },
  { group: 'attendee', label: '참가자 응대' },
  { group: 'promotion', label: '홍보' },
]

/** 코드 배열 → 한글 이름 배열 (UI 라벨 표시용) */
export function programPartNames(codes: string[] | null | undefined): string[] {
  if (!codes) return []
  return codes
    .map(c => PROGRAM_PART_BY_CODE.get(c)?.name)
    .filter((n): n is string => Boolean(n))
}

/** legacy event_type 단일 값 → program_parts 코드 배열 best-effort 매핑 */
export function migrateLegacyEventType(legacy: string | null | undefined): string[] {
  if (!legacy) return []
  const t = legacy.trim()
  const map: Record<string, string[]> = {
    '국제회의': ['40.04', '40.19'],
    '국내회의': ['40.04', '40.19'],
    '컨퍼런스': ['40.04', '40.19'],
    '세미나': ['40.04'],
    '포럼': ['40.04'],
    '전시회': ['40.05', '40.19'],
    '박람회': ['40.05', '40.19'],
    '엑스포': ['40.05', '40.19'],
    '시상식': ['40.08'],
    'MOU': ['40.08'],
    '개막식': ['40.08'],
    '체험행사': ['40.10'],
    '공모전': ['40.09'],
    '투어': ['40.11'],
    '홍보': ['40.17'],
    '등록': ['40.19'],
  }
  for (const [key, codes] of Object.entries(map)) {
    if (t.includes(key)) return codes
  }
  return []
}

/** program_parts 다중선택 → 권장 환경장식물 ID 매핑 (단일선택 v3 EVENT_TYPE_RECOMMEND 대체) */
export const PROGRAM_PART_SIGNAGE_HINTS: Record<string, string[]> = {
  '40.04': ['x_banner', 'foamboard', 'a3_landscape'],          // 회의: 입구·세션 안내
  '40.05': ['streetlight_banner', 'horizontal_banner', 'foamboard'], // 전시: 외부·내부 사인
  '40.06': ['l_board', 'a4_portrait', 'a4_landscape'],         // 매칭: 룸 사인·명패
  '40.07': ['x_banner', 'podium'],                              // 비즈니스 프로그램: 연단
  '40.08': ['horizontal_banner', 'podium', 'backwall', 'chunchen_banner'], // 공식행사: 무대·천장
  '40.09': ['x_banner', 'foamboard'],                           // 공모전형
  '40.10': ['x_banner', 'a3_portrait', 'foamboard'],           // 체험형: 단계 안내
  '40.11': ['a3_landscape', 'a4_portrait'],                    // 투어: 안내
  '40.17': ['streetlight_banner', 'vertical_banner'],          // 홍보: 외부
  '40.18': ['a4_portrait', 'a4_landscape'],                    // 의전: 손피켓
  '40.19': ['x_banner', 'foamboard', 'pop_guide'],            // 등록: 데스크 사인
  '40.20': ['x_banner', 'streetlight_banner', 'a3_landscape'], // 영접영송: 동선
}

/** 다중선택 결과 → 권장 환경장식물 union (중복 제거) */
export function recommendSignageByParts(codes: string[]): string[] {
  const set = new Set<string>()
  for (const c of codes) {
    for (const id of PROGRAM_PART_SIGNAGE_HINTS[c] ?? []) set.add(id)
  }
  return Array.from(set)
}

/**
 * v9.31: 환경장식물 ID → 선택된 파트 중 첫 번째 매칭 파트 코드
 *
 * NewProjectButton에서 design_items 생성 시 program_part 컬럼을 자동 채움.
 * 같은 환경장식물이 여러 파트에 매핑된 경우(예: x_banner는 회의·등록·체험 모두) 선택된 파트 중 우선순위 가장 높은 첫 매치 사용.
 * 매칭 실패 시 null 반환.
 */
export function pickPartForFormat(formatId: string, selectedParts: string[]): string | null {
  for (const code of selectedParts) {
    const ids = PROGRAM_PART_SIGNAGE_HINTS[code] ?? []
    if (ids.includes(formatId)) return code
  }
  return null
}

/**
 * v9.31: 환경장식물 카테고리(라벨 또는 ID) → 매핑된 파트 코드 목록 (전부)
 *
 * recommendSignage.ts에서 Gemini가 반환한 RecommendItem.category(id)와 program_parts 입력 교집합으로 program_part 자동 채움 fallback에 사용.
 */
export function partsForFormat(formatId: string): string[] {
  const matched: string[] = []
  for (const [code, ids] of Object.entries(PROGRAM_PART_SIGNAGE_HINTS)) {
    if (ids.includes(formatId)) matched.push(code)
  }
  return matched
}

/**
 * v9.31: 파트 코드 → 한글명 (단일 코드)
 *
 * Gemini SYSTEM_INSTRUCTION에서 "각 항목에 매칭된 파트 1개 명시" 지시 + UI 노출용.
 */
export function programPartName(code: string | null | undefined): string | null {
  if (!code) return null
  return PROGRAM_PART_BY_CODE.get(code)?.name ?? null
}
