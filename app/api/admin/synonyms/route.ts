// 동의어 매핑 CRUD — admin 전용
// 실제 테이블: signage_aliases (v3에서 정의, 운영 SOT)
// GET    /api/admin/synonyms      → 전체 목록
// POST   /api/admin/synonyms      → 신규 추가
// PATCH  /api/admin/synonyms/[id] → 수정
// DELETE /api/admin/synonyms/[id] → 삭제

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/auth/role'

export const runtime = 'nodejs'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const { data, error } = await supabase
    .from('signage_aliases')
    .select('id, alias_name, canonical_name, kind, source, note, created_at')
    .order('canonical_name', { ascending: true })
    .order('alias_name', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ items: data ?? [] })
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  if (!await isAdmin(supabase)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

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
      kind: body.kind?.trim() || 'banner',
      note: body.note?.trim() || null,
      source: 'manual',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true, item: data })
}
