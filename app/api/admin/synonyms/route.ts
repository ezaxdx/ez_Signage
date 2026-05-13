// 동의어 매핑 CRUD — admin 전용
// 실제 테이블: signage_aliases (v3에서 정의, 운영 SOT)
// GET    /api/admin/synonyms      → 전체 목록 (admin 컬렉션 조회 용도)
// POST   /api/admin/synonyms      → 신규 추가 (kind 명시 가능)
// PATCH  /api/admin/synonyms/[id] → 수정
// DELETE /api/admin/synonyms/[id] → 삭제
//
// v9.44 (2026-05-13): /api/admin/aliases 와 같은 테이블 운영.
//   - aliases route = LearningManagerClient 인라인 추가/삭제 (kind 기본 'banner')
//   - synonyms route = 상세 컬렉션 관리 (GET 전체 목록 + kind 명시 추가 + PATCH/DELETE [id])
//   둘 다 source='manual'로 저장 → adminMasterContext.ts가 합산.

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

  // v9.44: lower(alias_name) UNIQUE 인덱스(v9.37) 대비 — 중복 시 친절한 메시지
  const { data, error } = await supabase
    .from('signage_aliases')
    .insert({
      alias_name: alias,
      canonical_name: canon,
      kind: body.kind?.trim() || 'banner',   // NOT NULL 보호
      note: body.note?.trim() || null,
      source: 'manual',
    })
    .select()
    .single()

  if (error) {
    // 중복 UNIQUE 위반 (Postgres code 23505)은 409로 매핑
    const status = error.code === '23505' ? 409 : 400
    return NextResponse.json({ error: error.message }, { status })
  }
  return NextResponse.json({ ok: true, item: data })
}
