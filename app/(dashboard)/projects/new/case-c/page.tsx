// Case C — 샘플 디자인 이미지 업로드 → 빈 프로젝트 생성 후 master_image_url 설정
// (Vision 슬롯 인식은 기존 /api/analyze-layout 라우트가 처리; 1차안에서는 업로드만 즉시 가능, 분석은 프로젝트 진입 후)

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Image as ImageIcon, Upload, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function CaseCPage() {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [eventName, setEventName] = useState('')
  const [venue, setVenue] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCreate = async () => {
    if (!file || !eventName.trim()) { setError('행사명과 시안 이미지 모두 필요합니다'); return }
    setLoading(true)
    setError(null)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setError('로그인이 필요합니다'); return }

      // 1) 프로젝트 먼저 생성
      const { data: project, error: pErr } = await supabase
        .from('projects')
        .insert({
          name: eventName.trim(),
          owner_id: user.id,
          event_venue: venue.trim() || null,
          status: '준비중',
          allowed_users: [],
          purposes: [],
        })
        .select().single()
      if (pErr || !project) { setError(pErr?.message || '프로젝트 생성 실패'); return }

      // 2) 시안 이미지 → WebP 변환 → 마스터로 업로드
      const { compressToWebP } = await import('@/lib/services/imageUtils')
      const { buildStoragePath, explainStorageError } = await import('@/lib/services/storagePaths')
      const blob = await compressToWebP(file)
      const path = buildStoragePath('master', { userId: user.id, projectId: project.id })
      const { error: uErr } = await supabase.storage
        .from('design-images')
        .upload(path, blob, { contentType: blob.type || 'image/webp', upsert: true })
      if (uErr) { setError(explainStorageError(uErr.message || '')); return }

      const { data: { publicUrl } } = supabase.storage.from('design-images').getPublicUrl(path)
      await supabase.from('projects').update({ master_image_url: `${publicUrl}?t=${Date.now()}` }).eq('id', project.id)

      // 3) 프로젝트 정보 페이지(마스터 시안 + AI 분석)로 이동
      router.push(`/projects/${project.id}/info`)
    } catch (e) {
      setError(e instanceof Error ? e.message : '생성 실패')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="max-w-3xl mx-auto px-6 py-10">
        <Link href="/projects/new" className="text-sm text-slate-400 hover:text-slate-200">← 케이스 선택</Link>
        <div className="flex items-center gap-3 mt-4">
          <ImageIcon className="w-6 h-6 text-amber-400" />
          <h1 className="text-2xl font-bold">Case C · 샘플 디자인 보유로 시작</h1>
        </div>

        <div className="mt-8 space-y-5">
          <label className="block">
            <div className="text-sm text-slate-300 mb-1.5">행사명 *</div>
            <input value={eventName} onChange={e => setEventName(e.target.value)} className={inputCls} />
          </label>
          <label className="block">
            <div className="text-sm text-slate-300 mb-1.5">행사 장소</div>
            <input value={venue} onChange={e => setVenue(e.target.value)} className={inputCls} />
          </label>
          <label className="block border-2 border-dashed border-slate-700 rounded-xl p-8 text-center cursor-pointer hover:border-slate-600 hover:bg-slate-900/40 transition">
            <input type="file" accept="image/*" onChange={e => setFile(e.target.files?.[0] || null)} className="hidden" />
            <Upload className="w-8 h-8 mx-auto text-slate-500" />
            <div className="mt-2 text-sm text-slate-300">{file ? file.name : '시안 이미지를 선택하세요'}</div>
            <div className="mt-1 text-xs text-slate-500">PNG / JPG / WebP — 최대 10MB</div>
          </label>

          {error && <div className="text-sm text-rose-400 bg-rose-950/30 border border-rose-900/40 rounded-lg p-3">{error}</div>}

          <div className="text-sm text-slate-400 bg-slate-900/40 border border-slate-800 rounded-lg p-3">
            프로젝트 생성 후 <span className="text-slate-200 font-medium">/info 페이지에서 &quot;AI 슬롯 분석&quot;</span> 버튼을 누르면 슬롯 위치가 자동 추출됩니다.
          </div>

          <button onClick={handleCreate} disabled={!file || !eventName.trim() || loading}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-amber-600 hover:bg-amber-500 px-4 py-3 font-medium text-white disabled:opacity-50">
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> 처리 중…</> : '프로젝트 생성 + 시안 업로드'}
          </button>
        </div>
      </div>
    </div>
  )
}

const inputCls = 'w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2.5 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500'
