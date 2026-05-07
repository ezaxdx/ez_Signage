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

/** 프로젝트 삭제 — 모든 멤버 가능 (정책: 누구나 설정·삭제). 관련 design_items / item_contents / project_members 함께 삭제. */
export function DeleteProjectButton({ projectId, projectName, isOwner }: Props) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)

  // owner 체크 제거 — 모든 프로젝트 멤버가 삭제 가능 (사용자 정책 결정 2026-05-07)

  const handleDelete = async () => {
    const ok = window.confirm(
      `'${projectName}' 프로젝트를 삭제하시겠습니까?\n\n` +
      (!isOwner ? `⚠️ 본인이 만든 프로젝트가 아닙니다 (초대받은 멤버)\n\n` : '') +
      `· 모든 제작물·슬롯·이미지가 함께 삭제됩니다\n` +
      `· 초대된 팀원의 접근도 제거됩니다\n` +
      `· 되돌릴 수 없습니다`
    )
    if (!ok) return
    setIsDeleting(true)
    const supabase = createClient()
    try {
      // ── 0) 삭제 전 통계 스냅샷 (project_archive에 저장) ──
      // 정책: 프로젝트 삭제해도 데이터 수치는 데이터 관리에 남도록
      const { data: project } = await supabase
        .from('projects')
        .select('id, name, client_name, event_venue, event_date, event_type, event_category')
        .eq('id', projectId)
        .single()

      const { data: items } = await supabase
        .from('design_items')
        .select('id, category')
        .eq('project_id', projectId)

      const itemIds = (items ?? []).map(i => i.id)
      const itemCount = items?.length ?? 0
      const itemCategories = Array.from(new Set((items ?? []).map(i => i.category).filter(Boolean))) as string[]

      if (project) {
        const { error: archiveErr } = await supabase.from('project_archive').insert({
          original_project_id: projectId,
          name: project.name,
          client_name: project.client_name,
          event_venue: project.event_venue,
          event_date: project.event_date,
          event_type: project.event_type,
          event_category: project.event_category,
          item_count: itemCount,
          item_categories: itemCategories,
          reason: '사용자 삭제',
        })
        if (archiveErr) {
          console.warn('[Delete] 아카이브 저장 실패 (테이블 없을 수 있음):', archiveErr.message)
          // 마이그레이션 v4d 미실행 시 테이블 없음 → 그냥 진행 (삭제는 계속)
        } else {
          console.log(`[Delete] ✓ 아카이브 저장됨 (${itemCount}개 제작물 통계 보존)`)
        }
      }

      // 1) item_contents 먼저 (design_items 참조)
      if (itemIds.length > 0) {
        await supabase.from('item_contents').delete().in('item_id', itemIds)
      }
      // 2) design_items
      await supabase.from('design_items').delete().eq('project_id', projectId)
      // 3) project_members
      await supabase.from('project_members').delete().eq('project_id', projectId)
      // 4) slot_styles
      await supabase.from('slot_styles').delete().eq('project_id', projectId)
      // 5) projects
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
      className="flex items-center justify-center bg-slate-800 hover:bg-red-900/40 text-slate-500 hover:text-red-400 text-xs font-medium py-2 px-3 rounded-lg transition-all disabled:opacity-40"
      title="프로젝트 삭제 (Owner만)"
    >
      {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
    </button>
  )
}
