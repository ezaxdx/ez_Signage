// 행사장 단건 수정·삭제 — admin 전용

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/auth/role'

export const runtime = 'nodejs'

interface RouteCtx { params: { id: string } }

const EDITABLE = [
  'name', 'short_name', 'region', 'venue_type', 'has_hall_split',
  'main_entrance_note', 'area_sqm', 'floor_plan_url',
  'contact_phone', 'contact_email', 'manual_url', 'notes', 'specs_text',
] as const

export async function PATCH(req: NextRequest, { params }: RouteCtx) {
  const supabase = createClient()
  if (!await isAdmin(supabase)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const id = params.id
  if (!id) return NextResponse.json({ error: 'id 필수' }, { status: 400 })

  const body = await req.json()
  const patch: Record<string, unknown> = {}
  for (const key of EDITABLE) {
    if (body[key] !== undefined) {
      patch[key] = key === 'area_sqm' && body[key] !== null
        ? Number(body[key])
        : body[key]
    }
  }
  patch.updated_at = new Date().toISOString()

  const { data, error } = await supabase
    .from('venues')
    .update(patch)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true, item: data })
}

export async function DELETE(_req: NextRequest, { params }: RouteCtx) {
  const supabase = createClient()
  if (!await isAdmin(supabase)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const id = params.id
  if (!id) return NextResponse.json({ error: 'id 필수' }, { status: 400 })

  const { error } = await supabase.from('venues').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
