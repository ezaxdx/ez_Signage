'use client'

// 발주·설치 일정 안내 (§11-3, §11-4)
// 단순 일정 표시 — 시스템은 실제 발주 여부 모름.
// 5/19 사용자 명시 = 추가/삭제 제거·D-N·라벨 편집만 유지.

import { useState, useEffect, useRef } from 'react'
import { Calendar, ChevronDown, ChevronUp, AlertCircle, Pencil } from 'lucide-react'

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

// 노션 컴펌 본 §3-2 플로우별 예상 일수 정합 (5/18·페이지 36148589-8ea1-81d7-8b55-d1bd771a40a1)
// 환경장식물 종류별 자동 분기: 구조물 D-30~D-21·인쇄물 D-14 기본·디지털 D-20
const DEFAULT_MILESTONES: Milestone[] = [
  { key: 'review',  label: '시안 검수',     offset: -10 },
  { key: 'produce', label: '제작',          offset: -5  },
  { key: 'order',   label: '발주 마감',     offset: -3  },
  { key: 'install', label: '설치 시작',     offset: -1  },
  { key: 'event',   label: '행사 시작',     offset: 0, locked: true },
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
  const editRef = useRef<HTMLInputElement>(null)

  useEffect(() => { setMilestones(loadMilestones(projectId)) }, [projectId])
  useEffect(() => { if (editing && editRef.current) editRef.current.focus() }, [editing])

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
            </div>
          </div>
          {/* 노션 컴펌 본 §3-1·§3-3 안내 문구 A안 (5/18 정합) */}
          <div className="px-3 py-2 bg-amber-50 border-b border-amber-200 flex items-start gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-[10px] text-amber-800 leading-relaxed space-y-1">
              <p>본 일정은 추정 일정입니다. 협력사 확인 후 변경될 수 있습니다.</p>
              <p className="text-[9px] text-amber-700">
                ※ 종류별 권장 분기 (§3-2): 구조물 D-30~D-21 · 인쇄물 D-14 · 디지털 D-20
              </p>
            </div>
          </div>
          <p className="px-3 py-1.5 text-[10px] text-slate-500 bg-slate-50 border-b border-slate-100">
            이름·D 값 클릭 시 편집 (행사 시작은 고정).
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

                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
