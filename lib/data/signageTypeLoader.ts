// 환경장식물 종류 동적 로더
// DB(signage_types) 우선 조회 → 없으면 SEED_SIGNAGE_TYPES 폴백
// 시설 가이드(getFacilityGuideAsync)와 동일 패턴

import type { SupabaseClient } from '@supabase/supabase-js'
import { SEED_SIGNAGE_TYPES, type SignageTypeSeed } from '@/lib/data/dashboardSeed'

interface DbRow {
  id?: string
  name: string
  default_width_mm: number | null
  default_height_mm: number | null
  default_material: string | null
  category: string | null
  layout: string | null
  notes: string | null
  sort_order: number
  sample_image_url?: string | null
  hidden?: boolean | null
}

function dbRowToSeed(row: DbRow): SignageTypeSeed & { sample_image_url?: string | null; hidden?: boolean } {
  return {
    id: row.id ?? row.name.toLowerCase().replace(/[\s\-]/g, '_'),
    name: row.name,
    width_mm: row.default_width_mm ?? 600,
    height_mm: row.default_height_mm ?? 1800,
    default_material: row.default_material ?? '인쇄',
    category: row.category ?? '기타',
    layout: (row.layout as SignageTypeSeed['layout']) ?? '세로',
    note: row.notes ?? undefined,
    sample_image_url: row.sample_image_url ?? undefined,
    hidden: row.hidden ?? false,
  }
}

/**
 * 환경장식물 종류 목록 로드.
 * DB에 데이터가 있으면 DB 기준, 없으면 시드 반환.
 * 클라이언트 컴포넌트 마운트 시 1회 호출.
 */
export async function loadSignageTypes(supabase: SupabaseClient): Promise<SignageTypeSeed[]> {
  try {
    const { data, error } = await supabase
      .from('signage_types')
      .select('id, name, default_width_mm, default_height_mm, default_material, category, layout, notes, sort_order, sample_image_url, hidden')
      .order('sort_order', { ascending: true })

    if (error || !data || data.length === 0) return SEED_SIGNAGE_TYPES

    // DB 기준으로 구성, 시드에만 있는 항목은 뒤에 보강
    const dbRows = data as DbRow[]
    const dbNames = new Set(dbRows.map(r => r.name))
    const seedOnly = SEED_SIGNAGE_TYPES.filter(s => !dbNames.has(s.name))
    return [...dbRows.map(dbRowToSeed), ...seedOnly]
  } catch {
    return SEED_SIGNAGE_TYPES
  }
}
