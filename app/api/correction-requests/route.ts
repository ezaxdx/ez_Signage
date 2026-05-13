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

  const body = await req.json() as {
    venue_key: string
    venue_name?: string
    correction_text: string
  }

  if (!body.correction_text?.trim()) {
    return NextResponse.json({ error: '내용 필요' }, { status: 400 })
  }

  const { error } = await supabase
    .from('venue_correction_requests')
    .insert({
      venue_key: body.venue_key,
      venue_name: body.venue_name,
      correction_text: body.correction_text.trim(),
      submitted_by: user?.id ?? null,
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
