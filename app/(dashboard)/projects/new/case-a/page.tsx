// Case A — 행사 정보 입력 → Claude 추천 → 프로젝트 생성
// (도면 없이 풍부한 행사 정보만으로 추천 가능하도록 입력 필드 확장)

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Sparkles, Loader2, CheckCircle2, ChevronDown, ChevronUp, Download } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { StepIndicator, GuideBox } from '@/app/components/guide'
import type { RecommendItem, EventType, EventLanguage } from '@/lib/ai/recommendSignage'
import { SEED_PERFLIST } from '@/lib/data/dashboardSeed'

// 과거 수행실적에서 발주처·주관기관 후보 추출 (자동완성용)
const KNOWN_CLIENTS = Array.from(new Set(SEED_PERFLIST.map(p => p.client))).sort()
const KNOWN_VENUES = Array.from(new Set(SEED_PERFLIST.map(p => p.venue))).sort()

// 명세 6.2.4 — 행사 장소별 역대 사용 환경장식물 매칭
function matchVenueHistory(venueInput: string) {
  if (!venueInput.trim()) return null
  const matched = SEED_PERFLIST.filter(p =>
    p.venue.includes(venueInput) || venueInput.includes(p.venue.split(' ')[0])
  )
  if (matched.length === 0) return null
  return {
    count: matched.length,
    pastEvents: matched.slice(0, 3).map(p => p.project_name),
    clients: Array.from(new Set(matched.map(p => p.client))).slice(0, 3),
  }
}

const PURPOSE_OPTIONS = [
  { id: 'main_promo',     label: '행사 메인 홍보' },
  { id: 'registration',   label: '등록 안내' },
  { id: 'wayfinding',     label: '동선·웨이파인딩' },
  { id: 'program_info',   label: '프로그램 안내' },
  { id: 'experience',     label: '체험 안내' },
]

const EVENT_TYPES: { id: EventType; label: string; emoji: string }[] = [
  { id: 'conference',  label: '컨퍼런스',     emoji: '🎤' },
  { id: 'exhibition',  label: '전시회',       emoji: '🏛️' },
  { id: 'fair',        label: '박람회',       emoji: '🎪' },
  { id: 'awards',      label: '시상식',       emoji: '🏆' },
  { id: 'forum',       label: '포럼',         emoji: '💬' },
  { id: 'workshop',    label: '워크숍',       emoji: '🛠️' },
  { id: 'experience',  label: '체험행사',     emoji: '✨' },
  { id: 'ceremony',    label: '기념식',       emoji: '🎊' },
  { id: 'launching',   label: '발표·런칭',    emoji: '🚀' },
  { id: 'other',       label: '기타',         emoji: '📌' },
]

const LANGUAGE_OPTIONS: { id: EventLanguage; label: string }[] = [
  { id: 'KOR',    label: '국문만' },
  { id: 'EN',     label: '영문만' },
  { id: 'EN/KOR', label: '국·영문 병기' },
  { id: 'multi',  label: '다국어 (3+)' },
]

