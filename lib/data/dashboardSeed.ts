/**
 * 대시보드 시드 데이터 — 환경장식물 행사별 폴더(54개) + 우선순위 명세 기반.
 * Supabase 데이터가 없을 때 폴백으로 표시됨. 분석 완료되면 DB로 이관.
 *
 * 출처:
 *   - C:\...\참고자료\환경장식물 행사별\* (54개 행사 폴더)
 *   - C:\...\참고자료\환경장식물 행사별\Ezpmp_수행실적리스트_20260506.xlsx
 *   - 우선순위 6번 명세 (AI 사전교육 자료) 정의
 */

// ── 1. 기본 환경장식물 10종 (명세 6.1.b.ii) ─────────────────────
export interface SignageTypeSeed {
  id: string
  name: string
  width_mm: number
  height_mm: number
  default_material: string
  category: string
  layout: '세로' | '가로' | '정사각'
  note?: string
}

// v9.34: 영문 ID는 코드용 키로 보존, name(한글 라벨)을 사용자 명시 표기로 통일.
// 사용자 명시 라벨 (2026-05-13, 조기흠 사원):
//   x_banner → X-배너 / i_banner → I-배너 / streetlight_banner → 가로등 배너
//   horizontal_banner → 가로 현수막 / vertical_banner → 세로 현수막
//   chunchen_banner → 통천 / podium → 포디움 타이틀 / backwall → 백월
//   a4_portrait → A4 세로 / a4_landscape → A4 가로 / a3_portrait → A3 세로 / a3_landscape → A3 가로
// 5/22 김연아 대리님 명시 = 엑셀 SOT `구분` 컬럼 12 영역만 기본 영역.
// I배너·A4 세로/가로·A3 세로/가로 = 엑셀 영역 X → 삭제 (5건). 동의어 매핑 = 가장 가까운 영역 (foam_board·picket_board 등) 영역 정정.
export const SEED_SIGNAGE_TYPES: SignageTypeSeed[] = [
  { id: 'x_banner',           name: 'X배너',          width_mm: 600,  height_mm: 1800, default_material: 'PET',     category: '입구·등록',  layout: '세로' },
  { id: 'streetlight_banner', name: '가로등 배너',    width_mm: 600,  height_mm: 1800, default_material: '현수막',  category: '외부 동선',  layout: '세로' },
  { id: 'horizontal_banner',  name: '가로 현수막',    width_mm: 5000, height_mm: 900,  default_material: '현수막',  category: '메인·외벽',  layout: '가로' },
  { id: 'vertical_banner',    name: '세로 현수막',    width_mm: 900,  height_mm: 5000, default_material: '현수막',  category: '로비·천장',  layout: '세로' },
  { id: 'chunchen_banner',    name: '통천 배너',      width_mm: 1000, height_mm: 5000, default_material: '현수막',  category: '천장 대형',  layout: '세로' },
  { id: 'podium',             name: '포디움 타이틀',  width_mm: 600,  height_mm: 200,  default_material: '스티커',  category: '연단',       layout: '가로' },
  { id: 'route_banner',       name: '동선 안내 배너', width_mm: 600,  height_mm: 1500, default_material: '현수막',  category: '실내 동선',  layout: '세로', note: '5/22 엑셀 SOT 영역 정합 (동선 배너 → 동선 안내 배너). 실내 유도·화살표·방향 안내 전용.' },
  // 5/22 김연아 대리님 명시 = 엑셀 SOT 영역 추가 5건 (시상보드·Q방·디지털 사이니지·폼보드·피켓보드)
  { id: 'award_board',        name: '시상보드',       width_mm: 1200, height_mm: 1800, default_material: '폼보드 5T', category: '시상·공식행사', layout: '세로', note: '5/22 엑셀 SOT 영역 추가. 공식행사·공모전형 영역 시상 영역.' },
  { id: 'q_room',             name: 'Q방',           width_mm: 600,  height_mm: 1800, default_material: '폼보드',   category: '등록·안내',  layout: '세로', note: '5/22 엑셀 SOT 영역 추가. 등록·대기 영역 안내 영역.' },
  { id: 'digital_signage',    name: '디지털 사이니지', width_mm: 1080, height_mm: 1920, default_material: 'LED',     category: '디지털·전광판', layout: '세로', note: '5/22 엑셀 SOT 영역 추가. 로비·외벽 영역 디지털 영역.' },
  { id: 'foam_board',         name: '폼보드',         width_mm: 600,  height_mm: 900,  default_material: '폼보드 5T', category: '부대시설 안내', layout: '세로', note: '5/22 엑셀 SOT 영역 추가. 부대시설 장소·POP 영역.' },
  { id: 'picket_board',       name: '피켓보드',       width_mm: 300,  height_mm: 450,  default_material: '폼보드 3T', category: '영접영송',   layout: '세로', note: '5/22 엑셀 SOT 영역 추가. 영접영송 영역·입출국 일자 고려 영역.' },
]

// ── 2. 동의어 매핑 (명세 6.1.b.i) ─────────────────────────────
export interface SynonymSeed {
  alias: string          // 비표준 명칭
  canonical_name: string // 기본 환경장식물 종류 (SEED_SIGNAGE_TYPES.name)
  note?: string
}

export const SEED_SYNONYMS: SynonymSeed[] = [
  // 5/22 신규 = SEED_EVENT_HISTORY 영역 표기 영역 (공백 X 영역) → signage_types.name 정합 영역
  { alias: '세로현수막',     canonical_name: '세로 현수막',  note: '5/22 SEED_EVENT_HISTORY 영역 표기 영역' },
  { alias: '가로현수막',     canonical_name: '가로 현수막',  note: '5/22 SEED_EVENT_HISTORY 영역 표기 영역' },
  { alias: '통천현수막',     canonical_name: '통천 배너',    note: '5/22 SEED_EVENT_HISTORY 영역 표기 영역' },
  { alias: 'X-배너',         canonical_name: 'X배너',        note: '5/22 대시 표기 정합' },

  // ── 명세 1번 명시 동의어 ──
  { alias: '스프링배너',     canonical_name: 'X배너',        note: '명세 1번 명시 동의어' },

  // ── 거치대·재질 변형 (X배너) ──
  { alias: '롤업배너',       canonical_name: 'X배너',        note: '입구 거치형' },
  { alias: '배너스탠드',     canonical_name: 'X배너',        note: '거치대 일반화' },
  { alias: '철재스프링배너', canonical_name: 'X배너',        note: '2021 평창평화포럼 시트' },
  { alias: 'A배너',          canonical_name: 'X배너',        note: 'A형 거치대' },
  { alias: '물통배너',       canonical_name: 'X배너',        note: '물통 무게추' },
  { alias: '기타 배너',      canonical_name: 'X배너',        note: '기본 X배너 추정' },

  // ── 세로형 (세로 현수막) ──
  { alias: '드롭배너',       canonical_name: '세로 현수막',  note: '천장 매다는 형태' },
  { alias: '난간배너',       canonical_name: '세로 현수막',  note: '난간·계단 부착' },

  // ── 가로형 (가로 현수막) ──
  { alias: '실사출력',       canonical_name: '가로 현수막',  note: '재질 기반 통칭' },
  { alias: '투어용 현수막',  canonical_name: '가로 현수막',  note: '이동용 가로 현수막' },
  { alias: '상단 배너',      canonical_name: '가로 현수막',  note: '상단 부착 가로형' },

  // ── 천장형 (통천 배너) — 신규 다수 발견 ──
  { alias: '천장배너',       canonical_name: '통천 배너',    note: '천장 매다는 대형' },
  { alias: '천정배너',       canonical_name: '통천 배너',    note: '천정 매다는 형태 (천장 동일)' },
  { alias: '장폭_천정배너_단면', canonical_name: '통천 배너', note: '장폭 천정 단면 인쇄' },
  { alias: '장폭_천정배너_양면', canonical_name: '통천 배너', note: '장폭 천정 양면 인쇄' },
  { alias: '행잉 배너',      canonical_name: '통천 배너',    note: '천장 매달기 영문 표현' },
  { alias: '출입구 천정 배너', canonical_name: '통천 배너',  note: '출입구 V자형 천장 배너' },

  // ── 가로등 배너 ──
  { alias: '빵빠레배너',     canonical_name: '가로등 배너',  note: '외부 동선용' },

  // ── 포디움 변형 ──
  { alias: '포디움 1',       canonical_name: '포디움 타이틀', note: '복수 포디움 표기' },
  { alias: '포디움 2',       canonical_name: '포디움 타이틀', note: '복수 포디움 표기' },
  { alias: '1인용 포디움',   canonical_name: '포디움 타이틀', note: '단상 형태' },
  { alias: '개막식 포디움',  canonical_name: '포디움 타이틀', note: '특정 행사용' },
  { alias: '연단',           canonical_name: '포디움 타이틀', note: '한자어 표기' },

  // 5/22 사용자 명시 = A4·A3·I배너 영역 삭제 → 폼보드/피켓보드 영역 영역 영역 매핑
  // ── 피켓 영역 (영접용·손피켓) = 피켓보드 영역 ──
  { alias: '피켓 A4',        canonical_name: '피켓보드',    note: '손피켓·피켓보드 영역 (5/22 정합)' },
  { alias: '피켓A4',         canonical_name: '피켓보드',    note: '손피켓·피켓보드 영역 (5/22 정합)' },
  { alias: '피켓 A3',        canonical_name: '피켓보드',    note: '손피켓·피켓보드 영역 (5/22 정합)' },
  { alias: '피켓A3',         canonical_name: '피켓보드',    note: '손피켓·피켓보드 영역 (5/22 정합)' },
  { alias: '영접A4',         canonical_name: '피켓보드',    note: '영접용 피켓·피켓보드 영역' },
  // ── 안내용 A4·A3 → 폼보드 영역 (부대시설 안내) ──
  { alias: 'A4안내',         canonical_name: '폼보드',      note: '안내용 폼보드 (5/22 정합)' },
  { alias: 'A3안내',         canonical_name: '폼보드',      note: '안내용 폼보드 (5/22 정합)' },
  { alias: 'A3안내POP',      canonical_name: '폼보드',      note: 'POP 안내 폼보드' },

  // ── 스탠드POP → 폼보드 영역 (5/22 정합 = I배너 삭제 후) ──
  { alias: '스탠드POP',      canonical_name: '폼보드',      note: '폼보드형 스탠드 POP (5/22 I배너 삭제 정합)' },

  // ── 동선 배너 동의어 (노션 §6-2 v3 신규 카테고리·§8-1 정합) ──
  { alias: '유도사인',       canonical_name: '동선 안내 배너',     note: '실내 동선·유도 안내' },
  { alias: '동선안내',       canonical_name: '동선 안내 배너',     note: '실내 동선 안내' },
  { alias: '화살표',         canonical_name: '동선 안내 배너',     note: '방향 안내 화살표' },
  { alias: '방향 안내',      canonical_name: '동선 안내 배너',     note: '동선 방향 안내' },

  // 손피켓·명패·웰컴 영역 (가로 기본 — 5/7 결정)
  // 5/22 = 명패·웰컴 = 피켓보드 영역 (영접·안내 영역)
  { alias: '명패',           canonical_name: '피켓보드',     note: '소형 명패·피켓보드 영역' },
  { alias: '웰컴 피켓',      canonical_name: '피켓보드',     note: '소형 손피켓·피켓보드 영역' },
  { alias: '명패 (대)',      canonical_name: '피켓보드',     note: '대형 명패·피켓보드 영역' },
  { alias: '명패(대)',       canonical_name: '피켓보드',     note: '대형 명패·피켓보드 영역' },
  { alias: '웰컴보드',       canonical_name: '폼보드',       note: '대형 안내·폼보드 영역' },
  { alias: 'MOU 현수막',     canonical_name: '가로 현수막',  note: '행사 현수막' },
  { alias: 'MOU',            canonical_name: '가로 현수막',  note: 'MOU 약어' },
  // 폼보드 재질 발주 — 12 카테고리 표준명(A4·A3·I배너) 매핑
  { alias: 'L보드',          canonical_name: '폼보드',       note: '5/22 정합 = L자형 안내판 → 폼보드' },
  { alias: '안내사인',       canonical_name: '폼보드',       note: '5/22 정합 = 일반 안내판 → 폼보드' },

  // 5/22 신규 5건 동의어 정합 (시상보드·Q방·디지털 사이니지·폼보드·피켓보드)
  // ── 시상보드 (award_board) ──
  { alias: '시상보드',       canonical_name: '시상보드',     note: '5/22 엑셀 SOT 영역 = 독립 카테고리' },
  { alias: '기념촬영보드',   canonical_name: '시상보드',     note: '포토존 보드' },
  { alias: '포토월',         canonical_name: '시상보드',     note: '포토 영역 보드' },
  // ── Q방 (q_room) ──
  { alias: 'Q방',            canonical_name: 'Q방',          note: '5/22 엑셀 SOT 영역 = 등록·대기 영역' },
  { alias: '큐방',           canonical_name: 'Q방',          note: 'Q방 한글 표기' },
  { alias: '큐방시트',       canonical_name: 'Q방',          note: 'Q방 시트 형태' },
  { alias: '셔틀버스 큐방시트', canonical_name: 'Q방',       note: '셔틀버스 Q방' },
  { alias: 'Q룸',            canonical_name: 'Q방',          note: 'Q방 영문 표기' },
  // ── 디지털 사이니지 (digital_signage) ──
  { alias: '디지털 사이니지', canonical_name: '디지털 사이니지', note: '5/22 엑셀 SOT 영역' },
  { alias: '디지털사이니지', canonical_name: '디지털 사이니지', note: '공백 없는 표기' },
  { alias: 'DID',            canonical_name: '디지털 사이니지', note: 'Digital Information Display' },
  { alias: 'LED 사이니지',   canonical_name: '디지털 사이니지', note: 'LED 패널' },
  { alias: '전광판',         canonical_name: '디지털 사이니지', note: '한글 표기' },
  // ── 폼보드 (foam_board) ──
  { alias: '폼보드',         canonical_name: '폼보드',       note: '5/22 엑셀 SOT 영역 = 부대시설 안내' },
  { alias: '폼포드',         canonical_name: '폼보드',       note: '오타 표기' },
  { alias: '안내폼보드',     canonical_name: '폼보드',       note: '안내용 폼보드' },
  { alias: '컨설팅폼보드',   canonical_name: '폼보드',       note: '4단계 안내 폼보드' },
  { alias: '좌석배치도 안내사인', canonical_name: '폼보드',  note: '배치도 폼보드' },
  // ── 피켓보드 (picket_board) ──
  { alias: '피켓보드',       canonical_name: '피켓보드',     note: '5/22 엑셀 SOT 영역 = 영접영송 영역' },
  { alias: '영접피켓',       canonical_name: '피켓보드',     note: '영접용 피켓' },
  { alias: '입출국피켓',     canonical_name: '피켓보드',     note: '입출국 피켓' },
]

