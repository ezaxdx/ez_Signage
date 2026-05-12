import type { DesignItem, ContentsMap } from '@/lib/types'
import { SLOT_MAX_CHARS } from '@/lib/constants'
import { SEED_SIGNAGE_TYPES, SEED_EVENT_CATEGORIES, SEED_SYNONYMS } from '@/lib/data/dashboardSeed'

export type IssueLevel = 'error' | 'warning' | 'info'

export interface PreflightIssue {
  itemId: string
  itemNo: string
  level: IssueLevel
  code: string
  message: string
}

/**
 * 발주 직전 자동 검증 — 포디움 타이틀 오타·누락 행사명·QR 미지정 등
 * 실무자가 외주/협력사에 발주 전 모든 제작물을 한번에 점검
 */
export function runPreflight(
  items: DesignItem[],
  allContents: Record<string, ContentsMap>
): PreflightIssue[] {
  const issues: PreflightIssue[] = []

  for (const item of items) {
    const contents = allContents[item.id] ?? {}

    // ── ERROR: 치명적 누락 ─────────────────────────
    if (!item.width_mm || !item.height_mm) {
      issues.push({
        itemId: item.id, itemNo: item.no, level: 'error',
        code: 'NO_SIZE', message: '규격(mm) 미지정 — 인쇄 불가',
      })
    }
    if (!item.category) {
      issues.push({
        itemId: item.id, itemNo: item.no, level: 'error',
        code: 'NO_CATEGORY', message: '제작물 종류(품목) 미지정',
      })
    }
    // 행사명(hero_title) 누락
    const heroText = (contents['hero_title']?.ko ?? '') + (contents['hero_title']?.en ?? '')
    if (!heroText.trim()) {
      issues.push({
        itemId: item.id, itemNo: item.no, level: 'error',
        code: 'NO_HERO', message: '행사명 미입력 (hero_title 슬롯 비어있음)',
      })
    }

    // ── WARNING: 주의 확인 ────────────────────────
    // 포디움 타이틀 = 현장 출력 재발생 고빈도 케이스
    if (item.category?.includes('포디움') || item.category?.includes('podium')) {
      const heroText = contents['hero_title']
      if (heroText && (heroText.ko || heroText.en)) {
        // 오타 의심 패턴 — 반복문자, 특수문자 연속, 영어+한글 공백 누락
        const combined = `${heroText.ko}${heroText.en}`
        if (/([ㄱ-ㅎ가-힣])([a-zA-Z])|([a-zA-Z])([ㄱ-ㅎ가-힣])/.test(combined)) {
          issues.push({
            itemId: item.id, itemNo: item.no, level: 'warning',
            code: 'PODIUM_SPACING', message: '포디움 타이틀 — 한/영 사이 공백 확인 필요',
          })
        }
      }
    }
    // QR 슬롯 있으나 이미지 미업로드
    const qr = contents['qr_code']
    if (qr && (qr.ko || qr.en) && !(qr.images && qr.images.length > 0)) {
      issues.push({
        itemId: item.id, itemNo: item.no, level: 'warning',
        code: 'QR_NO_IMAGE', message: 'QR 텍스트만 있음 — QR 이미지 업로드 또는 생성 필요',
      })
    }
    // 장소·사용목적 누락
    if (!item.location) {
      issues.push({
        itemId: item.id, itemNo: item.no, level: 'warning',
        code: 'NO_LOCATION', message: '설치 장소 미입력',
      })
    }
    if (!item.purpose) {
      issues.push({
        itemId: item.id, itemNo: item.no, level: 'warning',
        code: 'NO_PURPOSE', message: '사용 목적 미입력',
      })
    }
    // 재질 누락
    if (!item.material) {
      issues.push({
        itemId: item.id, itemNo: item.no, level: 'warning',
        code: 'NO_MATERIAL', message: '재질 미입력 — 출력업체 혼선 가능',
      })
    }
    // 언어 미지정 + 텍스트는 한영 혼재
    const hasKo = Object.values(contents).some(s => /[가-힣]/.test(s.ko ?? '') || /[가-힣]/.test(s.en ?? ''))
    const hasEn = Object.values(contents).some(s => /[a-zA-Z]/.test(s.ko ?? '') || /[a-zA-Z]/.test(s.en ?? ''))
    if (!item.language) {
      if (hasKo && hasEn) {
        issues.push({
          itemId: item.id, itemNo: item.no, level: 'warning',
          code: 'LANG_AUTO', message: '언어 미지정 — 한영 혼재이므로 EN/KOR 확인',
        })
      }
    }
    // 수량 0 또는 미입력
    if (!item.quantity || item.quantity < 1) {
      issues.push({
        itemId: item.id, itemNo: item.no, level: 'warning',
        code: 'NO_QUANTITY', message: '수량 0 — 발주 누락 위험',
      })
    }
    // 파트 누락
    if (!item.part) {
      issues.push({
        itemId: item.id, itemNo: item.no, level: 'warning',
        code: 'NO_PART', message: '파트 미입력 — 엑셀 담당자 그룹핑 혼선',
      })
    }
    // SLOT_MAX 초과 — 인쇄 시 잘림 위험
    for (const [slotKey, slot] of Object.entries(contents)) {
      const max = SLOT_MAX_CHARS[slotKey]
      if (!max) continue
      const totalChars = (slot.ko?.length ?? 0) + (slot.en?.length ?? 0)
      if (totalChars > max) {
        issues.push({
          itemId: item.id, itemNo: item.no, level: 'warning',
          code: 'OVERFLOW', message: `${slotKey} 글자 수 초과 (${totalChars}/${max}자) — 자동 축소되나 확인 권장`,
        })
      }
    }
    // 이미지 업로드 확인 — 배경 시안 없음
    if (!item.image_url) {
      issues.push({
        itemId: item.id, itemNo: item.no, level: 'info',
        code: 'NO_BACKGROUND', message: '배경 시안 이미지 미업로드 — 기본 프레임으로 출력',
      })
    }

    // ── INFO: 검수 미완료 ─────────────────────────
    if (item.review_status === '작업중' || item.review_status === '확인필요') {
      issues.push({
        itemId: item.id, itemNo: item.no, level: 'info',
        code: 'NOT_REVIEWED', message: `검수 미완료 (현재 "${item.review_status}")`,
      })
    }
    if (!item.last_edited_by) {
      issues.push({
        itemId: item.id, itemNo: item.no, level: 'info',
        code: 'NEVER_EDITED', message: '미편집 — 기본 시안 상태',
      })
    }
  }

  // ── 프로젝트 레벨 점검 — 마스터 vs sibling 규격 불일치 ──
  const mastersByCategory: Record<string, DesignItem> = {}
  for (const it of items) {
    if (it.is_master && it.category) mastersByCategory[it.category] = it
  }
  for (const it of items) {
    if (it.is_master || !it.category) continue
    const master = mastersByCategory[it.category]
    if (!master) continue
    if (master.width_mm !== it.width_mm || master.height_mm !== it.height_mm) {
      issues.push({
        itemId: it.id, itemNo: it.no, level: 'info',
        code: 'MASTER_SIZE_DIFF',
        message: `마스터(${master.width_mm}×${master.height_mm})와 규격 다름 (${it.width_mm}×${it.height_mm}) — 레이아웃 자동 비율 조정됨`,
      })
    }
  }

  return issues
}