export default function CaseAPage() {
  const router = useRouter()

  // 필수
  const [eventName, setEventName] = useState('')
  const [venue, setVenue] = useState('')

  // 권장 (행사 분류·규모)
  const [eventType, setEventType] = useState<EventType | ''>('')
  const [eventDate, setEventDate] = useState('')
  const [setupDate, setSetupDate] = useState('')
  const [teardownDate, setTeardownDate] = useState('')
  const [attendeesCount, setAttendeesCount] = useState('')
  const [language, setLanguage] = useState<EventLanguage | ''>('')

  // 부가 (선택)
  const [clientName, setClientName] = useState('')
  const [hostOrganizer, setHostOrganizer] = useState('')
  const [keySpaces, setKeySpaces] = useState('')
  const [mainEntrance, setMainEntrance] = useState('')
  const [purposes, setPurposes] = useState<Set<string>>(new Set())
  const [budgetConstrained, setBudgetConstrained] = useState(false)
  const [outdoorPortion, setOutdoorPortion] = useState(false)
  const [hasVip, setHasVip] = useState(false)
  const [isInternational, setIsInternational] = useState(false)
  const [notes, setNotes] = useState('')

  const [showAdvanced, setShowAdvanced] = useState(false)

  const [stage, setStage] = useState<'form' | 'review' | 'creating'>('form')
  const [items, setItems] = useState<RecommendItem[]>([])
  const [summary, setSummary] = useState('')
  const [inferredScale, setInferredScale] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const togglePurpose = (id: string) => {
    setPurposes(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleRecommend = async () => {
    setError(null)
    if (!eventName.trim() || !venue.trim()) {
      setError('행사명·장소는 필수입니다')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventName: eventName.trim(),
          venue: venue.trim(),
          eventType: eventType || undefined,
          eventDate: eventDate || undefined,
          setupDate: setupDate || undefined,
          teardownDate: teardownDate || undefined,
          attendeesCount: attendeesCount ? parseInt(attendeesCount) : undefined,
          language: language || undefined,
          clientName: clientName.trim() || undefined,
          hostOrganizer: hostOrganizer.trim() || undefined,
          keySpaces: keySpaces.trim() || undefined,
          mainEntrance: mainEntrance.trim() || undefined,
          purposes: Array.from(purposes),
          budgetConstrained,
          outdoorPortion,
          hasVip,
          isInternational,
          notes: notes.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'AI 추천 실패')
        return
      }
      setItems(data.items)
      setSummary(data.summary || '')
      setInferredScale(data.inferredScale || '')
      setStage('review')
    } catch (e) {
      setError(e instanceof Error ? e.message : '네트워크 오류')
    } finally {
      setLoading(false)
    }
  }

  const removeItem = (idx: number) => {
    setItems(prev => prev.filter((_, i) => i !== idx))
  }

  const updateItemQuantity = (idx: number, q: number) => {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, quantity: Math.max(1, q) } : it))
  }

  const handleDownloadExcel = async () => {
    const XLSX = await import('xlsx')
    const today = new Date()
    const dateStr = `${today.getFullYear()}${String(today.getMonth()+1).padStart(2,'0')}${String(today.getDate()).padStart(2,'0')}`
    const headers = ['NO.', '파트', '구분', '장소', '사용목적', '품목', '언어', '규격(mm)', '재질', '수량', '내용', '비고', '담당자', '디자인업체', '출력업체', '설치시간', '철거시간']
    const rows = items.map(it => [
      it.no, '', it.category_label, it.location, it.purpose, it.category_label,
      language || 'KOR',
      `${it.width_mm}×${it.height_mm}`,
      it.material, it.quantity, it.rationale, '', '', '', '', '', ''
    ])
    const ws = XLSX.utils.aoa_to_sheet([
      [`환경 제작물  (${eventName})`, '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
      headers,
      ...rows,
    ])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '추천리스트')
    XLSX.writeFile(wb, `${eventName || '추천리스트'}_제작물 추천_${dateStr}.xlsx`)
  }

  const handleCreate = async () => {
    setStage('creating')
    setError(null)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setError('로그인이 필요합니다'); setStage('review'); return }

      // purposes 컬럼이 없을 수도 있어 시도 → 실패 시 컬럼 제외하고 재시도
      const baseInsert = {
        name: eventName.trim(),
        owner_id: user.id,
        client_name: clientName.trim() || null,
        event_venue: venue.trim() || null,
        event_date: eventDate || null,
        status: '준비중' as const,
        allowed_users: [],
      }
      let project: { id: string } | null = null
      const r1 = await supabase.from('projects').insert({ ...baseInsert, purposes: Array.from(purposes) }).select().single()
      if (r1.error && /purposes/i.test(r1.error.message)) {
        const r2 = await supabase.from('projects').insert(baseInsert).select().single()
        project = r2.data
        if (r2.error || !project) { setError(r2.error?.message || '프로젝트 생성 실패'); setStage('review'); return }
      } else if (r1.error || !r1.data) {
        setError(r1.error?.message || '프로젝트 생성 실패'); setStage('review'); return
      } else {
        project = r1.data
      }

      const rows = items.map((it, i) => ({
        project_id: project!.id,
        no: String(i + 1).padStart(2, '0'),
        category: it.category_label,
        location: it.location,
        purpose: it.purpose,
        language: (language && language !== 'multi' ? language : 'KOR') as 'KOR' | 'EN' | 'EN/KOR',
        quantity: it.quantity,
        material: it.material,
        width_mm: it.width_mm,
        height_mm: it.height_mm,
      }))
      const { error: iErr } = await supabase.from('design_items').insert(rows)
      if (iErr) { setError(iErr.message); setStage('review'); return }

      router.push(`/projects/${project!.id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : '생성 실패')
      setStage('review')
    }
  }

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <StepIndicator current={0} />
      <div className="max-w-3xl mx-auto px-6 py-10">
        <Link href="/projects/new" className="text-sm text-slate-500 hover:text-slate-800">← 케이스 선택</Link>
        <div className="flex items-center gap-3 mt-4">
          <Sparkles className="w-6 h-6 text-indigo-400" />
          <h1 className="text-2xl font-bold">Case A · AI 추천으로 시작</h1>
        </div>

        <div className="mt-4 rounded-lg border border-slate-200 bg-white/40 p-4">
          <GuideBox
            why="행사 유형·규모·기간·언어 정보가 풍부할수록 추천 정확도가 크게 향상됩니다. 도면 없이도 행사 정보만으로 적정 환경장식물 리스트를 받을 수 있도록 설계되었습니다."
            how="필수 2개(행사명·장소) + 핵심 4~5개(유형·일정·규모·언어)를 입력. '추가 정보'는 더 정확한 추천을 위해 선택적으로 채우세요."
            tip="대규모 정상회의(2000명+)는 50~100건, 중형 컨퍼런스(100~500명) 15~30건이 일반적. 추천 후 직접 수량 조정 + 엑셀 다운로드 모두 가능."
          />
        </div>

        {stage === 'form' && (
          <div className="mt-8 space-y-5">
            {/* ── 1. 필수 정보 ───────────────── */}
            <div className="rounded-xl border border-indigo-900/40 bg-indigo-950/15 p-4 space-y-4">
              <p className="text-xs text-indigo-300 font-semibold uppercase tracking-wide">필수 정보</p>
              <Field label="행사명 *">
                <input value={eventName} onChange={e => setEventName(e.target.value)} placeholder="예: 2026 K-콘텐츠 엑스포" className={inputCls} />
              </Field>
              <Field label="행사 장소 *">
                <input list="known-venues" value={venue} onChange={e => setVenue(e.target.value)} placeholder="예: 코엑스 그랜드볼룸 / 인천 송도 컨벤시아" className={inputCls} />
                <datalist id="known-venues">
                  {KNOWN_VENUES.map(v => <option key={v} value={v} />)}
                </datalist>
              </Field>
              {/* 명세 6.2.4 — 입력된 장소의 과거 행사 매칭 알림 */}
              {(() => {
                const match = matchVenueHistory(venue)
                if (!match) return null
                return (
                  <div className="bg-emerald-950/30 border border-emerald-800/40 rounded-lg p-2.5">
                    <p className="text-emerald-300 text-xs font-medium">
                      📍 이 장소에서 과거 행사 <strong>{match.count}건</strong> 진행 (수행실적 매핑)
                    </p>
                    <p className="text-emerald-500/70 text-[10px] mt-1 truncate">{match.pastEvents.join(' · ')}</p>
                    <p className="text-emerald-500/60 text-[10px] mt-0.5">발주처: {match.clients.join(', ')}</p>
                  </div>
                )
              })()}
            </div>

            {/* ── 2. 권장 정보 (추천 정확도 ↑) ─────── */}
            <div className="rounded-xl border border-slate-200 bg-white/30 p-4 space-y-4">
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide">권장 정보 <span className="text-slate-400 normal-case font-normal">— 추천 정확도 ↑</span></p>

              <Field label="행사 유형">
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                  {EVENT_TYPES.map(t => {
                    const on = eventType === t.id
                    return (
                      <button
                        key={t.id}
                        onClick={() => setEventType(on ? '' : t.id)}
                        className={`px-2 py-2 rounded-lg border text-xs flex flex-col items-center gap-0.5 transition ${on ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-white border-slate-300 text-slate-500 hover:bg-slate-50'}`}
                      >
                        <span className="text-base">{t.emoji}</span>
                        <span>{t.label}</span>
                      </button>
                    )
                  })}
                </div>
              </Field>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Field label="세팅 시작일">
                  <input type="date" value={setupDate} onChange={e => setSetupDate(e.target.value)} className={`${inputCls} [color-scheme:dark]`} />
                </Field>
                <Field label="행사일">
                  <input type="date" value={eventDate} onChange={e => setEventDate(e.target.value)} className={`${inputCls} [color-scheme:dark]`} />
                </Field>
                <Field label="철거일">
                  <input type="date" value={teardownDate} onChange={e => setTeardownDate(e.target.value)} className={`${inputCls} [color-scheme:dark]`} />
                </Field>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="예상 참가자 수">
                  <input type="number" min={1} value={attendeesCount} onChange={e => setAttendeesCount(e.target.value)} placeholder="예: 500" className={inputCls} />
                </Field>
                <Field label="행사 언어">
                  <div className="flex flex-wrap gap-1.5">
                    {LANGUAGE_OPTIONS.map(l => {
                      const on = language === l.id
                      return (
                        <button key={l.id} onClick={() => setLanguage(on ? '' : l.id)}
                          className={`px-2.5 py-1.5 rounded-lg border text-xs transition ${on ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-white border-slate-300 text-slate-500 hover:bg-slate-50'}`}>
                          {l.label}
                        </button>
                      )
                    })}
                  </div>
                </Field>
              </div>

              <Field label="사용 목적 (복수 선택, 선택 사항)">
                <div className="flex flex-wrap gap-2">
                  {PURPOSE_OPTIONS.map(p => {
                    const on = purposes.has(p.id)
                    return (
                      <button key={p.id} onClick={() => togglePurpose(p.id)}
                        className={`px-3 py-1.5 rounded-full border text-sm transition ${on ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-white border-slate-300 text-slate-400 hover:bg-slate-50'}`}>
                        {p.label}
                      </button>
                    )
                  })}
                </div>
              </Field>
            </div>

            {/* ── 3. 추가 정보 (접힘) ─────── */}
            <div className="rounded-xl border border-slate-200 bg-white/20">
              <button
                type="button"
                onClick={() => setShowAdvanced(v => !v)}
                className="w-full flex items-center justify-between px-4 py-3 text-sm text-slate-400 hover:bg-slate-50/40 rounded-xl transition"
              >
                <span className="font-medium">추가 정보 <span className="text-slate-500 text-xs">— 더 정확한 추천을 위해</span></span>
                {showAdvanced ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
              </button>
              {showAdvanced && (
                <div className="px-4 pb-4 space-y-4 border-t border-slate-200/60 pt-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label="주최 / 발주처">
                      <input list="known-clients" value={clientName} onChange={e => setClientName(e.target.value)} placeholder="예: 외교부 (입력 시 과거 발주처 추천)" className={inputCls} />
                      <datalist id="known-clients">
                        {KNOWN_CLIENTS.map(c => <option key={c} value={c} />)}
                      </datalist>
                    </Field>
                    <Field label="주관 기관">
                      <input value={hostOrganizer} onChange={e => setHostOrganizer(e.target.value)} placeholder="예: 한국관광공사" className={inputCls} />
                    </Field>
                  </div>
                  <p className="text-[10px] text-slate-400 -mt-2">
                    💡 과거 수행실적 {SEED_PERFLIST.length}건의 발주처·행사장 자동 완성 (입력란 클릭 시 추천 표시)
                  </p>
                  <Field label="주요 홀·공간">
                    <input value={keySpaces} onChange={e => setKeySpaces(e.target.value)} placeholder="예: 그랜드볼룸 / 회의실 A·B / 전시홀 1~3" className={inputCls} />
                  </Field>
                  <Field label="메인 출입구 위치">
                    <input value={mainEntrance} onChange={e => setMainEntrance(e.target.value)} placeholder="예: 1층 정문 / 지하 2층 로비" className={inputCls} />
                  </Field>

                  <Field label="행사 특성 (해당 항목 체크)">
                    <div className="grid grid-cols-2 gap-2">
                      <CheckboxRow checked={isInternational} onChange={setIsInternational} label="국제 행사 (영문 병기 필수)" />
                      <CheckboxRow checked={hasVip} onChange={setHasVip} label="VIP·정상급 인사 참석" />
                      <CheckboxRow checked={outdoorPortion} onChange={setOutdoorPortion} label="야외 구간 포함" />
                      <CheckboxRow checked={budgetConstrained} onChange={setBudgetConstrained} label="예산 제약 있음 (절감 우선)" />
                    </div>
                  </Field>

                  <Field label="추가 메모 (자유 기술)">
                    <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="동시통역·기자 회견·체험존 운영 등 특이사항"
                      className={inputCls + ' resize-none'} />
                  </Field>
                </div>
              )}
            </div>

            {error && <div className="text-sm text-rose-400 bg-rose-950/30 border border-rose-900/40 rounded-lg p-3">{error}</div>}

            <button onClick={handleRecommend} disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3 font-medium text-white disabled:opacity-50">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> AI가 추천 리스트를 만드는 중…</> : <><Sparkles className="w-4 h-4" /> AI 추천 받기</>}
            </button>
          </div>
        )}

        {stage === 'review' && (
          <div className="mt-8">
            {summary && (
              <div className="rounded-lg bg-indigo-950/30 border border-indigo-900/40 p-4 text-sm text-indigo-200 mb-4">
                💡 {summary}
                {inferredScale && <span className="ml-2 text-indigo-400 text-xs">[규모: {inferredScale}]</span>}
              </div>
            )}
            <div className="rounded-xl border border-slate-200 bg-white/40 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                <div className="text-sm text-slate-400">추천 환경장식물 <span className="font-semibold text-slate-900">{items.length}건</span></div>
                <button onClick={() => setStage('form')} className="text-xs text-slate-500 hover:text-slate-800">← 입력 수정</button>
              </div>
              <div className="divide-y divide-slate-800/60 max-h-[420px] overflow-y-auto">
                {items.map((it, i) => (
                  <div key={i} className="px-4 py-3 flex items-center gap-3">
                    <span className="w-6 text-xs text-slate-500">{it.no}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-900">{it.category_label}</span>
                        <span className="text-xs text-slate-500">{it.width_mm}×{it.height_mm}mm · {it.material}</span>
                      </div>
                      <div className="mt-0.5 text-sm text-slate-500 truncate">{it.location} — {it.rationale}</div>
                    </div>
                    <input type="number" min={1} value={it.quantity} onChange={e => updateItemQuantity(i, parseInt(e.target.value) || 1)}
                      className="w-16 bg-slate-50 border border-slate-300 rounded px-2 py-1 text-sm text-right" />
                    <button onClick={() => removeItem(i)} className="text-xs text-rose-400 hover:text-rose-300">삭제</button>
                  </div>
                ))}
              </div>
            </div>

            {error && <div className="mt-4 text-sm text-rose-400 bg-rose-950/30 border border-rose-900/40 rounded-lg p-3">{error}</div>}

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-3">
              <button onClick={handleDownloadExcel}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-50 hover:bg-slate-200 border border-slate-300 px-4 py-3 font-medium text-slate-800 transition">
                <Download className="w-4 h-4" /> 엑셀로만 다운로드
              </button>
              <button onClick={handleCreate}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-4 py-3 font-medium text-white">
                <CheckCircle2 className="w-4 h-4" /> 이대로 프로젝트 만들기 ({items.length}건)
              </button>
            </div>
          </div>
        )}

        {stage === 'creating' && (
          <div className="mt-12 text-center text-slate-500">
            <Loader2 className="w-6 h-6 animate-spin mx-auto" />
            <p className="mt-3">프로젝트를 만들고 추천 항목을 등록 중…</p>
          </div>
        )}
      </div>
    </div>
  )
}

const inputCls = 'w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2.5 text-slate-900 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-sm text-slate-400 mb-1.5">{label}</div>
      {children}
    </label>
  )
}

function CheckboxRow({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs text-left transition ${checked ? 'bg-indigo-600/15 border-indigo-700/50 text-indigo-200' : 'bg-white border-slate-300 text-slate-500 hover:bg-slate-50'}`}
    >
      <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${checked ? 'bg-indigo-600 border-indigo-500' : 'border-slate-600'}`}>
        {checked && <CheckCircle2 className="w-3 h-3 text-white" />}
      </div>
      <span className="leading-tight">{label}</span>
    </button>
  )
}
