// 행사장(venues) 마스터 CRUD — admin 전용
// 기존 venues 테이블(migration_v6_v4_1_fixed.sql) 재사용 + v9.37 컬럼 보강
// GET    /api/admin/venues      → 전체 목록
// POST   /api/admin/venues      → 신규 추가
// PATCH  /api/admin/venues/[id] → 수정
// DELETE /api/admin/venues/[id] → 삭제

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/auth/role'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  // HOTFIX (2026-05-20 에러 3): is_hidden 컬럼 unknown 대비 graceful — full select 시도 후 실패 시 fallback
  const hiddenOnly = req.nextUrl.searchParams.get('hidden') === 'true'

  // 1차 시도: is_hidden 포함 select
  const fullSelect = 'id, name, short_name, region, venue_type, has_hall_split, main_entrance_note, area_sqm, floor_plan_url, contact_phone, contact_email, manual_url, notes, specs_text, specs_updated_at, facility_guide_json, facility_guide_updated_at, is_hidden, created_at, updated_at'
  let query = supabase.from('venues').select(fullSelect)
  if (hiddenOnly) query = query.eq('is_hidden', true)
  query = query.order('region', { ascending: true }).order('name', { ascending: true })
  const first = await query
  if (!first.error) {
    return NextResponse.json({ items: first.data ?? [] })
  }
  console.error('[admin/venues] GET 1차 실패:', first.error.message, first.error.code)

  // 2차 시도: is_hidden 제외 (마이그레이션 v19 미적용 graceful)
  if (/column .* is_hidden|column .* does not exist/i.test(first.error.message)) {
    const fallbackSelect = 'id, name, short_name, region, venue_type, has_hall_split, main_entrance_note, area_sqm, floor_plan_url, contact_phone, contact_email, manual_url, notes, specs_text, specs_updated_at, facility_guide_json, facility_guide_updated_at, created_at, updated_at'
    const fallback = await supabase
      .from('venues')
      .select(fallbackSelect)
      .order('region', { ascending: true })
      .order('name', { ascending: true })
    if (fallback.error) {
      console.error('[admin/venues] GET fallback 실패:', fallback.error.message)
      return NextResponse.json({ items: [], fallback: true, error: fallback.error.message }, { status: 200 })
    }
    return NextResponse.json({ items: fallback.data ?? [], fallback: true })
  }

  return NextResponse.json({ items: [], error: first.error.message, code: first.error.code, fallback: true }, { status: 200 })
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  if (!await isAdmin(supabase)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let body: Record<string, unknown>
  try { body = await req.json() } catch { return NextResponse.json({ error: 'invalid body' }, { status: 400 }) }

  const name = typeof body.name === 'string' ? body.name.trim() : ''
  if (!name) return NextResponse.json({ error: '행사장명 필수' }, { status: 400 })

  // v9.44: area_sqm NaN 안전 처리 (이전: Number('xxx') = NaN이 DB에 들어가 numeric 컬럼 에러)
  let areaSqm: number | null = null
  if (body.area_sqm !== undefined && body.area_sqm !== null && body.area_sqm !== '') {
    const n = Number(body.area_sqm)
    if (!Number.isFinite(n) || n < 0) return NextResponse.json({ error: 'area_sqm 양수 필수' }, { status: 400 })
    areaSqm = n
  }

  const str = (k: keyof typeof body) => typeof body[k] === 'string' && (body[k] as string).trim() ? (body[k] as string).trim() : null

  const { data, error } = await supabase.from('venues').insert({
    name,
    region:             str('region'),
    venue_type:         str('venue_type'),
    has_hall_split:     !!body.has_hall_split,
    main_entrance_note: str('main_entrance_note'),
    area_sqm:           areaSqm,
    short_name:         str('short_name'),
    contact_phone:      str('contact_phone'),
    contact_email:      str('contact_email'),
    manual_url:         str('manual_url'),
    notes:              str('notes'),
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true, item: data })
}
