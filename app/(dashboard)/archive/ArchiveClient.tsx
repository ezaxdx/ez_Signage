'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { ExternalLink, MessageSquarePlus } from 'lucide-react'

type ReviewStatus = '작업중' | '확인필요' | '검수완료' | '발주완료' | '수정요청'

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

const STATUS_COLORS: Record<ReviewStatus, string> = {
  '작업중':   'bg-slate-700/50 text-slate-300 border-slate-600',
  '확인필요': 'bg-amber-900/40 text-amber-300 border-amber-700/60',
  '검수완료': 'bg-emerald-900/40 text-emerald-300 border-emerald-700/60',
  '발주완료': 'bg-indigo-900/40 text-indigo-300 border-indigo-700/60',
  '수정요청': 'bg-rose-900/40 text-rose-300 border-rose-700/60',
}

const STATUSES: ReviewStatus[] = ['작업중', '확인필요', '검수완료', '발주완료', '수정요청']

function extractContent(row: ItemRow): string {
  const parts: string[] = []
  for (const c of row.item_contents ?? []) {
    if (!c.slot_value) continue
    try {
      const slot = JSON.parse(c.slot_value) as { ko?: string }
      if (slot.ko && slot.ko.trim() && c.slot_key === 'body') parts.push(slot.ko.trim())
    } catch {}
  }
  return parts.join(' / ').slice(0, 80) || '기본시안'
}

