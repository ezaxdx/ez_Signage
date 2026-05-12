'use client'

// 발주·설치 일정 안내 (§11-3, §11-4)
// 단순 일정 표시 — 시스템은 실제 발주 여부 모름.
// 사용자가 일정 추가·삭제·D-N 조정 가능. 기본 날짜순 정렬 (D-N 큰 값 → 작은 값).

import { useState, useEffect, useRef } from 'react'
import { Calendar, ChevronDown, ChevronUp, AlertCircle, Pencil, Plus, X } from 'lucide-react'

interface Props {
  eventDate: string | null
  projectId?: string
  className?: string
}

interface Milestone {
  key: string
  label: string
  offset: number      // 음수 = 행사 전, 0 = 행사 당일
  locked?: boolean    // 행사 시작은 삭제 불가
}

const DEFAULT_MILESTONES: Milestone[] = [
  { key: 'confirm', label: '시안 컨펌', offset: -21 },
  { key: 'order',   label: '제작 발주', offset: -14 },
  { key: 'review',  label: '시안 검수', offset: -7  },
  { key: 'install', label: '설치 시작', offset: -1  },
  { key: 'event',   label: '행사 시작', offset: 0, locked: true },
]

const STORAGE_KEY = (pid?: string) => `ordering_schedule_v2_${pid ?? 'global'}`

function loadMilestones(projectId?: string): Milestone[] {
  if (typeof window === 'undefined') return DEFAULT_MILESTONES
  try {
    const raw = localStorage.getItem(STORAGE_KEY(projectId))
    if (!raw) return DEFAULT_MILESTONES
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_MILESTONES
    // 행사 시작이 빠져있으면 보존
    if (!parsed.some((p: Milestone) => p.key === 'event')) {
      parsed.push({ key: 'event', label: '행사 시작', offset: 0, locked: true })
    }
    return parsed
  } catch { return DEFAULT_MILESTONES }
}

function saveMilestones(milestones: Milestone[], projectId?: string) {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY(projectId), JSON.stringify(milestones))
}

function fmtDate(d: Date) {
  return `${d.getMonth() + 1}/${d.getDate()} (${['일','월','화','수','목','금','토'][d.getDay()]})`
}
function fmtDLabel(offset: number): string {
  if (offset === 0) return 'D-DAY'
  if (offset > 0) return `D+${offset}`
  return `D-${Math.abs(offset)}`
}

// 날짜순 정렬 (D-N 큰 값이 먼저 = 행사 전 → 행사 당일 → 행사 후)
function sortByDate(milestones: Milestone[]): Milestone[] {
  return [...milestones].sort((a, b) => a.offset - b.offset)
}

