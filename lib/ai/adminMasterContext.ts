// v9.40 — 어드민 마스터 데이터 컨텍스트 자동 주입
// 데이터 학습 관리자(/admin/learning)에서 admin이 추가/수정한 마스터 데이터를
// Supabase에서 직접 조회해 AI 추천 프롬프트에 자동 주입한다.
//
// 주입 대상 (어드민 DB 데이터 SOT)
//   ① signage_types (is_standard=false) — admin이 직접 추가한 환경장식물 종류
//   ② signage_aliases (source='manual') — admin이 직접 추가한 동의어 매핑
//   ③ venues.facility_guide_json — admin이 등록한 행사장 시설 가이드 JSON
//
// 기존 시드(SEED_SIGNAGE_TYPES 13종·SEED_SYNONYMS 47건·venueFacilityGuide 7개 행사장)는
// recommendSignage.ts 다른 블록(venueProfile·findSimilarPastEvents 등)에서 이미 반영.
// 이 모듈은 ′어드민이 DB에 직접 적재한 추가 자료′만 합쳐 AI가 즉시 학습한 것처럼 동작시킨다.
//
// Supabase 조회 실패 시 빈 블록 반환 — 추천 진행에 영향 없음(silent).

import { createClient } from '@/lib/supabase/server'

export interface AdminMasterBlock {
  text: string          // userText에 그대로 박는 블록 (빈 문자열이면 주입 skip)
  has_data: boolean     // 어떤 자료라도 있으면 true
  counts: {
    extra_signage_types: number
    extra_synonyms: number
    facility_guide_loaded: boolean
  }
}

const EMPTY: AdminMasterBlock = {
  text: '',
  has_data: false,
  counts: { extra_signage_types: 0, extra_synonyms: 0, facility_guide_loaded: false },
}

/**
 * 어드민이 추가한 마스터 데이터를 Supabase에서 합쳐 텍스트 블록으로 반환.
 * @param venueName 행사장 이름(시설 가이드 JSON 매칭용) — undefined면 venue 매칭 스킵
 */
export async function buildAdminMasterContext(venueName?: string | null): Promise<AdminMasterBlock> {
  let supabase
  try {
    supabase = createClient()
  } catch {
    return EMPTY
  }

  const lines: string[] = []
  const counts = { extra_signage_types: 0, extra_synonyms: 0, facility_guide_loaded: false }

  // ① 어드민이 추가한 환경장식물 종류 (is_standard=false)
  try {
    const { data, error } = await supabase
      .from('signage_types')
      .select('name, default_width_mm, default_height_mm, default_material, category, layout, notes')
      .eq('is_standard', false)
      .order('sort_order', { ascending: true })
      .limit(40)

    if (!error && Array.isArray(data) && data.length > 0) {
      counts.extra_signage_types = data.length
      lines.push(`[어드민 추가 환경장식물 종류 — ${data.length}건]`)
      for (const t of data) {
        const layout = t.layout ?? '세로'
        const mat = t.default_material ?? '인쇄'
        const note = t.notes ? ` — ${t.notes}` : ''
        lines.push(`- ${t.name} (${layout}, ${t.default_width_mm}×${t.default_height_mm}mm, ${mat}, ${t.category ?? '기타'})${note}`)
      }
      lines.push('→ 위 어드민 추가 종류도 후보로 사용 가능. category_label에 종류명 그대로 표기.')
      lines.push('')
    }
  } catch { /* silent */ }

  // ② 어드민이 추가한 동의어 매핑 (source='manual')
  try {
    const { data, error } = await supabase
      .from('signage_aliases')
      .select('alias_name, canonical_name, note')
      .eq('source', 'manual')
      .order('canonical_name', { ascending: true })
      .limit(60)

    if (!error && Array.isArray(data) && data.length > 0) {
      counts.extra_synonyms = data.length
      lines.push(`[어드민 추가 동의어 매핑 — ${data.length}건]`)
      for (const a of data) {
        const note = a.note ? ` (${a.note})` : ''
        lines.push(`- ${a.alias_name} → ${a.canonical_name}${note}`)
      }
      lines.push('→ 사용자가 비표준 별칭으로 입력해도 위 표준명을 따른다.')
      lines.push('')
    }
  } catch { /* silent */ }

  // ③ 어드민이 등록한 행사장 시설 가이드 JSON (venues.facility_guide_json)
  if (venueName && venueName.trim()) {
    try {
      const { data, error } = await supabase
        .from('venues')
        .select('name, facility_guide_json, facility_guide_updated_at')
        .ilike('name', `%${venueName.trim()}%`)
        .not('facility_guide_json', 'is', null)
        .limit(1)
        .maybeSingle()

      if (!error && data && data.facility_guide_json) {
        counts.facility_guide_loaded = true
        const guide = data.facility_guide_json as Record<string, unknown>
        lines.push(`[어드민 등록 시설 가이드 — ${data.name}]`)
        // 가이드 JSON은 자유 형식 — 주요 키 우선 출력, 나머지는 JSON 요약
        const allowed = (guide.install_allowed as unknown[] | undefined) ?? []
        if (Array.isArray(allowed) && allowed.length > 0) {
          const lbls = allowed.slice(0, 12).map(it => {
            const x = it as { category?: string; status?: string }
            return `${x.category}(${x.status ?? 'allowed'})`
          }).join(', ')
          lines.push(`- 설치 가능 카테고리: ${lbls}`)
        }
        const warnings = (guide.warnings as unknown[] | undefined) ?? []
        if (Array.isArray(warnings) && warnings.length > 0) {
          const w = warnings.slice(0, 5).map(it => {
            const x = it as { title?: string; description?: string }
            return x.title ?? x.description ?? ''
          }).filter(Boolean).join(' / ')
          if (w) lines.push(`- 주의사항: ${w}`)
        }
        if (data.facility_guide_updated_at) {
          lines.push(`- 가이드 갱신: ${String(data.facility_guide_updated_at).slice(0, 10)}`)
        }
        lines.push('→ 위 어드민 등록 시설 가이드는 시드 가이드보다 우선 반영. 설치 불가는 quantity=0 + ′[설치 불가 — 행사장 제약]′ 표기.')
        lines.push('')
      }
    } catch { /* silent */ }
  }

  if (lines.length === 0) return EMPTY
  return {
    text: '\n\n' + lines.join('\n').trim(),
    has_data: true,
    counts,
  }
}
