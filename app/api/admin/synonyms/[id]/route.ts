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

  let body: Record<string, unknown>
  try { body = await req.json() } catch { return NextResponse.json({ error: 'invalid body' }, { status: 400 }) }

  // v9.44: 빈 값 차단 + NOT NULL 컬럼(alias_name·canonical_name·kind) 빈 문자열 거부
  const patch: Record<string, unknown> = {}
  if (typeof body.alias_name === 'string') {
    const v = body.alias_name.trim()
    if (!v) return NextResponse.json({ error: 'alias_name 빈 값 불가' }, { status: 400 })
    patch.alias_name = v
  }
  if (typeof body.canonical_name === 'string') {
    const v = body.canonical_name.trim()
    if (!v) return NextResponse.json({ error: 'canonical_name 빈 값 불가' }, { status: 400 })
    patch.canonical_name = v
  }
  if (typeof body.kind === 'string') {
    const v = body.kind.trim()
    if (!v) return NextResponse.json({ error: 'kind 빈 값 불가' }, { status: 400 })
    patch.kind = v
  }
  if (body.note !== undefined) {
    patch.note = typeof body.note === 'string' && body.note.trim() ? body.note.trim() : null
  }
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
