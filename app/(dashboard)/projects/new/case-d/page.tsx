// Case D — 텍스트만 있는 상태: 기본 X배너 1장만 만들고 진입

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FileText, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function CaseDPage() {
  const router = useRouter()
  const [eventName, setEventName] = useState('')
  const [venue, setVenue] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCreate = async () => {
    if (!eventName.trim()) { setError('행사명은 필수입니다'); return }
    setLoading(true)
    setError(null)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setError('로그인이 필요합니다'); return }

      const { data: project, error: pErr } = await supabase
        .from('projects')
        .insert({
          name: eventName.trim(),
          owner_id: user.id,
          event_venue: venue.trim() || null,
          event_date: eventDate || null,
          status: '준비중',
          allowed_users: [],
          purposes: [],
        })
        .select().single()
      if (pErr || !project) { setError(pErr?.message || '프로젝트 생성 실패'); return }

      // 빈 X배너 1개를 기본 항목으로 추가
      await supabase.from('design_items').insert({
        project_id: project.id,
        no: '01',
        category: 'X-배너',
        location: '',
        purpose: 'main_promo',
        language: 'KOR',
        quantity: 1,
        material: 'PET',
        width_mm: 600,
        height_mm: 1800,
      })

      router.push(`/projects/${project.id}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <div className="max-w-2xl mx-auto px-6 py-10">
        <Link href="/projects/new" className="text-sm text-slate-500 hover:text-slate-800">← 케이스 선택</Link>
        <div className="flex items-center gap-3 mt-4">
          <FileText className="w-6 h-6 text-slate-400" />
          <h1 className="text-2xl font-bold">Case D · 텍스트만으로 시작</h1>
        </div>

        <div className="mt-8 space-y-5">
          <label className="block">
            <div className="text-sm text-slate-400 mb-1.5">행사명 *</div>
            <input value={eventName} onChange={e => setEventName(e.target.value)} className={inputCls} />
          </label>
          <label className="block">
            <div className="text-sm text-slate-400 mb-1.5">행사 장소</div>
            <input value={venue} onChange={e => setVenue(e.target.value)} className={inputCls} />
          </label>
          <label className="block">
            <div className="text-sm text-slate-400 mb-1.5">행사일</div>
            <input type="date" value={eventDate} onChange={e => setEventDate(e.target.value)} className={inputCls} />
          </label>

          {error && <div className="text-sm text-rose-400 bg-rose-950/30 border border-rose-900/40 rounded-lg p-3">{error}</div>}

          <div className="text-sm text-slate-500 bg-white/40 border border-slate-200 rounded-lg p-3">
            <span className="text-slate-800 font-medium">기본 X-배너 1장</span>이 자동으로 추가됩니다. 필요한 만큼 에디터에서 추가하세요.
          </div>

          <button onClick={handleCreate} disabled={!eventName.trim() || loading}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-slate-200 hover:bg-slate-600 px-4 py-3 font-medium text-white disabled:opacity-50">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            프로젝트 생성
          </button>
        </div>
      </div>
    </div>
  )
}

const inputCls = 'w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2.5 text-slate-900 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500'
