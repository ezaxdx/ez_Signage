'use client'

import { useState } from 'react'
import { X, Loader2, AlertCircle, Send, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { explainStorageError } from '@/lib/services/storagePaths'

interface Props {
  open: boolean
  onClose: () => void
  userId: string
  initialName?: string
  onSubmitted?: (requestId: string, name: string) => void
}

const VENUE_TYPES = [
  { value: '컨벤션센터', label: '컨벤션센터' },
  { value: '호텔',       label: '호텔' },
  { value: '전시장',     label: '전시장' },
  { value: '야외',       label: '야외' },
  { value: '공공시설',   label: '공공시설' },
  { value: '기타',       label: '기타' },
] as const

const REGIONS = ['서울', '수도권', '지방', '제주', '해외'] as const

export function VenueRequestModal({ open, onClose, userId, initialName = '', onSubmitted }: Props) {
  const [name, setName] = useState(initialName)
  const [region, setRegion] = useState<string>('')
  const [venueType, setVenueType] = useState<string>('')
  const [hallSplit, setHallSplit] = useState(false)
  const [floorPlanFile, setFloorPlanFile] = useState<File | null>(null)
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  if (!open) return null

  const reset = () => {
    setName(''); setRegion(''); setVenueType(''); setHallSplit(false)
    setFloorPlanFile(null); setNotes(''); setError(null); setSubmitted(false)
  }

  const handleClose = () => {
    if (submitting) return
    reset()
    onClose()
  }

  const handleSubmit = async () => {
    if (!name.trim()) { setError('행사장 이름을 입력하세요.'); return }
    setSubmitting(true); setError(null)
    try {
      const supabase = createClient()
      let floorPlanUrl: string | null = null
      if (floorPlanFile) {
        try {
          // 첫 세그먼트는 반드시 userId (RLS 요구). venue-requests는 사용자 영역 하위.
          const ext = (floorPlanFile.name.split('.').pop() || 'bin').toLowerCase()
          const path = `${userId}/venue-requests/${Date.now()}.${ext}`
          const { error: upErr } = await supabase.storage
            .from('design-images')
            .upload(path, floorPlanFile, { contentType: floorPlanFile.type || undefined, upsert: false })
          if (upErr) {
            console.warn('도면 업로드 실패:', explainStorageError(upErr.message))
          } else {
            const { data: pub } = supabase.storage.from('design-images').getPublicUrl(path)
            floorPlanUrl = pub.publicUrl
          }
        } catch (e) {
          console.warn('도면 업로드 예외:', e)
        }
      }
      const { data, error: insErr } = await supabase
        .from('venue_requests')
        .insert({
          name: name.trim(),
          region: region || null,
          venue_type: venueType || null,
          floor_plan_url: floorPlanUrl,
          hall_split_requested: hallSplit,
          notes: notes.trim() || null,
          requested_by: userId,
        })
        .select('id')
        .single()
      if (insErr) {
        // venue_requests 테이블 미생성 시 친절한 안내
        if (/relation .* does not exist|venue_requests/i.test(insErr.message ?? '')) {
          setError('venue_requests 테이블이 아직 생성되지 않았습니다. 관리자가 supabase/migration_v6_v4_1.sql을 실행한 뒤 다시 시도해주세요.')
        } else {
          setError(insErr.message)
        }
        return
      }
      // usage_logs 기록 (있으면)
      try {
        await supabase.from('usage_logs').insert({ user_id: userId, action: 'venue_request', metadata: { request_id: data?.id, name } })
      } catch { /* usage_logs 없을 수도 */ }

      setSubmitted(true)
      onSubmitted?.(data?.id ?? '', name.trim())
    } catch (e) {
      setError(e instanceof Error ? e.message : '요청 실패')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h2 className="text-slate-900 font-semibold text-sm">신규 행사장 등록 요청</h2>
          <button onClick={handleClose} disabled={submitting} className="text-slate-500 hover:text-slate-400 disabled:opacity-50">
            <X className="w-4 h-4" />
          </button>
        </div>

        {submitted ? (
          <div className="p-6 text-center space-y-3">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
            <p className="text-slate-900 text-sm font-medium">요청을 보냈습니다.</p>
            <p className="text-slate-500 text-xs">관리자가 승인하면 새 프로젝트 행사장 드롭다운에 즉시 표시됩니다.</p>
            <button onClick={handleClose} className="mt-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg transition">
              닫기
            </button>
          </div>
        ) : (
          <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
            <p className="text-slate-500 text-[11px] leading-relaxed">
              목록에 없는 행사장을 등록 요청합니다. 관리자가 승인하면 다음 프로젝트 생성 시 드롭다운에 자동으로 나타납니다.
            </p>

            <div>
              <label className="block text-slate-500 text-[11px] font-medium mb-1">행사장 이름 <span className="text-indigo-400">*</span></label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="예: BEXCO 1전시장"
                className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-slate-900 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-500 text-[11px] font-medium mb-1">권역</label>
                <select value={region} onChange={e => setRegion(e.target.value)} className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-2 text-slate-900 text-sm">
                  <option value="">선택</option>
                  {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-slate-500 text-[11px] font-medium mb-1">행사장 유형</label>
                <select value={venueType} onChange={e => setVenueType(e.target.value)} className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-2 text-slate-900 text-sm">
                  <option value="">선택</option>
                  {VENUE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
            </div>

            <label className="flex items-start gap-2 text-slate-400 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={hallSplit}
                onChange={e => setHallSplit(e.target.checked)}
                className="mt-0.5"
              />
              <span>
                <span className="font-medium">홀 단위 분리 필요</span>
                <span className="block text-slate-500 text-[10px] mt-0.5">
                  예: 코엑스 전시장과 컨퍼런스홀처럼 홀 단위로 환경장식물이 다를 때 체크
                </span>
              </span>
            </label>

            <div>
              <label className="block text-slate-500 text-[11px] font-medium mb-1">도면 첨부 (선택, PDF/이미지)</label>
              <input
                type="file"
                accept=".pdf,image/*"
                onChange={e => setFloorPlanFile(e.target.files?.[0] ?? null)}
                className="block w-full text-slate-400 text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:bg-slate-50 file:text-slate-400 file:cursor-pointer"
              />
              {floorPlanFile && <p className="text-slate-500 text-[10px] mt-1 truncate">{floorPlanFile.name}</p>}
            </div>

            <div>
              <label className="block text-slate-500 text-[11px] font-medium mb-1">메모 (선택)</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="주출입구 위치, 면적, 특이사항 등"
                rows={2}
                className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-slate-900 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {error && (
              <div className="flex items-start gap-2 text-red-400 text-xs bg-red-950/30 border border-red-900/40 rounded px-3 py-2">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span className="whitespace-pre-wrap">{error}</span>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                onClick={handleClose}
                disabled={submitting}
                className="px-3 py-1.5 text-slate-500 hover:text-slate-800 text-xs transition disabled:opacity-50"
              >
                취소
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting || !name.trim()}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-200 disabled:text-slate-500 text-white text-xs rounded transition"
              >
                {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                요청 보내기
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
