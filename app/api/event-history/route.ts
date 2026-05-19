// 5/22 사용자 명시 = 행사 관리 영역 REST endpoint. SEED + 사용자 편집·삭제·추가 + 자동 누적 영역.
// GET·POST·PATCH·DELETE 영역. RLS = 인증 사용자만.

import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface SignageBreakdownItem {
  category: string
  quantity: number
  sizes?: string
}

interface EventHistoryRow {
  id: string
  project_code: string | null
  project_name: string
  year: number | null
  venue: string
  category_tag: string
  program_parts: string[]
  signage_breakdown: SignageBreakdownItem[]
  analyzed_item_count: number | null
  is_seed: boolean
  source: string
  created_by: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
  edit_history: unknown[]
}

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ items: [], error: '로그인이 필요합니다' }, { status: 200 })

  try {
    const { data, error } = await supabase
      .from('event_history')
      .select('*')
      .is('deleted_at', null)
      .order('year', { ascending: false })
      .limit(500)

    if (error) {
      // 5/22 = 테이블 부재 (42P01) 또는 RLS 차단 = fallback (빈 배열·200·SEED 영역 그대로 동작)
      console.error('[event-history] GET 실패:', error.message, error.code)
      return NextResponse.json({ items: [], error: error.message, code: error.code, fallback: true }, { status: 200 })
    }
    return NextResponse.json({ items: (data ?? []) as EventHistoryRow[] })
  } catch (e) {
    console.error('[event-history] GET Exception:', e)
    return NextResponse.json({ items: [], error: e instanceof Error ? e.message : 'unknown', fallback: true }, { status: 200 })
  }
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })

  let body: Partial<EventHistoryRow>
  try { body = await req.json() } catch { return NextResponse.json({ error: '잘못된 요청 본문' }, { status: 400 }) }

  if (!body.project_name?.trim() || !body.venue?.trim()) {
    return NextResponse.json({ error: '행사명·행사장 필수' }, { status: 400 })
  }

  const insertRow = {
    project_code: body.project_code ?? null,
    project_name: body.project_name,
    year: body.year ?? null,
    venue: body.venue,
    category_tag: body.category_tag ?? '일반',
    program_parts: body.program_parts ?? [],
    signage_breakdown: body.signage_breakdown ?? [],
    analyzed_item_count: body.analyzed_item_count ?? null,
    is_seed: false,
    source: body.source ?? 'manual',
    created_by: user.id,
  }

  try {
    const { data, error } = await supabase
      .from('event_history')
      .insert(insertRow)
      .select()
      .single()

    if (error) {
      // 테이블 부재 (42P01) = silent skip·200 (auto_project 영역 = 라이브 영향 0)
      console.error('[event-history] POST 실패:', error.message, error.code)
      if (error.code === '42P01' || error.code === '42501') {
        return NextResponse.json({ skipped: true, error: error.message, code: error.code }, { status: 200 })
      }
      return NextResponse.json({ error: error.message, code: error.code }, { status: 500 })
    }
    return NextResponse.json({ item: data })
  } catch (e) {
    console.error('[event-history] POST Exception:', e)
    return NextResponse.json({ skipped: true, error: e instanceof Error ? e.message : 'unknown' }, { status: 200 })
  }
}

export async function PATCH(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })

  let body: { project_code?: string; id?: string; patch: Partial<EventHistoryRow> }
  try { body = await req.json() } catch { return NextResponse.json({ error: '잘못된 요청 본문' }, { status: 400 }) }

  if (!body.project_code && !body.id) {
    return NextResponse.json({ error: 'project_code 또는 id 영역 필수' }, { status: 400 })
  }

  try {
    const queryEq = body.id ? { id: body.id } : { project_code: body.project_code as string }
    const { data: existing, error: fetchErr } = await supabase
      .from('event_history')
      .select('*')
      .match(queryEq)
      .maybeSingle()
    if (fetchErr) {
      if (fetchErr.code === '42P01') {
        return NextResponse.json({ skipped: true, error: fetchErr.message, code: fetchErr.code }, { status: 200 })
      }
      return NextResponse.json({ error: fetchErr.message, code: fetchErr.code }, { status: 500 })
    }
    if (!existing) {
      return NextResponse.json({ error: '해당 행사 영역 없음' }, { status: 404 })
    }

    const newHistory = [...(existing.edit_history ?? []), {
      edited_by: user.id,
      edited_at: new Date().toISOString(),
      before: { project_name: existing.project_name, venue: existing.venue, program_parts: existing.program_parts },
      after: body.patch,
    }]
    const updateRow = { ...body.patch, edit_history: newHistory, updated_at: new Date().toISOString() }
    const { data, error } = await supabase
      .from('event_history')
      .update(updateRow)
      .match(queryEq)
      .select()
      .single()
    if (error) {
      console.error('[event-history] PATCH 실패:', error.message)
      return NextResponse.json({ error: error.message, code: error.code }, { status: 500 })
    }
    return NextResponse.json({ item: data })
  } catch (e) {
    console.error('[event-history] PATCH Exception:', e)
    return NextResponse.json({ error: e instanceof Error ? e.message : 'unknown' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })

  let body: { project_code?: string; id?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: '잘못된 요청 본문' }, { status: 400 }) }

  const queryEq = body.id ? { id: body.id } : body.project_code ? { project_code: body.project_code } : null
  if (!queryEq) return NextResponse.json({ error: 'project_code 또는 id 영역 필수' }, { status: 400 })

  try {
    const { error } = await supabase
      .from('event_history')
      .update({ deleted_at: new Date().toISOString() })
      .match(queryEq)

    if (error) {
      console.error('[event-history] DELETE 실패:', error.message)
      if (error.code === '42P01') {
        return NextResponse.json({ skipped: true, error: error.message, code: error.code }, { status: 200 })
      }
      return NextResponse.json({ error: error.message, code: error.code }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[event-history] DELETE Exception:', e)
    return NextResponse.json({ skipped: true, error: e instanceof Error ? e.message : 'unknown' }, { status: 200 })
  }
}
