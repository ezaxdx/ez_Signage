// 행사장별 시설 가이드 시드 데이터 (§11-6-2 6종 정보)
// v8 (2026-05-11): 1차 시험 결과 기반 + 매뉴얼 추출 정보
// 출처: docs/VENUE_LEARNING_INSIGHTS_260511.md, docs/VENUE_EVENT_MATRIX_260511.md
//
// 시드 데이터는 supabase venue_facility_guide 테이블이 비어있을 때 폴백.
// 관리자가 /admin/learning 에서 시드 데이터를 DB로 업로드 가능.

import type { VenueFacilityGuide } from '@/lib/types'

export const VENUE_FACILITY_GUIDE_SEED: VenueFacilityGuide[] = [
  // ─── 킨텍스 1전시장 5홀 (매뉴얼 일부 파싱 성공) ───
  {
    venue_key: 'kintex_1_hall_5',
    venue_name: '킨텍스 제1전시장 5홀',
    install_allowed: [
      { category: 'X배너', status: 'allowed', note: '1F 로비·전시장 자유 배치' },
      { category: '세로현수막', status: 'allowed', note: '외부 가로등 부착 (조 단위)' },
      { category: '가로현수막', status: 'allowed', note: '기둥·외벽 부착 가능' },
      { category: '통천현수막', status: 'allowed', note: '외벽 최대 24m×17m / 내부 무대 10m×5m' },
      { category: '천정배너', status: 'conditional', note: '행잉 그리드 위치만 가능 — 매뉴얼 확인 필요' },
      { category: '물통배너', status: 'allowed', note: '외부 셔틀 정류장' },
    ],
    mount_methods: {
      taka: 'conditional',
      magnet: 'denied',
      adhesive: 'denied',
      hanger: 'conditional',
      rope: 'allowed',
      note: '벽면 부착은 매뉴얼 별도 확인 필요. 천장 행잉은 그리드 라인만',
    },
    rigging: {
      available: true,
      grid_lines: ['[확인 필요]'],
      max_load_kg: undefined,
      note: '매뉴얼 천장 행잉 섹션 한국어 폰트 깨짐 — OCR 또는 직접 확인 필요',
    },
    safety: {
      fire: '난연 자재만 사용 (전시장 표준)',
      fall: '천장 행잉은 2점 이상 고정 권장',
      electric: '220V 표준. 추가 전기 사용 시 운영실 신청',
      weather: '외부 옥외 사인은 우천 시 철거 권장',
      note: '안전 세부 규정은 매뉴얼 직접 확인',
    },
    warnings: [
      { type: '비상구·소화전 가림', description: '비상구·소화전 표지 가림 금지' },
      { type: '외벽 부착 제한', description: '외벽 통천 부착 위치는 매뉴얼 §3 외부 광고 섹션 참고' },
      { type: '주차장 미운영', description: '1전시장 주차장 미운영 (공사 중) — 셔틀 의존도 ↑' },
    ],
    digital_signage: {
      allowed_locations: ['5홀 내부 LED 보드 (운영팀 협의 필수)'],
      led_size_limit: '[확인 필요]',
      content_review: true,
      note: '디지털 사이니지 콘텐츠 사전 검토 필요',
    },
    last_updated: '2024-10-15',
    notes: '매뉴얼 PDF에서 외부 광고(7600×2000mm) 표준은 추출 성공. 천정·행잉 섹션은 OCR 필요.',
  },

  // ─── 킨텍스 1전시장 1~4홀 (매뉴얼 표준만 확인) ───
  {
    venue_key: 'kintex_1_hall_1_to_4',
    venue_name: '킨텍스 제1전시장 1~4홀',
    install_allowed: [
      { category: 'X배너', status: 'allowed' },
      { category: '세로현수막', status: 'allowed' },
      { category: '가로현수막', status: 'allowed', note: '외벽 표준: 1홀 7700×2000 / 2~4홀 8000×2000' },
      { category: '통천현수막', status: 'allowed' },
      { category: '천정배너', status: 'conditional', note: '매뉴얼 확인 필요' },
    ],
    mount_methods: { taka: 'conditional', magnet: 'denied', adhesive: 'denied', hanger: 'conditional', rope: 'allowed' },
    rigging: { available: true, note: '5홀과 동일 운영팀' },
    safety: { fire: '난연 자재만', fall: '2점 이상 고정', electric: '220V', weather: '우천 시 외부 철거' },
    warnings: [
      { type: '외부 광고 표준', description: '1홀 7700×2000, 2~4홀 8000×2000 (매뉴얼 §3)' },
    ],
    digital_signage: { content_review: true },
    last_updated: '2024-10-15',
  },

  // ─── 킨텍스 2전시장 6~10홀 ───
  {
    venue_key: 'kintex_2_hall_6_to_10',
    venue_name: '킨텍스 제2전시장 6~10홀',
    install_allowed: [
      { category: 'X배너', status: 'allowed' },
      { category: '세로현수막', status: 'allowed' },
      { category: '가로현수막', status: 'allowed', note: '외벽 표준 8000×5000mm (대형)' },
      { category: '통천현수막', status: 'allowed' },
      { category: '천정배너', status: 'conditional' },
    ],
    mount_methods: { taka: 'conditional', magnet: 'denied', adhesive: 'denied', hanger: 'allowed', rope: 'allowed' },
    rigging: { available: true, note: '2전시장 운영실 별도 협의' },
    safety: { fire: '난연 자재만', fall: '대형 행잉은 매뉴얼 별도 규정' },
    warnings: [
      { type: '외부 광고 대형', description: '외벽 표준 8000×5000mm — 1전시장과 다름' },
    ],
    digital_signage: { content_review: true },
    last_updated: '2024-10-15',
  },

  // ─── 코엑스 ───
  {
    venue_key: 'coex',
    venue_name: '코엑스 (그랜드볼룸·아셈볼룸 외)',
    install_allowed: [
      { category: 'X배너', status: 'allowed' },
      { category: '세로현수막', status: 'allowed' },
      { category: '가로현수막', status: 'conditional', note: '구역별 사이즈 제한 — 매뉴얼 확인' },
      { category: '통천현수막', status: 'conditional' },
      { category: '천정배너', status: 'conditional', note: 'D2·컨퍼런스룸 등 일부만' },
    ],
    mount_methods: { taka: 'denied', magnet: 'denied', adhesive: 'denied', hanger: 'conditional', rope: 'allowed' },
    rigging: { available: true, note: '코엑스 운영팀 협의 필수' },
    safety: { fire: '난연 자재만', fall: '2점 고정', electric: '220V', weather: '외부 옥외 우천 철거' },
    warnings: [
      { type: '구역별 제한', description: 'D2·그랜드볼룸·아셈볼룸 각각 제한 다름' },
    ],
    digital_signage: { allowed_locations: ['D2 LED'], content_review: true },
    last_updated: '2024-10-15',
    notes: '매뉴얼 미파싱 — 직접 확인 권장',
  },

  // ─── 송도컨벤시아 ───
  {
    venue_key: 'songdo_convensia',
    venue_name: '송도컨벤시아',
    install_allowed: [
      { category: 'X배너', status: 'allowed' },
      { category: '행사 현수막', status: 'allowed' },
      { category: '유도사인', status: 'allowed' },
      { category: '룸사인', status: 'allowed' },
      { category: '폴대배너', status: 'allowed' },
      { category: '포디움 타이틀', status: 'allowed' },
    ],
    mount_methods: { taka: 'denied', magnet: 'conditional', adhesive: 'denied', hanger: 'conditional', rope: 'allowed' },
    rigging: { available: true },
    safety: { fire: '난연 자재만', fall: '2점 고정' },
    warnings: [
      { type: '룸사인 표준', description: '안내·행사 룸사인 분리 운영' },
    ],
    digital_signage: { content_review: true },
    last_updated: '2024-10-15',
  },

  // ─── ICC 제주 ───
  {
    venue_key: 'icc_jeju',
    venue_name: 'ICC 제주 (한라홀 외)',
    install_allowed: [
      { category: 'X배너', status: 'allowed' },
      { category: '세로현수막', status: 'allowed' },
      { category: '통천현수막', status: 'conditional' },
    ],
    mount_methods: { taka: 'denied', magnet: 'denied', adhesive: 'denied', hanger: 'conditional', rope: 'allowed' },
    rigging: { available: true },
    safety: { fire: '난연 자재만', fall: '천장 행잉 제한적' },
    warnings: [],
    digital_signage: { content_review: true },
    last_updated: '2024-10-15',
  },

  // ─── DDP 아트홀 1관 ───
  {
    venue_key: 'ddp_arthall_1',
    venue_name: 'DDP 아트홀 1관',
    install_allowed: [
      { category: 'X배너', status: 'allowed' },
      { category: '가로현수막', status: 'conditional', note: 'DDP 곡면 외벽 부착 불가' },
      { category: '통천현수막', status: 'conditional' },
    ],
    mount_methods: { taka: 'denied', magnet: 'denied', adhesive: 'denied', hanger: 'conditional', rope: 'denied' },
    rigging: { available: false, note: 'DDP 건축 특성상 천장 행잉 매우 제한적' },
    safety: { fire: '난연 자재만', fall: '천장 행잉 거의 불가', electric: '220V', weather: '외부 옥외 우천 철거' },
    warnings: [
      { type: 'DDP 곡면 외벽', description: 'DDP 건축 곡면 외벽 부착 금지 — 별도 사인 구조물 필요' },
    ],
    digital_signage: { allowed_locations: ['DDP 미디어 파사드 (별도 협의)'], content_review: true },
    last_updated: '2024-10-15',
  },
]

