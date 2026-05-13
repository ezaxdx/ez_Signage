// 동의어 추가/삭제 API — 관리자 전용
// 회의록 ′환경장식물별 동의어 추가/삭제 가능′ 구현
// POST { alias_name, canonical_name, kind?, note? } → 신규 INSERT
// DELETE { id } → 삭제
//
// v9.44 (2026-05-13): signage_aliases.kind NOT NULL 컬럼 (v3 schema) 누락 버그 수정.
// kind 미입력 시 'banner' 기본값. source는 RLS 정책상 'manual' 고정 (v9.37 시드는 'seed').

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/auth/role'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  const supabase = createClient()
  if (!(await isAdmin(supabase))) return NextResponse.json({ error: '관리자 권한 필요' }, { status: 403 })

  let body: { alias_name?: string; canonical_name?: string; kind?: string; note?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'invalid body' }, { status: 400 }) }
  const alias = body.alias_name?.trim()
  const canon = body.canonical_name?.trim()
  if (!alias || !canon) return NextResponse.json({ error: '별칭·표준명 필수' }, { status: 400 })

  const { data, error } = await supabase
    .from('signage_aliases')
    .insert({
      alias_name: alias,
      canonical_name: canon,
      kind: body.kind?.trim() || 'banner',    // v9.44: NOT NULL 컬럼 보호 — 기본값 'banner'
      source: 'manual',                        // adminMasterContext.ts가 source='manual'만 합산
      note: body.note?.trim() || null,
    })
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
