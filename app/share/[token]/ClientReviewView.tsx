'use client'

import { useState, useMemo } from 'react'
import { CheckCircle2, XCircle, Clock, Send, LayoutGrid } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Project, DesignItem, ContentsMap } from '@/lib/types'

interface Props {
  project: Project
  items: DesignItem[]
  allContents: Record<string, ContentsMap>
}

type Decision = '승인' | '수정' | '보류'

export function ClientReviewView({ project, items, allContents }: Props) {
  const supabase = createClient()
  const [selectedId, setSelectedId] = useState<string>(items[0]?.id ?? '')
  const [reviewerName, setReviewerName] = useState('')
  const [comment, setComment] = useState('')
  const [decision, setDecision] = useState<Decision | null>(null)
  const [submitted, setSubmitted] = useState<string[]>([])

  const selected = useMemo(() => items.find(i => i.id === selectedId), [items, selectedId])
  const contents = selected ? allContents[selected.id] ?? {} : {}

  const handleSubmit = async () => {
    if (!selected || !decision) return
    await supabase.from('client_reviews').insert({
      project_id: project.id,
      item_id: selected.id,
      reviewer: reviewerName.trim() || '익명',
      comment: comment.trim(),
      decision,
    })
    setSubmitted(prev => [...prev, selected.id])
    setComment('')
    setDecision(null)
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* 헤더 */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
              <LayoutGrid className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-slate-900 font-semibold text-sm">{project.name}</p>
              <p className="text-slate-500 text-[11px]">제작물 시안 검토 · 의사결정자용</p>
            </div>
          </div>
          <div className="text-[11px] text-slate-500">
            {items.length}개 제작물 · {submitted.length}개 검토 완료
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6 grid grid-cols-[240px_1fr_280px] gap-4">
        {/* 좌: 제작물 목록 */}
        <aside className="bg-white rounded-xl border border-slate-200 overflow-y-auto max-h-[calc(100vh-120px)]">
          <div className="px-3 py-2 border-b border-slate-200">
            <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">제작물 목록</p>
          </div>
          <div className="divide-y divide-slate-100">
            {items.map(item => (
              <button
                key={item.id}
                onClick={() => setSelectedId(item.id)}
                className={`w-full text-left px-3 py-2.5 hover:bg-slate-50 transition ${
                  selectedId === item.id ? 'bg-indigo-50' : ''
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-slate-400 w-6">{item.no}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-800 truncate">{item.category ?? '미분류'}</p>
                    <p className="text-[10px] text-slate-500 truncate">{item.location ?? '장소 미입력'}</p>
                  </div>
                  {submitted.includes(item.id) && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  )}
                </div>
              </button>
            ))}
          </div>
        </aside>

        {/* 중앙: 제작물 미리보기 */}
        <main className="bg-white rounded-xl border border-slate-200 p-6">
          {selected ? (
            <>
              <div className="mb-4">
                <h2 className="text-slate-900 font-semibold">#{selected.no} {selected.category}</h2>
                <p className="text-slate-500 text-xs mt-1">
                  {selected.width_mm}×{selected.height_mm}mm · {selected.material ?? ''} · {selected.location ?? ''}
                </p>
              </div>

              {/* 미리보기 박스 */}
              <div
                className="relative bg-slate-900 rounded-lg mx-auto overflow-hidden shadow-lg"
                style={{
                  width: '100%',
                  maxWidth: `${Math.min(500, (selected.width_mm ?? 600) / 4)}px`,
                  aspectRatio: `${selected.width_mm ?? 600} / ${selected.height_mm ?? 1800}`,
                  backgroundImage: selected.image_url ? `url(${selected.image_url})` : undefined,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              >
                {Object.entries(contents).map(([key, slot]) => {
                  const text = [slot.ko, slot.en].filter(Boolean).join('\n') || slot.placeholder || ''
                  if (!text) return null
                  return (
                    <div
                      key={key}
                      style={{
                        position: 'absolute',
                        left: `${slot.x}%`, top: `${slot.y}%`,
                        transform: 'translateX(-50%)',
                        width: `${slot.w ?? 70}%`,
                        fontSize: `${(slot.fontSize || 16) * 0.35}px`,
                        color: slot.color ? `#${slot.color}` : '#fff',
                        fontFamily: slot.fontFace ?? 'Arial',
                        textAlign: slot.align ?? 'center',
                        whiteSpace: 'pre-line',
                        lineHeight: 1.2,
                      }}
                    >
                      {text}
                    </div>
                  )
                })}
              </div>

              {/* 내용 요약 */}
              <div className="mt-4 p-3 bg-slate-50 rounded-lg">
                <p className="text-[10px] text-slate-500 font-semibold uppercase mb-2">입력된 내용</p>
                {Object.entries(contents).map(([key, slot]) => (
                  (slot.ko || slot.en) ? (
                    <div key={key} className="text-xs text-slate-700 mb-1">
                      <strong className="text-slate-500">{slot.label ?? key}:</strong> {slot.ko} {slot.en}
                    </div>
                  ) : null
                ))}
              </div>
            </>
          ) : (
            <p className="text-center text-slate-500 py-20">제작물을 선택하세요</p>
          )}
        </main>

        {/* 우: 의견 입력 */}
        <aside className="bg-white rounded-xl border border-slate-200 p-4 h-fit">
          <h3 className="text-slate-900 font-semibold text-sm mb-3">검토 의견</h3>

          <div className="space-y-3">
            <div>
              <label className="block text-[10px] text-slate-500 mb-1">검토자 이름</label>
              <input
                value={reviewerName}
                onChange={e => setReviewerName(e.target.value)}
                placeholder="성함 (선택)"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-[10px] text-slate-500 mb-1">결정</label>
              <div className="grid grid-cols-3 gap-1.5">
                {([
                  { d: '승인' as Decision, icon: CheckCircle2, color: 'emerald' },
                  { d: '수정' as Decision, icon: XCircle, color: 'rose' },
                  { d: '보류' as Decision, icon: Clock, color: 'amber' },
                ]).map(opt => {
                  const Icon = opt.icon
                  const isActive = decision === opt.d
                  return (
                    <button
                      key={opt.d}
                      onClick={() => setDecision(opt.d)}
                      className={`flex flex-col items-center gap-1 py-2 rounded-lg border text-xs transition ${
                        isActive
                          ? `bg-${opt.color}-50 border-${opt.color}-400 text-${opt.color}-700`
                          : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {opt.d}
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <label className="block text-[10px] text-slate-500 mb-1">코멘트</label>
              <textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                rows={5}
                placeholder="예: 로고 크기 조금 크게 / 오탈자 '서을' → '서울'"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 resize-none"
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={!decision || !selected}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium py-2.5 rounded-lg transition"
            >
              <Send className="w-4 h-4" />
              의견 전송
            </button>

            {submitted.includes(selected?.id ?? '') && (
              <p className="text-[11px] text-emerald-600 text-center">✓ 이 제작물에 의견 전송 완료</p>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-slate-200">
            <p className="text-[10px] text-slate-500 leading-relaxed">
              💡 이 화면은 <strong>발주 전 확인</strong>을 위한 공유 링크입니다.<br />
              의견은 프로젝트 담당자에게 즉시 전달됩니다.
            </p>
          </div>
        </aside>
      </div>
    </div>
  )
}
