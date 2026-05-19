// 5/22 사용자 명시 = 프로그램 파트 관리 영역 REST endpoint
// GET·POST·PATCH·DELETE 영역. 시드 영역 override + 신규 영역.

import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/auth/role'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface ProgramPartOverride {
  code: string
  name: string | null
  hint: string | null
  group_name: 'program' | 'attendee' | 'promotion' | null
  hidden: boolean
  is_custom: boolean
}

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ items: [] }, { status: 200 })

  const { data, error } = await supabase
    .from('program_parts_overrides')
    .select('*')
  if (error) {
    console.error('[program-parts] GET 실패:', error.message)
    return NextResponse.json({ items: [], error: error.message })
  }
  return NextResponse.json({ items: (data ?? []) as ProgramPartOverride[] })
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })
  if (!(await isAdmin(supabase))) return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 })

  const body = await req.json().catch(() => null) as Partial<ProgramPartOverride> | null
  if (!body?.name?.trim() || !body.group_name) {
    return NextResponse.json({ error: '파트명·분류 필수' }, { status: 400 })
  }
  const code = body.code || 'custom_' + Date.now().toString(36)
  const row = {
    code,
    name: body.name,
    hint: body.hint ?? '',
    group_name: body.group_name,
    hidden: false,
    is_custom: !body.code || body.code.startsWith('custom_'),
    edited_by: user.id,
    updated_at: new Date().toISOString(),
  }
  const { data, error } = await supabase
    .from('program_parts_overrides')
    .upsert(row)
    .select()
    .single()
  if (error) {
    console.error('[program-parts] POST 실패:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ item: data })
}

export async function PATCH(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })
  if (!(await isAdmin(supabase))) return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 })

  const body = await req.json().catch(() => null) as { code: string; patch: Partial<ProgramPartOverride> } | null
  if (!body?.code) return NextResponse.json({ error: 'code 필수' }, { status: 400 })

  const updateRow = { ...body.patch, edited_by: user.id, updated_at: new Date().toISOString() }
  const { data, error } = await supabase
    .from('program_parts_overrides')
    .upsert({ code: body.code, ...updateRow })
    .select()
    .single()
  if (error) {
    console.error('[program-parts] PATCH 실패:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ item: data })
}

export async function DELETE(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })
  if (!(await isAdmin(supabase))) return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 })

  const body = await req.json().catch(() => null) as { code: string } | null
  if (!body?.code) return NextResponse.json({ error: 'code 필수' }, { status: 400 })

  const { error } = await supabase
    .from('program_parts_overrides')
    .upsert({ code: body.code, hidden: true, edited_by: user.id, updated_at: new Date().toISOString() })
  if (error) {
    console.error('[program-parts] DELETE 실패:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
