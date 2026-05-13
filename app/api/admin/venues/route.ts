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

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const { data, error } = await supabase
    .from('venues')
    .select('id, name, short_name, region, venue_type, has_hall_split, main_entrance_note, area_sqm, floor_plan_url, contact_phone, contact_email, manual_url, notes, specs_text, specs_updated_at, facility_guide_json, facility_guide_updated_at, created_at, updated_at')
    .order('region', { ascending: true })
    .order('name',   { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ items: data ?? [] })
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
