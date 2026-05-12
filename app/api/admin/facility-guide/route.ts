// 행사장 시설 가이드 JSON 관리 API
// GET  ?venueId=xxx → venues.facility_guide_json 반환
// POST { venueId, guide }         → 직접 저장 (관리자 수동 편집)
// POST { venueId, action: 'extract' } → specs_text로 Gemini 추출 후 저장

import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'
import { isAdmin } from '@/lib/auth/role'
import { extractStructuredGuide } from '@/lib/ai/visionFloorPlan'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const venueId = req.nextUrl.searchParams.get('venueId')
  if (!venueId) return NextResponse.json({ error: 'venueId required' }, { status: 400 })

  const { data, error } = await supabase
    .from('venues')
    .select('facility_guide_json, facility_guide_updated_at, specs_text, name')
    .eq('id', venueId)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const admin = await isAdmin(supabase)
  if (!admin) return NextResponse.json({ error: '권한 없음' }, { status: 403 })

  const body = await req.json() as {
    venueId: string
    guide?: object
    action?: 'extract'
  }

  if (body.action === 'extract') {
    // specs_text → Gemini 추출
    const { data: venue, error } = await supabase
      .from('venues')
      .select('specs_text, name')
      .eq('id', body.venueId)
      .single()

    if (error || !venue) return NextResponse.json({ error: '행사장 없음' }, { status: 404 })
    if (!venue.specs_text) return NextResponse.json({ error: 'specs_text 없음 — 도면 Vision 분석 먼저 실행' }, { status: 400 })

    const result = await extractStructuredGuide(venue.specs_text, venue.name)
    if (result.error || !result.json) return NextResponse.json({ error: result.error }, { status: 500 })

    // 저장
    const { error: saveError } = await supabase
      .from('venues')
      .update({
        facility_guide_json: result.json,
        facility_guide_updated_at: new Date().toISOString(),
      })
      .eq('id', body.venueId)

    if (saveError) return NextResponse.json({ error: saveError.message }, { status: 500 })
    return NextResponse.json({ ok: true, guide: result.json })
  }

  // 직접 저장 (관리자 수동 편집)
  if (body.guide) {
    const { error } = await supabase
      .from('venues')
      .update({
        facility_guide_json: body.guide,
        facility_guide_updated_at: new Date().toISOString(),
      })
      .eq('id', body.venueId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'guide 또는 action 필요' }, { status: 400 })
}
