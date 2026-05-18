// ─── MICE 표준 제작물 규격 라이브러리 ─────────────────────────
// 이 수치는 pptxgenjs 슬라이드 크기와 Fabric.js 캔버스 비율의 기준값입니다.

export interface ProductionFormat {
  id: string
  label: string
  category: string
  width_mm: number
  height_mm: number
  orientation: 'portrait' | 'landscape'
  description: string
  /**
   * 노션 컴펌 본 §6-2 외 영역 마킹 (5/18).
   * true = 노션 12 카테고리 외 (l_board·foamboard·hardpaper·coated_paper·pop_guide·backwall·sheet).
   * UI 동작은 보존 (DB 운영 데이터 호환). 점진 제거 후보.
   */
  deprecated?: boolean
  /** deprecated 시 추천 매핑 카테고리 (§8-1 동의어 정합) */
  replaces_with?: string
}

// ─── 실제 샘플 기반 템플릿 라이브러리 ────────────────────────
// 사용자가 참고한 실제 환경장식물 샘플 분석(14장+) → 카테고리×용도×variant별 슬롯 배치
// 신규 제작물 생성 시 "기본 안"으로 제공

import type { ContentsMap } from './types'

export interface TemplateMeta {
  id: string
  name: string
  categoryIds: string[]   // 적용 가능한 ProductionFormat.id
  purposeId: string       // PURPOSE_PRESETS.id
  variantId?: string
  description: string
  slots: ContentsMap      // 이 템플릿이 제공하는 슬롯 초기값 (위치·크기·placeholder)
}

