import type { DesignItem, ContentsMap } from '@/lib/types'

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

  return issues
}

export function groupIssues(issues: PreflightIssue[]) {
  return {
    errors: issues.filter(i => i.level === 'error'),
    warnings: issues.filter(i => i.level === 'warning'),
    infos: issues.filter(i => i.level === 'info'),
  }
}