export function groupIssues(issues: PreflightIssue[]) {
  return {
    errors: issues.filter(i => i.level === 'error'),
    warnings: issues.filter(i => i.level === 'warning'),
    infos: issues.filter(i => i.level === 'info'),
  }
}

// ─── 누락 품목 후보 (표준 11종 중 현재 리스트에 없는 종류) ───────────────

export interface MissingCandidate {
  typeId: string
  typeName: string
  /** 예: "입구·등록 / 600×1800mm" */
  note: string
  /** 8개 표준 행사 유형 중 이 종류를 권장하는 유형 수 (많을수록 범용) */
  frequency: number
}

function normCat(s: string): string {
  return s.trim().toLowerCase().replace(/[\s\-_·]+/g, '')
}

/**
 * 표준 11종 중 현재 design_items 목록에 없는 품목을 반환.
 * frequency >= 2 인 것만 "범용 품목"으로 분류해 UI에서 강조.
 */
export function checkMissingCandidates(items: DesignItem[]): MissingCandidate[] {
  // 동의어 정규화 맵 (alias norm → canonical norm)
  const synonymMap: Record<string, string> = {}
  for (const s of SEED_SYNONYMS) {
    synonymMap[normCat(s.alias)] = normCat(s.canonical_name)
  }

  // 현재 items 카테고리 집합 (동의어 정규화 후)
  const covered = new Set(
    items.map(i => {
      const n = normCat(i.category ?? '')
      return synonymMap[n] ?? n
    }).filter(Boolean)
  )

  return SEED_SIGNAGE_TYPES
    .filter(seed => !covered.has(normCat(seed.name)))
    .map(seed => ({
      typeId: seed.id,
      typeName: seed.name,
      note: `${seed.category} / ${seed.width_mm}×${seed.height_mm}mm`,
      frequency: SEED_EVENT_CATEGORIES.filter(ec =>
        ec.recommended_signage_keys.includes(seed.id)
      ).length,
    }))
    .sort((a, b) => b.frequency - a.frequency)
}
