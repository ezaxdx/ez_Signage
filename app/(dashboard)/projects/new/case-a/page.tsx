// Case A — 빈 상태에서 시작: 행사 정보 입력 → Claude 추천 → 프로젝트 생성

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Sparkles, Loader2, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { StepIndicator, GuideBox } from '@/app/components/guide'
import type { RecommendItem } from '@/lib/ai/recommendSignage'

const PURPOSE_OPTIONS = [
  { id: 'main_promo',     label: '행사 메인 홍보' },
  { id: 'registration',   label: '등록 안내' },
  { id: 'wayfinding',     label: '동선·웨이파인딩' },
  { id: 'program_info',   label: '프로그램 안내' },
  { id: 'experience',     label: '체험 안내' },
]

export default function CaseAPage() {
  const router = useRouter()
  const [eventName, setEventName] = useState('')
  const [venue, setVenue] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [purposes, setPurposes] = useState<Set<string>>(new Set())
  const [notes, setNotes] = useState('')

  const [stage, setStage] = useState<'form' | 'review' | 'creating'>('form')
  const [items, setItems] = useState<RecommendItem[]>([])
  const [summary, setSummary] = useState('')
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
          eventDate: eventDate || undefined,
          purposes: Array.from(purposes),
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

  const handleCreate = async () => {
    setStage('creating')
    setError(null)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setError('로그인이 필요합니다'); setStage('review'); return }

      // 1) 프로젝트 생성
      const { data: project, error: pErr } = await supabase
        .from('projects')
        .insert({
          name: eventName.trim(),
          owner_id: user.id,
          event_venue: venue.trim() || null,
          event_date: eventDate || null,
          purposes: Array.from(purposes),
          status: '준비중',
          allowed_users: [],
        })
        .select().single()
      if (pErr || !project) { setError(pErr?.message || '프로젝트 생성 실패'); setStage('review'); return }

      // 2) 추천 항목을 design_items에 일괄 삽입
      const rows = items.map((it, i) => ({
        project_id: project.id,
        no: String(i + 1).padStart(2, '0'),
        category: it.category_label,
        location: it.location,
        purpose: it.purpose,
        language: 'KOR' as const,
        quantity: it.quantity,
        material: it.material,
        width_mm: it.width_mm,
        height_mm: it.height_mm,
      }))
      const { error: iErr } = await supabase.from('design_items').insert(rows)
      if (iErr) { setError(iErr.message); setStage('review'); return }

      router.push(`/projects/${project.id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : '생성 실패')
      setStage('review')
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <StepIndicator current={0} />
      <div className="max-w-3xl mx-auto px-6 py-10">
        <Link href="/projects/new" className="text-sm text-slate-400 hover:text-slate-200">← 케이스 선택</Link>
        <div className="flex items-center gap-3 mt-4">
          <Sparkles className="w-6 h-6 text-indigo-400" />
          <h1 className="text-2xl font-bold">Case A · AI 추천으로 시작</h1>
        </div>

        <div className="mt-4 rounded-lg border border-slate-800 bg-slate-900/40 p-4">
          <GuideBox
            why="행사 정보를 자세히 적을수록 추천 품질이 높아집니다. 표준 12종 환경장식물 중 적절한 항목을 자동으로 골라줍니다."
            how="행사명·장소는 필수. 사용 목적을 다중 선택하면 (예: 등록 안내+동선) 케이스에 맞는 제작물 조합을 받습니다."
            tip="대규모 정상회의는 30~80개, 중형 컨퍼런스 10~30개, 소형 워크숍 5~15개가 일반적입니다. 추천 후 직접 수량을 조정할 수 있어요."
          />
        </div>

        {stage === 'form' && (
          <div className="mt-8 space-y-5">
            <Field label="행사명 *">
              <input value={eventName} onChange={e => setEventName(e.target.value)} placeholder="예: 2026 K-콘텐츠 엑스포" className={inputCls} />
            </Field>
            <Field label="행사 장소 *">
              <input value={venue} onChange={e => setVenue(e.target.value)} placeholder="예: 코엑스 그랜드볼룸 / 인천 송도 컨벤시아" className={inputCls} />
            </Field>
            <Field label="행사일">
              <input type="date" value={eventDate} onChange={e => setEventDate(e.target.value)} className={inputCls} />
            </Field>
            <Field label="사용 목적 (복수 선택)">
              <div className="flex flex-wrap gap-2">
                {PURPOSE_OPTIONS.map(p => {
                  const on = purposes.has(p.id)
                  return (
                    <button key={p.id} onClick={() => togglePurpose(p.id)}
                      className={`px-3 py-1.5 rounded-full border text-sm transition ${on ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'}`}>
                      {p.label}
                    </button>
                  )
                })}
              </div>
            </Field>
            <Field label="추가 메모 (선택)">
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="VIP 참석·동시통역·해외 참가자 등 특이사항"
                className={inputCls + ' resize-none'} />
            </Field>

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
              </div>
            )}
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
                <div className="text-sm text-slate-300">추천 환경장식물 <span className="font-semibold text-slate-100">{items.length}건</span></div>
                <button onClick={() => setStage('form')} className="text-xs text-slate-400 hover:text-slate-200">← 입력 수정</button>
              </div>
              <div className="divide-y divide-slate-800/60">
                {items.map((it, i) => (
                  <div key={i} className="px-4 py-3 flex items-center gap-3">
                    <span className="w-6 text-xs text-slate-500">{it.no}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-100">{it.category_label}</span>
                        <span className="text-xs text-slate-500">{it.width_mm}×{it.height_mm}mm · {it.material}</span>
                      </div>
                      <div className="mt-0.5 text-sm text-slate-400 truncate">{it.location} — {it.rationale}</div>
                    </div>
                    <input type="number" min={1} value={it.quantity} onChange={e => updateItemQuantity(i, parseInt(e.target.value) || 1)}
                      className="w-16 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm text-right" />
                    <button onClick={() => removeItem(i)} className="text-xs text-rose-400 hover:text-rose-300">삭제</button>
                  </div>
                ))}
              </div>
            </div>

            {error && <div className="mt-4 text-sm text-rose-400 bg-rose-950/30 border border-rose-900/40 rounded-lg p-3">{error}</div>}

            <button onClick={handleCreate}
              className="mt-6 w-full inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-4 py-3 font-medium text-white">
              <CheckCircle2 className="w-4 h-4" /> 이대로 프로젝트 만들기 ({items.length}건)
            </button>
          </div>
        )}

        {stage === 'creating' && (
          <div className="mt-12 text-center text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin mx-auto" />
            <p className="mt-3">프로젝트를 만들고 추천 항목을 등록 중…</p>
          </div>
        )}
      </div>
    </div>
  )
}

const inputCls = 'w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2.5 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-sm text-slate-300 mb-1.5">{label}</div>
      {children}
    </label>
  )
}
