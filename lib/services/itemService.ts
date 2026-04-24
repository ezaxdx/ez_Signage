import { pickDefaultSlots } from '@/lib/types'
import type { SupabaseClient } from '@supabase/supabase-js'

/** 프로젝트의 slot_styles 폰트 크기를 가져와 DEFAULT_SLOTS에 병합 */
async function fetchProjectFontSizes(
  supabase: SupabaseClient,
  projectId: string
): Promise<Record<string, number>> {
  const { data } = await supabase
    .from('slot_styles')
    .select('slot_key, font_size')
    .eq('project_id', projectId)
  const map: Record<string, number> = {}
  for (const row of data ?? []) map[row.slot_key] = row.font_size
  return map
}

async function fetchItem(
  supabase: SupabaseClient,
  itemId: string
): Promise<{ category: string | null; project_id: string; width_mm: number | null; height_mm: number | null } | null> {
  const { data } = await supabase
    .from('design_items')
    .select('category, project_id, width_mm, height_mm')
    .eq('id', itemId)
    .single()
  return data
}

/** 같은 프로젝트 + category의 마스터 item_contents를 가져옴 */
async function fetchMasterContents(
  supabase: SupabaseClient,
  projectId: string,
  category: string
): Promise<Array<{ slot_key: string; slot_value: string | null }> | null> {
  const { data: master } = await supabase
    .from('design_items')
    .select('id')
    .eq('project_id', projectId)
    .eq('category', category)
    .eq('is_master', true)
    .maybeSingle()
  if (!master) return null

  const { data: contents } = await supabase
    .from('item_contents')
    .select('slot_key, slot_value')
    .eq('item_id', master.id)
  return contents
}

/** 새 아이템에 슬롯 삽입 — 마스터 우선, 없으면 규격 기반 기본값 */
export async function insertDefaultSlotsForItem(
  supabase: SupabaseClient,
  itemId: string,
  projectId?: string
): Promise<void> {
  const info = await fetchItem(supabase, itemId)
  if (!info) return

  // 1) 같은 category에 마스터가 있으면 그대로 복제 (ko/en 제외)
  if (projectId && info.category) {
    const masterContents = await fetchMasterContents(supabase, projectId, info.category)
    if (masterContents && masterContents.length > 0) {
      const rows = masterContents.map(c => {
        let slot: any = {}
        try { slot = JSON.parse(c.slot_value ?? '{}') } catch {}
        // 텍스트 내용은 비우고 서식/위치/이미지만 승계
        return {
          item_id: itemId,
          slot_key: c.slot_key,
          slot_value: JSON.stringify({ ...slot, ko: '', en: '' }),
        }
      })
      await supabase.from('item_contents').insert(rows)
      return
    }
  }

  // 2) 마스터 없으면 기본 레이아웃 사용 (프로젝트 slot_styles 폰트 적용)
  const fontSizes = projectId ? await fetchProjectFontSizes(supabase, projectId) : {}
  const slots = pickDefaultSlots(info.width_mm, info.height_mm)

  const rows = Object.entries(slots).map(([slot_key, slot]) => ({
    item_id: itemId,
    slot_key,
    slot_value: JSON.stringify({
      ...slot,
      fontSize: fontSizes[slot_key] ?? slot.fontSize,
    }),
  }))
  await supabase.from('item_contents').insert(rows)
}

/** 여러 아이템에 규격별 기본 슬롯 일괄 삽입 */
export async function insertDefaultSlotsForItems(
  supabase: SupabaseClient,
  itemIds: string[],
  projectId?: string
): Promise<void> {
  if (itemIds.length === 0) return
  for (const id of itemIds) {
    await insertDefaultSlotsForItem(supabase, id, projectId)
  }
}

/** 특정 아이템을 해당 category의 마스터로 지정 + 같은 category의 나머지에 서식 전파 */
export async function setAsMaster(
  supabase: SupabaseClient,
  itemId: string
): Promise<{ propagated: number; error?: string }> {
  const info = await fetchItem(supabase, itemId)
  if (!info || !info.category) return { propagated: 0, error: 'category 없음' }

  // 1) 기존 같은 category의 is_master 해제
  await supabase
    .from('design_items')
    .update({ is_master: false })
    .eq('project_id', info.project_id)
    .eq('category', info.category)

  // 2) 새 마스터 지정
  const { error: masterErr } = await supabase
    .from('design_items')
    .update({ is_master: true })
    .eq('id', itemId)
  if (masterErr) return { propagated: 0, error: masterErr.message }

  // 3) 마스터의 item_contents 읽기
  const { data: masterContents } = await supabase
    .from('item_contents')
    .select('slot_key, slot_value')
    .eq('item_id', itemId)

  if (!masterContents || masterContents.length === 0) return { propagated: 0 }

  // 4) 같은 category의 다른 아이템들 ID 조회
  const { data: siblings } = await supabase
    .from('design_items')
    .select('id')
    .eq('project_id', info.project_id)
    .eq('category', info.category)
    .neq('id', itemId)

  if (!siblings || siblings.length === 0) return { propagated: 0 }

  // 5) 각 sibling의 item_contents를 마스터 스타일로 덮어쓰기 (ko/en 텍스트는 유지)
  const siblingIds = siblings.map(s => s.id)

  const { data: existingSiblingContents } = await supabase
    .from('item_contents')
    .select('item_id, slot_key, slot_value')
    .in('item_id', siblingIds)

  // 기존 sibling 텍스트 맵: itemId + slotKey → { ko, en }
  const existingTextMap = new Map<string, { ko: string; en: string; images?: string[] }>()
  for (const row of existingSiblingContents ?? []) {
    try {
      const s = JSON.parse(row.slot_value ?? '{}')
      existingTextMap.set(`${row.item_id}:${row.slot_key}`, {
        ko: s.ko ?? '',
        en: s.en ?? '',
        images: s.images,
      })
    } catch {}
  }

  // 슬롯별 기본 힌트 (팀원에게 "여기에 입력" 안내)
  const DEFAULT_PLACEHOLDERS: Record<string, string> = {
    header_brand: '주최기관 / 로고',
    hero_title: '행사명 입력',
    sub_title: '부제·슬로건 입력',
    body: '여기에 본문 내용 입력',
    arrow: '방향 지시 (←/→)',
    qr_code: 'QR 코드',
    footer_credits: '후원사·크레딧',
  }

  const upserts = siblingIds.flatMap(sid =>
    masterContents.map(mc => {
      let masterSlot: any = {}
      try { masterSlot = JSON.parse(mc.slot_value ?? '{}') } catch {}
      const existing = existingTextMap.get(`${sid}:${mc.slot_key}`)
      // 마스터 슬롯에 placeholder 없으면 기본 힌트 부여
      const placeholder = masterSlot.placeholder
        ?? DEFAULT_PLACEHOLDERS[mc.slot_key]
        ?? `${masterSlot.label ?? mc.slot_key} 입력`

      return {
        item_id: sid,
        slot_key: mc.slot_key,
        slot_value: JSON.stringify({
          ...masterSlot,
          placeholder,
          ko: existing?.ko ?? '',
          en: existing?.en ?? '',
          images: existing?.images ?? masterSlot.images,
        }),
      }
    })
  )

  if (upserts.length > 0) {
    await supabase.from('item_contents').upsert(upserts, { onConflict: 'item_id,slot_key' })
  }
  return { propagated: siblingIds.length }
}

/** 마스터 해제 */
export async function unsetMaster(supabase: SupabaseClient, itemId: string): Promise<void> {
  await supabase.from('design_items').update({ is_master: false }).eq('id', itemId)
}
