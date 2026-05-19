'use client'

// 시설 가이드 수동 조회 패널 (§11-6-2)
// 사용자가 [행사장 가이드 보기] 버튼 클릭 시 슬라이드로 표시.
// 6종 정보 표시 + 학습 시점만 표기 (출처 URL 등 부가 정보는 제거 — §11-6-2 v8)
// v9+: 데이터 수집 현황 + 미확인 항목 섹션 추가
// v9.15+: 하단 "데이터 수정 요청" — 값이 바뀌었을 때 localStorage 신고 루트

import { useState } from 'react'
// v9.34: Database·CheckCircle2 (인라인 완료 메시지 외)·XCircle·Loader2 제거 — 데이터 수집 현황 섹션 삭제로 미사용
import { X, AlertCircle, Wrench, Anchor, Shield, Ban, Monitor, Calendar, Star, CheckCircle2, ClipboardList, Flag, Send } from 'lucide-react'
import { getFacilityGuide, findVenueKey } from '@/lib/data/venueFacilityGuide'
import { formatNoteText } from '@/lib/text/normalizeAiText'
import type { VenueFacilityGuide } from '@/lib/types'

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  allowed:     { label: '가능',     color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  conditional: { label: '조건부',   color: 'bg-amber-100 text-amber-700 border-amber-200' },
  denied:      { label: '불가',     color: 'bg-red-100 text-red-700 border-red-200' },
}

function StatusBadge({ status }: { status?: string }) {
  if (!status) return <span className="text-slate-400 text-[10px]">—</span>
  const cfg = STATUS_LABEL[status] ?? { label: status, color: 'bg-slate-100 text-slate-600 border-slate-200' }
  return <span className={`inline-block px-1.5 py-0.5 rounded border text-[10px] font-medium ${cfg.color}`}>{cfg.label}</span>
}

// v9.34: CollectionRow 함수 삭제 (데이터 수집 현황 섹션 미사용)

// v9.21 (2026-05-13): 회의 결정 ④⑤ — 미확인 항목 처리 정리
// v9.31 (2026-05-13): 회의 결정 ⑤ 추가 강조 텍스트 제거 — 사용자 지적
//   "사전 협의 후 발주 권장" 같은 추가 문구는 강조 라벨 톤다운 원칙과 맞지 않음.
//   카테고리명만 표기. 추가 안내가 필요하면 install_allowed의 note에서 이미 노출됨.
//
// 회의 인용:
//   "운영팀 확인 필수 이런 건 필요 없어요. 그냥 각별로 다른데 일반적으로 이때 하더라라는 정보만 주면 되고"
//   "미확인 항목 ... 어떤 설치 품목이 조건 메뉴를 하 필요한지가 같이 리스트업이 돼야겠죠.
//    만약에 그걸 못 하겠다 하면 이건 그냥 삭제하는 게 맞는 거 같고"
function getGuideUnknowns(guide: VenueFacilityGuide): string[] {
  const items: string[] = []

  // 설치 품목 중 "확인 필요" 문구가 들어간 항목을 카테고리명만 리스트업
  // (회의 결정 ⑤: 모호한 "재확인 필요" → 어떤 카테고리인지 명확화. 단, 추가 강조 텍스트 X)
  const itemsNeedingConfirmation = guide.install_allowed
    ?.filter(i => i.note?.includes('확인 필요') || i.note?.includes('확인 필수'))
    .map(i => i.category) ?? []

  for (const category of itemsNeedingConfirmation) {
    items.push(category)
  }

  // rigging 정보는 install_allowed의 ′천정배너′ 항목 note에 이미 포함됨 → 중복 제거
  // 매뉴얼 OCR 미파싱·내부 처리 메시지는 사용자에게 의미 없음 → 제거

  return items
}

interface Props {
  venueName: string | null | undefined
  open: boolean
  onClose: () => void
  /** 컬럼 핀포인트 (특정 컬럼 가이드만 강조). 'mount'·'rigging'·'safety' 등 */
  focusSection?: 'install' | 'mount' | 'rigging' | 'safety' | 'warning' | 'digital'
  /** 5/22 사용자 명시 = admin 영역 = 가이드 직접 수정 영역 활성 */
  adminMode?: boolean
  /** admin 영역 venue_id (PATCH 영역 영역). 없으면 = 수정 X */
  venueId?: string | null
}

