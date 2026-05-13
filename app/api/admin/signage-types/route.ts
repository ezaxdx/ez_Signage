import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/auth/role'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  if (!await isAdmin(supabase)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { name, width_mm, height_mm, default_material, category, layout, notes } = body
  if (!name || !width_mm || !height_mm) {
    return NextResponse.json({ error: '이름·너비·높이 필수' }, { status: 400 })
  }

  const { error } = await supabase.from('signage_types').insert({
    name,
    default_width_mm: Number(width_mm),
    default_height_mm: Number(height_mm),
    default_material: default_material || '인쇄',
    category: category || '기타',
    layout: layout || '세로',
    notes: notes || null,
    is_standard: false,
    sort_order: 99,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  if (!await isAdmin(supabase)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { name } = await req.json()
  if (!name) return NextResponse.json({ error: 'name 필수' }, { status: 400 })

  const { error } = await supabase
    .from('signage_types')
    .delete()
    .eq('name', name)
    .eq('is_standard', false)  // 표준 시드 항목은 삭제 불가

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