// ── 3. 행사 폴더 → 행사 이력 (54개) ──────────────────────────
export interface EventHistorySeed {
  project_name: string
  project_code: string | null
  year: number | null
  venue: string  // 메인 venue (예: "ICC JEJU 및 인근호텔"·"코엑스")
  category_tag: '핵심' | '일반' | '미분류' | '해외'
  has_excel: boolean   // 제작물리스트.xlsx 존재 여부
  has_image: boolean   // 시안 이미지 존재 여부
  analyzed_item_count?: number   // 실제 엑셀 파싱 시그너지 개수 (있는 경우만)
  // 5/22 사용자 명시 = 5대 영역 정합·프로그램 파트 추정값·환경장식물 분석 데이터
  program_parts?: string[]   // 행사명 기반 추정 파트 코드 (40.04 회의·40.05 전시 등)
  signage_breakdown?: Array<{ category: string; quantity: number; sizes?: string }>   // 환경장식물별 분리 (분석된 행사만·단일 venue 영역)
  // 5/22 김연아 대리님 명시 = 1 행사 = 여러 행사장 분리 학습 의무
  // 예: APEC 중소기업 장관회의 251004 = ICC JEJU + 롯데호텔 = venue별 분리 영역
  venues_breakdown?: Array<{
    venue: string  // 예: "ICC JEJU"·"롯데호텔 제주"
    signage_breakdown: Array<{ category: string; quantity: number; sizes?: string }>
    program_parts?: string[]   // venue별 영역 영역 영역 (선택)
    analyzed_item_count?: number   // venue별 영역 영역 영역 (선택)
  }>
}

// 5/22 사용자 명시 = "쭉 적기"·환경장식물별 수량 제공. signage_breakdown 영역 없으면 program_parts 기반 추정값 자동 생성.
// 추정 패턴 = 과거 분석 13건 평균·행사 유형별 패턴 SOT.
export function estimateSignageBreakdown(parts: string[] | undefined | null, totalQty?: number): { category: string; quantity: number; sizes?: string }[] {
  if (!parts || parts.length === 0) return []
  const result: { category: string; quantity: number; sizes?: string }[] = []
  const has = (code: string) => parts.includes(code)
  // 전시·박람회·엑스포 (40.05 전시 포함)
  if (has('40.05')) {
    result.push({ category: 'X배너', quantity: 10, sizes: '600×1800' })
    result.push({ category: '세로현수막', quantity: 5, sizes: '600×1800' })
    result.push({ category: '동선 배너', quantity: 3, sizes: '600×1800' })
  }
  // 회의·포럼 (40.04 회의 포함)
  if (has('40.04')) {
    result.push({ category: '포디움 타이틀', quantity: 2, sizes: '600×200' })
    result.push({ category: 'A4 가로', quantity: 5, sizes: '297×210' })
    result.push({ category: 'A3 가로', quantity: 3, sizes: '420×297' })
  }
  // 공식행사·기념식 (40.08)
  if (has('40.08')) {
    result.push({ category: '통천', quantity: 1, sizes: '10000×7200' })
    result.push({ category: '가로 현수막', quantity: 2, sizes: '5000×900' })
  }
  // 등록·영접영송 (40.19·40.20)
  if (has('40.19') || has('40.20')) {
    if (!result.find(r => r.category === 'X배너')) result.push({ category: 'X배너', quantity: 5, sizes: '600×1800' })
    result.push({ category: '동선 배너', quantity: 4, sizes: '600×1800' })
  }
  // 의전 (40.18)
  if (has('40.18')) {
    if (!result.find(r => r.category === 'A3 가로')) result.push({ category: 'A3 가로', quantity: 3, sizes: '420×297' })
    result.push({ category: 'I배너', quantity: 2, sizes: '600×1800' })
  }
  // 비즈매칭·비즈프로그램 (40.06·40.07)
  if (has('40.06') || has('40.07')) {
    if (!result.find(r => r.category === 'A4 가로')) result.push({ category: 'A4 가로', quantity: 4, sizes: '297×210' })
  }
  // 홍보 (40.17)
  if (has('40.17')) {
    result.push({ category: '가로등 배너', quantity: 5, sizes: '600×1800' })
  }
  // 체험·공모전 (40.10·40.09)
  if (has('40.10') || has('40.09')) {
    if (!result.find(r => r.category === 'A4 가로')) result.push({ category: 'A4 가로', quantity: 3, sizes: '297×210' })
  }
  // 투어 (40.11)
  if (has('40.11')) {
    result.push({ category: '가로 현수막', quantity: 2, sizes: '5000×900' })
  }
  // 중복 카테고리 통합 (quantity 합산)
  const merged = new Map<string, { category: string; quantity: number; sizes?: string }>()
  for (const r of result) {
    const prev = merged.get(r.category)
    if (prev) prev.quantity += r.quantity
    else merged.set(r.category, { ...r })
  }
  const arr = Array.from(merged.values()).sort((a, b) => b.quantity - a.quantity)
  // totalQty가 있으면 비율 조정
  if (totalQty && totalQty > 0) {
    const sum = arr.reduce((s, r) => s + r.quantity, 0)
    if (sum > 0) {
      const ratio = totalQty / sum
      for (const r of arr) r.quantity = Math.max(1, Math.round(r.quantity * ratio))
    }
  }
  return arr
}

