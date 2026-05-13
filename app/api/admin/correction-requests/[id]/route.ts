// 수정요청 단건 status 변경·삭제 — admin 전용

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/auth/role'

export const runtime = 'nodejs'

interface RouteCtx { params: { id: string } }

const VALID_STATUS = new Set(['pending','approved','rejected','resolved'])

export async function PATCH(req: NextRequest, { params }: RouteCtx) {
  const supabase = createClient()
  if (!await isAdmin(supabase)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const id = params.id
  if (!id) return NextResponse.json({ error: 'id 필수' }, { status: 400 })

  const body = await req.json() as { status?: string; review_note?: string }
  if (!body.status || !VALID_STATUS.has(body.status)) {
    return NextResponse.json({ error: 'status 값 오류 (pending/approved/rejected/resolved)' }, { status: 400 })
  }

  const { data: { user } } = await supabase.auth.getUser()
  const patch: Record<string, unknown> = {
    status: body.status,
    reviewed_by: user?.id ?? null,
    reviewed_at: new Date().toISOString(),
  }
  if (body.review_note !== undefined) patch.review_note = body.review_note

  const { data, error } = await supabase
    .from('venue_correction_requests')
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

  const { error } = await supabase.from('venue_correction_requests').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
