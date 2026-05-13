// 시설 가이드 컬렉션 CRUD — admin 전용
// 실제 저장: venues.facility_guide_json (행사장당 1 가이드 JSON)
// GET    /api/admin/facility-guides           → facility_guide_json 보유 행사장 전체
// POST   /api/admin/facility-guides           → 신규 가이드 저장({ venue_id, guide })
// PATCH  /api/admin/facility-guides/[venueId] → 가이드 수정
// DELETE /api/admin/facility-guides/[venueId] → 가이드 비우기(facility_guide_json = null)
//
// (단건 동작은 기존 /api/admin/facility-guide(단수)도 유지 — 후방 호환)

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
    .select('id, name, region, venue_type, facility_guide_json, facility_guide_updated_at')
    .not('facility_guide_json', 'is', null)
    .order('region', { ascending: true })
    .order('name',   { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ items: data ?? [] })
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  if (!await isAdmin(supabase)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let body: { venue_id?: string; guide?: object }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'invalid body' }, { status: 400 }) }

  if (!body.venue_id) return NextResponse.json({ error: 'venue_id 필수' }, { status: 400 })
  // v9.44: guide JSON 타입 강화 — null·배열·string은 거부 (객체만 허용)
  if (!body.guide || typeof body.guide !== 'object' || Array.isArray(body.guide)) {
    return NextResponse.json({ error: 'guide JSON 객체 필수' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('venues')
    .update({
      facility_guide_json: body.guide,
      facility_guide_updated_at: new Date().toISOString(),
    })
    .eq('id', body.venue_id)
    .select('id, name, facility_guide_json, facility_guide_updated_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  if (!data) return NextResponse.json({ error: '행사장 없음' }, { status: 404 })
  return NextResponse.json({ ok: true, item: data })
}