export const TEMPLATE_PRESETS: TemplateMeta[] = [
  // ── 메인 홍보 — X배너/가로등 세로 ─────────────────────
  {
    id: 'x_main_centered',
    name: 'X배너 · 중앙 타이틀',
    categoryIds: ['x_banner', 'i_banner', 'streetlight_banner'],
    purposeId: 'main_promo',
    variantId: 'hero_title',
    description: '상단 로고 + 중앙 대형 행사명 + 하단 일시·장소',
    slots: {
      header_brand:    { label: '주최 로고',   ko: '', en: '', x: 50, y:  8, fontSize: 14, w: 60, placeholder: '주최기관 로고' },
      hero_title:      { label: '행사명',       ko: '', en: '', x: 50, y: 35, fontSize: 52, w: 85, placeholder: '행사명 입력' },
      sub_title:       { label: '부제',         ko: '', en: '', x: 50, y: 55, fontSize: 22, w: 80, placeholder: '부제·슬로건' },
      body:            { label: '일시·장소',    ko: '', en: '', x: 50, y: 78, fontSize: 18, w: 75, placeholder: '2026년 0월 0일 / 장소' },
      footer_credits:  { label: '후원사',       ko: '', en: '', x: 50, y: 93, fontSize: 12, w: 90, placeholder: '주최·주관·후원 로고' },
    },
  },
  // ── 등록 안내 — X배너/L보드 ────────────────────────
  {
    id: 'x_registration_qr',
    name: 'X배너 · 등록 + QR',
    categoryIds: ['x_banner', 'l_board', 'foamboard'],
    purposeId: 'registration',
    variantId: 'qr_simple',
    description: '상단 Registration 영문 + 중앙 행사명 + 하단 QR + 안내',
    slots: {
      header_brand:    { label: '라벨',         ko: '', en: '', x: 50, y:  8, fontSize: 14, w: 60, placeholder: 'Registration Desk' },
      hero_title:      { label: '등록 안내',    ko: '', en: '', x: 50, y: 22, fontSize: 40, w: 85, placeholder: '등록데스크' },
      sub_title:       { label: '행사명',       ko: '', en: '', x: 50, y: 42, fontSize: 20, w: 80, placeholder: '행사명 · 영문' },
      body:            { label: '안내 문구',    ko: '', en: '', x: 50, y: 60, fontSize: 16, w: 75, placeholder: 'QR 스캔 → 등록 완료' },
      qr_code:         { label: 'QR 코드',     ko: '', en: '', x: 50, y: 78, fontSize: 14, w: 35, placeholder: 'QR 이미지 업로드' },
      footer_credits:  { label: '로고',         ko: '', en: '', x: 50, y: 93, fontSize: 11, w: 80, placeholder: '주최 로고' },
    },
  },
  // ── 웨이파인딩 — L보드 단방향 ───────────────────────
  {
    id: 'l_wayfinding_single',
    name: 'L보드 · 단방향 화살표',
    categoryIds: ['l_board', 'foamboard', 'a3_portrait', 'hardpaper'],
    purposeId: 'wayfinding',
    variantId: 'single_dir',
    description: '상단 화살표 아이콘 → 중앙 목적지 → 하단 행사명',
    slots: {
      arrow:           { label: '방향',         ko: '→', en: '→', x: 50, y: 15, fontSize: 90, w: 35, placeholder: '← → ↑ ↓' },
      hero_title:      { label: '목적지',       ko: '', en: '', x: 50, y: 42, fontSize: 44, w: 85, placeholder: '회의실명 / 층' },
      sub_title:       { label: '세부 정보',    ko: '', en: '', x: 50, y: 62, fontSize: 18, w: 75, placeholder: '예: 3층 그랜드볼룸' },
      body:            { label: '행사명',       ko: '', en: '', x: 50, y: 78, fontSize: 16, w: 70, placeholder: '행사명' },
      footer_credits:  { label: '로고',         ko: '', en: '', x: 50, y: 93, fontSize: 11, w: 80, placeholder: '주최 로고' },
    },
  },
  // ── 웨이파인딩 — 다방향 ──────────────────────────
  {
    id: 'l_wayfinding_multi',
    name: 'L보드 · 다방향 리스트',
    categoryIds: ['l_board', 'foamboard', 'a3_landscape'],
    purposeId: 'wayfinding',
    variantId: 'multi_dir',
    description: '여러 장소를 각 화살표와 함께 리스트',
    slots: {
      header_brand:    { label: '라벨',         ko: '', en: '', x: 50, y:  8, fontSize: 18, w: 60, placeholder: 'Directory' },
      body:            { label: '장소 리스트',  ko: '', en: '', x: 50, y: 50, fontSize: 20, w: 88, placeholder: '← 회의실 A\n→ 회의실 B\n↑ 3층 로비' },
      footer_credits:  { label: '행사명·로고',  ko: '', en: '', x: 50, y: 92, fontSize: 13, w: 85, placeholder: '행사명 · 주최 로고' },
    },
  },
  // ── 프로그램 안내 시간표 ──────────────────────────
  {
    id: 'x_program_timetable',
    name: 'X배너 · 시간표',
    categoryIds: ['x_banner', 'foamboard', 'horizontal_banner'],
    purposeId: 'program_info',
    variantId: 'timetable',
    description: '상단 Day + 행사명 + 중앙 시간표 리스트',
    slots: {
      header_brand:    { label: 'Day',          ko: '', en: '', x: 50, y:  6, fontSize: 16, w: 40, placeholder: 'Day 1 / Day 2' },
      hero_title:      { label: '행사명',       ko: '', en: '', x: 50, y: 16, fontSize: 32, w: 85, placeholder: '행사명' },
      sub_title:       { label: '부제',         ko: '', en: '', x: 50, y: 27, fontSize: 18, w: 80, placeholder: 'Conference Program' },
      body:            { label: '시간표',       ko: '', en: '', x: 50, y: 55, fontSize: 15, w: 88, placeholder: '09:00 개회식\n10:00 키노트\n11:30 세션 1\n13:00 오찬\n...' },
      footer_credits:  { label: '로고',         ko: '', en: '', x: 50, y: 93, fontSize: 11, w: 80, placeholder: '주최·후원 로고' },
    },
  },
  // ── 체험 단계별 ─────────────────────────────────
  {
    id: 'x_experience_steps',
    name: 'X배너 · 단계별 체험',
    categoryIds: ['x_banner', 'foamboard', 'i_banner'],
    purposeId: 'experience',
    variantId: 'steps',
    description: '상단 체험명 + ①~⑤ 단계 리스트',
    slots: {
      header_brand:    { label: '주최',         ko: '', en: '', x: 50, y:  6, fontSize: 13, w: 50, placeholder: '주최기관' },
      hero_title:      { label: '체험존명',     ko: '', en: '', x: 50, y: 18, fontSize: 36, w: 85, placeholder: '체험존 이름' },
      sub_title:       { label: '영문',         ko: '', en: '', x: 50, y: 30, fontSize: 18, w: 80, placeholder: 'Experience Zone' },
      body:            { label: '단계 설명',    ko: '', en: '', x: 50, y: 56, fontSize: 15, w: 85, placeholder: '① 첫 번째 단계\n② 두 번째 단계\n③ 세 번째 단계\n④ 네 번째 단계\n⑤ 다섯 번째 단계' },
      qr_code:         { label: '체험 QR',     ko: '', en: '', x: 50, y: 80, fontSize: 13, w: 30, placeholder: 'QR 이미지' },
      footer_credits:  { label: '로고',         ko: '', en: '', x: 50, y: 93, fontSize: 11, w: 80, placeholder: '후원·협력사' },
    },
  },
  // ── 포디움 가로장형 ────────────────────────────
  {
    id: 'podium_hero',
    name: '포디움 타이틀',
    categoryIds: ['podium'],
    purposeId: 'main_promo',
    description: '가로장형 포디움 스티커 — 중앙 행사명 + 부제',
    slots: {
      hero_title:      { label: '행사명',       ko: '', en: '', x: 50, y: 40, fontSize: 80, w: 90, placeholder: '행사명 (크게)' },
      sub_title:       { label: '부제',         ko: '', en: '', x: 50, y: 70, fontSize: 28, w: 80, placeholder: '부제 (작게)' },
    },
  },
  // ── 가로 현수막 ────────────────────────────────
  {
    id: 'h_banner_hero',
    name: '가로 현수막 · 메인',
    categoryIds: ['horizontal_banner', 'chunchen_banner', 'backwall'],
    purposeId: 'main_promo',
    description: '좌측 로고 / 중앙 초대형 행사명 / 우측 부제·후원',
    slots: {
      header_brand:    { label: '주최',         ko: '', en: '', x:  8, y: 50, fontSize: 24, w: 14, placeholder: '주최 로고' },
      hero_title:      { label: '행사명',       ko: '', en: '', x: 50, y: 40, fontSize: 100, w: 70, placeholder: '행사명' },
      sub_title:       { label: '부제',         ko: '', en: '', x: 50, y: 68, fontSize: 36, w: 60, placeholder: '부제·슬로건' },
      body:            { label: '일시',         ko: '', en: '', x: 50, y: 85, fontSize: 20, w: 40, placeholder: '2026년 0월 0일 / 장소' },
      footer_credits:  { label: '후원',         ko: '', en: '', x: 92, y: 50, fontSize: 18, w: 14, placeholder: '후원사 로고' },
    },
  },
  // ── 백월 (포토월) ──────────────────────────────
  {
    id: 'backwall_hero',
    name: '백월 · 포토월',
    categoryIds: ['backwall'],
    purposeId: 'main_promo',
    description: '전체 배경 + 중앙 행사명 + 반복 로고 패턴',
    slots: {
      hero_title:      { label: '행사명',       ko: '', en: '', x: 50, y: 45, fontSize: 140, w: 70, placeholder: '행사명' },
      sub_title:       { label: '부제',         ko: '', en: '', x: 50, y: 62, fontSize: 48, w: 60, placeholder: '부제' },
      footer_credits:  { label: '로고 밴드',    ko: '', en: '', x: 50, y: 90, fontSize: 22, w: 90, placeholder: '주최·주관·후원 로고 (반복)' },
    },
  },
  // ── 안내 POP ───────────────────────────────────
  {
    id: 'pop_simple_guide',
    name: '안내 POP · 간단 안내',
    categoryIds: ['pop_guide', 'coated_paper', 'hardpaper', 'a4_portrait', 'a4_landscape'],
    purposeId: 'wayfinding',
    variantId: 'entrance',
    description: '작은 크기 즉석 안내판',
    slots: {
      header_brand:    { label: '라벨',         ko: '', en: '', x: 50, y: 12, fontSize: 14, w: 60, placeholder: 'NOTICE / 안내' },
      hero_title:      { label: '핵심 메시지',  ko: '', en: '', x: 50, y: 40, fontSize: 32, w: 90, placeholder: '여기에 핵심 안내' },
      body:            { label: '세부 안내',    ko: '', en: '', x: 50, y: 70, fontSize: 14, w: 85, placeholder: '세부 설명' },
    },
  },
  // ── QR 단순 스캔 ───────────────────────────────
  {
    id: 'qr_only_simple',
    name: 'QR 단순 스캔',
    categoryIds: ['x_banner', 'foamboard', 'hardpaper', 'pop_guide'],
    purposeId: 'experience',
    variantId: 'survey',
    description: 'QR 중심 — 스캔만으로 기능 수행',
    slots: {
      hero_title:      { label: '액션 문구',    ko: '', en: '', x: 50, y: 18, fontSize: 36, w: 85, placeholder: '설문 참여 / 등록하기' },
      qr_code:         { label: 'QR',           ko: '', en: '', x: 50, y: 50, fontSize: 14, w: 55, placeholder: 'QR 이미지' },
      body:            { label: '안내',         ko: '', en: '', x: 50, y: 82, fontSize: 14, w: 80, placeholder: '카메라로 스캔하세요' },
    },
  },
]