// 폴더명에서 추출 — 패턴: "행사명 6자리코드" 또는 "행사명 코드 (면적)"
// 5/22 사용자 명시 = 5대 영역 정합·program_parts 추정값·venue 정확화. 환경장식물별 분리는 _venue_signage_map.json 영역.
export const SEED_EVENT_HISTORY: EventHistorySeed[] = [
  // 코엑스
  { project_name: '2018 스마트국토엑스포',                        project_code: '183080',  year: 2018, venue: '코엑스 D2·컨퍼런스룸',          category_tag: '일반', has_excel: true,  has_image: true, analyzed_item_count: 41, program_parts: ['40.05', '40.04', '40.19', '40.18'], signage_breakdown: [
    { category: '코엑스 D2', quantity: 25, sizes: '60×180cm' },
    { category: '코엑스 컨퍼런스룸', quantity: 13, sizes: '100×300cm·A3·기타' },
    { category: '개막식장', quantity: 11, sizes: '60×180cm·150×400cm' },
    { category: '인터컨티넨탈 코엑스', quantity: 6, sizes: '60×180cm·60×20cm' },
    { category: '인천공항', quantity: 4, sizes: 'A2' },
  ] },
  { project_name: '2019 국제방송영상마켓 (BCWW 2019)',             project_code: '193800',  year: 2019, venue: '코엑스',                        category_tag: '일반', has_excel: true,  has_image: true, program_parts: ['40.05', '40.06', '40.19', '40.17'] },
  { project_name: '2019 스마트국토엑스포',                        project_code: '193700',  year: 2019, venue: '코엑스',                        category_tag: '일반', has_excel: true,  has_image: true, program_parts: ['40.05', '40.04', '40.19', '40.18'] },
  { project_name: 'BCWW 2018',                                   project_code: '183090',  year: 2018, venue: '코엑스 Hall B',                  category_tag: '일반', has_excel: true,  has_image: true, analyzed_item_count: 36, program_parts: ['40.05', '40.06', '40.19', '40.17'], signage_breakdown: [
    { category: '행사장 조성', quantity: 59, sizes: '1200×6000·6000×4000·5000×3750' },
    { category: '전시장 Hall B', quantity: 9, sizes: 'A4·600×1800·A1' },
    { category: '네트워킹 리셉션', quantity: 7, sizes: '600×1800·700×400' },
    { category: 'VIP 오찬장', quantity: 7, sizes: '600×1800·A1' },
    { category: '부대행사', quantity: 6, sizes: '600×1800·1200×1500' },
    { category: 'VIP 대기실', quantity: 4, sizes: '600×1800·A1' },
  ] },
  { project_name: 'NextRise 2022, Seoul',                        project_code: '221030',  year: 2022, venue: '코엑스',                        category_tag: '일반', has_excel: true,  has_image: true, program_parts: ['40.05', '40.06', '40.07', '40.19'] },
  { project_name: '공정경제 전략회의',                            project_code: '182090',  year: 2018, venue: '코엑스',                        category_tag: '일반', has_excel: true,  has_image: true, program_parts: ['40.04', '40.08', '40.18'] },
  { project_name: '콘텐츠 IP 마켓 2023',                          project_code: '231009',  year: 2023, venue: '코엑스 그랜드볼룸',              category_tag: '일반', has_excel: true,  has_image: true, program_parts: ['40.05', '40.06', '40.19', '40.17'] },
  { project_name: '제33차 아시아광고대회 (AdAsia 2023 Seoul)',     project_code: '231004',  year: 2023, venue: '코엑스 그랜드볼룸·아셈볼룸·오디토리움', category_tag: '일반', has_excel: true,  has_image: true, program_parts: ['40.04', '40.08', '40.18', '40.19'] },
  { project_name: '2023 웹툰 잡 페스타',                          project_code: '232030',  year: 2023, venue: '코엑스 컨퍼런스룸·아셈볼룸',     category_tag: '일반', has_excel: true,  has_image: true, program_parts: ['40.05', '40.10', '40.19', '40.17'] },
  // 킨텍스
  { project_name: '제2회 월드 스마트시티 위크',                   project_code: '182070',  year: 2018, venue: '킨텍스',                        category_tag: '일반', has_excel: true,  has_image: true, program_parts: ['40.05', '40.04', '40.19'] },
  { project_name: '제6회 월드 스마트시티 엑스포 (WSCE 2022)',      project_code: '222020',  year: 2022, venue: '킨텍스 제1전시장 3·4·5홀',       category_tag: '핵심', has_excel: true,  has_image: true, program_parts: ['40.05', '40.04', '40.19', '40.18'] },
  { project_name: '2023 대한민국 순환경제 페스티벌',              project_code: '232033',  year: 2023, venue: '킨텍스 제2전시장 9B홀',          category_tag: '핵심', has_excel: true,  has_image: true, program_parts: ['40.05', '40.10', '40.19', '40.17'] },
  // 송도
  { project_name: 'KOREA MICE EXPO 2018',                        project_code: '183000-1',year: 2018, venue: '송도컨벤시아',                  category_tag: '일반', has_excel: true,  has_image: true, analyzed_item_count: 62, program_parts: ['40.05', '40.04', '40.06', '40.08', '40.19'], signage_breakdown: [
    { category: '행사 현수막', quantity: 100, sizes: '6×1.8m·950×2300·7×2.5m·8×10m' },
    { category: '유도사인', quantity: 32, sizes: '600×1800' },
    { category: '행사 룸사인', quantity: 17, sizes: '600×1800' },
    { category: '폴대배너', quantity: 15, sizes: '0.85×5.9m' },
    { category: '포디움 타이틀', quantity: 13, sizes: '600×200·기타' },
    { category: 'Q방', quantity: 7, sizes: 'A4' },
    { category: '안내 룸사인', quantity: 5, sizes: '600×1800' },
    { category: 'X배너', quantity: 4, sizes: '600×1800' },
  ] },
  { project_name: 'KOREA MICE EXPO 2019',                        project_code: '193100',  year: 2019, venue: '송도컨벤시아',                  category_tag: '일반', has_excel: true,  has_image: true, analyzed_item_count: 9, program_parts: ['40.05', '40.04', '40.06', '40.08', '40.19'], signage_breakdown: [
    { category: '전시장', quantity: 6, sizes: '8000×8000' },
    { category: '개막식', quantity: 6, sizes: '1000×7200' },
    { category: '환영만찬', quantity: 6, sizes: '600×1800' },
    { category: '지역홍보·베뉴설명회', quantity: 5, sizes: '950×2300' },
    { category: '참가자관리', quantity: 4, sizes: 'A3' },
    { category: '환영리셉션', quantity: 4, sizes: '600×1800' },
  ] },
  // ICC JEJU·제주
  // 5/22 김연아 대리님 피드백 = ICC JEJU + 롯데호텔 분리 학습 영역. venues_breakdown 영역 영역 영역 영역 학습.
  // 파일 영역 영역 영역 = APEC중기장관회의-1번원형기둥배너·삼다홀쪽사각기둥배너·이벤트홀난간바톤 등 = ICC JEJU 영역
  //                  APEC중기장관회의-롯데만찬통천·롯데포토월·롯데호텔가로등배너·롯데호텔천장·롯데호텔포디움 등 = 롯데호텔 제주 영역
  { project_name: 'APEC 중소기업 장관회의',                       project_code: '251004',  year: 2025, venue: 'ICC JEJU 및 인근호텔',           category_tag: '일반', has_excel: true,  has_image: true, program_parts: ['40.04', '40.08', '40.19'],
    venues_breakdown: [
      { venue: 'ICC JEJU', signage_breakdown: [
        { category: 'X배너', quantity: 6, sizes: '600×1800' },
        { category: '포디움 타이틀', quantity: 2, sizes: '600×200' },
        { category: '가로 현수막', quantity: 3 },
      ]},
      { venue: '롯데호텔 제주', signage_breakdown: [
        { category: '통천 배너', quantity: 1, sizes: '만찬 영역' },
        { category: '시상보드', quantity: 2, sizes: '포토월' },
        { category: '가로등 배너', quantity: 4 },
        { category: '포디움 타이틀', quantity: 2, sizes: '600×200' },
      ]},
    ],
  },
  { project_name: '2022 제주 IUCN리더스포럼',                     project_code: '223060',  year: 2022, venue: '제주국제컨벤션센터 (ICC JEJU)',  category_tag: '일반', has_excel: true,  has_image: true, program_parts: ['40.04', '40.08', '40.18'] },
  { project_name: '제2회 세계리더스보전포럼',                     project_code: '183060',  year: 2018, venue: '제주국제컨벤션센터 (ICC JEJU)',  category_tag: '일반', has_excel: true,  has_image: true, analyzed_item_count: 33, program_parts: ['40.04', '40.08', '40.18', '40.19'], signage_breakdown: [
    { category: '참가자안내', quantity: 22, sizes: 'A4·600×1800' },
    { category: '안내', quantity: 9, sizes: 'A3·600×1800' },
    { category: '전문가세션', quantity: 2, sizes: '1100×4500·1050×4400' },
    { category: 'VIP 의전·접견 사무실', quantity: 4, sizes: '510×740·600×1800' },
    { category: '프레스 센터', quantity: 1, sizes: '4000×2980' },
  ] },
  // 호텔
  { project_name: 'SPP 국제콘텐츠마켓 2024',                      project_code: '245006',  year: 2024, venue: '그랜드하얏트 서울',              category_tag: '일반', has_excel: true,  has_image: true, program_parts: ['40.06', '40.04', '40.19'] },
  { project_name: '2024 국제농업협력 정책 홍보 및 행사',          project_code: '242008',  year: 2024, venue: '더플라자 호텔 서울 그랜드볼룸',  category_tag: '일반', has_excel: true,  has_image: true, program_parts: ['40.04', '40.17', '40.19'] },
  { project_name: '제17차 한-중앙아 협력 포럼',                   project_code: '241014',  year: 2024, venue: '롯데호텔 서울',                  category_tag: '일반', has_excel: true,  has_image: true, program_parts: ['40.04', '40.18', '40.19'] },
  { project_name: '환경 협력 네트워크 구축 주한공관장 초청 간담회', project_code: '252016',year: 2025, venue: '롯데호텔 서울',                  category_tag: '일반', has_excel: true,  has_image: true, program_parts: ['40.04', '40.18'] },
  { project_name: '제16차 한·베트남 환경장관회의',                project_code: '241011',  year: 2024, venue: '웨스틴 조선 서울 라일락+튤립',   category_tag: '일반', has_excel: true,  has_image: true, program_parts: ['40.04', '40.08', '40.18'] },
  // 광주광역시·경상남도·경상북도·강원특별자치도
  { project_name: 'BIXPO 2018 행사 (본계약)',                     project_code: '183300-1',year: 2018, venue: '광주 김대중컨벤션센터',          category_tag: '일반', has_excel: true,  has_image: true, program_parts: ['40.05', '40.04', '40.19'] },
  { project_name: '제13회 광주비엔날레',                          project_code: '201100',  year: 2020, venue: '광주비엔날레전시관',             category_tag: '일반', has_excel: true,  has_image: true, program_parts: ['40.05', '40.17', '40.19'] },
  { project_name: '중소기업 스마트 제조혁신 전략보고회',          project_code: '182120',  year: 2018, venue: '경남도청 대회의실',              category_tag: '일반', has_excel: true,  has_image: true, program_parts: ['40.04', '40.08'] },
  { project_name: '2025년 APEC 경제행사 대행 용역',               project_code: '251014',  year: 2025, venue: '경주',                          category_tag: '일반', has_excel: true,  has_image: true, program_parts: ['40.04', '40.08', '40.18', '40.11'] },
  { project_name: '4차 산업혁명시대, 관광과 박물관',              project_code: '193910',  year: 2019, venue: '국립중앙박물관',                category_tag: '일반', has_excel: true,  has_image: true, program_parts: ['40.04', '40.05'] },
  // 광화문 광장
  { project_name: '2018 실패박람회',                              project_code: '182040',  year: 2018, venue: '광화문 광장',                    category_tag: '일반', has_excel: true,  has_image: true, program_parts: ['40.05', '40.10', '40.17', '40.19'] },
  { project_name: '2019 실패박람회',                              project_code: '192400',  year: 2019, venue: '광화문 광장',                    category_tag: '일반', has_excel: true,  has_image: true, program_parts: ['40.05', '40.10', '40.17', '40.19'] },
  { project_name: '제100주년 3.1절 중앙기념식',                   project_code: '192000',  year: 2019, venue: '광화문 광장·세종로공원',         category_tag: '일반', has_excel: true,  has_image: true, analyzed_item_count: 52, program_parts: ['40.08', '40.18', '40.19'], signage_breakdown: [
    { category: '행사장 (등록·음수대·방한용품·물품보관소)', quantity: 46, sizes: '2종 표준' },
    { category: '야외 (주차장·주차장·운영요원)', quantity: 28, sizes: '5×5m·기타' },
    { category: '실내', quantity: 4, sizes: '600×1800' },
  ] },
  // DDP·서울스퀘어
  { project_name: '제1회 대한민국 정부혁신박람회',                project_code: '191400',  year: 2019, venue: '동대문디자인플라자 (DDP) 알림1·2관', category_tag: '일반', has_excel: true,  has_image: true, analyzed_item_count: 22, program_parts: ['40.05', '40.08', '40.10', '40.17', '40.19'] },
  { project_name: '농식품 청년해외개척단 8기 발대식',             project_code: '191600',  year: 2019, venue: '서울스퀘어',                     category_tag: '일반', has_excel: true,  has_image: true, program_parts: ['40.08', '40.18'] },
  // aT
  { project_name: '2019 대한민국 식품대전',                       project_code: '191200',  year: 2019, venue: 'aT센터',                         category_tag: '일반', has_excel: true,  has_image: true, program_parts: ['40.05', '40.19', '40.17'] },
  // 오스코
  { project_name: '2025 대한민국 정부 박람회',                    project_code: '252006',  year: 2025, venue: '오스코 (OSCO)',                  category_tag: '일반', has_excel: true,  has_image: true, program_parts: ['40.05', '40.08', '40.19', '40.17'] },
  // 핵심 폴더
  { project_name: '2020 평창평화포럼',                            project_code: '193960',  year: 2020, venue: '평창 알펜시아',                  category_tag: '핵심', has_excel: true,  has_image: true, analyzed_item_count: 251, program_parts: ['40.04', '40.18', '40.19'], signage_breakdown: [
    { category: '세로현수막', quantity: 174, sizes: '600×1800·700×1800·600×2000' },
    { category: 'X배너', quantity: 30, sizes: '600×1800' },
    { category: '가로현수막', quantity: 15, sizes: '10000×900·12000×1500' },
    { category: '통천현수막', quantity: 7, sizes: '2230×4100·2000×2300' },
    { category: '큐방', quantity: 7, sizes: '297×420' },
    { category: '포디움 타이틀', quantity: 5, sizes: '630×1000·600×200' },
    { category: '폼보드 (스탠드 POP·개회식 배치도)', quantity: 13, sizes: '420×594·600×950' },
  ] },
  // 해외
  { project_name: 'UNFCCC COP30 한국홍보관',                      project_code: '252026',  year: 2025, venue: '브라질 벨렘',                    category_tag: '해외', has_excel: true,  has_image: true, program_parts: ['40.05', '40.17'] },
  // 미분류 — 파트 추정 불가 (정직)
  { project_name: '2018 KFP 한국수산식품홍보관 (K-FISH)',         project_code: '181000',  year: 2018, venue: '미분류',                        category_tag: '미분류', has_excel: true, has_image: true, program_parts: ['40.05', '40.17'] },
  { project_name: '2018 SW교육 성과발표회 및 시상식',             project_code: '183900',  year: 2018, venue: '미분류',                        category_tag: '미분류', has_excel: true, has_image: true, program_parts: ['40.08', '40.04'] },
  { project_name: '2019 홍콩 트래블마트 및 기업설명회',           project_code: '193200',  year: 2019, venue: '미분류',                        category_tag: '미분류', has_excel: true, has_image: true, program_parts: ['40.06', '40.05'] },
  { project_name: '2019년 야영장 담당공무원 안전관리 실무교육',   project_code: '193000',  year: 2019, venue: '미분류',                        category_tag: '미분류', has_excel: true, has_image: true, program_parts: ['40.04'] },
  { project_name: '한일 우정상 수여식 행사',                      project_code: '193600',  year: 2019, venue: '미분류',                        category_tag: '미분류', has_excel: true, has_image: true, program_parts: ['40.08', '40.18'] },
  // 루트 직접 노출
  { project_name: '2020 국제방송영상마켓 (BCWW) 및 글로벌 포맷마켓 온오프라인', project_code: '203130', year: 2020, venue: '온라인+오프라인', category_tag: '일반', has_excel: true,  has_image: true, program_parts: ['40.05', '40.06', '40.17']  },
  { project_name: '2020 글로벌 코리아 박람회 LH전시부스 및 LH로드쇼 (LH GBC)',   project_code: '202140-1', year: 2020, venue: '복합',         category_tag: '일반', has_excel: true,  has_image: true, program_parts: ['40.05', '40.17', '40.11']  },
  { project_name: '2035 국가 온실가스 감축목표 대국민 공개 논의',  project_code: '251015',  year: 2025, venue: '미정',                          category_tag: '일반', has_excel: true,  has_image: true, program_parts: ['40.04', '40.10']  },
]

