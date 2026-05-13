// 행사장 시설 가이드 수정 요청 API
// POST → venue_correction_requests INSERT (인증 사용자)
// GET  → pending 목록 조회 (관리자만)

import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'
import { isAdmin } from '@/lib/auth/role'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  // v9.44: 인증 사용자만 제출 허용 (이전: 비로그인도 INSERT 시도 가능했음 — RLS가 막아도 명시적 거부가 더 안전)
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  let body: { venue_key?: string; venue_name?: string; correction_text?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'invalid body' }, { status: 400 }) }

  if (!body.venue_key?.trim()) {
    return NextResponse.json({ error: 'venue_key 필요' }, { status: 400 })
  }
  if (!body.correction_text?.trim()) {
    return NextResponse.json({ error: '내용 필요' }, { status: 400 })
  }

  const { error } = await supabase
    .from('venue_correction_requests')
    .insert({
      venue_key:       body.venue_key.trim(),
      venue_name:      body.venue_name?.trim() || null,
      correction_text: body.correction_text.trim(),
      submitted_by:    user.id,
    })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const admin = await isAdmin(supabase)
  if (!admin) return NextResponse.json({ error: '권한 없음' }, { status: 403 })

  const status = req.nextUrl.searchParams.get('status') ?? 'pending'
  const { data, error } = await supabase
    .from('venue_correction_requests')
    .select('*')
    .eq('status', status)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