/** category + purpose로 적합한 템플릿들 찾기 */
export function findTemplates(categoryId: string | null, purposeId?: string | null): TemplateMeta[] {
  if (!categoryId) return TEMPLATE_PRESETS
  return TEMPLATE_PRESETS.filter(t => {
    const catMatch = t.categoryIds.includes(categoryId) || t.categoryIds.includes('*')
    const purMatch = !purposeId || t.purposeId === purposeId
    return catMatch && purMatch
  })
}

// ─── 슬롯별 최대 글자 수 가이드 (CLAUDE.md 11항 Overflow 2순위) ──
export const SLOT_MAX_CHARS: Record<string, number> = {
  header_brand: 40,
  hero_title: 60,
  sub_title: 80,
  body: 200,
  arrow: 40,
  qr_code: 30,
  footer_credits: 100,
}

// ─── 스타일 프리셋 6종 (CLAUDE.md 7항) ─────────────────────
// 선택 시 slot_styles에 색상·폰트 일괄 반영
export interface StylePreset {
  id: string
  label: string
  mood: string
  font_face: string
  text_color: string      // hex (no #)
  bg_color: string
  accent: string
}

export const STYLE_PRESETS: StylePreset[] = [
  {
    id: 'tech_dark',
    label: 'Tech Dark / Neon',
    mood: '기술·스타트업',
    font_face: 'Pretendard',
    text_color: 'FFFFFF',
    bg_color: '0B1020',
    accent: '6366F1',
  },
  {
    id: 'bright_solid',
    label: 'Bright Solid',
    mood: '활기·주목',
    font_face: 'Pretendard',
    text_color: '1E293B',
    bg_color: 'FFCE00',
    accent: 'FF3B30',
  },
  {
    id: 'soft_gradient',
    label: 'Soft Gradient',
    mood: '공공·친환경',
    font_face: 'Noto Sans KR',
    text_color: '1E293B',
    bg_color: 'E0F2FE',
    accent: '059669',
  },
  {
    id: 'illustrative_clean',
    label: 'Illustrative Clean',
    mood: '공공 행사·국제회의',
    font_face: 'Noto Sans KR',
    text_color: '1E293B',
    bg_color: 'FFFFFF',
    accent: '2563EB',
  },
  {
    id: 'character_friendly',
    label: 'Character / Friendly',
    mood: '지역·가족·문화',
    font_face: 'Nanum Gothic',
    text_color: '1E293B',
    bg_color: 'FDF6E3',
    accent: 'F59E0B',
  },
  {
    id: 'editorial_dark',
    label: 'Editorial Dark',
    mood: '컨퍼런스·포럼',
    font_face: 'Pretendard',
    text_color: 'FFFFFF',
    bg_color: '111827',
    accent: '8B5CF6',
  },
]