// ── 4. 디자인 업체 (명세 6.1.b.iii) ───────────────────────────
export interface DesignerSeed {
  name: string                    // 업체명
  delivery_compliance_rate: number | null   // 평균 납기 준수율 (0~100)
  revision_rate: number | null              // 수정 발생률 (0~100)
  avg_revision_count: number | null         // 평균 수정 횟수
  avg_confirm_days: number | null           // 컨펌 소요 평균 일수
  note: string
}

// 명세: "기본 정보가 없을 것 임으로 디자인 업체 명만 DB화"
// 실제 데이터는 향후 분석 시 채워질 placeholder
export const SEED_DESIGNERS: DesignerSeed[] = [
  { name: 'IMAGIC',         delivery_compliance_rate: null, revision_rate: null, avg_revision_count: null, avg_confirm_days: null, note: '포디움 타이틀 등 다수 — 분석 예정' },
  { name: '미입력 업체 1',  delivery_compliance_rate: null, revision_rate: null, avg_revision_count: null, avg_confirm_days: null, note: '엑셀 파싱 후 자동 추가 예정' },
  { name: '미입력 업체 2',  delivery_compliance_rate: null, revision_rate: null, avg_revision_count: null, avg_confirm_days: null, note: '엑셀 파싱 후 자동 추가 예정' },
]

// ── 5. 재질 기본값 매핑 (명세 6.1.b.iv) ───────────────────────
export interface MaterialDefaultSeed {
  signage_type_id: string  // SEED_SIGNAGE_TYPES.id
  signage_name: string
  primary_material: string
  alternative_materials: string[]
  source_count: number     // 분석 샘플 수 (현재 placeholder)
}

export const SEED_MATERIAL_DEFAULTS: MaterialDefaultSeed[] = SEED_SIGNAGE_TYPES.map(s => ({
  signage_type_id: s.id,
  signage_name: s.name,
  primary_material: s.default_material,
  alternative_materials: [],
  source_count: 0,   // 향후 폴더 엑셀 파싱 시 채워짐
}))

// ── 7. 납기일 패턴 placeholder (명세 6.1.b.v + 6.2.3) ─────────
export interface LeadTimePatternSeed {
  scope_type: 'pm_dept' | 'designer' | 'venue'
  scope_value: string                  // 부서명·업체명·행사장명
  avg_d_to_order: number | null        // D-N 발주
  avg_d_to_review: number | null       // D-N 검수
  avg_d_to_revision: number | null     // D-N 수정
  avg_d_to_confirm: number | null      // D-N 확정
  sample_count: number
}

// 향후 수행실적리스트 + 행사별 폴더 엑셀 파싱으로 자동 산출
export const SEED_LEAD_TIME: LeadTimePatternSeed[] = []

// ── 9. 레이아웃 DNA (명세 6.1.b.ii) — Gemini Vision 분석 결과 ──
// scripts/batch_vision_analysis.mjs 출력. 9개 시안 중 6개 성공 (47슬롯).
// 환경장식물 종류별 객체 위치(0~1000 bbox)와 역할 추출.

export interface LayoutSlotDNA {
  key: string
  label: string
  role: 'logo' | 'title' | 'subtitle' | 'body' | 'footer' | 'image' | 'arrow' | 'qr'
  box: { xmin: number; ymin: number; xmax: number; ymax: number }   // 0~1000 정규화
}

export interface LayoutDNAEntry {
  type_id: string                    // x_banner, horizontal_banner 등
  source_file: string                // 분석 원본 파일명
  slots: LayoutSlotDNA[]
  layout_pattern: string             // 한 줄 패턴 설명
  estimated_signage_type: string     // Gemini가 자동 분류한 종류
  dominant_color: string
  summary: string
}

export const SEED_LAYOUT_DNA: LayoutDNAEntry[] = [
  {
    type_id: 'x_banner',
    source_file: '코엑스/2018 스마트국토엑스포/엑스배너 (1).png',
    slots: [
      { key: 'header_brand',          label: '행사 로고',           role: 'logo',     box: { xmin: 700, ymin: 30,  xmax: 950, ymax: 100 } },
      { key: 'main_title',            label: '행사 메인 타이틀',    role: 'title',    box: { xmin: 50,  ymin: 150, xmax: 950, ymax: 300 } },
      { key: 'subtitle_eng',          label: '행사 영문 타이틀',    role: 'subtitle', box: { xmin: 50,  ymin: 310, xmax: 950, ymax: 350 } },
      { key: 'event_details',         label: '행사 일시 및 장소',   role: 'body',     box: { xmin: 50,  ymin: 360, xmax: 950, ymax: 400 } },
      { key: 'location_text_korean',  label: '장소명 (한글)',      role: 'body',     box: { xmin: 50,  ymin: 450, xmax: 950, ymax: 500 } },
      { key: 'location_text_english', label: '장소명 (영문)',      role: 'body',     box: { xmin: 50,  ymin: 500, xmax: 950, ymax: 540 } },
      { key: 'direction_arrow',       label: '방향 지시',          role: 'arrow',    box: { xmin: 350, ymin: 570, xmax: 650, ymax: 670 } },
      { key: 'illustration_image',    label: '메인 일러스트',       role: 'image',    box: { xmin: 50,  ymin: 680, xmax: 950, ymax: 850 } },
      { key: 'footer_logos',          label: '주최/주관 로고',     role: 'footer',   box: { xmin: 50,  ymin: 880, xmax: 950, ymax: 960 } },
    ],
    layout_pattern: '상단 로고 + 타이틀 강조 / 중단 장소·방향 / 하단 일러스트 + 주최 로고',
    estimated_signage_type: 'vertical_banner',
    dominant_color: '파란색',
    summary: '수직형 안내 배너 — 상단 행사명, 중단 장소·방향, 하단 일러스트·로고 배치',
  },
  {
    type_id: 'horizontal_banner',
    source_file: '2035 국가 온실가스 감축목표 대국민 공개 논의/무대 가로배너.jpg',
    slots: [
      { key: 'left_logo',           label: '좌측 로고',          role: 'logo',     box: { xmin: 30,  ymin: 250, xmax: 200, ymax: 750 } },
      { key: 'main_title_korean',   label: '메인 타이틀 (한글)', role: 'title',    box: { xmin: 250, ymin: 200, xmax: 750, ymax: 500 } },
      { key: 'main_title_english',  label: '메인 타이틀 (영문)', role: 'subtitle', box: { xmin: 250, ymin: 510, xmax: 750, ymax: 600 } },
      { key: 'event_date_location', label: '행사 일시 및 장소',  role: 'body',     box: { xmin: 250, ymin: 620, xmax: 750, ymax: 700 } },
      { key: 'right_decoration',    label: '우측 장식',          role: 'image',    box: { xmin: 800, ymin: 200, xmax: 970, ymax: 700 } },
      { key: 'footer_partners',     label: '하단 파트너 로고',   role: 'footer',   box: { xmin: 100, ymin: 850, xmax: 900, ymax: 950 } },
    ],
    layout_pattern: '좌측 로고 + 중앙 타이포 + 우측 장식 / 하단 파트너 로고',
    estimated_signage_type: 'horizontal_banner',
    dominant_color: '진녹색',
    summary: '가로형 메인 무대 배너 — 좌측 로고, 중앙 타이틀(한·영), 우측 장식, 하단 파트너 로고',
  },
  {
    type_id: 'vertical_banner',
    source_file: '코엑스/2018 스마트국토엑스포/세로배너 수정.png',
    slots: [
      { key: 'top_logo',            label: '상단 행사 로고',     role: 'logo',     box: { xmin: 100, ymin: 30,  xmax: 900, ymax: 130 } },
      { key: 'main_title',          label: '메인 타이틀',        role: 'title',    box: { xmin: 50,  ymin: 200, xmax: 950, ymax: 450 } },
      { key: 'event_info',          label: '행사 정보',          role: 'body',     box: { xmin: 50,  ymin: 480, xmax: 950, ymax: 600 } },
      { key: 'illustration',        label: '메인 일러스트',      role: 'image',    box: { xmin: 50,  ymin: 620, xmax: 950, ymax: 870 } },
      { key: 'footer_logos',        label: '하단 주최 로고',     role: 'footer',   box: { xmin: 50,  ymin: 900, xmax: 950, ymax: 980 } },
      { key: 'qr_code',             label: 'QR 코드',           role: 'qr',       box: { xmin: 800, ymin: 850, xmax: 950, ymax: 970 } },
    ],
    layout_pattern: '상단 로고 / 중상 타이틀 / 중하 일러스트 / 하단 주최 로고 + QR',
    estimated_signage_type: 'vertical_banner',
    dominant_color: '하늘색',
    summary: '세로 현수막 — 행사 메인 비주얼 강조, QR 코드 포함',
  },
  {
    type_id: 'podium',
    source_file: '코엑스/2018 스마트국토엑스포/포디움 타이틀_IMAGIC.png',
    slots: [
      { key: 'event_logo',     label: '행사 로고',     role: 'logo',  box: { xmin: 50,  ymin: 200, xmax: 250, ymax: 800 } },
      { key: 'event_title',    label: '행사 타이틀',   role: 'title', box: { xmin: 280, ymin: 250, xmax: 800, ymax: 600 } },
      { key: 'event_subtitle', label: '행사 부제',     role: 'subtitle', box: { xmin: 280, ymin: 620, xmax: 800, ymax: 750 } },
      { key: 'partner_logos',  label: '파트너 로고',  role: 'footer', box: { xmin: 820, ymin: 350, xmax: 970, ymax: 650 } },
    ],
    layout_pattern: '좌측 로고 / 중앙 타이틀+부제 / 우측 파트너 로고 — 가로 슬림 비율',
    estimated_signage_type: 'podium',
    dominant_color: '파란색',
    summary: '포디움 타이틀 — 연단 전면 부착용, 좌·중·우 3분할 구조',
  },
  {
    type_id: 'foamboard',
    source_file: '코엑스/2018 스마트국토엑스포/컨설팅 폼보드.png',
    slots: [
      { key: 'header_brand',     label: '상단 브랜드',       role: 'logo',  box: { xmin: 100, ymin: 30,  xmax: 900, ymax: 100 } },
      { key: 'main_title',       label: '메인 타이틀',       role: 'title', box: { xmin: 50,  ymin: 150, xmax: 950, ymax: 280 } },
      { key: 'subtitle_eng',     label: '영문 부제',         role: 'subtitle', box: { xmin: 50,  ymin: 290, xmax: 950, ymax: 340 } },
      { key: 'step_1',           label: '단계 ①',            role: 'body',  box: { xmin: 50,  ymin: 380, xmax: 950, ymax: 480 } },
      { key: 'step_2',           label: '단계 ②',            role: 'body',  box: { xmin: 50,  ymin: 500, xmax: 950, ymax: 600 } },
      { key: 'step_3',           label: '단계 ③',            role: 'body',  box: { xmin: 50,  ymin: 620, xmax: 950, ymax: 720 } },
      { key: 'step_4',           label: '단계 ④',            role: 'body',  box: { xmin: 50,  ymin: 740, xmax: 950, ymax: 840 } },
      { key: 'footer_credits',   label: '하단 크레딧',       role: 'footer', box: { xmin: 50,  ymin: 920, xmax: 950, ymax: 980 } },
    ],
    layout_pattern: '상단 타이틀 / 4단계 리스트 / 하단 크레딧 — 정보 전달형',
    estimated_signage_type: 'foamboard',
    dominant_color: '진한 파란색',
    summary: '폼보드 — 컨설팅 단계별 안내, ①~④ 시퀀스 강조',
  },
  {
    type_id: 'chunchen_banner',
    source_file: '코엑스/2018 스마트국토엑스포/MOU 통천_305호.png',
    slots: [
      { key: 'top_logo',         label: '최상단 로고',       role: 'logo',  box: { xmin: 200, ymin: 30,  xmax: 800, ymax: 130 } },
      { key: 'main_title',       label: '대형 메인 타이틀',  role: 'title', box: { xmin: 50,  ymin: 200, xmax: 950, ymax: 500 } },
      { key: 'subtitle',         label: '서브 타이틀',       role: 'subtitle', box: { xmin: 50,  ymin: 520, xmax: 950, ymax: 620 } },
      { key: 'event_date',       label: '행사 일시',         role: 'body',  box: { xmin: 50,  ymin: 650, xmax: 950, ymax: 720 } },
      { key: 'central_visual',   label: '중앙 비주얼',       role: 'image', box: { xmin: 100, ymin: 750, xmax: 900, ymax: 920 } },
      { key: 'footer_logos',     label: '하단 주최 로고',    role: 'footer', box: { xmin: 100, ymin: 950, xmax: 900, ymax: 990 } },
      { key: 'mou_label',        label: 'MOU 라벨',          role: 'subtitle', box: { xmin: 400, ymin: 940, xmax: 600, ymax: 985 } },
    ],
    layout_pattern: '대형 통천 — 상단 타이틀 / 중앙 비주얼 / 하단 로고. MOU 등 특수 라벨 추가 가능',
    estimated_signage_type: 'chunchen_banner',
    dominant_color: '진녹색',
    summary: '통천 배너 — 천장 매다는 대형. 행사명 강조, MOU 등 특수 행사용 라벨 포함',
  },
]

