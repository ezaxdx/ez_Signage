// 환경장식물 종류 CRUD — admin 전용
// GET    /api/admin/signage-types        → 전체 목록(정렬 sort_order)
// POST   /api/admin/signage-types        → 신규 추가
// PATCH  /api/admin/signage-types/[id]   → 수정 (is_standard 표준 시드는 일부 필드 락)
// DELETE /api/admin/signage-types/[id]   → 삭제 (is_standard 보호)

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/auth/role'

export const runtime = 'nodejs'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const { data, error } = await supabase
    .from('signage_types')
    .select('id, name, default_width_mm, default_height_mm, default_material, category, layout, is_standard, sort_order, notes, updated_at')
    .order('sort_order', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ items: data ?? [] })
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  if (!await isAdmin(supabase)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { name, width_mm, height_mm, default_material, category, layout, notes } = body
  if (!name || !width_mm || !height_mm) {
    return NextResponse.json({ error: '이름·너비·높이 필수' }, { status: 400 })
  }

  const { data, error } = await supabase.from('signage_types').insert({
    name: String(name).trim(),
    default_width_mm: Number(width_mm),
    default_height_mm: Number(height_mm),
    default_material: default_material || '인쇄',
    category: category || '기타',
    layout: layout || '세로',
    notes: notes || null,
    is_standard: false,
    sort_order: 99,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true, item: data })
}