// ─── 사용 목적 5종 + 서브타입 (회의록: "같은 목적·다른 형태") ─
export interface PurposeVariant {
  id: string
  label: string
  hint: string  // 마스터 지정 시 body placeholder로 사용
}

export interface PurposePreset {
  id: string
  label: string
  description: string
  recommendedFormats: string[]
  emoji: string
  variants: PurposeVariant[]  // 같은 목적 내 형태 세분화
}

export const PURPOSE_PRESETS: PurposePreset[] = [
  {
    id: 'main_promo',
    label: '행사 메인 홍보',
    description: '행사 타이틀·테마·일시 고지',
    recommendedFormats: ['x_banner', 'horizontal_banner', 'vertical_banner', 'streetlight_banner'],
    emoji: '🎯',
    variants: [
      { id: 'hero_title',   label: '타이틀 강조형',     hint: '행사명·슬로건만 크게' },
      { id: 'hero_date',    label: '타이틀 + 일시',     hint: '행사명 + 개막일·장소' },
      { id: 'hero_visual',  label: '타이틀 + 키비주얼', hint: '메인 일러스트·사진 중심' },
    ],
  },
  {
    id: 'registration',
    label: '등록 안내',
    description: '현장등록·체크인 유도',
    recommendedFormats: ['x_banner', 'l_board', 'foamboard'],
    emoji: '📝',
    variants: [
      { id: 'qr_simple',   label: 'QR 단순 입력',   hint: '스캔만으로 등록' },
      { id: 'qr_process',  label: 'QR + 단계 설명', hint: '체크인 프로세스 단계별' },
      { id: 'desk_guide',  label: '데스크 안내',    hint: '등록데스크 위치 + 필요 준비물' },
    ],
  },
  {
    id: 'wayfinding',
    label: '웨이파인딩',
    description: '입구·호실·층간 위치 안내',
    recommendedFormats: ['l_board', 'foamboard', 'a3_landscape', 'hardpaper'],
    emoji: '➡️',
    variants: [
      { id: 'single_dir',  label: '단방향 (←/→)',     hint: '화살표 + 목적지 1곳' },
      { id: 'multi_dir',   label: '다방향 (여러 장소)', hint: '장소 여러 곳 + 각 화살표' },
      { id: 'floor_map',   label: '층간 이동',         hint: '↑/↓ 층별 안내' },
      { id: 'entrance',    label: '입구 / 출구',       hint: 'ENTRANCE / EXIT' },
    ],
  },
  {
    id: 'program_info',
    label: '프로그램 안내',
    description: '세부 프로그램·일정·배치도',
    recommendedFormats: ['x_banner', 'foamboard', 'horizontal_banner'],
    emoji: '📅',
    variants: [
      { id: 'timetable',   label: '시간표',            hint: '시간별 프로그램 목록' },
      { id: 'daily',       label: '일자별 (Day 1/2)',  hint: '일자별 세션 분리' },
      { id: 'floor_plan',  label: '배치도 / 좌석표',   hint: '공간 레이아웃 + 세션 위치' },
      { id: 'speaker',     label: '연사 소개',         hint: '발표자 프로필·일정' },
    ],
  },
  {
    id: 'experience',
    label: '체험 안내',
    description: '체험존·부스 참여 방법',
    recommendedFormats: ['x_banner', 'foamboard', 'i_banner'],
    emoji: '✨',
    variants: [
      { id: 'steps',       label: '단계별 (①~⑤)',   hint: '참여 단계 번호순' },
      { id: 'booth_intro', label: '부스·체험존 소개', hint: '체험 내용·주최 소개' },
      { id: 'survey',      label: '설문·피드백',     hint: 'QR → 설문 응답' },
    ],
  },
]