export function ArchiveClient({ initialItems }: { initialItems: ItemRow[] }) {
  const supabase = createClient()
  const [items, setItems] = useState(initialItems)
  const [filterStatus, setFilterStatus] = useState<'전체' | ReviewStatus>('전체')
  const [filterProject, setFilterProject] = useState<string>('전체')
  const [noteEdit, setNoteEdit] = useState<{ id: string; note: string } | null>(null)

  const projectNames = useMemo(() => {
    const set = new Set<string>()
    items.forEach(i => { if (i.projects?.name) set.add(i.projects.name) })
    return Array.from(set)
  }, [items])

  const filtered = useMemo(() => items.filter(i => {
    const status = (i.review_status ?? '작업중') as ReviewStatus
    if (filterStatus !== '전체' && status !== filterStatus) return false
    if (filterProject !== '전체' && i.projects?.name !== filterProject) return false
    return true
  }), [items, filterStatus, filterProject])

  const counts = useMemo(() => {
    const map: Record<string, number> = { 전체: items.length }
    for (const s of STATUSES) map[s] = 0
    for (const it of items) {
      const s = (it.review_status ?? '작업중') as ReviewStatus
      map[s] = (map[s] ?? 0) + 1
    }
    return map
  }, [items])

  const handleStatusChange = async (itemId: string, newStatus: ReviewStatus) => {
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, review_status: newStatus } : i))
    await supabase.from('design_items').update({ review_status: newStatus }).eq('id', itemId)
  }

  const handleSaveNote = async () => {
    if (!noteEdit) return
    setItems(prev => prev.map(i => i.id === noteEdit.id ? { ...i, review_note: noteEdit.note } : i))
    await supabase.from('design_items').update({ review_note: noteEdit.note }).eq('id', noteEdit.id)
    setNoteEdit(null)
  }

  return (
    <>
      {/* 상태별 통계 카드 */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mb-4">
        <button
          onClick={() => setFilterStatus('전체')}
          className={`px-3 py-2 rounded-lg border text-xs transition ${
            filterStatus === '전체' ? 'bg-slate-800 border-slate-500 text-slate-100' : 'bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-700'
          }`}
        >
          <div className="font-semibold">전체</div>
          <div className="text-lg font-bold mt-0.5">{counts['전체']}</div>
        </button>
        {STATUSES.map(s => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`px-3 py-2 rounded-lg border text-xs transition ${
              filterStatus === s ? STATUS_COLORS[s] : 'bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-700'
            }`}
          >
            <div className="font-semibold">{s}</div>
            <div className="text-lg font-bold mt-0.5">{counts[s] ?? 0}</div>
          </button>
        ))}
      </div>

      {/* 프로젝트 필터 */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <button
          onClick={() => setFilterProject('전체')}
          className={`text-[11px] px-2.5 py-1 rounded-full transition ${
            filterProject === '전체' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
          }`}
        >
          모든 프로젝트
        </button>
        {projectNames.map(name => (
          <button
            key={name}
            onClick={() => setFilterProject(name)}
            className={`text-[11px] px-2.5 py-1 rounded-full transition ${
              filterProject === name ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            {name}
          </button>
        ))}
      </div>

      {/* 테이블 */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 text-slate-600 text-sm">해당 조건의 제작물이 없습니다</div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="grid grid-cols-[40px_120px_80px_80px_100px_1fr_100px_110px_24px_80px] gap-2 px-4 py-2.5 bg-slate-900/80 border-b border-slate-800 text-slate-500 text-[10px] font-semibold uppercase tracking-wide">
            <span>No</span>
            <span>프로젝트</span>
            <span>품목</span>
            <span>파트</span>
            <span>장소</span>
            <span>내용 요약</span>
            <span>편집자</span>
            <span>상태</span>
            <span></span>
            <span>날짜</span>
          </div>
          <div className="divide-y divide-slate-800/60">
            {filtered.map(row => {
              const status = (row.review_status ?? '작업중') as ReviewStatus
              return (
                <div
                  key={row.id}
                  className="grid grid-cols-[40px_120px_80px_80px_100px_1fr_100px_110px_24px_80px] gap-2 px-4 py-2.5 text-xs hover:bg-slate-800/40 transition items-center"
                >
                  <span className="text-slate-600 font-mono">{row.no}</span>
                  <Link href={`/projects/${row.project_id}`} className="text-indigo-300 hover:text-indigo-200 truncate flex items-center gap-1">
                    {row.projects?.name ?? '—'}
                    <ExternalLink className="w-2.5 h-2.5 flex-shrink-0" />
                  </Link>
                  <span className="text-slate-400 truncate">{row.category ?? '—'}</span>
                  <span className="text-slate-500 truncate">{row.part ?? '—'}</span>
                  <span className="text-slate-500 truncate">{row.location ?? '—'}</span>
                  <div className="min-w-0">
                    <div className="text-slate-400 truncate">{extractContent(row)}</div>
                    {row.review_note && (
                      <div className="text-amber-400/80 text-[10px] truncate italic mt-0.5">{row.review_note}</div>
                    )}
                  </div>
                  <span className="text-slate-500 truncate text-[11px]">
                    {row.last_edited_by ? row.last_edited_by.split('@')[0] : <span className="text-slate-700 italic">미편집</span>}
                  </span>
                  <select
                    value={status}
                    onChange={e => handleStatusChange(row.id, e.target.value as ReviewStatus)}
                    className={`text-[10px] px-2 py-1 rounded border cursor-pointer focus:outline-none ${STATUS_COLORS[status]}`}
                  >
                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <button
                    onClick={() => setNoteEdit({ id: row.id, note: row.review_note ?? '' })}
                    className="text-slate-600 hover:text-indigo-400 transition"
                    title="검수 코멘트 남기기"
                  >
                    <MessageSquarePlus className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-slate-600 text-[10px] font-mono">
                    {new Date(row.updated_at).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 코멘트 모달 */}
      {noteEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setNoteEdit(null)} />
          <div className="relative bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-md p-5">
            <h3 className="text-slate-200 font-semibold text-sm mb-3">검수 코멘트</h3>
            <textarea
              autoFocus
              value={noteEdit.note}
              onChange={e => setNoteEdit({ ...noteEdit, note: e.target.value })}
              placeholder="예: 행사명 재확인 필요 / 로고 해상도 부족 / 오탈자 수정 요청"
              rows={4}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm placeholder-slate-600 focus:outline-none focus:border-indigo-500"
            />
            <div className="flex gap-2 mt-3 justify-end">
              <button onClick={() => setNoteEdit(null)} className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs px-4 py-2 rounded-lg transition">
                취소
              </button>
              <button onClick={handleSaveNote} className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium px-4 py-2 rounded-lg transition">
                저장
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
