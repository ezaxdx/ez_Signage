'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  projectId: string
  projectName: string
  isOwner: boolean
}

/** 프로젝트 삭제 — owner만 가능. 관련 design_items / item_contents / project_members 함께 삭제. */
export function DeleteProjectButton({ projectId, projectName, isOwner }: Props) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)

  if (!isOwner) return null

  const handleDelete = async () => {
    const supabase = createClient()
    // PR#1 단위 9a (δ 정책): 삭제 전 design_items 카운트 확인 → confirm 텍스트 분기.
    const { data: preItems } = await supabase
      .from('design_items')
      .select('id, category, quantity, width_mm, height_mm')
      .eq('project_id', projectId)
    const preCount = preItems?.length ?? 0
    const willPreserve = preCount >= 3

    const confirmMsg = willPreserve
      ? `'${projectName}' 프로젝트를 삭제합니다.\n\n행사명·환경장식물 사용 이력은 학습 데이터로 보존됩니다.\n· 운영 데이터(제작물·슬롯·이미지·팀원) cascade 삭제\n· 되돌릴 수 없습니다`
      : `'${projectName}' 프로젝트를 삭제합니다.\n\n(학습 데이터 보존 안 됨 — 입력 데이터 부족: ${preCount}건 < 3건)\n· 운영 데이터 cascade 삭제\n· 되돌릴 수 없습니다`

    const ok = window.confirm(confirmMsg)
    if (!ok) return
    setIsDeleting(true)
    try {
      // ── Step 1: design_items ≥3건이면 event_history 추출 + UPSERT (atomic — 실패 시 삭제 진행 안 함) ──
      const { data: project } = await supabase
        .from('projects')
        .select('id, name, client_name, event_venue, event_date, event_type, event_category, program_parts')
        .eq('id', projectId)
        .single()

      if (willPreserve && project) {
        // signage_breakdown 집계 (completeProject 패턴 정합)
        const sigByCategory = new Map<string, { quantity: number; sizes: Set<string> }>()
        for (const it of (preItems ?? []) as Array<{ category: string | null; quantity: number | null; width_mm: number | null; height_mm: number | null }>) {
          if (!it.category) continue
          const prev = sigByCategory.get(it.category) ?? { quantity: 0, sizes: new Set<string>() }
          prev.quantity += it.quantity ?? 1
          if (it.width_mm && it.height_mm) prev.sizes.add(`${it.width_mm}×${it.height_mm}`)
          sigByCategory.set(it.category, prev)
        }
        const signage_breakdown = Array.from(sigByCategory.entries())
          .map(([category, v]) => ({ category, quantity: v.quantity, sizes: Array.from(v.sizes).join('·') || undefined }))
          .sort((a, b) => b.quantity - a.quantity)

        const projWithParts = project as { name: string; event_date: string | null; event_venue: string | null; program_parts: string[] | null }
        const ehRes = await fetch('/api/event-history', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            project_code: projectId.slice(0, 12),
            project_name: projWithParts.name,
            year: projWithParts.event_date ? new Date(projWithParts.event_date).getFullYear() : new Date().getFullYear(),
            venue: projWithParts.event_venue || '미정',
            program_parts: projWithParts.program_parts ?? [],
            signage_breakdown,
            analyzed_item_count: preCount,
            source: 'manual_delete',
          }),
        })
        // 응답이 skipped(테이블 없음)면 OK·운영 영향 0. 진짜 오류만 abort.
        if (!ehRes.ok) {
          throw new Error(`event_history UPSERT 실패 (status ${ehRes.status}) — 삭제 중단`)
        }
      }

      // ── (legacy) project_archive 통계 스냅샷 — 마이그레이션 v4d 적용 환경에선 백워드 호환 ──
      if (project) {
        const itemCategories = Array.from(new Set((preItems ?? []).map(i => i.category).filter(Boolean))) as string[]
        const projLegacy = project as { name: string; client_name: string | null; event_venue: string | null; event_date: string | null; event_type: string | null; event_category: string | null }
        const { error: archiveErr } = await supabase.from('project_archive').insert({
          original_project_id: projectId,
          name: projLegacy.name,
          client_name: projLegacy.client_name,
          event_venue: projLegacy.event_venue,
          event_date: projLegacy.event_date,
          event_type: projLegacy.event_type,
          event_category: projLegacy.event_category,
          item_count: preCount,
          item_categories: itemCategories,
          reason: '사용자 삭제',
        })
        if (archiveErr) {
          console.warn('[Delete] project_archive 저장 실패 (테이블 없음 — skip):', archiveErr.message)
        }
      }

      // ── Step 2: Storage 이미지 cleanup (마스터 시안 + design_items.image_url) ──
      try {
        const { data: projForStorage } = await supabase
          .from('projects')
          .select('master_image_url')
          .eq('id', projectId)
          .single()
        const { data: itemsForStorage } = await supabase
          .from('design_items')
          .select('image_url')
          .eq('project_id', projectId)
        const urls: string[] = []
        if (projForStorage && typeof (projForStorage as { master_image_url?: string | null }).master_image_url === 'string') {
          urls.push((projForStorage as { master_image_url: string }).master_image_url)
        }
        for (const it of (itemsForStorage ?? []) as Array<{ image_url: string | null }>) {
          if (it.image_url) urls.push(it.image_url)
        }
        // Supabase Storage path 추출 (publicUrl → path)
        const paths = urls
          .map(u => {
            const m = u.match(/\/storage\/v1\/object\/public\/design-images\/(.+)$/)
            return m ? m[1] : null
          })
          .filter((p): p is string => !!p)
        if (paths.length > 0) {
          await supabase.storage.from('design-images').remove(paths)
        }
      } catch (e) {
        console.warn('[Delete] Storage cleanup 실패 (skip):', e)
      }

      // ── Step 3: 운영 데이터 cascade 삭제 ──
      const itemIds = (preItems ?? []).map(i => i.id)
      if (itemIds.length > 0) {
        await supabase.from('item_contents').delete().in('item_id', itemIds)
      }
      await supabase.from('design_items').delete().eq('project_id', projectId)
      await supabase.from('project_members').delete().eq('project_id', projectId)
      await supabase.from('slot_styles').delete().eq('project_id', projectId)
      const { error } = await supabase.from('projects').delete().eq('id', projectId)
      if (error) throw error
      router.refresh()
    } catch (err) {
      alert('삭제 실패: ' + (err instanceof Error ? err.message : '알 수 없는 오류'))
      setIsDeleting(false)
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isDeleting}
      className="flex items-center justify-center bg-slate-50 hover:bg-red-900/40 text-slate-500 hover:text-red-400 text-xs font-medium py-2 px-3 rounded-lg transition-all disabled:opacity-40"
      title="프로젝트 삭제 (Owner만)"
    >
      {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
    </button>
  )
}