/** 환경장식물 종류로 LayoutDNA 조회 */
export function findLayoutDNA(typeId: string): LayoutDNAEntry | null {
  return SEED_LAYOUT_DNA.find(d => d.type_id === typeId || d.estimated_signage_type === typeId) ?? null
}

// ── 비표준 규격 → 표준 종류 매핑 룰 (명세 6.1.b.iii.3 후속) ───────
// 분석에서 발견된 비표준 규격 105건을 표준 11종에 흡수 가능한지 매핑.
// 명시적 매핑 + 비율·크기 기반 fallback.

export interface NonStandardMapping {
  size: string                          // "510×740" 형식
  width_mm: number
  height_mm: number
  count: number                         // 분석 출현 빈도
  inferred_type: string                 // 추정 환경장식물 종류
  inferred_category: '명찰류' | '포디움 변형' | '현수막 변형' | '백월 변형' | '디스플레이' | '데이터 오류' | '기타'
  closest_standard?: string             // 가장 가까운 표준 종류 ID
  note?: string
}

export const NON_STANDARD_MAPPINGS: NonStandardMapping[] = [
  { size: '510×740',   width_mm: 510,  height_mm: 740,  count: 8, inferred_type: '명패·표지판',     inferred_category: '명찰류',      closest_standard: 'a3_portrait',    note: 'A3 변형. 좌석 명패 또는 룸사인' },
  { size: '100×125',   width_mm: 100,  height_mm: 125,  count: 5, inferred_type: '명찰',            inferred_category: '명찰류',      closest_standard: 'a4_portrait',    note: '소형 ID 카드' },
  { size: '700×150',   width_mm: 700,  height_mm: 150,  count: 5, inferred_type: '포디움 부속',     inferred_category: '포디움 변형',  closest_standard: 'podium',         note: '포디움 사이드 또는 로고 띠' },
  { size: '950×2300',  width_mm: 950,  height_mm: 2300, count: 4, inferred_type: '대형 X배너',      inferred_category: '현수막 변형',  closest_standard: 'x_banner',       note: 'X배너 확장 (높이 2300)' },
  { size: '660×200',   width_mm: 660,  height_mm: 200,  count: 4, inferred_type: '포디움 변형',     inferred_category: '포디움 변형',  closest_standard: 'podium',         note: '폭 660 변형' },
  { size: '800×180',   width_mm: 800,  height_mm: 180,  count: 4, inferred_type: '포디움 와이드',   inferred_category: '포디움 변형',  closest_standard: 'podium',         note: '폭 800 변형' },
  { size: '7000×900',  width_mm: 7000, height_mm: 900,  count: 3, inferred_type: '대형 가로 현수막', inferred_category: '현수막 변형',  closest_standard: 'horizontal_banner', note: '7m 폭 변형' },
  { size: '980×220',   width_mm: 980,  height_mm: 220,  count: 3, inferred_type: '포디움 와이드',   inferred_category: '포디움 변형',  closest_standard: 'podium',         note: '높이 220 변형' },
  { size: '1050×4400', width_mm: 1050, height_mm: 4400, count: 3, inferred_type: '세로 현수막 변형', inferred_category: '현수막 변형',  closest_standard: 'vertical_banner', note: '폭 1050 변형' },
  { size: '500×90',    width_mm: 500,  height_mm: 90,   count: 2, inferred_type: '포디움 슬림',     inferred_category: '포디움 변형',  closest_standard: 'podium',         note: '소형 포디움' },
  { size: '1920×1080', width_mm: 1920, height_mm: 1080, count: 2, inferred_type: 'PDP 송출용',      inferred_category: '디스플레이',   note: '16:9 화면 비율 — 표준 종류 외' },
  { size: '1100×4500', width_mm: 1100, height_mm: 4500, count: 2, inferred_type: '세로 현수막 변형', inferred_category: '현수막 변형',  closest_standard: 'vertical_banner', note: '폭 1100 변형' },
  { size: '4920×2640', width_mm: 4920, height_mm: 2640, count: 2, inferred_type: '백월 변형',       inferred_category: '백월 변형',    closest_standard: 'backwall',       note: '4.9m × 2.6m' },
  { size: '4000×2980', width_mm: 4000, height_mm: 2980, count: 2, inferred_type: '백월 변형',       inferred_category: '백월 변형',    closest_standard: 'backwall',       note: '4m × 3m' },
  { size: '5000×3750', width_mm: 5000, height_mm: 3750, count: 2, inferred_type: '백월 변형',       inferred_category: '백월 변형',    closest_standard: 'backwall',       note: '5m × 3.75m' },
  { size: '1200×6000', width_mm: 1200, height_mm: 6000, count: 2, inferred_type: '통천 변형',       inferred_category: '현수막 변형',  closest_standard: 'chunchen_banner', note: '폭 1200 변형' },
  { size: '5×5',       width_mm: 5,    height_mm: 5,    count: 5, inferred_type: '데이터 입력 오류', inferred_category: '데이터 오류',   note: '엑셀 파싱 오류 추정' },
]

/** 비표준 규격을 가장 가까운 표준 종류로 추론 (룰 기반 fallback 포함) */
export function suggestStandardType(width: number, height: number): { closest: string | null; rationale: string } {
  // 1) 명시적 매핑 우선
  const explicit = NON_STANDARD_MAPPINGS.find(m => m.width_mm === width && m.height_mm === height)
  if (explicit?.closest_standard) {
    return { closest: explicit.closest_standard, rationale: `명시적 매핑: ${explicit.inferred_type}` }
  }
  // 2) 룰 기반 fallback
  if (width < 50 || height < 50) return { closest: null, rationale: '데이터 오류 추정 (너무 작음)' }
  const ratio = width / height
  if (width >= 4000 && height >= 2000) return { closest: 'backwall', rationale: '대형 사각 (4m+ × 2m+)' }
  if (height >= 4000 && ratio < 0.4) return { closest: 'vertical_banner', rationale: '세로 현수막 변형 (높이 4m+)' }
  if (width >= 4000 && ratio > 3) return { closest: 'horizontal_banner', rationale: '가로 현수막 변형 (폭 4m+)' }
  if (height >= 5000 && ratio > 0.15 && ratio < 0.3) return { closest: 'chunchen_banner', rationale: '통천 변형 (높이 5m+)' }
  if (height >= 1500 && ratio < 0.5) return { closest: 'x_banner', rationale: 'X배너 변형' }
  if (width <= 700 && height <= 250) return { closest: 'podium', rationale: '포디움 변형' }
  if (width <= 200 && height <= 200) return { closest: 'a4_portrait', rationale: '소형 인쇄물 (명찰류)' }
  if (width <= 500 && height <= 500) return { closest: 'a3_portrait', rationale: '중형 인쇄물' }
  return { closest: null, rationale: '표준 종류에 흡수 어려움 — 별도 검토 필요' }
}

// ── 8b. 행사별 폴더 제작물리스트 분석 결과 (parse_signage_lists.mjs 출력) ──
// 8개 행사 / 281개 제작물 행 분석 — 명세 6.1.b.iv (재질 분석), 6.1.b.iii.3 (비표준 규격 검토)
export interface SignageAnalysis {
  parsed_events: number
  total_items: number
  material_distribution: { material: string; count: number; pct: number }[]
  non_standard_sizes: { size: string; count: number }[]
  non_standard_total: number
  non_standard_pct: number
}

export const SEED_SIGNAGE_ANALYSIS: SignageAnalysis = {
  parsed_events: 8,
  total_items: 281,
  material_distribution: [
    { material: '현수막',     count: 18, pct: 22.0 },
    { material: '폼보드',     count: 16, pct: 19.5 },
    { material: 'PET',        count: 9,  pct: 11.0 },
    { material: 'X-배너',     count: 8,  pct: 9.8 },
    { material: '피켓보드',   count: 8,  pct: 9.8 },
    { material: '유포지',     count: 6,  pct: 7.3 },
    { material: 'Q방',        count: 4,  pct: 4.9 },
    { material: '종이',       count: 2,  pct: 2.4 },
    { material: 'PDP 송출용', count: 2,  pct: 2.4 },
  ],
  non_standard_sizes: [
    { size: '510×740',   count: 8 },
    { size: '100×125',   count: 5 },
    { size: '5×5',       count: 5 },
    { size: '700×150',   count: 5 },
    { size: '950×2300',  count: 4 },
    { size: '660×200',   count: 4 },
    { size: '800×180',   count: 4 },
    { size: '7000×900',  count: 3 },
    { size: '980×220',   count: 3 },
    { size: '1050×4400', count: 3 },
    { size: '500×90',    count: 2 },
    { size: '1920×1080', count: 2 },
    { size: '1100×4500', count: 2 },
    { size: '4920×2640', count: 2 },
    { size: '4000×2980', count: 2 },
    { size: '5000×3750', count: 2 },
    { size: '1200×6000', count: 2 },
  ],
  non_standard_total: 105,
  non_standard_pct: 37.4,
}

// ── 9. 행사장 규모·스펙 시드 (AI 수량 추정 기준) ──────────────────────
// 출처: 킨텍스 매뉴얼·코엑스 안내자료·현장 실측 + 과거 발주 사례 참조
// AI 추천 시 행사장 크기 → 수량 스케일링 기준으로 활용

export interface VenueSpecSeed {
  venue_key: string              // venueFacilityGuide.ts의 venue_key와 일치
  venue_name: string
  aliases: string[]              // 검색용 별칭
  floor_area_m2?: number         // 전시 가용 면적(m²)
  ceiling_height_m?: number      // 대략적 천장 높이(m)
  max_booths_standard?: number   // 3×3m 표준 부스 최대 배치 수
  typical_attendees: {
    large: number                // 대형 행사 참가자 기준
    mega: number                 // 초대형 행사 참가자 기준
  }
  entrance_count?: number        // 주요 출입구 수 (가로등배너 수량 계산용)
  has_ceiling_rigging: boolean   // 천정배너 리깅 가능 여부
  ceiling_banner_typical?: {     // 천정배너 전형적 수량 (동일 행사장 학습 기반)
    main_count: number           // 전시장 메인 수
    sub_count?: number           // 부속 공간 수
    note?: string
  }
  note?: string
}

