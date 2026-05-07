export type ProjectStatus = '준비중' | '진행중' | '완료'
export type ProjectStage = '의뢰서작성' | '발주완료' | '시안검수' | '수정중' | '확정' | '납품완료'
export type ItemLanguage = 'KOR' | 'EN' | 'EN/KOR'
export type UserRole = 'admin' | 'user'

// 환경장식물 동의어 사전 (signage_aliases 테이블)
export interface SignageAlias {
  id?: string
  alias_name: string
  canonical_name: string
  kind: string             // category 키 (x_banner, vertical_banner …)
  default_size: string | null
  note: string | null
}

// 외부 공유 토큰 (share_tokens 테이블)
export interface ShareToken {
  id: string
  project_id: string
  token: string
  created_by: string
  expires_at: string | null
  enabled: boolean
  created_at: string
}

// Profile 확장 (role 추가)
export interface Profile {
  id: string
  email: string
  display_name: string | null
  role: UserRole
  created_at: string
}

// ─── DB 엔티티 ────────────────────────────────────────────────

export interface Project {
  id: string
  name: string
  owner_id: string
  client_name: string | null
  event_date: string | null      // ISO date string "YYYY-MM-DD"
  event_venue: string | null
  status: ProjectStatus
  allowed_users: string[]        // 접근 허용 사용자 이메일 목록
  master_image_url: string | null  // 총괄자가 업로드한 마스터 시안 (전체 디자인 기준)
  purposes: string[]               // 사용 목적 5종 (main_promo, registration, wayfinding, program_info, experience)
  share_token: string | null       // 클라이언트 공유용 토큰 (로그인 없이 미리보기)
  share_enabled: boolean           // 공유 활성화 여부
  stage?: ProjectStage             // 행사 진행 단계 (의뢰서작성→납품완료) — migration_v4 이후 필수
  created_at: string
  updated_at: string
}

/** 프로젝트 레벨 슬롯 마스터 스타일 (slot_styles 테이블 — PPT 슬라이드 마스터 개념) */
export interface SlotStyle {
  id?: string
  project_id: string
  slot_key: string
  font_face: string
  font_size: number
  color: string                    // hex without # (ex: "FFFFFF")
  align: 'center' | 'left' | 'right'
  letter_spacing?: number          // 자간 (-5 ~ 10)
  master_x?: number | null         // 마스터 X 좌표 (%, null이면 각 아이템 값 유지)
  master_y?: number | null         // 마스터 Y 좌표 (%)
  master_w?: number | null         // 마스터 너비 (%)
  padding_x?: number               // 좌우 여백
}

export type SlotStylesMap = Record<string, Omit<SlotStyle, 'id' | 'project_id' | 'slot_key'>>

export interface BoundingBox {
  ymin: number  // 0~1000 normalized
  xmin: number
  ymax: number
  xmax: number
}

export interface LayoutSlot {
  id: string
  key: string   // snake_case — "hero_title", "sub_title" etc.
  label: string // 한글 레이블 — "행사명", "부제" etc.
  box: BoundingBox
}

export interface LayoutDNA {
  slots: LayoutSlot[]
  imageWidth: number   // px
  imageHeight: number  // px
}

export interface DesignItem {
  id: string
  project_id: string
  no: string           // 순번 "01", "02" …
  part: string | null  // 파트 "종합안내", "세션" …
  category: string | null   // 구분 "X-Banner", "현수막" …
  location: string | null   // 설치 장소
  purpose: string | null    // 사용 목적
  language: ItemLanguage | null
  quantity: number
  material: string | null   // 재질 "PET", "폼보드 5T" …
  width_mm: number | null
  height_mm: number | null
  image_url: string | null
  qr_required: boolean
  layout_dna: LayoutDNA | null
  last_edited_by: string | null  // 마지막 편집자 이메일
  updating_by: string | null     // 현재 편집 중인 사용자 (편집 잠금 표시)
  completed: boolean             // 저장/편집 완료 체크
  is_master: boolean             // 같은 category의 마스터 디자인 (기본값)
  review_status: '작업중' | '확인필요' | '검수완료' | '발주완료' | '수정요청'
  review_note: string | null     // 관리자 코멘트
  revision_count?: number        // 수정 횟수 (3회 이상 시 경고) — migration_v4 이후 필수
  created_at: string
  updated_at: string
}

export interface ItemContent {
  id: string
  item_id: string
  slot_key: string
  slot_value: string | null
  created_at: string
  updated_at: string
}

// ─── 뷰 / 집계 타입 ──────────────────────────────────────────

export interface ProjectWithCount extends Project {
  design_items: { count: number }[]
}

export interface DesignItemWithContents extends DesignItem {
  item_contents: ItemContent[]
}

// ─── 에디터 슬롯 타입 ─────────────────────────────────────────

