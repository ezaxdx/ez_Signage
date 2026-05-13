// 동의어 단건 수정·삭제 — admin 전용 (signage_aliases)

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
  const patch: Record<string, unknown> = {}
  if (body.alias_name     !== undefined) patch.alias_name     = String(body.alias_name).trim()
  if (body.canonical_name !== undefined) patch.canonical_name = String(body.canonical_name).trim()
  if (body.kind           !== undefined) patch.kind           = String(body.kind).trim()
  if (body.note           !== undefined) patch.note           = body.note ? String(body.note).trim() : null
  patch.updated_at = new Date().toISOString()

  const { data, error } = await supabase
    .from('signage_aliases')
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

  const { error } = await supabase.from('signage_aliases').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
