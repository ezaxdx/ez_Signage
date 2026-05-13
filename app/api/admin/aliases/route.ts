// 동의어 추가/삭제 API — 관리자 전용
// 회의록 ′환경장식물별 동의어 추가/삭제 가능′ 구현
// POST { alias_name, canonical_name, note? } → 신규 INSERT
// DELETE { id } → 삭제

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/auth/role'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })
  if (!(await isAdmin(supabase))) return NextResponse.json({ error: '관리자 권한 필요' }, { status: 403 })

  let body: { alias_name?: string; canonical_name?: string; note?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'invalid body' }, { status: 400 }) }
  const alias = body.alias_name?.trim()
  const canon = body.canonical_name?.trim()
  if (!alias || !canon) return NextResponse.json({ error: '별칭·표준명 필수' }, { status: 400 })

  const { data, error } = await supabase
    .from('signage_aliases')
    .insert({ alias_name: alias, canonical_name: canon, note: body.note?.trim() || null })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, data })
}

export async function DELETE(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })
  if (!(await isAdmin(supabase))) return NextResponse.json({ error: '관리자 권한 필요' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id 필수' }, { status: 400 })

  const { error } = await supabase.from('signage_aliases').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