export function FacilityGuidePanel({ venueName, open, onClose, focusSection, adminMode, venueId }: Props) {
  const guide: VenueFacilityGuide | null = getFacilityGuide(venueName)
  // v9.34: dbData·dbLoading state와 venues 조회 useEffect 삭제 (데이터 수집 현황 섹션 미사용).
  // 어드민 학습 관리자(LearningManagerClient)에서 venues.floor_plan_url·specs_text를 별도 조회·표시.
  const [correctionOpen, setCorrectionOpen] = useState(false)
  const [correctionText, setCorrectionText] = useState('')
  const [correctionDone, setCorrectionDone] = useState(false)
  // 5/22 사용자 명시 = admin 영역 = 6 영역 모두 직접 수정 영역 (카테고리·주의사항·설치 방법·리깅·안전·디지털 사이니지)
  const [editMode, setEditMode] = useState(false)
  const [editCategories, setEditCategories] = useState('')
  const [editWarnings, setEditWarnings] = useState('')
  const [editMountNote, setEditMountNote] = useState('')
  const [editRiggingAvail, setEditRiggingAvail] = useState<'true'|'false'|'unknown'>('unknown')
  const [editRiggingLoad, setEditRiggingLoad] = useState('')
  const [editRiggingNote, setEditRiggingNote] = useState('')
  const [editSafetyFire, setEditSafetyFire] = useState('')
  const [editSafetyFall, setEditSafetyFall] = useState('')
  const [editSafetyElectric, setEditSafetyElectric] = useState('')
  const [editSafetyWeather, setEditSafetyWeather] = useState('')
  const [editDigitalNote, setEditDigitalNote] = useState('')
  const [editSpecialNotes, setEditSpecialNotes] = useState('')
  const [editSaving, setEditSaving] = useState(false)
  const [editSaved, setEditSaved] = useState(false)

  const openEditMode = () => {
    if (!guide) return
    setEditCategories((guide.install_allowed ?? []).map(i => i.category + (i.note ? ` — ${i.note}` : '')).join('\n'))
    setEditWarnings((guide.warnings ?? []).map(w => w.description ?? w.type ?? '').join('\n'))
    setEditMountNote(guide.mount_methods?.note ?? '')
    setEditRiggingAvail(guide.rigging?.available === true ? 'true' : guide.rigging?.available === false ? 'false' : 'unknown')
    setEditRiggingLoad(guide.rigging?.max_load_kg ? String(guide.rigging.max_load_kg) : '')
    setEditRiggingNote(guide.rigging?.note ?? '')
    setEditSafetyFire(guide.safety?.fire ?? '')
    setEditSafetyFall(guide.safety?.fall ?? '')
    setEditSafetyElectric(guide.safety?.electric ?? '')
    setEditSafetyWeather(guide.safety?.weather ?? '')
    setEditDigitalNote(guide.digital_signage?.note ?? '')
    setEditSpecialNotes((guide.special_notes ?? []).join('\n'))
    setEditMode(true)
  }

  const saveEdit = async () => {
    if (!venueId) { alert('venue_id 영역 없음 — 학습 관리자 영역 등록 후 수정 가능'); return }
    setEditSaving(true)
    try {
      const catList = editCategories.split('\n').map(s => s.trim()).filter(Boolean).map(line => {
        const [cat, ...rest] = line.split('—').map(s => s.trim())
        return { category: cat, status: 'allowed' as const, note: rest.length > 0 ? rest.join('—') : undefined }
      })
      const warnList = editWarnings.split('\n').map(s => s.trim()).filter(Boolean).map(d => ({ type: '주의사항', description: d }))
      const newJson = {
        ...(guide ?? {}),
        install_allowed: catList,
        warnings: warnList,
        mount_methods: { ...(guide?.mount_methods ?? {}), note: editMountNote.trim() || undefined },
        rigging: {
          ...(guide?.rigging ?? {}),
          available: editRiggingAvail === 'true' ? true : editRiggingAvail === 'false' ? false : undefined,
          max_load_kg: editRiggingLoad.trim() ? Number(editRiggingLoad) : undefined,
          note: editRiggingNote.trim() || undefined,
        },
        safety: {
          fire: editSafetyFire.trim() || undefined,
          fall: editSafetyFall.trim() || undefined,
          electric: editSafetyElectric.trim() || undefined,
          weather: editSafetyWeather.trim() || undefined,
        },
        digital_signage: { ...(guide?.digital_signage ?? {}), note: editDigitalNote.trim() || undefined },
        special_notes: editSpecialNotes.split('\n').map(s => s.trim()).filter(Boolean),
        last_updated: new Date().toISOString().slice(0, 10),
      }
      const res = await fetch(`/api/admin/venues/${venueId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ facility_guide_json: newJson }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || res.statusText) }
      setEditSaved(true)
      setTimeout(() => { setEditSaved(false); setEditMode(false); window.location.reload() }, 1500)
    } catch (e) {
      alert('저장 실패: ' + (e instanceof Error ? e.message : 'unknown'))
    } finally { setEditSaving(false) }
  }

  const submitCorrection = () => {
    if (!correctionText.trim()) return
    const venueKey = guide ? (findVenueKey(guide.venue_name) ?? guide.venue_key) : (findVenueKey(venueName) ?? 'unknown')
    const vName = guide?.venue_name ?? venueName ?? undefined

    fetch('/api/correction-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        venue_key: venueKey,
        venue_name: vName,
        correction_text: correctionText.trim(),
      }),
    }).catch(() => {
      // API 실패 시 localStorage 폴백
      const key = 'venue_correction_requests'
      const prev: unknown[] = JSON.parse(localStorage.getItem(key) ?? '[]')
      prev.push({
        venue: guide?.venue_name ?? venueName ?? '알 수 없음',
        text: correctionText.trim(),
        submitted_at: new Date().toISOString(),
      })
      localStorage.setItem(key, JSON.stringify(prev))
    })
    setCorrectionText('')
    setCorrectionOpen(false)
    setCorrectionDone(true)
    setTimeout(() => setCorrectionDone(false), 3000)
  }

  if (!open) return null

  const unknowns = guide ? getGuideUnknowns(guide) : []

  // v9.21 (2026-05-13): 회의 결정 ① — 한 번 클릭에 진입 보장
  // - outer wrapper에 onClick={onClose}를 두면 패널 내부 클릭이 bubble되어 닫힘 → 두 번 클릭 필요
  // - 변경: pointer-events-none + backdrop만 onClose / 패널 본체는 pointer-events-auto + e.stopPropagation()
  //   첫 클릭에 즉시 모달이 열리고 그 안에서 어떤 자식 클릭도 닫지 않도록 격리
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none p-4">
      <div
        className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm pointer-events-auto"
        onClick={onClose}
        aria-label="가이드 닫기"
      />
      {/* 5/21 사용자 명시 = 시설 가이드 더 크게 노출. max-w-4xl + 폰트·여백 확대 */}
      <div
        className="relative w-full max-w-4xl max-h-[90vh] bg-white border border-slate-200 rounded-lg shadow-2xl overflow-y-auto pointer-events-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 = 중앙 정렬 모달 정합 (rounded top) */}
        <div className="sticky top-0 bg-white border-b border-slate-200 rounded-t-lg px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-slate-900 text-base font-bold">행사장 시설 가이드</h2>
            <p className="text-slate-500 text-sm mt-0.5">{guide?.venue_name ?? venueName ?? '행사장 미지정'}</p>
          </div>
          <div className="flex items-center gap-2">
            {/* 5/22 사용자 명시 = admin 영역 = 이 창에서 가이드 수정 가능 */}
            {adminMode && guide && !editMode && (
              <button onClick={openEditMode} className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs rounded transition">
                ✎ 가이드 수정
              </button>
            )}
            {adminMode && editMode && (
              <>
                <button onClick={saveEdit} disabled={editSaving} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-300 text-white text-xs rounded transition">
                  {editSaving ? '저장 중...' : editSaved ? '✓ 저장됨' : '저장'}
                </button>
                <button onClick={() => setEditMode(false)} className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs rounded transition">
                  취소
                </button>
              </>
            )}
            <button onClick={onClose} className="p-2 rounded hover:bg-slate-100 text-slate-500 transition">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 5/22 사용자 명시 = admin 편집 모드 영역 = 6 영역 모두 직접 편집 */}
        {adminMode && editMode && (
          <div className="px-6 py-5 space-y-4 bg-amber-50/40 border-b border-amber-200">
            <div>
              <label className="block text-sm text-slate-700 font-semibold mb-1">① 설치 가능 환경장식물 카테고리</label>
              <p className="text-[10px] text-slate-500 mb-1.5">1줄 1건·′카테고리 — 상세 메모′ (예: ′X배너 — 컨벤션홀 자립형′)</p>
              <textarea value={editCategories} onChange={e => setEditCategories(e.target.value)} rows={6} className="w-full text-xs border border-slate-300 rounded px-2 py-1.5 font-mono" />
            </div>
            <div>
              <label className="block text-sm text-slate-700 font-semibold mb-1">② 주의사항</label>
              <p className="text-[10px] text-slate-500 mb-1.5">1줄 1건 (예: ′외벽 부착 = 운영팀 사전 협의 의무′)</p>
              <textarea value={editWarnings} onChange={e => setEditWarnings(e.target.value)} rows={4} className="w-full text-xs border border-slate-300 rounded px-2 py-1.5" />
            </div>
            <div>
              <label className="block text-sm text-slate-700 font-semibold mb-1">③ 설치 방법 메모</label>
              <p className="text-[10px] text-slate-500 mb-1.5">타카·자석·접착제·행거·로프 영역 공통 메모 (예: ′리깅 영역 운영팀 협의′)</p>
              <input value={editMountNote} onChange={e => setEditMountNote(e.target.value)} className="w-full text-xs border border-slate-300 rounded px-2 py-1.5" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-sm text-slate-700 font-semibold mb-1">④ 리깅 가능</label>
                <select value={editRiggingAvail} onChange={e => setEditRiggingAvail(e.target.value as 'true'|'false'|'unknown')} className="w-full text-xs border border-slate-300 rounded px-2 py-1.5">
                  <option value="unknown">확인 필요</option>
                  <option value="true">가능</option>
                  <option value="false">불가</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-700 font-semibold mb-1">최대 하중 (kg)</label>
                <input type="number" value={editRiggingLoad} onChange={e => setEditRiggingLoad(e.target.value)} placeholder="50" className="w-full text-xs border border-slate-300 rounded px-2 py-1.5" />
              </div>
              <div>
                <label className="block text-sm text-slate-700 font-semibold mb-1">리깅 메모</label>
                <input value={editRiggingNote} onChange={e => setEditRiggingNote(e.target.value)} placeholder="예: 운영팀 도면 영역" className="w-full text-xs border border-slate-300 rounded px-2 py-1.5" />
              </div>
            </div>
            <div>
              <label className="block text-sm text-slate-700 font-semibold mb-1">⑤ 안전 기준</label>
              <div className="grid grid-cols-2 gap-2">
                <input value={editSafetyFire} onChange={e => setEditSafetyFire(e.target.value)} placeholder="화재 (예: 난연 2급 이상)" className="text-xs border border-slate-300 rounded px-2 py-1.5" />
                <input value={editSafetyFall} onChange={e => setEditSafetyFall(e.target.value)} placeholder="낙하 (예: 리깅 2점)" className="text-xs border border-slate-300 rounded px-2 py-1.5" />
                <input value={editSafetyElectric} onChange={e => setEditSafetyElectric(e.target.value)} placeholder="전기 (예: 220V)" className="text-xs border border-slate-300 rounded px-2 py-1.5" />
                <input value={editSafetyWeather} onChange={e => setEditSafetyWeather(e.target.value)} placeholder="기상 (예: 실내 영역)" className="text-xs border border-slate-300 rounded px-2 py-1.5" />
              </div>
            </div>
            <div>
              <label className="block text-sm text-slate-700 font-semibold mb-1">⑥ 디지털 사이니지 메모</label>
              <input value={editDigitalNote} onChange={e => setEditDigitalNote(e.target.value)} placeholder="예: 컨벤션홀 LED 영역" className="w-full text-xs border border-slate-300 rounded px-2 py-1.5" />
            </div>
            <div>
              <label className="block text-sm text-slate-700 font-semibold mb-1">특이사항</label>
              <p className="text-[10px] text-slate-500 mb-1.5">1줄 1건 (예: ′리조트 영업팀 D-30 이전 협의′)</p>
              <textarea value={editSpecialNotes} onChange={e => setEditSpecialNotes(e.target.value)} rows={3} className="w-full text-xs border border-slate-300 rounded px-2 py-1.5" />
            </div>
          </div>
        )}

        {!guide ? (
          <div className="px-5 py-4 space-y-4 text-xs">
            {/* v9.34: 데이터 수집 현황 섹션 삭제 (FacilityGuidePanel — 일반 사용자 화면).
                어드민 학습 관리자(LearningManagerClient)에는 보존. */}
            <div className="text-center py-6">
              <AlertCircle className="w-7 h-7 text-amber-400 mx-auto mb-2" />
              <p className="text-slate-600 text-sm font-medium">시설 가이드 없음</p>
              <p className="text-slate-400 text-[11px] mt-1 leading-relaxed">
                이 행사장의 설치 규정·리깅·안전 기준이 아직 등록되지 않았습니다.<br />
                /admin/learning 에서 매뉴얼을 등록하면 자동으로 학습됩니다.
              </p>
            </div>
          </div>
        ) : (
          <div className="px-6 py-5 space-y-6 text-sm">
            {/* v9.34: 데이터 수집 현황 섹션 삭제 (FacilityGuidePanel — 일반 사용자 화면).
                어드민 학습 관리자(LearningManagerClient)에는 보존. */}

            {/* 0-B. 사전 협의 권장 항목 (v9.21: 회의 결정 ④ — 강조 라벨 톤다운)
                이전 라벨: "미확인 항목 — 운영팀 직접 확인 필요" (강조 과다)
                변경: "사전 협의 권장" + 어떤 카테고리인지 명시. 일반적으로 어떻게 하더라 정보만 제공. */}
            {unknowns.length > 0 && (
              <section className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-3">
                <div className="flex items-center gap-1.5 mb-2 text-slate-700">
                  <ClipboardList className="w-3.5 h-3.5" />
                  <h3 className="font-semibold text-[12px]">사전 협의 권장 항목</h3>
                </div>
                <ul className="space-y-1.5">
                  {unknowns.map((item, i) => (
                    <li key={i} className="flex gap-2 text-slate-700">
                      <span className="mt-0.5 text-slate-400 flex-shrink-0">·</span>
                      <span className="leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* 0-C. 행사장 특이사항 — 데이터 있을 때만 표시
                v9.21: 시설 가이드 원문 전체 노출 (break-words + whitespace-pre-wrap) */}
            {guide.special_notes && guide.special_notes.length > 0 && (
              <section className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
                <div className="flex items-center gap-1.5 mb-2 text-amber-700">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                  <h3 className="font-semibold text-[12px]">행사장 특이사항</h3>
                </div>
                <ul className="space-y-1.5">
                  {guide.special_notes.map((note, i) => (
                    <li key={i} className="flex gap-2 text-amber-800">
                      <span className="mt-0.5 text-amber-500 flex-shrink-0">▸</span>
                      <span className="leading-relaxed break-words whitespace-pre-wrap">
                        {formatNoteText(note)}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* 1. 설치 가능 품목
                v9.21 (2026-05-13): 회의 결정 ② — 호버 텍스트 잘림 해결
                이전: 한 줄 가로 배치 + truncate max-w-[180px] → 사용자가 ′가다가 만′ 정보로 느낌
                변경: 행사장 시설 가이드는 객관 정보(코엑스 등 1차 자료) → 잘림 없이 전부 노출
                      카테고리·상태는 헤더 라인 + note는 아래 줄에 wrap. truncate / line-clamp 제거. */}
            <Section icon={<Wrench className="w-3.5 h-3.5" />} title="1. 설치 가능 품목" highlight={focusSection === 'install'}>
              <div className="space-y-2.5">
                {guide.install_allowed.length === 0 && <p className="text-slate-400 text-[11px]">등록된 정보 없음</p>}
                {guide.install_allowed.map((item, i) => (
                  <div key={i} className="py-1.5 border-b border-slate-100 last:border-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-slate-800 font-medium">{item.category}</span>
                      <StatusBadge status={item.status} />
                    </div>
                    {item.note && (
                      <p className="text-slate-600 text-[11px] leading-relaxed break-words whitespace-pre-wrap">
                        {formatNoteText(item.note)}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </Section>

            {/* 2. 설치·고정 방법 */}
            <Section icon={<Wrench className="w-3.5 h-3.5" />} title="2. 설치·고정 방법" highlight={focusSection === 'mount'}>
              <div className="grid grid-cols-2 gap-2">
                {[
                  ['타카', guide.mount_methods?.taka],
                  ['자석', guide.mount_methods?.magnet],
                  ['접착제', guide.mount_methods?.adhesive],
                  ['행거', guide.mount_methods?.hanger],
                  ['로프', guide.mount_methods?.rope],
                ].map(([label, status]) => (
                  <div key={label as string} className="flex items-center justify-between bg-slate-50 px-2 py-1.5 rounded">
                    <span className="text-slate-700">{label}</span>
                    <StatusBadge status={status as string | undefined} />
                  </div>
                ))}
              </div>
              {guide.mount_methods?.note && (
                <p className="text-slate-500 text-[11px] mt-2 leading-relaxed">※ {guide.mount_methods.note}</p>
              )}
            </Section>

            {/* 3. 리깅·하중 */}
            <Section icon={<Anchor className="w-3.5 h-3.5" />} title="3. 리깅·하중 제한" highlight={focusSection === 'rigging'}>
              <dl className="space-y-1">
                <Row label="천장 행잉 가능" value={guide.rigging?.available === false ? '불가' : guide.rigging?.available ? '가능' : '[확인 필요]'} />
                <Row label="그리드 라인" value={guide.rigging?.grid_lines?.join(', ') ?? '[확인 필요]'} />
                <Row label="하중 한계" value={guide.rigging?.max_load_kg ? `${guide.rigging.max_load_kg}kg/조` : '[확인 필요]'} />
              </dl>
              {guide.rigging?.note && <p className="text-slate-500 text-[11px] mt-2 leading-relaxed">※ {guide.rigging.note}</p>}
            </Section>

            {/* 4. 안전 기준 */}
            <Section icon={<Shield className="w-3.5 h-3.5" />} title="4. 안전 기준" highlight={focusSection === 'safety'}>
              <dl className="space-y-1">
                <Row label="화재" value={guide.safety?.fire ?? '—'} />
                <Row label="낙하" value={guide.safety?.fall ?? '—'} />
                <Row label="전기" value={guide.safety?.electric ?? '—'} />
                <Row label="기상" value={guide.safety?.weather ?? '—'} />
              </dl>
            </Section>

            {/* 5. 주의·금지 — v9.21: 시설 가이드 원문 전체 노출 (잘림 금지) */}
            <Section icon={<Ban className="w-3.5 h-3.5" />} title="5. 주의사항·금지조건" highlight={focusSection === 'warning'}>
              {guide.warnings.length === 0 ? (
                <p className="text-slate-400 text-[11px]">등록된 정보 없음</p>
              ) : (
                <ul className="space-y-2">
                  {guide.warnings.map((w, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-red-500 mt-0.5 flex-shrink-0">●</span>
                      <div className="min-w-0">
                        <span className="text-slate-800 font-medium">{w.type}</span>
                        <p className="text-slate-600 text-[11px] leading-relaxed break-words whitespace-pre-wrap mt-0.5">
                          {formatNoteText(w.description)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            {/* 6. 디지털 사이니지 */}
            <Section icon={<Monitor className="w-3.5 h-3.5" />} title="6. 디지털 사이니지" highlight={focusSection === 'digital'}>
              <dl className="space-y-1">
                <Row label="허용 위치" value={guide.digital_signage?.allowed_locations?.join(', ') ?? '—'} />
                <Row label="LED 크기 한도" value={guide.digital_signage?.led_size_limit ?? '—'} />
                <Row label="콘텐츠 사전 검토" value={guide.digital_signage?.content_review ? '필수' : '—'} />
              </dl>
              {guide.digital_signage?.note && <p className="text-slate-500 text-[11px] mt-2 leading-relaxed">※ {guide.digital_signage.note}</p>}
            </Section>

            {/* 푸터 — 학습 시점 + 데이터 수정 요청 */}
            <div className="pt-3 border-t border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-slate-500 text-[11px] flex items-center gap-1.5">
                  <Calendar className="w-3 h-3" />
                  본 정보는 {guide.last_updated ?? '학습 시점 미확인'} 기준입니다.
                </p>
                <button
                  onClick={() => { setCorrectionOpen(v => !v); setCorrectionDone(false) }}
                  className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-rose-600 transition"
                  title="정보가 오래되었거나 틀린 경우 신고"
                >
                  <Flag className="w-3 h-3" />
                  정보 수정 요청
                </button>
              </div>
              {guide.notes && <p className="text-slate-400 text-[10px] leading-relaxed">{guide.notes}</p>}

              {/* 수정 요청 인라인 폼 */}
              {correctionOpen && (
                <div className="bg-rose-50 border border-rose-200 rounded-lg px-3 py-2.5 space-y-2">
                  <p className="text-[11px] text-rose-700 font-medium">어떤 정보가 변경되었나요?</p>
                  <textarea
                    value={correctionText}
                    onChange={e => setCorrectionText(e.target.value)}
                    placeholder="예: 코엑스 그랜드볼룸 최대 폭이 4,000mm에서 3,500mm로 변경됨"
                    rows={3}
                    className="w-full text-[11px] px-2 py-1.5 border border-rose-300 rounded bg-white resize-none text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-rose-400"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => { setCorrectionOpen(false); setCorrectionText('') }}
                      className="text-[10px] text-slate-500 hover:text-slate-700 px-2 py-1"
                    >취소</button>
                    <button
                      onClick={submitCorrection}
                      disabled={!correctionText.trim()}
                      className="flex items-center gap-1 text-[10px] px-2.5 py-1 bg-rose-600 text-white rounded hover:bg-rose-700 disabled:opacity-40 transition"
                    >
                      <Send className="w-2.5 h-2.5" /> 제출
                    </button>
                  </div>
                </div>
              )}

              {/* 제출 완료 메시지 */}
              {correctionDone && (
                <p className="text-[11px] text-emerald-600 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3 h-3" />
                  수정 요청이 접수되었습니다. 관리자가 확인 후 반영합니다.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function Section({ icon, title, highlight, children }: { icon: React.ReactNode; title: string; highlight?: boolean; children: React.ReactNode }) {
  return (
    <section className={highlight ? 'ring-2 ring-indigo-300 rounded-lg p-3 -m-3 transition' : ''}>
      <div className="flex items-center gap-2 mb-3 text-slate-700">
        {icon}
        <h3 className="font-semibold text-sm">{title}</h3>
      </div>
      {children}
    </section>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  // 5/22 사용자 명시 = "LED 크기 한도" 같은 긴 라벨 줄 바꿔지는 문제 해결
  return (
    <div className="flex gap-2">
      <dt className="text-slate-500 w-28 flex-shrink-0 whitespace-nowrap">{label}</dt>
      <dd className="text-slate-800 break-words min-w-0">{value}</dd>
    </div>
  )
}
