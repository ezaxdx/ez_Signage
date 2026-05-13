// 시설 가이드 단건 수정·삭제 — admin 전용. [id] = venues.id

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/auth/role'

export const runtime = 'nodejs'

interface RouteCtx { params: { id: string } }

export async function PATCH(req: NextRequest, { params }: RouteCtx) {
  const supabase = createClient()
  if (!await isAdmin(supabase)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const id = params.id
  if (!id) return NextResponse.json({ error: 'id 필수' }, { status: 400 })

  const body = await req.json() as { guide?: object }
  if (!body.guide) return NextResponse.json({ error: 'guide JSON 필수' }, { status: 400 })

  const { data, error } = await supabase
    .from('venues')
    .update({
      facility_guide_json: body.guide,
      facility_guide_updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('id, name, facility_guide_json, facility_guide_updated_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true, item: data })
}

export async function DELETE(_req: NextRequest, { params }: RouteCtx) {
  const supabase = createClient()
  if (!await isAdmin(supabase)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const id = params.id
  if (!id) return NextResponse.json({ error: 'id 필수' }, { status: 400 })

  const { error } = await supabase
    .from('venues')
    .update({
      facility_guide_json: null,
      facility_guide_updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
