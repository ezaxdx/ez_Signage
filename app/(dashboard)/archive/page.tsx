import { redirect } from 'next/navigation'
import Link from 'next/link'
import { LayoutGrid, ArrowLeft, Archive } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { ArchiveClient } from './ArchiveClient'

interface ItemRow {
  id: string
  no: string
  project_id: string
  category: string | null
  part: string | null
  location: string | null
  purpose: string | null
  last_edited_by: string | null
  review_status: string | null
  review_note: string | null
  completed: boolean | null
  updated_at: string
  projects: { name: string } | null
  item_contents: { slot_key: string; slot_value: string | null }[]
}

export default async function ArchivePage() {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data } = await supabase
    .from('design_items')
    .select(`
      id, no, project_id, category, part, location, purpose, last_edited_by,
      review_status, review_note, completed, updated_at,
      projects:project_id (name),
      item_contents (slot_key, slot_value)
    `)
    .order('updated_at', { ascending: false })
    .limit(500)

  const items = (data ?? []) as unknown as ItemRow[]

  return (
    <div className="min-h-screen bg-slate-950">
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Link
              href="/dashboard"
              className="w-6 h-6 rounded-md bg-indigo-600 hover:bg-indigo-500 flex items-center justify-center transition"
              title="메인 대시보드로 이동"
            >
              <LayoutGrid className="w-3.5 h-3.5 text-white" />
            </Link>
            <Link href="/dashboard" className="flex items-center gap-1 text-slate-500 hover:text-slate-300 transition text-xs">
              <ArrowLeft className="w-3.5 h-3.5" />
              대시보드
            </Link>
            <span className="text-slate-700 text-xs">/</span>
            <span className="text-slate-300 text-xs font-medium">검수 · 저장 제작물</span>
          </div>
          <span className="text-slate-500 text-xs">{items.length}개</span>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center gap-2 mb-5">
          <Archive className="w-4 h-4 text-indigo-400" />
          <h1 className="text-slate-200 font-semibold text-sm">전체 제작물 검수 대시보드</h1>
          <span className="text-slate-600 text-xs ml-2">총괄 담당자용 — 진행 상태 한눈에 확인 + 일괄 관리</span>
        </div>

        <ArchiveClient initialItems={items} />
      </main>
    </div>
  )
}
