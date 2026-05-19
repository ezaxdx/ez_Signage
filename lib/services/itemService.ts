import { pickDefaultSlots } from '@/lib/types'
import { findLayoutDNA, type LayoutDNAEntry } from '@/lib/data/dashboardSeed'
import type { SupabaseClient } from '@supabase/supabase-js'

// 5/22 김연아 대리님 명시 = 엑셀 SOT 12 카테고리만 영역. I배너·A4·A3 영역 = 폼보드·피켓보드 영역 영역 매핑.
const CATEGORY_TO_DNA_TYPE: Record<string, string> = {
  'X배너':         'x_banner',
  'X-배너':        'x_banner',
  '가로등 배너':   'streetlight_banner',
  '가로 현수막':   'horizontal_banner',
  '세로 현수막':   'vertical_banner',
  '통천':          'chunchen_banner',
  '통천 배너':     'chunchen_banner',
  '포디움 타이틀': 'podium',
  '동선 배너':     'route_banner',
  '동선 안내 배너': 'route_banner',
  '동선배너':      'route_banner',
  // 5/22 신규 5건
  '시상보드':      'award_board',
  'Q방':           'q_room',
  '디지털 사이니지': 'digital_signage',
  '폼보드':        'foam_board',
  'L보드':         'foam_board',
  '피켓보드':      'picket_board',
}

/** 카테고리(한글) → SEED_LAYOUT_DNA 적합 항목 조회. 없으면 null. */
function findDnaForCategory(category: string | null): LayoutDNAEntry | null {
  if (!category) return null
  // 정확 매치
  const exactKey = CATEGORY_TO_DNA_TYPE[category]
  if (exactKey) {
    const dna = findLayoutDNA(exactKey)
    if (dna) return dna
  }
  // 부분 매치 (사용자가 "X-배너 정문" 같이 자유 입력했을 때)
  for (const [koLabel, typeId] of Object.entries(CATEGORY_TO_DNA_TYPE)) {
    if (category.includes(koLabel)) {
      const dna = findLayoutDNA(typeId)
      if (dna) return dna
    }
  }
  return null
}

/** 0~1000 bbox → 0~100% 슬롯 좌표(중심+너비) 변환 */
function dnaSlotToSlotContent(dnaSlot: { key: string; label: string; role: string; box: { xmin: number; ymin: number; xmax: number; ymax: number } }) {
  const { xmin, ymin, xmax, ymax } = dnaSlot.box
  const cx = ((xmin + xmax) / 2) / 10  // 중심 x in %
  const cy = ((ymin + ymax) / 2) / 10  // 중심 y in %
  const w = ((xmax - xmin)) / 10       // 너비 %
  // 역할별 폰트 크기 가이드
  const fontByRole: Record<string, number> = { logo: 13, title: 38, subtitle: 20, body: 16, footer: 11, image: 13, arrow: 24, qr: 13 }
  return {
    label: dnaSlot.label,
    ko: '',
    en: '',
    x: Math.round(cx),
    y: Math.round(cy),
    w: Math.round(w),
    fontSize: fontByRole[dnaSlot.role] ?? 16,
  }
}

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

  // 2) 마스터 없으면 SEED_LAYOUT_DNA 우선 (Vision 분석 기반 종류별 슬롯)
  //    매칭 안 되면 규격 기반 기본 레이아웃 fallback
  const fontSizes = projectId ? await fetchProjectFontSizes(supabase, projectId) : {}
  const dna = findDnaForCategory(info.category)

  if (dna) {
    const rows = dna.slots.map(dnaSlot => {
      const slot = dnaSlotToSlotContent(dnaSlot)
      return {
        item_id: itemId,
        slot_key: dnaSlot.key,
        slot_value: JSON.stringify({
          ...slot,
          fontSize: fontSizes[dnaSlot.key] ?? slot.fontSize,
        }),
      }
    })
    await supabase.from('item_contents').insert(rows)
    return
  }

  // 3) Fallback — 규격 기반 기본 레이아웃 (DNA 없는 종류)
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

// ══════════════════════════════════════════════════════
// setAsMaster — 에디터 상단 툴바의 "👑 마스터로 지정" 버튼
// 역할 구분 (3가지 전파 함수 중 #3):
//   • [#1] handleApplyStyleToAll (에디터 SlotPanel) — 프로젝트 전체 같은 slot_key의 fontSize·y만
//   • [#2] handleMasterBroadcast (/info 페이지 🎯) — slot_styles 테이블이 소스, 프로젝트 전체
//   • [#3] 이 함수 — 같은 category 범위만, 이 아이템의 모든 슬롯을 복제 (ko/en 텍스트만 유지)
// 사용 시점: "X배너 한 장 완성했고 다른 X배너들도 똑같이"
// ══════════════════════════════════════════════════════
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
