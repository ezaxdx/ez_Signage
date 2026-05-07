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
    const ok = window.confirm(
      `'${projectName}' 프로젝트를 삭제하시겠습니까?\n\n` +
      `· 모든 제작물·슬롯·이미지가 함께 삭제됩니다\n` +
      `· 초대된 팀원의 접근도 제거됩니다\n` +
      `· 되돌릴 수 없습니다`
    )
    if (!ok) return
    setIsDeleting(true)
    const supabase = createClient()
    try {
      // 1) item_contents 먼저 (design_items 참조)
      const { data: items } = await supabase.from('design_items').select('id').eq('project_id', projectId)
      const itemIds = (items ?? []).map(i => i.id)
      if (itemIds.length > 0) {
        await supabase.from('item_contents').delete().in('item_id', itemIds)
      }
      // 2) design_items
      await supabase.from('design_items').delete().eq('project_id', projectId)
      // 3) project_members
      await supabase.from('project_members').delete().eq('project_id', projectId)
      // 4) slot_styles
      await supabase.from('slot_styles').delete().eq('project_id', projectId)
      // 5) projects (CASCADE 적용 안 된 경우 대비 — 직접 마지막에)
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