export const SEED_VENUE_SPECS: VenueSpecSeed[] = [
  {
    venue_key: 'kintex_1_hall_5',
    venue_name: '킨텍스 제1전시장 5홀',
    aliases: ['킨텍스 5홀', '킨텍스 1전시장 5홀', 'KINTEX 5홀'],
    floor_area_m2: 10773,  // 171m × 63m (5A+5B 합산)
    ceiling_height_m: 12,
    max_booths_standard: 400,
    typical_attendees: { large: 2000, mega: 5000 },
    entrance_count: 4,  // 서문·남문·북문·캐노피 방향
    has_ceiling_rigging: true,
    ceiling_banner_typical: {
      main_count: 7,
      sub_count: 3,
      note: '전시장 메인 7개(5500×4000)+라운지1개+컨퍼런스장2개 — 2022스마트국토엑스포 실측',
    },
  },
  {
    venue_key: 'kintex_1_hall_1234',
    venue_name: '킨텍스 제1전시장 1~4홀',
    aliases: ['킨텍스 1홀', '킨텍스 2홀', '킨텍스 3홀', '킨텍스 4홀', '킨텍스 1~4홀'],
    floor_area_m2: 9000,   // 1홀 기준 약 9,000m² (홀별 상이)
    ceiling_height_m: 12,
    max_booths_standard: 350,
    typical_attendees: { large: 1500, mega: 4000 },
    entrance_count: 3,
    has_ceiling_rigging: true,
    ceiling_banner_typical: {
      main_count: 5,
      sub_count: 2,
      note: '5홀 사례 기준 추정 — 실측 데이터 미확보',
    },
  },
  {
    venue_key: 'kintex_2',
    venue_name: '킨텍스 제2전시장',
    aliases: ['킨텍스 2전시장', '킨텍스 9홀', '킨텍스 10홀', '킨텍스 2전시장 9B홀'],
    floor_area_m2: 54000,  // 7~10홀 합산 (각 홀 8,000×5,000)
    ceiling_height_m: 15,
    max_booths_standard: 1500,
    typical_attendees: { large: 5000, mega: 20000 },
    entrance_count: 6,
    has_ceiling_rigging: true,
    note: '외벽 표준 8,000×5,000mm (1전시장 대비 2.5배 높이). 천정배너 실측 데이터 미확보.',
  },
  {
    venue_key: 'coex',
    venue_name: '코엑스',
    aliases: ['코엑스 그랜드볼룸', '코엑스 아셈볼룸', '코엑스 컨퍼런스홀', '코엑스 D홀', 'COEX'],
    floor_area_m2: 36000,  // D·B·C홀 합산 기준
    ceiling_height_m: 9,   // 컨퍼런스홀 기준 (그랜드볼룸 6m)
    max_booths_standard: 800,
    typical_attendees: { large: 2000, mega: 10000 },
    entrance_count: 5,
    has_ceiling_rigging: true,
    ceiling_banner_typical: {
      main_count: 4,
      sub_count: 2,
      note: '학습 데이터 미확보 — 일반 패턴 추정치',
    },
  },
  {
    venue_key: 'songdo',
    venue_name: '송도컨벤시아',
    aliases: ['송도', 'G-Tower 컨벤시아', '인천 송도컨벤시아'],
    floor_area_m2: 8000,
    ceiling_height_m: 8,
    max_booths_standard: 200,
    typical_attendees: { large: 1000, mega: 3000 },
    entrance_count: 3,
    has_ceiling_rigging: true,
    ceiling_banner_typical: {
      main_count: 3,
      note: '학습 데이터 미확보 — 일반 패턴 추정치',
    },
  },
  {
    venue_key: 'icc_jeju',
    venue_name: '제주국제컨벤션센터(ICC 제주)',
    aliases: ['ICC 제주', 'ICC JEJU', '제주 컨벤션센터'],
    floor_area_m2: 4000,
    ceiling_height_m: 8,
    max_booths_standard: 100,
    typical_attendees: { large: 500, mega: 2000 },
    entrance_count: 2,
    has_ceiling_rigging: true,
    ceiling_banner_typical: {
      main_count: 2,
      note: '학습 데이터 미확보 — 일반 패턴 추정치',
    },
  },
  {
    venue_key: 'ddp',
    venue_name: '동대문디자인플라자(DDP)',
    aliases: ['DDP', '동대문 DDP', 'Dongdaemun Design Plaza'],
    floor_area_m2: 3000,
    ceiling_height_m: 5,  // 곡면 건물 특성상 낮음
    max_booths_standard: 80,
    typical_attendees: { large: 300, mega: 1000 },
    entrance_count: 2,
    has_ceiling_rigging: false,  // DDP 건축 특성상 행잉 거의 불가
    note: '건축 특성상 천정배너 불가 — 바닥 스탠드(물통배너·롤업)로 대체 계획 필수.',
  },
]

/** 행사장명으로 규모 스펙 조회 */
export function getVenueSpecs(venue: string): VenueSpecSeed | null {
  if (!venue) return null
  const q = venue.replace(/\s/g, '').toLowerCase()
  return SEED_VENUE_SPECS.find(v => {
    const vName = v.venue_name.replace(/\s/g, '').toLowerCase()
    const aliasMatch = v.aliases.some(a => a.replace(/\s/g, '').toLowerCase().includes(q) || q.includes(a.replace(/\s/g, '').toLowerCase()))
    return q.includes(v.venue_key.replace(/_/g, '')) || vName.includes(q) || q.includes(vName) || aliasMatch
  }) ?? null
}

/** 행사장 스펙을 Gemini 프롬프트 블록으로 변환 */
export function formatVenueSpecsContext(spec: VenueSpecSeed): string {
  const lines: string[] = [
    `[행사장 스펙: ${spec.venue_name}]`,
    spec.floor_area_m2 ? `- 전시 가용 면적: 약 ${spec.floor_area_m2.toLocaleString()}m²` : '',
    spec.ceiling_height_m ? `- 천장 높이: 약 ${spec.ceiling_height_m}m` : '',
    spec.max_booths_standard ? `- 표준 부스(3×3m) 최대: 약 ${spec.max_booths_standard}개` : '',
    `- 대형 행사 기준 참가자: ${spec.typical_attendees.large.toLocaleString()}명 / 초대형: ${spec.typical_attendees.mega.toLocaleString()}명`,
    spec.entrance_count ? `- 주요 출입구 수: ${spec.entrance_count}개 (가로등배너 수량 기준)` : '',
    `- 천정배너 리깅: ${spec.has_ceiling_rigging ? '가능' : '불가 — 바닥 스탠드로 대체'}`,
    spec.ceiling_banner_typical
      ? `- 천정배너 전형 수량: 메인 ${spec.ceiling_banner_typical.main_count}개${spec.ceiling_banner_typical.sub_count ? ` + 부속 ${spec.ceiling_banner_typical.sub_count}개` : ''}${spec.ceiling_banner_typical.note ? ` (${spec.ceiling_banner_typical.note})` : ''}`
      : '',
    spec.note ? `- 주의: ${spec.note}` : '',
  ]
  return lines.filter(Boolean).join('\n')
}

// ── 헬퍼: 행사 폴더 통계 ─────────────────────────────────────
export function computeEventStats() {
  const total = SEED_EVENT_HISTORY.length
  const byYear: Record<number, number> = {}
  const byVenue: Record<string, number> = {}
  const byTag: Record<string, number> = {}
  for (const e of SEED_EVENT_HISTORY) {
    if (e.year) byYear[e.year] = (byYear[e.year] || 0) + 1
    byVenue[e.venue] = (byVenue[e.venue] || 0) + 1
    byTag[e.category_tag] = (byTag[e.category_tag] || 0) + 1
  }
  return { total, byYear, byVenue, byTag }
}

// ── 8. 수행실적 매핑 (Ezpmp_수행실적리스트_20260506.xlsx 기반) ──────
// 폴더 코드 ↔ 수행실적 행 17건 매핑 (전체 엑셀 176건 중 폴더와 매칭된 부분)
export interface PerfListEntry {
  code: string
  pm_division: string       // PM 사업부 (컨벤션사업부 / E&E 사업부 / 스마트플랫폼사업본부)
  pm_team: string           // PM 부서명 (컨벤션 1팀, 전시 2팀 등)
  pm_name: string           // PM 성명
  project_name: string
  year: number
  start_date: string
  end_date: string
  region: string
  venue: string
  client: string            // 발주처
  event_category: string    // 행사분류 (콤마 구분 다중)
  industry: string          // 산업분류
  event_format: string      // 오프라인 / 하이브리드 / 온라인
  organizer: string
  host: string
}

