// PR#4 단위 2 (δ 정책): 미분류 카테고리 매핑 큐 API.
//
// GET    /api/admin/unmatched-categories         → 미해결 (resolved_at IS NULL) 누적 리스트
// POST   /api/admin/unmatched-categories         → { rawCategory, standardName } → resolveUnmatchedCategory
// DELETE /api/admin/unmatched-categories?raw=X   → 단순 무시 (resolved_at = now() + resolved_to = NULL)
//
// 모두 admin 권한 필요.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/auth/role'
import { resolveUnmatchedCategory } from '@/lib/services/normalizeCategory'

export const runtime = 'nodejs'

export async function GET() {
  const supabase = createClient()
  if (!(await isAdmin(supabase))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  try {
    const { data, error } = await supabase
      .from('unmatched_category_log')
      .select('id, raw_category, occurrences, first_seen, last_seen, sample_design_item_id')
      .is('resolved_at', null)
      .order('occurrences', { ascending: false })
      .limit(100)
    if (error) {
      if (error.code === '42P01') {
        return NextResponse.json({ items: [], fallback: true, error: '테이블 미적용 (migration_v19 실행 필요)' }, { status: 200 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ items: data ?? [] })
  } catch (e) {
    return NextResponse.json({ items: [], fallback: true, error: e instanceof Error ? e.message : 'unknown' }, { status: 200 })
  }
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  if (!(await isAdmin(supabase))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { data: { user } } = await supabase.auth.getUser()
  let body: { rawCategory?: string; standardName?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 })
  }
  if (!body.rawCategory?.trim() || !body.standardName?.trim()) {
    return NextResponse.json({ error: 'rawCategory·standardName 필수' }, { status: 400 })
  }
  const result = await resolveUnmatchedCategory(supabase, body.rawCategory, body.standardName, user?.id ?? null)
  if (result.error) {
    return NextResponse.json({ error: result.error, updatedCount: 0 }, { status: 400 })
  }
  return NextResponse.json({ ok: true, updatedCount: result.updatedCount })
}

export async function DELETE(req: NextRequest) {
  const supabase = createClient()
  if (!(await isAdmin(supabase))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const raw = req.nextUrl.searchParams.get('raw')
  if (!raw) return NextResponse.json({ error: 'raw 파라미터 필수' }, { status: 400 })
  const { data: { user } } = await supabase.auth.getUser()
  try {
    const { error } = await supabase
      .from('unmatched_category_log')
      .update({
        resolved_at: new Date().toISOString(),
        resolved_to: null,
        resolved_by: user?.id ?? null,
      })
      .eq('raw_category', raw)
      .is('resolved_at', null)
    if (error) {
      if (error.code === '42P01') return NextResponse.json({ skipped: true }, { status: 200 })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'unknown' }, { status: 500 })
  }
}
