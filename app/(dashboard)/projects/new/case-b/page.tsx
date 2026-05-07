// Case B — 엑셀(.xlsx) 업로드: 17컬럼 fuzzy 매칭 후 프로젝트 생성
// 1차안: 헤더 매칭 + 행 → design_items 직접 변환

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FileSpreadsheet, Upload, CheckCircle2, Loader2, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

// 표준 17컬럼 (CLAUDE.md §10) — 각 컬럼의 fuzzy 매칭용 키워드
const COLUMN_KEYS = [
  { key: 'no',         names: ['NO', '번호', 'NO.', '순번'] },
  { key: 'part',       names: ['파트', '업무파트', '담당파트'] },
  { key: 'category',   names: ['구분', '품목', '제작물', '종류', '환경장식물'] },
  { key: 'location',   names: ['장소', '설치위치', '위치'] },
  { key: 'purpose',    names: ['사용목적', '목적', '용도'] },
  { key: 'language',   names: ['언어'] },
  { key: 'size',       names: ['규격', '사이즈', '크기'] },
  { key: 'material',   names: ['재질', '소재'] },
  { key: 'quantity',   names: ['수량', '개수'] },
  { key: 'content',    names: ['내용'] },
  { key: 'note',       names: ['비고', '특이사항'] },
] as const

interface ParsedRow {
  no?: string; part?: string; category?: string; location?: string
  purpose?: string; language?: string; size?: string; material?: string
  quantity?: string; content?: string; note?: string
}

export default function CaseBPage() {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [eventName, setEventName] = useState('')
  const [venue, setVenue] = useState('')
  const [parsed, setParsed] = useState<ParsedRow[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setError(null)
    try {
      const XLSX = await import('xlsx')
      const buf = await f.arrayBuffer()
      const wb = XLSX.read(buf, { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const aoa: string[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
      if (aoa.length < 2) { setError('엑셀에 데이터가 없습니다'); return }

      // 헤더 행 자동 탐색 (NO/번호가 들어있는 첫 행)
      let headerIdx = aoa.findIndex(row => row.some(c => /^(NO|번호)$/i.test(String(c).trim())))
      if (headerIdx === -1) headerIdx = 0

      const header = aoa[headerIdx].map(c => String(c).trim())
      const colMap: Record<string, number> = {}
      for (const { key, names } of COLUMN_KEYS) {
        const idx = header.findIndex(h => names.some(n => h.replace(/\s+/g, '').includes(n.replace(/\s+/g, ''))))
        if (idx >= 0) colMap[key] = idx
      }

      const rows: ParsedRow[] = aoa.slice(headerIdx + 1)
        .filter(r => r.some(c => String(c).trim() !== ''))
        .map(r => {
          const out: ParsedRow = {}
          for (const { key } of COLUMN_KEYS) {
            const i = colMap[key]
            if (i !== undefined) out[key as keyof ParsedRow] = String(r[i] ?? '').trim()
          }
          return out
        })
      setParsed(rows)
    } catch (e) {
      setError(e instanceof Error ? e.message : '엑셀 파싱 실패')
    }
  }

  const handleCreate = async () => {
    if (!parsed || !eventName.trim()) { setError('행사명과 엑셀 모두 필요합니다'); return }
    setLoading(true)
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
          status: '준비중',
          allowed_users: [],
          purposes: [],
        })
        .select().single()
      if (pErr || !project) { setError(pErr?.message || '프로젝트 생성 실패'); return }

      // 동의어 사전 로드 (예: 스프링배너 → X배너)
      const { loadAliases, resolveAliasSync } = await import('@/lib/services/aliasResolver')
      const aliases = await loadAliases(supabase)

      const rows = parsed.map((r, i) => {
        // 규격 "600*1800" or "600x1800" 파싱
        const sizeMatch = (r.size || '').match(/(\d+)\s*[\*x×]\s*(\d+)/)
        // 동의어 표준화 (categoryRaw → canonical)
        const categoryRaw = r.category || ''
        const resolved = resolveAliasSync(categoryRaw, aliases)
        return {
          project_id: project.id,
          no: r.no || String(i + 1).padStart(2, '0'),
          part: r.part || null,
          category: resolved.canonical || null,
          location: r.location || null,
          purpose: r.purpose || null,
          language: r.language === 'EN' ? 'EN' : r.language === 'EN/KOR' ? 'EN/KOR' : 'KOR',
          quantity: parseInt(r.quantity || '1', 10) || 1,
          material: r.material || null,
          width_mm: sizeMatch ? parseInt(sizeMatch[1]) : null,
          height_mm: sizeMatch ? parseInt(sizeMatch[2]) : null,
        }
      })
      const { error: iErr } = await supabase.from('design_items').insert(rows)
      if (iErr) { setError(iErr.message); return }
      router.push(`/projects/${project.id}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="max-w-3xl mx-auto px-6 py-10">
        <Link href="/projects/new" className="text-sm text-slate-400 hover:text-slate-200">← 케이스 선택</Link>
        <div className="flex items-center gap-3 mt-4">
          <FileSpreadsheet className="w-6 h-6 text-emerald-400" />
          <h1 className="text-2xl font-bold">Case B · 엑셀 보유로 시작</h1>
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
            <input type="file" accept=".xlsx,.xls" onChange={handleFile} className="hidden" />
            <Upload className="w-8 h-8 mx-auto text-slate-500" />
            <div className="mt-2 text-sm text-slate-300">{file ? file.name : '엑셀 파일을 선택하세요 (.xlsx)'}</div>
            <div className="mt-1 text-xs text-slate-500">17컬럼 표준 양식 또는 NO/구분/장소/규격/수량/재질 포함</div>
          </label>

          {error && <div className="text-sm text-rose-400 bg-rose-950/30 border border-rose-900/40 rounded-lg p-3 flex items-start gap-2"><AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />{error}</div>}

          {parsed && parsed.length > 0 && (
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-800 text-sm">매칭된 항목 <span className="font-semibold">{parsed.length}건</span></div>
              <div className="max-h-72 overflow-auto divide-y divide-slate-800/60 text-sm">
                {parsed.slice(0, 50).map((r, i) => (
                  <div key={i} className="px-4 py-2 grid grid-cols-12 gap-2">
                    <span className="col-span-1 text-slate-500">{r.no || i + 1}</span>
                    <span className="col-span-3 truncate">{r.category || '—'}</span>
                    <span className="col-span-3 truncate text-slate-400">{r.location || '—'}</span>
                    <span className="col-span-2 text-slate-500">{r.size || '—'}</span>
                    <span className="col-span-1 text-right">{r.quantity || 1}</span>
                    <span className="col-span-2 truncate text-slate-500">{r.material || '—'}</span>
                  </div>
                ))}
                {parsed.length > 50 && <div className="px-4 py-2 text-xs text-slate-500">… +{parsed.length - 50}건 더 있음</div>}
              </div>
            </div>
          )}

          <button onClick={handleCreate} disabled={!parsed || !eventName.trim() || loading}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-4 py-3 font-medium text-white disabled:opacity-50">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            프로젝트 생성 + 엑셀 항목 등록
          </button>
        </div>
      </div>
    </div>
  )
}

const inputCls = 'w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2.5 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500'
