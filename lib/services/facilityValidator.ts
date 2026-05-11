// 시설 가이드 검증 (§11-6-1)
// 사용자 입력 vs 매뉴얼 표준 비교 → 위반 항목 감지

import type { DesignItem, VenueFacilityGuide } from '@/lib/types'
import { getFacilityGuide } from '@/lib/data/venueFacilityGuide'

export interface ValidationIssue {
  itemId: string
  field: string                  // 어떤 컬럼인지 ('category' / 'size' / 'mount' 등)
  rule: string                   // 위반한 규칙
  message: string                // 사용자 친화 메시지
  standardValue?: string         // 매뉴얼 표준
  userValue?: string             // 사용자 입력값
  severity: 'warn' | 'info'      // warn = 알랏, info = 그리드 아이콘만
}

/**
 * 행사장 시설 가이드 기준으로 항목 검증.
 * 위반 항목 배열을 반환. 빈 배열이면 모든 입력 정상.
 */
export function validateAgainstFacility(
  item: DesignItem,
  venueName: string | null | undefined
): ValidationIssue[] {
  const guide = getFacilityGuide(venueName)
  if (!guide) return []  // 학습 데이터 없는 행사장은 검증 안 함

  const issues: ValidationIssue[] = []

  // 1. 카테고리 설치 가능 여부 검증
  if (item.category) {
    const allowed = guide.install_allowed.find(a =>
      a.category === item.category || item.category!.includes(a.category)
    )
    if (allowed && allowed.status === 'denied') {
      issues.push({
        itemId: item.id,
        field: 'category',
        rule: 'install_denied',
        message: `${guide.venue_name}에서는 '${item.category}' 설치가 불가합니다.`,
        standardValue: allowed.note ?? '설치 불가',
        userValue: item.category,
        severity: 'warn',
      })
    } else if (allowed && allowed.status === 'conditional') {
      issues.push({
        itemId: item.id,
        field: 'category',
        rule: 'install_conditional',
        message: `${guide.venue_name}에서 '${item.category}'는 조건부 설치 (${allowed.note ?? '매뉴얼 확인 필요'}).`,
        standardValue: allowed.note,
        userValue: item.category,
        severity: 'info',
      })
    }
  }

  // 2. 천정배너의 경우 리깅 가능 여부 확인
  if (item.category?.includes('천정') || item.category?.includes('행잉')) {
    if (guide.rigging?.available === false) {
      issues.push({
        itemId: item.id,
        field: 'category',
        rule: 'rigging_unavailable',
        message: `${guide.venue_name}은 천장 행잉이 불가합니다.`,
        standardValue: guide.rigging.note ?? '행잉 불가',
        userValue: item.category,
        severity: 'warn',
      })
    }
  }

  return issues
}

/** 전체 items에서 위반 항목 카운트 (다운로드 직전 일괄 요약용) */
export function countViolations(
  items: DesignItem[],
  venueName: string | null | undefined
): { warn: number; info: number; total: number; issues: ValidationIssue[] } {
  const all = items.flatMap(it => validateAgainstFacility(it, venueName))
  const warn = all.filter(i => i.severity === 'warn').length
  const info = all.filter(i => i.severity === 'info').length
  return { warn, info, total: all.length, issues: all }
}

/** 항목별 위반 맵 (그리드 ⚠️ 아이콘 표시용) */
export function buildIssueMap(
  items: DesignItem[],
  venueName: string | null | undefined
): Record<string, ValidationIssue[]> {
  const map: Record<string, ValidationIssue[]> = {}
  for (const item of items) {
    const issues = validateAgainstFacility(item, venueName)
    if (issues.length > 0) map[item.id] = issues
  }
  return map
}