export const PRODUCTION_FORMATS: ProductionFormat[] = [
  // ── 배너류 ────────────────────────────────────────────────
  {
    id: 'x_banner',
    label: 'X배너',
    category: 'X배너',
    width_mm: 600,
    height_mm: 1800,
    orientation: 'portrait',
    description: '입구·등록·룸사인·일반 안내 (자체 스탠드)',
  },
  {
    id: 'i_banner',
    label: 'I배너',
    category: 'I배너',
    width_mm: 600,
    height_mm: 1600,
    orientation: 'portrait',
    description: '실내 인포메이션·셔틀버스·시간표 안내',
  },
  {
    id: 'streetlight_banner',
    label: '가로등 배너',
    category: '가로등배너',
    width_mm: 600,
    height_mm: 1800,
    orientation: 'portrait',
    description: '2매 1조 구성',
  },
  // ── 현수막류 ──────────────────────────────────────────────
  {
    id: 'horizontal_banner',
    label: '가로 현수막',
    category: '현수막',
    width_mm: 5000,
    height_mm: 900,
    orientation: 'landscape',
    description: '외벽 / 무대 표준',
  },
  {
    id: 'vertical_banner',
    label: '세로 현수막',
    category: '현수막',
    width_mm: 900,
    height_mm: 5000,
    orientation: 'portrait',
    description: '로비 보이드 공간용',
  },
  {
    id: 'chunchen_banner',
    label: '통천',
    category: '통천',
    width_mm: 1000,
    height_mm: 5000,
    orientation: 'portrait',
    description: '천장 매다는 대형 (외벽·천장 모두 사용)',
  },
  // ── 실내 동선 (노션 §6-2 12 카테고리 — 5/14 회의 X배너 분리 결정) ──
  {
    id: 'route_banner',
    label: '동선 배너',
    category: '동선 배너',
    width_mm: 600,
    height_mm: 1500,
    orientation: 'portrait',
    description: '실내 동선·유도·화살표 안내 전용',
  },
  // ── 기타 ──────────────────────────────────────────────────
  {
    id: 'podium',
    label: '포디움 타이틀',
    category: '포디움 타이틀',
    width_mm: 600,
    height_mm: 200,
    orientation: 'landscape',
    description: '연단 전면 폼보드 (사회자용·연사용 분리)',
  },
  {
    id: 'a4_portrait',
    label: 'A4 세로',
    category: 'A4',
    width_mm: 210,
    height_mm: 297,
    orientation: 'portrait',
    description: '소형 안내·세로 (보통 폼보드 발주)',
  },
  {
    id: 'a4_landscape',
    label: 'A4 가로',
    category: 'A4',
    width_mm: 297,
    height_mm: 210,
    orientation: 'landscape',
    description: '소형 안내·가로 손피켓 기본 (보통 폼보드 발주)',
  },
  {
    id: 'a3_portrait',
    label: 'A3 세로',
    category: 'A3',
    width_mm: 297,
    height_mm: 420,
    orientation: 'portrait',
    description: '중형 안내·세로 (보통 폼보드 발주)',
  },
  {
    id: 'a3_landscape',
    label: 'A3 가로',
    category: 'A3',
    width_mm: 420,
    height_mm: 297,
    orientation: 'landscape',
    description: '중형 안내·가로 손피켓 기본 (보통 폼보드 발주)',
  },
  // ── 노션 §6-2 외 영역 (5/18 deprecated 마킹·UI 보존·DB 호환) ─────────
  {
    id: 'l_board',
    label: 'L보드',
    category: 'L보드',
    width_mm: 600,
    height_mm: 900,
    orientation: 'portrait',
    description: '로비·동선·라운지 안내',
    deprecated: true,
    replaces_with: 'a3_landscape',
  },
  {
    id: 'foamboard',
    label: '폼보드',
    category: '폼보드',
    width_mm: 600,
    height_mm: 900,
    orientation: 'portrait',
    description: '데스크·시상·발표 안내',
    deprecated: true,
    replaces_with: 'a3_landscape',
  },
  {
    id: 'hardpaper',
    label: '하드지',
    category: '하드지',
    width_mm: 297,
    height_mm: 420,
    orientation: 'portrait',
    description: '현장 등록 안내·차량 안내판',
    deprecated: true,
    replaces_with: 'a3_portrait',
  },
  {
    id: 'coated_paper',
    label: '코팅지',
    category: '코팅지',
    width_mm: 210,
    height_mm: 297,
    orientation: 'portrait',
    description: '비표·임시 게시',
    deprecated: true,
    replaces_with: 'a4_portrait',
  },
  {
    id: 'pop_guide',
    label: '안내 POP',
    category: '안내POP',
    width_mm: 297,
    height_mm: 420,
    orientation: 'portrait',
    description: '데스크·테이블 안내',
    deprecated: true,
    replaces_with: 'a3_landscape',
  },
  {
    id: 'backwall',
    label: '백월',
    category: '백월',
    width_mm: 6000,
    height_mm: 2400,
    orientation: 'landscape',
    description: '포토월·메인 무대 배경',
    deprecated: true,
    replaces_with: 'horizontal_banner',
  },
  {
    id: 'sheet',
    label: '시트지',
    category: '시트지',
    width_mm: 1650,
    height_mm: 920,
    orientation: 'landscape',
    description: '출입구 유리창 부착. 바닥스티커·유도사인 포함',
    deprecated: true,
    replaces_with: 'horizontal_banner',
  },
]

