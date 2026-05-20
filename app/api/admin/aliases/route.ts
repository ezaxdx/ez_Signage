// 동의어 추가/삭제 API — 관리자 전용
// 회의록 ′환경장식물별 동의어 추가/삭제 가능′ 구현
// POST { alias_name, canonical_name, kind?, note? } → 신규 INSERT
// DELETE { id } → 삭제
//
// v9.44 (2026-05-13): signage_aliases.kind NOT NULL 컬럼 (v3 schema) 누락 버그 수정.
// kind 미입력 시 'banner' 기본값. source는 RLS 정책상 'manual' 고정 (v9.37 시드는 'seed').

import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/auth/role'

export const runtime = 'nodejs'

// HOTFIX (2026-05-20 에러 4): GET 핸들러 추가 — query param hidden=true 처리
//   기본: 전체 aliases / hidden=true: is_hidden=true만 반환 (graceful column unknown)
export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const hiddenOnly = req.nextUrl.searchParams.get('hidden') === 'true'
  const fullSelect = 'id, alias_name, canonical_name, kind, source, note, is_hidden, created_at'
  let query = supabase.from('signage_aliases').select(fullSelect)
  if (hiddenOnly) query = query.eq('is_hidden', true)
  const first = await query.order('alias_name', { ascending: true })
  if (!first.error) {
    return NextResponse.json({ items: first.data ?? [] })
  }
  console.error('[admin/aliases] GET 1차 실패:', first.error.message, first.error.code)

  // is_hidden 컬럼 unknown 시 fallback
  if (/column .* is_hidden|column .* does not exist/i.test(first.error.message)) {
    const fallback = await supabase
      .from('signage_aliases')
      .select('id, alias_name, canonical_name, kind, source, note, created_at')
      .order('alias_name', { ascending: true })
    if (fallback.error) {
      return NextResponse.json({ items: [], fallback: true, error: fallback.error.message }, { status: 200 })
    }
    // hidden=true 요청이지만 컬럼 없음 = 빈 배열 반환
    if (hiddenOnly) return NextResponse.json({ items: [], fallback: true })
    return NextResponse.json({ items: fallback.data ?? [], fallback: true })
  }

  return NextResponse.json({ items: [], error: first.error.message, code: first.error.code, fallback: true }, { status: 200 })
}

// HOTFIX (2026-05-20 단위 5): PATCH 핸들러 — is_hidden 토글
export async function PATCH(req: NextRequest) {
  const supabase = createClient()
  if (!(await isAdmin(supabase))) return NextResponse.json({ error: '관리자 권한 필요' }, { status: 403 })
  let body: { alias_name?: string; id?: string; is_hidden?: boolean }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'invalid body' }, { status: 400 }) }
  const matcher = body.id ? { id: body.id } : body.alias_name ? { alias_name: body.alias_name } : null
  if (!matcher) return NextResponse.json({ error: 'id 또는 alias_name 필수' }, { status: 400 })
  const patch: Record<string, unknown> = {}
  if (typeof body.is_hidden === 'boolean') patch.is_hidden = body.is_hidden
  if (Object.keys(patch).length === 0) return NextResponse.json({ error: 'patch 필드 없음' }, { status: 400 })
  const { error } = await supabase.from('signage_aliases').update(patch).match(matcher)
  if (error) {
    if (/column .* is_hidden|column .* does not exist/i.test(error.message)) {
      return NextResponse.json({ skipped: true, error: error.message }, { status: 200 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}

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
