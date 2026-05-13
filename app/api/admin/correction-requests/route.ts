// 수정요청(venue_correction_requests) 관리자 CRUD
// GET    /api/admin/correction-requests?status=pending  → 상태별 조회
// POST   /api/admin/correction-requests                 → 신규 등록(관리자가 대리 입력 시)
// PATCH  /api/admin/correction-requests/[id]            → status 변경(approved/rejected/resolved)
// DELETE /api/admin/correction-requests/[id]            → 삭제
//
// 일반 사용자 제출은 기존 /api/correction-requests POST 유지

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/auth/role'

export const runtime = 'nodejs'

const VALID_STATUS = new Set(['pending','approved','rejected','resolved','all'])

export async function GET(req: NextRequest) {
  const supabase = createClient()
  if (!await isAdmin(supabase)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const status = req.nextUrl.searchParams.get('status') ?? 'pending'
  if (!VALID_STATUS.has(status)) {
    return NextResponse.json({ error: 'status 값 오류' }, { status: 400 })
  }

  let q = supabase
    .from('venue_correction_requests')
    .select('id, venue_key, venue_name, correction_text, submitted_by, status, reviewed_by, review_note, created_at, reviewed_at')
    .order('created_at', { ascending: false })
    .limit(200)

  if (status !== 'all') q = q.eq('status', status)

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ items: data ?? [] })
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  if (!await isAdmin(supabase)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data: { user } } = await supabase.auth.getUser()
  let body: { venue_key?: string; venue_name?: string; correction_text?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'invalid body' }, { status: 400 }) }
  if (!body.venue_key || !body.correction_text?.trim()) {
    return NextResponse.json({ error: 'venue_key·correction_text 필수' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('venue_correction_requests')
    .insert({
      venue_key: body.venue_key,
      venue_name: body.venue_name ?? null,
      correction_text: body.correction_text.trim(),
      submitted_by: user?.id ?? null,
      status: 'pending',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true, item: data })
}