/** item_contents.slot_value 에 JSON으로 저장되는 구조 */
export interface SlotContent {
  label: string     // 항목명 (표시용 한글 레이블)
  ko: string        // 국문 텍스트
  en: string        // 영문 텍스트
  x: number         // 캔버스 X 위치 (%, 0~100)
  y: number         // 캔버스 Y 위치 (%, 0~100)
  w?: number        // 텍스트박스 너비 (%, 0~100), 기본 70
  h?: number        // 텍스트박스 scaleY 배율 (기본 1.0 = 원본 높이)
  fontSize: number  // 폰트 크기 (pt)
  color?: string    // 개별 텍스트 색상 (hex no #, 없으면 slot_styles.color 상속)
  fontFace?: string // 개별 폰트 오버라이드
  align?: 'center' | 'left' | 'right'
  images?: string[] // 구역 내부 이미지 URL 배열
  placeholder?: string  // 비어있을 때 표시할 힌트 ("여기에 본문 입력" 등)
  locked?: boolean      // 마스터가 잠근 슬롯 (팀원은 텍스트만 수정 가능)
}

/** 가입한 사용자 프로필 (초대 검색용) */
export interface Profile {
  id: string
  email: string
  display_name: string | null
}

/** 로고 자산 (주최·주관·후원 등 재사용용) */
export interface OrgLogoAsset {
  id: string
  project_id: string
  name: string
  category: '주최' | '주관' | '후원' | '협찬' | '기타'
  image_url: string
  created_at: string
}

/** 프로젝트 멤버 (초대된 협업자) */
export interface ProjectMember {
  id: string
  project_id: string
  user_email: string
  part_name: string | null
  invited_at: string
}

export type ContentsMap = Record<string, SlotContent>

/**
 * 세로형(portrait) X배너·I배너·폼보드 기본 레이아웃 — 위→아래 수직 분포
 */
export const DEFAULT_SLOTS_PORTRAIT: ContentsMap = {
  header_brand:    { label: '주최기관',    ko: '', en: '', x: 50, y:  4, fontSize: 13, w: 80 },
  hero_title:      { label: '행사명',      ko: '', en: '', x: 50, y: 27, fontSize: 38, w: 85 },
  sub_title:       { label: '부제/슬로건', ko: '', en: '', x: 50, y: 47, fontSize: 20, w: 80 },
  body:            { label: '본문 정보',   ko: '', en: '', x: 50, y: 61, fontSize: 16, w: 75 },
  arrow:           { label: '화살표',      ko: '', en: '', x: 50, y: 55, fontSize: 24, w: 50 },
  qr_code:         { label: 'QR코드',     ko: '', en: '', x: 50, y: 72, fontSize: 13, w: 40 },
  footer_credits:  { label: '후원사',     ko: '', en: '', x: 50, y: 90, fontSize: 11, w: 90 },
}

/**
 * 가로형(landscape) 현수막·포디움 기본 레이아웃 — 좌→우 수평 분포, 중앙 강조
 */
export const DEFAULT_SLOTS_LANDSCAPE: ContentsMap = {
  header_brand:    { label: '주최기관',    ko: '', en: '', x: 10, y: 15, fontSize: 18, w: 18 },
  hero_title:      { label: '행사명',      ko: '', en: '', x: 50, y: 40, fontSize: 60, w: 90 },
  sub_title:       { label: '부제/슬로건', ko: '', en: '', x: 50, y: 65, fontSize: 26, w: 80 },
  body:            { label: '본문 정보',   ko: '', en: '', x: 50, y: 80, fontSize: 18, w: 70 },
  arrow:           { label: '화살표',      ko: '', en: '', x: 50, y: 50, fontSize: 40, w: 40 },
  qr_code:         { label: 'QR코드',     ko: '', en: '', x: 88, y: 50, fontSize: 14, w: 12 },
  footer_credits:  { label: '후원사',     ko: '', en: '', x: 50, y: 93, fontSize: 13, w: 90 },
}

/**
 * 정사각형 또는 소형(A4/A3) 기본 레이아웃
 */
export const DEFAULT_SLOTS_SQUARE: ContentsMap = {
  header_brand:    { label: '주최기관',    ko: '', en: '', x: 50, y:  8, fontSize: 14, w: 80 },
  hero_title:      { label: '행사명',      ko: '', en: '', x: 50, y: 30, fontSize: 32, w: 85 },
  sub_title:       { label: '부제/슬로건', ko: '', en: '', x: 50, y: 48, fontSize: 18, w: 80 },
  body:            { label: '본문 정보',   ko: '', en: '', x: 50, y: 65, fontSize: 14, w: 75 },
  arrow:           { label: '화살표',      ko: '', en: '', x: 50, y: 55, fontSize: 22, w: 40 },
  qr_code:         { label: 'QR코드',     ko: '', en: '', x: 50, y: 78, fontSize: 12, w: 30 },
  footer_credits:  { label: '후원사',     ko: '', en: '', x: 50, y: 92, fontSize: 10, w: 90 },
}

/** 규격 aspect ratio에 맞는 기본 레이아웃 선택 */
export function pickDefaultSlots(widthMm?: number | null, heightMm?: number | null): ContentsMap {
  const w = widthMm || 600
  const h = heightMm || 1800
  const ratio = w / h
  if (ratio > 1.5) return DEFAULT_SLOTS_LANDSCAPE
  if (ratio < 0.8) return DEFAULT_SLOTS_PORTRAIT
  return DEFAULT_SLOTS_SQUARE
}

/** 기본 슬롯 (세로형 default — 하위 호환) */
export const DEFAULT_SLOTS: ContentsMap = DEFAULT_SLOTS_PORTRAIT
