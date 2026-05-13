// 환경장식물 종류 단건 수정·삭제 — admin 전용

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

  const body = await req.json()
  // 표준 시드(is_standard=true)는 핵심 식별 필드(name) 변경 금지. 규격·재질·노트만 허용.
  const { data: existing } = await supabase
    .from('signage_types')
    .select('is_standard, name')
    .eq('id', id)
    .single()
  if (!existing) return NextResponse.json({ error: '항목 없음' }, { status: 404 })

  const patch: Record<string, unknown> = {}
  if (body.default_material !== undefined) patch.default_material = body.default_material
  if (body.category !== undefined)         patch.category         = body.category
  if (body.layout !== undefined)           patch.layout           = body.layout
  if (body.notes !== undefined)            patch.notes            = body.notes
  if (body.width_mm !== undefined)         patch.default_width_mm  = Number(body.width_mm)
  if (body.height_mm !== undefined)        patch.default_height_mm = Number(body.height_mm)
  if (body.sort_order !== undefined)       patch.sort_order       = Number(body.sort_order)
  if (!existing.is_standard && body.name !== undefined) {
    patch.name = String(body.name).trim()
  }
  patch.updated_at = new Date().toISOString()

  const { data, error } = await supabase
    .from('signage_types')
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

  const { data: existing } = await supabase
    .from('signage_types')
    .select('is_standard, name')
    .eq('id', id)
    .single()
  if (!existing) return NextResponse.json({ error: '항목 없음' }, { status: 404 })
  if (existing.is_standard) {
    return NextResponse.json({ error: '표준 시드 항목은 삭제 불가' }, { status: 400 })
  }

  const { error } = await supabase.from('signage_types').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
