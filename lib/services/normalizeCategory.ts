// PR#4 단위 2 (δ 정책): design_items.category 정규화 SOT 헬퍼.
//
// 호출 순서:
//   1. 표준 12 카테고리 직접 매칭 (SEED_SIGNAGE_TYPES.name)
//   2. SEED_SYNONYMS (lib/data/dashboardSeed) 매칭
//   3. signage_aliases DB 매칭 (admin이 추가한 manual + admin_resolved)
//   4. 실패 → unmatched_category_log UPSERT (occurrences++)
//
// 결과:
//   - matched: category_normalized = 표준명, status='matched', 학습 풀 포함
//   - unmatched: category_normalized = NULL, status='unmatched', 학습 풀 제외 + 로그
//
// 사용처: case-a·EditorLayout·ProjectInfoClient의 design_items INSERT 직전.

import type { SupabaseClient } from '@supabase/supabase-js'
import { SEED_SYNONYMS, SEED_SIGNAGE_TYPES } from '@/lib/data/dashboardSeed'

const STANDARD_NAMES = new Set(SEED_SIGNAGE_TYPES.map(t => t.name))

function normKey(s: string): string {
  return s.replace(/[\s\-_·()\[\]]/g, '').toLowerCase()
}

const SEED_MAP = new Map<string, string>(
  SEED_SYNONYMS.map(s => [normKey(s.alias), s.canonical_name]),
)

export interface NormalizeResult {
  matched: boolean
  normalized: string | null
  raw: string
  status: 'matched' | 'unmatched'
}

/**
 * raw category를 12 표준 카테고리 중 하나로 정규화.
 * 매칭 실패 시 unmatched_category_log UPSERT (silent fail OK).
 */
export async function normalizeCategory(
  supabase: SupabaseClient,
  rawCategory: string,
  options?: { logUnmatched?: boolean; designItemId?: string },
): Promise<NormalizeResult> {
  const raw = rawCategory.trim()
  if (!raw) return { matched: false, normalized: null, raw, status: 'unmatched' }

  // 1. 표준명 12종 직접 매칭
  if (STANDARD_NAMES.has(raw)) {
    return { matched: true, normalized: raw, raw, status: 'matched' }
  }

  // 2. SEED 동의어
  const seedMatch = SEED_MAP.get(normKey(raw))
  if (seedMatch && STANDARD_NAMES.has(seedMatch)) {
    return { matched: true, normalized: seedMatch, raw, status: 'matched' }
  }

  // 3. DB signage_aliases (silent fail — 마이그레이션 미적용 환경 graceful degradation)
  try {
    const { data } = await supabase
      .from('signage_aliases')
      .select('canonical_name, is_hidden')
      .eq('alias_name', raw)
      .limit(1)
      .maybeSingle()
    if (data && !data.is_hidden && data.canonical_name && STANDARD_NAMES.has(data.canonical_name)) {
      return { matched: true, normalized: data.canonical_name, raw, status: 'matched' }
    }
  } catch { /* silent — DB 미적용 또는 is_hidden 컬럼 부재 */ }

  // 4. 매칭 실패 → unmatched_category_log UPSERT
  if (options?.logUnmatched !== false) {
    try {
      // 기존 미해결 row 있으면 occurrences++ / 없으면 INSERT
      const { data: existing } = await supabase
        .from('unmatched_category_log')
        .select('id, occurrences')
        .eq('raw_category', raw)
        .is('resolved_at', null)
        .limit(1)
        .maybeSingle()
      if (existing) {
        await supabase
          .from('unmatched_category_log')
          .update({
            occurrences: (existing.occurrences ?? 0) + 1,
            last_seen: new Date().toISOString(),
            sample_design_item_id: options?.designItemId ?? null,
          })
          .eq('id', existing.id)
      } else {
        await supabase.from('unmatched_category_log').insert({
          raw_category: raw,
          occurrences: 1,
          sample_design_item_id: options?.designItemId ?? null,
        })
      }
    } catch { /* silent — 테이블 미적용 */ }
  }
  return { matched: false, normalized: null, raw, status: 'unmatched' }
}

/**
 * 관리자가 미분류 raw_category를 12 표준 카테고리로 매핑 결정.
 *   1. signage_aliases UPSERT (admin_resolved source)
 *   2. 기존 design_items.category_normalize_status='unmatched' 일괄 재변환
 *   3. unmatched_category_log resolved_at·resolved_to 갱신
 */
export async function resolveUnmatchedCategory(
  supabase: SupabaseClient,
  rawCategory: string,
  standardName: string,
  resolvedBy?: string | null,
): Promise<{ updatedCount: number; error?: string }> {
  if (!STANDARD_NAMES.has(standardName)) {
    return { updatedCount: 0, error: `'${standardName}'는 12종 표준 카테고리가 아닙니다` }
  }
  const raw = rawCategory.trim()
  if (!raw) return { updatedCount: 0, error: 'raw_category 필수' }

  try {
    // 1. signage_aliases UPSERT (admin_resolved)
    await supabase
      .from('signage_aliases')
      .upsert(
        {
          alias_name: raw,
          canonical_name: standardName,
          source: 'admin_resolved',
        },
        { onConflict: 'alias_name' },
      )

    // 2. 기존 design_items 일괄 재변환
    const { data: updated } = await supabase
      .from('design_items')
      .update({
        category_normalized: standardName,
        category_normalize_status: 'manual_override',
      })
      .eq('category', raw)
      .eq('category_normalize_status', 'unmatched')
      .select('id')

    // 3. unmatched_category_log resolved 갱신
    await supabase
      .from('unmatched_category_log')
      .update({
        resolved_at: new Date().toISOString(),
        resolved_to: standardName,
        resolved_by: resolvedBy ?? null,
      })
      .eq('raw_category', raw)
      .is('resolved_at', null)

    return { updatedCount: updated?.length ?? 0 }
  } catch (e) {
    return { updatedCount: 0, error: e instanceof Error ? e.message : 'unknown' }
  }
}
