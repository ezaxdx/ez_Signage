// 환경장식물 종류 단건 수정·삭제 — admin 전용

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/auth/role'

export const runtime = 'nodejs'

interface RouteCtx { params: { id: string } }

export async function PATCH(req: NextRequest, { params }: RouteCtx) {
  const supabase = createClient()
  if (!await isAdmin(supabase)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const id = params.id
  if (!id) return NextResponse.json({ error: 'id 필수' }, { status: 400 })

  let body: Record<string, unknown>
  try { body = await req.json() } catch { return NextResponse.json({ error: 'invalid body' }, { status: 400 }) }

  // 표준 시드(is_standard=true)는 핵심 식별 필드(name) 변경 금지. 규격·재질·노트만 허용.
  const { data: existing } = await supabase
    .from('signage_types')
    .select('is_standard, name')
    .eq('id', id)
    .single()
  if (!existing) return NextResponse.json({ error: '항목 없음' }, { status: 404 })

  // v9.44: 숫자 필드 NaN 차단 + layout 유효값 검증
  const validLayouts = new Set(['세로', '가로', '정사각'])
  const patch: Record<string, unknown> = {}
  if (typeof body.default_material === 'string') patch.default_material = body.default_material
  if (typeof body.category === 'string')         patch.category         = body.category
  if (typeof body.layout === 'string') {
    if (!validLayouts.has(body.layout)) return NextResponse.json({ error: 'layout 값 오류 (세로/가로/정사각)' }, { status: 400 })
    patch.layout = body.layout
  }
  if (body.notes !== undefined)                  patch.notes            = body.notes === null || body.notes === '' ? null : String(body.notes)
  if (body.width_mm !== undefined) {
    const w = Number(body.width_mm)
    if (!Number.isFinite(w) || w <= 0) return NextResponse.json({ error: '너비(mm) 양수 필수' }, { status: 400 })
    patch.default_width_mm  = w
  }
  if (body.height_mm !== undefined) {
    const h = Number(body.height_mm)
    if (!Number.isFinite(h) || h <= 0) return NextResponse.json({ error: '높이(mm) 양수 필수' }, { status: 400 })
    patch.default_height_mm = h
  }
  if (body.sort_order !== undefined) {
    const s = Number(body.sort_order)
    if (!Number.isFinite(s)) return NextResponse.json({ error: 'sort_order 숫자 필수' }, { status: 400 })
    patch.sort_order = s
  }
  // 5/22 사용자 명시 = sample_image_url·hidden 영역 DB 영역 정합 (migration_v14 영역)
  if (typeof body.sample_image_url === 'string' || body.sample_image_url === null) patch.sample_image_url = body.sample_image_url
  // HOTFIX 2026-05-20: client는 body.is_hidden(v19 SOT)를 보냄. 기존 body.hidden(v14)만 받아 silent fail.
  //   v14(hidden)·v19(is_hidden) 두 컬럼 DB에 공존 → 양쪽 동기화로 호환 보장.
  if (typeof body.is_hidden === 'boolean') {
    patch.is_hidden = body.is_hidden
    patch.hidden = body.is_hidden
  } else if (typeof body.hidden === 'boolean') {
    patch.is_hidden = body.hidden
    patch.hidden = body.hidden
  }
  if (!existing.is_standard && typeof body.name === 'string') {
    const n = body.name.trim()
    if (!n) return NextResponse.json({ error: '이름 빈 값 불가' }, { status: 400 })
    patch.name = n
  }
  patch.updated_at = new Date().toISOString()

  const { data, error } = await supabase
    .from('signage_types')
    .update(patch)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true, item: data })
}

export async function DELETE(_req: NextRequest, { params }: RouteCtx) {
  const supabase = createClient()
  if (!await isAdmin(supabase)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const id = params.id
  if (!id) return NextResponse.json({ error: 'id 필수' }, { status: 400 })

  const { data: existing } = await supabase
    .from('signage_types')
    .select('is_standard, name')
    .eq('id', id)
    .single()
  if (!existing) return NextResponse.json({ error: '항목 없음' }, { status: 404 })
  if (existing.is_standard) {
    return NextResponse.json({ error: '표준 시드 항목은 삭제 불가' }, { status: 400 })
  }

  const { error } = await supabase.from('signage_types').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