/** 행사장명 → venue_key 매칭 (퍼지 매칭) */
export function findVenueKey(venueName: string | null | undefined): string | null {
  if (!venueName) return null
  const n = venueName.toLowerCase().trim()
  if (n.includes('킨텍스') || n.includes('kintex')) {
    if (n.includes('5홀')) return 'kintex_1_hall_5'
    if (/[1-4]홀/.test(n)) return 'kintex_1_hall_1_to_4'
    if (/[6-9]홀|10홀/.test(n)) return 'kintex_2_hall_6_to_10'
    return 'kintex_1_hall_5'
  }
  if (n.includes('코엑스') || n.includes('coex')) return 'coex'
  if (n.includes('송도') || n.includes('컨벤시아')) return 'songdo_convensia'
  if (n.includes('icc') || n.includes('제주국제컨벤션')) return 'icc_jeju'
  if (n.includes('ddp') || n.includes('동대문디자인')) return 'ddp_arthall_1'
  return null
}

/** 행사장명으로 시드 데이터 조회 */
export function getFacilityGuide(venueName: string | null | undefined): VenueFacilityGuide | null {
  const key = findVenueKey(venueName)
  if (!key) return null
  return VENUE_FACILITY_GUIDE_SEED.find(g => g.venue_key === key) ?? null
}
