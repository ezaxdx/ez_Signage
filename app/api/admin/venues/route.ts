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

  const body = await req.json()
  const { name, region, venue_type, has_hall_split, main_entrance_note, area_sqm,
          short_name, contact_phone, contact_email, manual_url, notes } = body
  if (!name) return NextResponse.json({ error: '행사장명 필수' }, { status: 400 })

  const { data, error } = await supabase.from('venues').insert({
    name: String(name).trim(),
    region: region || null,
    venue_type: venue_type || null,
    has_hall_split: !!has_hall_split,
    main_entrance_note: main_entrance_note || null,
    area_sqm: area_sqm ? Number(area_sqm) : null,
    short_name:    short_name || null,
    contact_phone: contact_phone || null,
    contact_email: contact_email || null,
    manual_url:    manual_url || null,
    notes:         notes || null,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true, item: data })
}
