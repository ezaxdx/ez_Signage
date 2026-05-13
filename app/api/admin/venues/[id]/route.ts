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

  let body: Record<string, unknown>
  try { body = await req.json() } catch { return NextResponse.json({ error: 'invalid body' }, { status: 400 }) }

  const patch: Record<string, unknown> = {}
  for (const key of EDITABLE) {
    if (body[key] === undefined) continue
    // v9.44: area_sqm NaN 안전 처리 + null/빈문자 → DB null
    if (key === 'area_sqm') {
      if (body[key] === null || body[key] === '') { patch[key] = null; continue }
      const n = Number(body[key])
      if (!Number.isFinite(n) || n < 0) return NextResponse.json({ error: 'area_sqm 양수 필수' }, { status: 400 })
      patch[key] = n
      continue
    }
    if (key === 'has_hall_split') { patch[key] = !!body[key]; continue }
    // 그 외 text 필드: 빈 문자열은 null로 정규화
    patch[key] = body[key] === '' ? null : body[key]
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
