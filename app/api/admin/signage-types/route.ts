// 환경장식물 종류 CRUD — admin 전용
// GET    /api/admin/signage-types        → 전체 목록(정렬 sort_order)
// POST   /api/admin/signage-types        → 신규 추가
// PATCH  /api/admin/signage-types/[id]   → 수정 (is_standard 표준 시드는 일부 필드 락)
// DELETE /api/admin/signage-types/[id]   → 삭제 (is_standard 보호)

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/auth/role'

export const runtime = 'nodejs'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ items: [], error: '인증 필요' }, { status: 200 })

  // 5/22 fallback = v14 미적용 시 'layout'·'updated_at' 컬럼 부재 (42703) → 단순 컬럼 재시도. 테이블 부재 (42P01) → 빈 배열 200.
  // HOTFIX 2026-05-20: v14 'hidden' + v19 'is_hidden' 두 컬럼 공존 → 응답엔 is_hidden(SOT) 통일.
  //   row.is_hidden ?? row.hidden ?? false 로 v14 데이터도 자동 흡수 (client는 is_hidden만 봄).
  try {
    const full = await supabase
      .from('signage_types')
      .select('id, name, default_width_mm, default_height_mm, default_material, category, layout, is_standard, sort_order, notes, updated_at, sample_image_url, hidden, is_hidden')
      .order('sort_order', { ascending: true })

    if (!full.error) {
      const items = (full.data ?? []).map((r: Record<string, unknown>) => ({
        ...r,
        is_hidden: (r.is_hidden ?? r.hidden ?? false) as boolean,
      }))
      return NextResponse.json({ items })
    }

    console.error('[signage-types] GET full failed:', full.error.message, full.error.code)
    if (full.error.code === '42703') {
      // 컬럼 부재 = v14 hidden만 시도 (v19 is_hidden 미적용 환경 graceful)
      const v14 = await supabase
        .from('signage_types')
        .select('id, name, default_width_mm, default_height_mm, default_material, category, layout, is_standard, sort_order, notes, updated_at, sample_image_url, hidden')
        .order('sort_order', { ascending: true })
      if (!v14.error) {
        const items = (v14.data ?? []).map((r: Record<string, unknown>) => ({
          ...r,
          is_hidden: (r.hidden ?? false) as boolean,
        }))
        return NextResponse.json({ items, partial: true, missing_columns: 'v19 (is_hidden)' })
      }
      // 컬럼 부재 = 기본 컬럼만 재조회
      const basic = await supabase
        .from('signage_types')
        .select('id, name, default_width_mm, default_height_mm, default_material, category, is_standard, sort_order, notes')
        .order('sort_order', { ascending: true })
      if (!basic.error) {
        return NextResponse.json({ items: basic.data ?? [], partial: true, missing_columns: 'v14 (sample_image_url·layout·hidden·updated_at)' })
      }
      console.error('[signage-types] GET basic failed:', basic.error.message, basic.error.code)
    }
    if (full.error.code === '42P01') {
      return NextResponse.json({ items: [], fallback: true, error: full.error.message, code: full.error.code }, { status: 200 })
    }
    return NextResponse.json({ items: [], error: full.error.message, code: full.error.code, fallback: true }, { status: 200 })
  } catch (e) {
    console.error('[signage-types] GET Exception:', e)
    return NextResponse.json({ items: [], fallback: true, error: e instanceof Error ? e.message : 'unknown' }, { status: 200 })
  }
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  if (!await isAdmin(supabase)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let body: Record<string, unknown>
  try { body = await req.json() } catch { return NextResponse.json({ error: 'invalid body' }, { status: 400 }) }

  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const widthMm  = Number(body.width_mm)
  const heightMm = Number(body.height_mm)
  // v9.44: NaN·음수·0 모두 차단 (이전: width_mm=0이면 Number(0) falsy로 검증 통과 못 함, 그러나 NaN은 누락 — 보강)
  if (!name) return NextResponse.json({ error: '이름 필수' }, { status: 400 })
  if (!Number.isFinite(widthMm)  || widthMm  <= 0) return NextResponse.json({ error: '너비(mm) 양수 필수' }, { status: 400 })
  if (!Number.isFinite(heightMm) || heightMm <= 0) return NextResponse.json({ error: '높이(mm) 양수 필수' }, { status: 400 })

  const validLayouts = new Set(['세로', '가로', '정사각'])
  const layout = typeof body.layout === 'string' && validLayouts.has(body.layout) ? body.layout : '세로'

  const { data, error } = await supabase.from('signage_types').insert({
    name,
    default_width_mm:  widthMm,
    default_height_mm: heightMm,
    default_material:  typeof body.default_material === 'string' && body.default_material ? body.default_material : '인쇄',
    category:          typeof body.category === 'string' && body.category ? body.category : '기타',
    layout,
    notes:             typeof body.notes === 'string' && body.notes ? body.notes : null,
    is_standard: false,
    sort_order: 99,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true, item: data })
}