export function OrderingSchedule({ eventDate, projectId, className = '' }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [milestones, setMilestones] = useState<Milestone[]>(DEFAULT_MILESTONES)
  const [editing, setEditing] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [editLabel, setEditLabel] = useState('')
  const [adding, setAdding] = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const [newOffset, setNewOffset] = useState('')
  const editRef = useRef<HTMLInputElement>(null)
  const labelRef = useRef<HTMLInputElement>(null)

  useEffect(() => { setMilestones(loadMilestones(projectId)) }, [projectId])
  useEffect(() => { if (editing && editRef.current) editRef.current.focus() }, [editing])
  useEffect(() => { if (adding && labelRef.current) labelRef.current.focus() }, [adding])

  if (!eventDate) {
    return (
      <div className={`flex items-center gap-1.5 text-xs text-slate-400 ${className}`}>
        <AlertCircle className="w-3.5 h-3.5" />
        행사 일자 미입력
      </div>
    )
  }

  const event = new Date(eventDate)
  const sorted = sortByDate(milestones)

  const schedule = sorted.map(m => {
    const date = new Date(event)
    date.setDate(date.getDate() + m.offset)
    return { ...m, date }
  })

  const eventItem = schedule.find(s => s.key === 'event') ?? schedule[schedule.length - 1]

  // 툴바 배지: 오늘 기준으로 가장 임박한 미래 일정 (없으면 행사 당일)
  const todayMidnight = new Date(); todayMidnight.setHours(0, 0, 0, 0)
  const nextItem = schedule.find(s => { const d = new Date(s.date); d.setHours(0,0,0,0); return d >= todayMidnight }) ?? eventItem

  const update = (next: Milestone[]) => {
    setMilestones(next)
    saveMilestones(next, projectId)
  }

  const commitEditOffset = (key: string) => {
    const n = parseInt(editValue, 10)
    if (!isNaN(n)) {
      const next = milestones.map(m => m.key === key ? { ...m, offset: -Math.abs(n) } : m)
      update(next)
    }
    setEditing(null)
  }

  const commitEditLabel = (key: string) => {
    if (editLabel.trim()) {
      const next = milestones.map(m => m.key === key ? { ...m, label: editLabel.trim() } : m)
      update(next)
    }
    setEditing(null)
  }

  const deleteItem = (key: string) => {
    const next = milestones.filter(m => m.key !== key)
    update(next)
  }

  const addNew = () => {
    const label = newLabel.trim()
    const offset = parseInt(newOffset, 10)
    if (!label || isNaN(offset)) return
    const key = `custom_${Date.now()}`
    const next = [...milestones, { key, label, offset: -Math.abs(offset) }]
    update(next)
    setNewLabel(''); setNewOffset(''); setAdding(false)
  }

  const reset = () => {
    update(DEFAULT_MILESTONES)
  }

  const isCustomized = JSON.stringify(milestones) !== JSON.stringify(DEFAULT_MILESTONES)

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setExpanded(v => !v)}
        className="flex items-center gap-1.5 text-xs bg-indigo-50 text-indigo-700 border border-indigo-300 px-2.5 py-1 rounded-md transition hover:bg-indigo-100"
      >
        <Calendar className="w-3.5 h-3.5" />
        <span className="font-medium">일정 편집</span>
        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-600 text-white" title={nextItem.label}>
          {nextItem.label} {fmtDate(nextItem.date)}
        </span>
        {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>

      {expanded && (
        <div className="absolute top-full right-0 mt-1 w-96 bg-white border-2 border-indigo-200 rounded-lg shadow-2xl z-[300] overflow-hidden">
          <div className="px-3 py-2 border-b border-indigo-200 bg-indigo-50 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-indigo-600" />
              <p className="text-xs font-semibold text-indigo-800">일정 편집</p>
            </div>
            <div className="flex items-center gap-2">
              {isCustomized && (
                <button onClick={reset} className="text-[10px] text-slate-500 hover:text-slate-700">기본값으로</button>
              )}
              <button
                onClick={() => setAdding(true)}
                className="flex items-center gap-0.5 text-[10px] text-indigo-600 hover:text-indigo-800"
              >
                <Plus className="w-3 h-3" /> 추가
              </button>
            </div>
          </div>
          <p className="px-3 py-1.5 text-[10px] text-slate-500 bg-slate-50 border-b border-slate-100">
            이름·D 값 클릭 시 편집. 추가·삭제 가능 (행사 시작은 고정).
          </p>

          <div className="divide-y divide-slate-100">
            {schedule.map(s => {
              const isEditingOffset = editing === `${s.key}:offset`
              const isEditingLabel = editing === `${s.key}:label`
              const editable = !s.locked
              const isDDay = s.key === 'event'

              return (
                <div key={s.key} className={`px-3 py-2 flex items-center gap-2 ${isDDay ? 'bg-indigo-50' : 'bg-white'} group`}>
                  <Calendar className={`w-3.5 h-3.5 flex-shrink-0 ${isDDay ? 'text-indigo-700' : 'text-slate-500'}`} />

                  {/* 라벨 (편집 가능) */}
                  {isEditingLabel && editable ? (
                    <input
                      ref={editRef}
                      type="text"
                      value={editLabel}
                      onChange={(e) => setEditLabel(e.target.value)}
                      onBlur={() => commitEditLabel(s.key)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') commitEditLabel(s.key)
                        if (e.key === 'Escape') setEditing(null)
                      }}
                      className="flex-1 text-xs px-1 py-0.5 border border-indigo-400 rounded bg-white"
                    />
                  ) : (
                    <button
                      onClick={() => {
                        if (!editable) return
                        setEditLabel(s.label); setEditing(`${s.key}:label`)
                      }}
                      disabled={!editable}
                      className={`flex-1 text-left text-xs font-medium ${isDDay ? 'text-indigo-800' : 'text-slate-700'} ${editable ? 'hover:text-indigo-600 cursor-pointer' : ''}`}
                      title={editable ? '클릭해서 이름 수정' : ''}
                    >
                      {s.label}
                    </button>
                  )}

                  {/* D-N (편집 가능) */}
                  {isEditingOffset && editable ? (
                    <div className="flex items-center gap-0.5">
                      <span className="text-xs text-slate-600">D-</span>
                      <input
                        ref={editRef}
                        type="number"
                        min="0"
                        max="365"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => commitEditOffset(s.key)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') commitEditOffset(s.key)
                          if (e.key === 'Escape') setEditing(null)
                        }}
                        className="w-12 text-xs px-1 py-0.5 border border-indigo-400 rounded bg-white"
                      />
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        if (!editable) return
                        setEditValue(String(Math.abs(s.offset))); setEditing(`${s.key}:offset`)
                      }}
                      disabled={!editable}
                      className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${isDDay ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-700'} ${editable ? 'hover:opacity-80 cursor-pointer flex items-center gap-1' : ''}`}
                      title={editable ? '클릭해서 D 값 수정' : ''}
                    >
                      {fmtDLabel(s.offset)}
                      {editable && <Pencil className="w-2.5 h-2.5 opacity-60" />}
                    </button>
                  )}

                  {/* 날짜 */}
                  <div className="text-right flex-shrink-0 w-16">
                    <p className={`text-[11px] font-medium ${isDDay ? 'text-indigo-700' : 'text-slate-600'}`}>{fmtDate(s.date)}</p>
                  </div>

                  {/* 삭제 버튼 */}
                  {editable ? (
                    <button
                      onClick={() => deleteItem(s.key)}
                      className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-600 transition flex-shrink-0"
                      title="삭제"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <span className="w-3.5 flex-shrink-0" />
                  )}
                </div>
              )
            })}
          </div>

          {/* 추가 입력 폼 */}
          {adding && (
            <div className="px-3 py-2 bg-indigo-50 border-t border-indigo-100 flex items-center gap-2">
              <input
                ref={labelRef}
                type="text"
                placeholder="일정 이름"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') addNew()
                  if (e.key === 'Escape') { setAdding(false); setNewLabel(''); setNewOffset('') }
                }}
                className="flex-1 text-xs px-2 py-1 border border-indigo-300 rounded bg-white"
              />
              <span className="text-xs text-slate-600">D-</span>
              <input
                type="number"
                placeholder="14"
                min="0"
                max="365"
                value={newOffset}
                onChange={(e) => setNewOffset(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') addNew()
                  if (e.key === 'Escape') { setAdding(false); setNewLabel(''); setNewOffset('') }
                }}
                className="w-14 text-xs px-1 py-1 border border-indigo-300 rounded bg-white"
              />
              <button onClick={addNew} className="text-xs px-2 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700">추가</button>
              <button onClick={() => { setAdding(false); setNewLabel(''); setNewOffset('') }} className="text-xs px-1.5 py-1 text-slate-500 hover:text-slate-700">취소</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