/** mm 치수로 포맷을 검색 */
export function findFormatByDimensions(
  w: number,
  h: number
): ProductionFormat | undefined {
  return PRODUCTION_FORMATS.find((f) => f.width_mm === w && f.height_mm === h)
}

/** 컨테이너 크기와 제작물 mm 치수로 픽셀 캔버스 크기 계산 (비율 유지, padding%) */
export function calcCanvasDimensions(
  containerW: number,
  containerH: number,
  itemWidthMm: number,
  itemHeightMm: number,
  padding = 0.88
): { w: number; h: number } {
  // 입력값 검증 (0 또는 음수 방지)
  const safeW = Math.max(1, itemWidthMm || 1)
  const safeH = Math.max(1, itemHeightMm || 1)
  const safeCw = Math.max(1, containerW || 1)
  const safeCh = Math.max(1, containerH || 1)

  const ratio = safeW / safeH
  const cRatio = safeCw / safeCh

  if (cRatio > ratio) {
    const h = Math.floor(safeCh * padding)
    return { w: Math.max(1, Math.floor(h * ratio)), h: Math.max(1, h) }
  } else {
    const w = Math.floor(safeCw * padding)
    return { w: Math.max(1, w), h: Math.max(1, Math.floor(w / ratio)) }
  }
}