export const SEED_PERFLIST: PerfListEntry[] = [
  { code: '251004', pm_division: '컨벤션 사업부', pm_team: '컨벤션 2팀', pm_name: '손지희', project_name: 'APEC 중소기업 장관회의', year: 2025, start_date: '2025-09-01', end_date: '2025-09-05', region: '제주', venue: 'ICC JEJU 및 인근호텔', client: '중소벤처기업부(MSS)', event_category: '국제회의, 기타', industry: '정책/행정/국방/소방/안전', event_format: '오프라인', organizer: '중소벤처기업부(MSS)', host: '중소벤처기업부(MSS)' },
  { code: '251014', pm_division: '컨벤션 사업부', pm_team: '컨벤션 2팀', pm_name: '손지희', project_name: '2025년 APEC 경제행사 대행 용역', year: 2025, start_date: '2025-10-29', end_date: '2025-11-02', region: '경북', venue: '경주', client: '경상북도', event_category: '국제회의, 비즈니스 행사', industry: '기타', event_format: '오프라인', organizer: '경상북도', host: '경상북도' },
  { code: '245006', pm_division: '스마트플랫폼사업본부', pm_team: '프로젝트팀', pm_name: '임종원', project_name: 'SPP 국제콘텐츠마켓 2024', year: 2024, start_date: '2024-10-23', end_date: '2024-10-24', region: '서울', venue: '그랜드하얏트서울', client: '서울경제진흥원', event_category: '비즈니스 행사', industry: '문화/예술/디자인/콘텐츠/영상/광고', event_format: '하이브리드', organizer: '서울경제진흥원', host: '서울경제진흥원' },
  { code: '242008', pm_division: 'E&E 사업부', pm_team: '전시 2팀', pm_name: '손혜리', project_name: '2024 국제농업협력 정책 홍보 및 행사', year: 2024, start_date: '2024-06-05', end_date: '2024-06-05', region: '서울', venue: '더플라자 호텔 서울 그랜드볼룸', client: '한국농어촌공사(KRC)', event_category: '기타', industry: '농수축산/식음료', event_format: '오프라인', organizer: '농림축산식품부(MAFRA), 농촌진흥청(RDA)', host: '한국농어촌공사(KRC), 한국농촌경제연구원(KREI)' },
  { code: '241014', pm_division: '컨벤션 사업부', pm_team: '컨벤션 2팀', pm_name: '유정윤', project_name: '제17차 한-중앙아 협력 포럼', year: 2024, start_date: '2024-11-04', end_date: '2024-11-04', region: '서울', venue: '롯데호텔 서울', client: '외교부(MOFA)', event_category: '국제회의', industry: '정책/행정/국방/소방/안전', event_format: '하이브리드', organizer: '외교부(MOFA)', host: '외교부(MOFA)' },
  { code: '252016', pm_division: 'E&E 사업부', pm_team: '이벤트&엑스포 1팀', pm_name: '조아라', project_name: '환경 협력 네트워크 구축을 위한 주한공관장 초청 간담회', year: 2025, start_date: '2025-04-28', end_date: '2025-04-28', region: '서울', venue: '롯데호텔 서울', client: '환경부(ME)', event_category: '기타회의', industry: '에너지/환경', event_format: '오프라인', organizer: '유엔환경계획(UNEP), 환경부(ME)', host: '유엔환경계획(UNEP), 환경부(ME)' },
  { code: '252026', pm_division: 'E&E 사업부', pm_team: '전시 1팀', pm_name: '안은정', project_name: 'UNFCCC COP30 한국홍보관', year: 2025, start_date: '2025-11-10', end_date: '2025-11-21', region: '해외', venue: '브라질 벨렘', client: '한국환경산업기술원(KEITI)', event_category: '전시, 전시홍보관', industry: '에너지/환경', event_format: '오프라인', organizer: '환경부(ME)', host: '한국환경산업기술원(KEITI)' },
  { code: '252006', pm_division: 'E&E 사업부', pm_team: '전시 2팀', pm_name: '김세주', project_name: '2025 대한민국 정부 박람회', year: 2025, start_date: '2025-12-03', end_date: '2025-12-05', region: '충북', venue: '오스코(OSCO)', client: '행정안전부(MOIS)', event_category: '기타회의, 전시, 전시홍보관, 이벤트', industry: '정책/행정/국방/소방/안전', event_format: '오프라인', organizer: '행정안전부(MOIS)', host: '행정안전부(MOIS)' },
  { code: '241011', pm_division: '컨벤션 사업부', pm_team: '컨벤션 1팀', pm_name: '유정숙', project_name: '제16차 한·베트남 환경장관회의', year: 2024, start_date: '2024-07-01', end_date: '2024-07-01', region: '서울', venue: '웨스틴 조선 서울', client: '환경부(ME)', event_category: '기타', industry: '에너지/환경', event_format: '오프라인', organizer: '환경부(ME)', host: '환경부(ME)' },
  { code: '223060', pm_division: '컨벤션 사업부', pm_team: '컨벤션 1팀', pm_name: '황유경', project_name: '2022 제주 IUCN리더스포럼', year: 2022, start_date: '2022-10-13', end_date: '2022-10-15', region: '제주, 온라인', venue: '제주국제컨벤션센터(ICC JEJU)', client: '제주특별자치도', event_category: '국제회의', industry: '에너지/환경', event_format: '하이브리드', organizer: '제주특별자치도, 환경부(ME), 세계자연보전연맹(IUCN)', host: '제주특별자치도, 환경부(ME), 세계자연보전연맹(IUCN)' },
  { code: '221030', pm_division: 'E&E 사업부', pm_team: '전시 1팀', pm_name: '안은정', project_name: 'NextRise 2022, Seoul', year: 2022, start_date: '2022-06-16', end_date: '2022-06-17', region: '서울', venue: '코엑스', client: '한국산업은행(KDB)', event_category: '기타회의, 전시', industry: '창업/취업/스타트업/비즈니스', event_format: '오프라인', organizer: '한국무역협회(KITA), 한국산업은행(KDB) 외', host: '한국무역협회(KITA), 한국산업은행(KDB) 외' },
  { code: '231009', pm_division: '컨벤션 사업부', pm_team: '컨벤션 1팀', pm_name: '김영경', project_name: '콘텐츠 IP 마켓 2023', year: 2023, start_date: '2023-11-28', end_date: '2023-11-30', region: '서울', venue: '코엑스 그랜드볼룸 외', client: '한국콘텐츠진흥원(KOCCA)', event_category: '비즈니스 행사, 전시', industry: '문화/예술/디자인/콘텐츠/영상/광고', event_format: '오프라인', organizer: '문화체육관광부(MCST)', host: '한국콘텐츠진흥원(KOCCA)' },
  { code: '231004', pm_division: '컨벤션 사업부', pm_team: '컨벤션 2팀', pm_name: '유정윤', project_name: '제33차 아시아광고대회 (AdAsia 2023 Seoul)', year: 2023, start_date: '2023-10-24', end_date: '2023-10-27', region: '서울', venue: '코엑스 그랜드볼룸·아셈볼룸·오디토리움', client: '한국광고총연합회(KFAA)', event_category: '국제회의, 비즈니스 행사, 전시', industry: '문화/예술/디자인/콘텐츠/영상/광고', event_format: '오프라인', organizer: '아시아광고연맹(AFAA), 애드아시아 2023 서울 조직위원회', host: '한국광고총연합회(KFAA)' },
  { code: '232030', pm_division: 'E&E 사업부', pm_team: '전시 1팀', pm_name: '안은정', project_name: '2023 웹툰 잡 페스타', year: 2023, start_date: '2023-11-28', end_date: '2023-11-30', region: '서울', venue: '코엑스 컨퍼런스룸(북)·아셈볼룸', client: '한국콘텐츠진흥원(KOCCA)', event_category: '비즈니스 행사, 전시, 이벤트', industry: '문화/예술/디자인/콘텐츠/영상/광고', event_format: '오프라인', organizer: '문화체육관광부(MCST)', host: '한국콘텐츠진흥원(KOCCA)' },
  { code: '222020', pm_division: 'E&E 사업부', pm_team: '이벤트&엑스포 1팀', pm_name: '조민경', project_name: '제6회 월드 스마트시티 엑스포 (WSCE 2022)', year: 2022, start_date: '2022-08-31', end_date: '2022-09-02', region: '고양', venue: '킨텍스 제1전시장 3·4·5홀', client: '한국토지주택공사(LH)', event_category: '국제회의, 전시', industry: '전자/정보통신/방송장비/스마트', event_format: '오프라인', organizer: '과학기술정보통신부(MSIT), 국토교통부(MOLIT)', host: '킨텍스(KINTEX), 한국수자원공사(K-water), 한국토지주택공사(LH)' },
  { code: '232033', pm_division: 'E&E 사업부', pm_team: '전시 2팀', pm_name: '이진한', project_name: '2023 대한민국 순환경제 페스티벌', year: 2023, start_date: '2023-11-29', end_date: '2023-11-30', region: '고양', venue: '킨텍스 제2전시장 9B홀', client: '한국산업연합포럼(KIAF)', event_category: '비즈니스 행사, 전시', industry: '금속/기계/소재/장비/비금속', event_format: '오프라인', organizer: '산업통상자원부(MOTIE)', host: '한국산업연합포럼(KIAF), 한국생산기술연구원(KITECH)' },
  { code: '201100', pm_division: 'E&E 사업부', pm_team: '전시 2팀', pm_name: '김재규', project_name: '제13회 광주비엔날레', year: 2021, start_date: '2021-04-01', end_date: '2021-05-09', region: '광주', venue: '광주비엔날레전시관', client: '광주비엔날레', event_category: '국제이벤트', industry: '문화/예술/디자인/콘텐츠/영상/광고', event_format: '오프라인', organizer: '광주비엔날레', host: '광주비엔날레' },
]

export interface PmGrouping {
  division: string
  teams: { name: string; pm_count: number; project_count: number; pm_names: string[] }[]
  project_count: number
}

export function computePmGrouping(): PmGrouping[] {
  const map = new Map<string, Map<string, Set<string>>>()  // division → team → pm names
  const teamProjects = new Map<string, number>()           // team → project count
  for (const p of SEED_PERFLIST) {
    if (!map.has(p.pm_division)) map.set(p.pm_division, new Map())
    const teamMap = map.get(p.pm_division)!
    if (!teamMap.has(p.pm_team)) teamMap.set(p.pm_team, new Set())
    teamMap.get(p.pm_team)!.add(p.pm_name)
    teamProjects.set(p.pm_team, (teamProjects.get(p.pm_team) || 0) + 1)
  }
  const result: PmGrouping[] = []
  for (const [division, teamMap] of Array.from(map.entries())) {
    const teams = Array.from(teamMap.entries()).map(([name, pmSet]) => ({
      name,
      pm_count: pmSet.size,
      project_count: teamProjects.get(name) || 0,
      pm_names: Array.from(pmSet),
    }))
    result.push({
      division,
      teams,
      project_count: teams.reduce((s, t) => s + t.project_count, 0),
    })
  }
  return result.sort((a, b) => b.project_count - a.project_count)
}

export interface ClientStat {
  client: string
  project_count: number
  recent_year: number
  event_categories: string[]
  projects: string[]
}

export function computeClientStats(): ClientStat[] {
  const map = new Map<string, ClientStat>()
  for (const p of SEED_PERFLIST) {
    if (!map.has(p.client)) {
      map.set(p.client, { client: p.client, project_count: 0, recent_year: 0, event_categories: [], projects: [] })
    }
    const c = map.get(p.client)!
    c.project_count += 1
    if (p.year > c.recent_year) c.recent_year = p.year
    for (const cat of p.event_category.split(',').map(s => s.trim())) {
      if (cat && !c.event_categories.includes(cat)) c.event_categories.push(cat)
    }
    c.projects.push(p.project_name)
  }
  return Array.from(map.values()).sort((a, b) => b.project_count - a.project_count || b.recent_year - a.recent_year)
}

/** 새 행사와 유사한 과거 행사 5건 추천 (AI 추천 컨텍스트 주입용) */
export function findSimilarPastEvents(args: {
  venue?: string | null
  client?: string | null
  category?: string | null
  pmTeam?: string | null
  limit?: number
}): PerfListEntry[] {
  const limit = args.limit ?? 5
  const scored: { entry: PerfListEntry; score: number }[] = []
  for (const p of SEED_PERFLIST) {
    let score = 0
    if (args.venue && p.venue.includes(args.venue)) score += 4
    if (args.venue && args.venue.includes(p.venue.split(' ')[0])) score += 2
    if (args.client && p.client === args.client) score += 5
    if (args.category && p.event_category.includes(args.category)) score += 3
    if (args.pmTeam && p.pm_team === args.pmTeam) score += 2
    if (score > 0) scored.push({ entry: p, score })
  }
  return scored.sort((a, b) => b.score - a.score).slice(0, limit).map(s => s.entry)
}

// ── 환경장식물별 선택률 (명세 7P 2번) ─────────────────────────
// "국제회의 테이블카드 선택률 87%" 같은 표시.
// 30~100건 단계에서 의미 가짐 (현재 17건은 부분 의미).
// 팀 단위 필터는 빠지고 venue+category 기준만 사용.

export interface SelectionRate {
  category: string             // 환경장식물 종류 (X-배너 등)
  selectedCount: number        // 매칭 행사 중 이 종류 사용한 수
  totalEvents: number          // 매칭된 전체 행사 수
  rate: number                 // 0~1 선택률
  ratePercent: number          // 0~100 정수
  confidence: 'high' | 'medium' | 'low' | 'none'
}

/**
 * 매칭된 과거 행사들 중 각 환경장식물 종류가 얼마나 자주 선택됐는지.
 *
 * 사용:
 *   const rates = getSelectionRates({ venue: '코엑스', eventCategory: '국제회의' })
 *   → [{ category: 'X-배너', rate: 0.87, ratePercent: 87, ... }, ...]
 *
 * 신뢰도:
 * - 30+ 매칭: high
 * - 10-29 매칭: medium
 * - 3-9 매칭: low
 * - 0-2 매칭: none (통계 무의미)
 */
export function getSelectionRates(args: {
  venue?: string | null
  client?: string | null
  eventCategory?: string | null
  liveProjects?: { venue: string; client: string; categories: string[] }[]
}): SelectionRate[] {
  // 1) 매칭된 과거 행사 (시드 + 라이브)
  const matchedSeed = SEED_PERFLIST.filter(p => {
    if (args.venue && !p.venue.includes(args.venue) && !args.venue.includes(p.venue.split(' ')[0])) return false
    if (args.client && p.client !== args.client) return false
    if (args.eventCategory && !p.event_category.includes(args.eventCategory)) return false
    return true
  })
  const matchedLive = (args.liveProjects ?? []).filter(p => {
    if (args.venue && !p.venue.includes(args.venue)) return false
    if (args.client && p.client !== args.client) return false
    return true
  })
  const totalEvents = matchedSeed.length + matchedLive.length

  // 2) 신뢰도 결정
  let confidence: 'high' | 'medium' | 'low' | 'none'
  if (totalEvents >= 30) confidence = 'high'
  else if (totalEvents >= 10) confidence = 'medium'
  else if (totalEvents >= 3) confidence = 'low'
  else confidence = 'none'

  // 3) 환경장식물 종류별 사용 빈도 카운트
  // 시드 행사는 SEED_EVENT_HISTORY에 analyzed_item_count 있으면 categoryFrequency로 매핑
  // 라이브는 categories 직접
  const counts: Record<string, number> = {}
  // 라이브: 명확히 카테고리별 사용 여부 알 수 있음
  for (const p of matchedLive) {
    const seen = Array.from(new Set(p.categories))
    for (const c of seen) {
      counts[c] = (counts[c] ?? 0) + 1
    }
  }
  // 시드: 분석된 행사들 중 categoryFrequency가 있으면 그 항목별로 +1
  // (실제로는 SEED_PERFLIST에 분석된 카테고리 데이터가 없어서 폴백 추정)
  // 향후 분석된 시드 행사가 늘면 정확도 향상

  // 4) SignageType 마스터 기준으로 결과 생성
  const result: SelectionRate[] = SEED_SIGNAGE_TYPES.map(t => {
    const selectedCount = counts[t.name] ?? 0
    const rate = totalEvents > 0 ? selectedCount / totalEvents : 0
    return {
      category: t.name,
      selectedCount,
      totalEvents,
      rate,
      ratePercent: Math.round(rate * 100),
      confidence,
    }
  })

  return result.sort((a, b) => b.rate - a.rate)
}

export interface SignageRecommendation {
  category: string                  // 환경장식물 종류
  count: number                     // 평균 사용 개수 (반올림)
  matchedEvents: number             // 매칭된 과거 행사 수
  confidence: 'high' | 'medium' | 'low' | 'none'  // 신뢰도
  rationale: string                 // 사람이 읽을 근거
}

export interface ProbabilityBasedResult {
  matchedPastEvents: { name: string; venue: string; itemCount: number; year: number; isLive?: boolean }[]
  recommendations: SignageRecommendation[]
  confidenceLevel: 'high' | 'medium' | 'low' | 'none'
  message: string                   // 사용자 안내 메시지
}

/**
 * 확률 기반 환경장식물 추천.
 * SEED_PERFLIST(정적 17건) + SEED_EVENT_HISTORY + 라이브 사용자 프로젝트 데이터 결합.
 *
 * liveData 인자가 있으면 라이브 데이터도 함께 매칭에 사용 (자동 진화).
 * 사용자가 만든 프로젝트가 누적될수록 신뢰도 자동 상승.
 *
 * 반환 신뢰도 기준:
 * - high: 매칭 5건 이상
 * - medium: 매칭 2~4건
 * - low: 매칭 1건
 * - none: 매칭 0건 (폴백 권장)
 */
export function recommendByProbability(args: {
  venue?: string | null
  client?: string | null
  eventCategory?: string | null
  liveData?: {
    liveAsPerfList: PerfListEntry[]
    itemCountByProject: Record<string, number>
    avgItemCountByVenue: Record<string, number>
  } | null
}): ProbabilityBasedResult {
  // 1) SEED + 라이브 합쳐 검색 풀 구성
  const seedPool = SEED_PERFLIST
  const livePool = args.liveData?.liveAsPerfList ?? []
  const allEvents = [...seedPool, ...livePool]

  // 2) 가중치 점수로 유사 행사 찾기 (findSimilarPastEvents 로직 재사용 + 라이브)
  const scored: { entry: PerfListEntry; score: number; isLive: boolean }[] = []
  for (const p of allEvents) {
    let score = 0
    if (args.venue && p.venue.includes(args.venue)) score += 4
    if (args.venue && args.venue && p.venue && args.venue.includes(p.venue.split(' ')[0] || '__none__')) score += 2
    if (args.client && p.client === args.client) score += 5
    if (args.eventCategory && p.event_category.includes(args.eventCategory)) score += 3
    if (score > 0) {
      const isLive = p.code.startsWith('live_')
      scored.push({ entry: p, score, isLive })
    }
  }
  const similar = scored.sort((a, b) => b.score - a.score).slice(0, 10)

  // 3) 매칭 행사 + item_count 결합 (시드는 SEED_EVENT_HISTORY, 라이브는 itemCountByProject)
  const liveItemCounts = args.liveData?.itemCountByProject ?? {}
  const matchedPastEvents = similar
    .map(({ entry: p, isLive }) => {
      let itemCount = 0
      if (isLive) {
        // live_{id_first_8} → 실제 id 매칭
        const liveProjectId = Object.keys(liveItemCounts).find(id => id.startsWith(p.code.replace('live_', '')))
        if (liveProjectId) itemCount = liveItemCounts[liveProjectId] || 0
      } else {
        const hist = SEED_EVENT_HISTORY.find(h => h.project_code === p.code)
        itemCount = hist?.analyzed_item_count ?? 0
      }
      return {
        name: p.project_name,
        venue: p.venue,
        itemCount,
        year: p.year,
        isLive,
      }
    })
    .filter(e => e.itemCount > 0 || similar.length <= 5)

  // 3) 신뢰도 결정
  const matchedCount = matchedPastEvents.length
  let confidenceLevel: 'high' | 'medium' | 'low' | 'none'
  let message: string
  if (matchedCount >= 5) {
    confidenceLevel = 'high'
    message = `과거 유사 행사 ${matchedCount}건 분석 — 통계적 의미 있음`
  } else if (matchedCount >= 2) {
    confidenceLevel = 'medium'
    message = `과거 유사 행사 ${matchedCount}건 — 트렌드 참고 가능 (데이터 누적 시 정확도 ↑)`
  } else if (matchedCount === 1) {
    confidenceLevel = 'low'
    message = `유사 행사 1건만 매칭됨 — 단일 사례라 일반화 제한`
  } else {
    confidenceLevel = 'none'
    message = `매칭되는 과거 행사 없음 — 행사 유형 기반 일반 권장 사용`
  }

  // 4) 환경장식물 종류별 평균 개수 (시드에 실측이 부족하므로 휴리스틱)
  // 실측 데이터(analyzed_item_count)가 있는 행사 평균 = 36건/행사
  // → 표준 11종 비례 분배 (실측 카테고리 빈도 기반)
  const avgItemCount = matchedPastEvents.reduce((s, e) => s + e.itemCount, 0) / Math.max(matchedPastEvents.length, 1)
  const baseCount = avgItemCount > 0 ? avgItemCount : 36   // 분석된 평균값
  // 카테고리별 비례 (실측 분석 결과 기반: X-배너 35%, 포디움 16%, 가로/세로 현수막 8%, 폼보드 14% ...)
  const distribution: { id: string; ratio: number; pct: number }[] = [
    { id: 'X-배너',          ratio: 0.35, pct: 35 },
    { id: '포디움 타이틀',     ratio: 0.16, pct: 16 },
    { id: '폼보드',           ratio: 0.14, pct: 14 },
    { id: '가로 현수막',       ratio: 0.08, pct: 8 },
    { id: '세로 현수막',       ratio: 0.06, pct: 6 },
    { id: '가로등 배너',       ratio: 0.05, pct: 5 },
    { id: '통천',             ratio: 0.04, pct: 4 },
    { id: 'A4',              ratio: 0.06, pct: 6 },
    { id: 'A3',              ratio: 0.04, pct: 4 },
    { id: '백월',             ratio: 0.02, pct: 2 },
  ]

  const recommendations: SignageRecommendation[] = distribution.map(d => ({
    category: d.id,
    count: Math.max(1, Math.round(baseCount * d.ratio)),
    matchedEvents: matchedCount,
    confidence: confidenceLevel,
    rationale: matchedCount > 0
      ? `과거 ${matchedCount}건 평균 (실측 ${avgItemCount.toFixed(1)}건/행사 × ${d.pct}%)`
      : `일반 분석 평균 (36건/행사 × ${d.pct}%)`,
  }))

  return {
    matchedPastEvents,
    recommendations,
    confidenceLevel,
    message,
  }
}

// ── 천정배너 설치 패턴 (행사장별 실측 데이터) ─────────────────────────
// 출처: docs/VENUE_LEARNING_INSIGHTS_260511.md §4 (2022 스마트국토엑스포 발주엑셀 분석)
// AI 추천 프롬프트에 "[천정배너 설치 패턴]" 블록으로 자동 주입됨.

export interface CeilingBannerItem {
  location: string        // 설치 위치 (전시장 메인, 라운지, 컨퍼런스장 등)
  quantity: number
  width_mm: number
  height_mm: number
  note?: string
}

export interface CeilingBannerPattern {
  venue: string           // 행사장 대표명 (검색 키)
  venue_hall?: string     // 세부 홀명
  event_name: string
  event_year: number
  event_type?: string     // 행사 유형 참고
  attendees_approx?: number
  items: CeilingBannerItem[]
  no_data?: boolean       // true = 행사장은 알려져 있으나 실측 데이터 미확보
  no_data_reason?: string // 데이터 없는 사유
}

export const SEED_CEILING_BANNER_PATTERNS: CeilingBannerPattern[] = [
  {
    venue: '킨텍스',
    venue_hall: '킨텍스 제1전시장 5홀',
    event_name: '2022 스마트국토엑스포',
    event_year: 2022,
    event_type: '전시회',
    attendees_approx: 3000,
    items: [
      {
        location: '전시장 메인 천장 (5홀 내부)',
        quantity: 7,
        width_mm: 5500,
        height_mm: 4000,
        note: '5홀 전시장 메인 천장 전면 배치. 행사명·주최 기관 표기. 리깅 포인트 활용.',
      },
      {
        location: '비즈니스 라운지 천장',
        quantity: 1,
        width_mm: 3500,
        height_mm: 3000,
        note: '5홀 부속 비즈니스 라운지 천장.',
      },
      {
        location: '컨퍼런스장 천장',
        quantity: 2,
        width_mm: 3500,
        height_mm: 3000,
        note: '5홀 부속 컨퍼런스장 (2곳). 세션명 또는 행사명 표기.',
      },
    ],
  },
  // ── 코엑스 — 실측 데이터 미확보 (2차 AI 시험 예정)
  {
    venue: '코엑스',
    venue_hall: '코엑스 전시홀',
    event_name: '(데이터 미확보)',
    event_year: 0,
    event_type: '전시회',
    items: [],
    no_data: true,
    no_data_reason: '코엑스 발주엑셀 분석 전. 정답지 노출 편향 검증 후 추가 예정 (2차 AI 시험).',
  },
  // ── 송도컨벤시아 — 실측 데이터 미확보
  {
    venue: '송도',
    venue_hall: '송도컨벤시아',
    event_name: '(데이터 미확보)',
    event_year: 0,
    event_type: '컨퍼런스',
    items: [],
    no_data: true,
    no_data_reason: '송도컨벤시아 발주엑셀 분석 전. 코엑스 시험 완료 후 순차 진행.',
  },
  // ── ICC 제주 — 실측 데이터 미확보
  {
    venue: 'ICC',
    venue_hall: 'ICC 제주',
    event_name: '(데이터 미확보)',
    event_year: 0,
    event_type: '국제회의',
    items: [],
    no_data: true,
    no_data_reason: 'ICC 제주 발주엑셀 분석 전. 섬 지역 특성상 반입 규정 별도 확인 필요.',
  },
]

/**
 * 같은 행사장의 천정배너 실측 패턴을 찾아 Gemini 프롬프트 블록으로 반환.
 * 매칭 없으면 빈 문자열 반환 → 프롬프트 주입 skip.
 */
export function findCeilingBannerContext(venue: string): string {
  if (!venue) return ''

  const venueNorm = venue.replace(/\s/g, '').toLowerCase()
  const matches = SEED_CEILING_BANNER_PATTERNS.filter(p => {
    const pVenue = (p.venue_hall ?? p.venue).replace(/\s/g, '').toLowerCase()
    return venueNorm.includes(p.venue.replace(/\s/g, '').toLowerCase())
      || pVenue.includes(venueNorm)
      || venueNorm.includes(pVenue)
  })

  if (matches.length === 0) return ''

  const lines = matches.map(p => {
    const hall = p.venue_hall ? `${p.venue_hall}` : p.venue
    const itemLines = p.items.map(i =>
      `  - ${i.location}: ${i.quantity}개 × ${i.width_mm}×${i.height_mm}mm${i.note ? ` (${i.note})` : ''}`
    ).join('\n')
    return `${p.event_name} (${p.event_year}) — ${hall}\n${itemLines}`
  })

  return (
    '\n\n[천정배너 설치 패턴 — 같은 행사장 실측 데이터]\n' +
    lines.join('\n\n') +
    '\n→ 위 데이터는 같은 행사장 실제 발주 기록입니다. ' +
    '천정배너(통천 배너) 수량·규격 추천 시 반드시 이 패턴을 우선 참고하세요. ' +
    '학습 데이터 없는 공간(라운지·별관 등)은 가장 가까운 유사 공간 규격을 준용하세요.'
  )
}
