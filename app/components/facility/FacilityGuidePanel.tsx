'use client'

// 시설 가이드 수동 조회 패널 (§11-6-2)
// 사용자가 [행사장 가이드 보기] 버튼 클릭 시 슬라이드로 표시.
// 6종 정보 표시 + 학습 시점만 표기 (출처 URL 등 부가 정보는 제거 — §11-6-2 v8)

import { X, AlertCircle, Wrench, Anchor, Shield, Ban, Monitor, Calendar, Star } from 'lucide-react'
import { getFacilityGuide } from '@/lib/data/venueFacilityGuide'
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

interface Props {
  venueName: string | null | undefined
  open: boolean
  onClose: () => void
  /** 컬럼 핀포인트 (특정 컬럼 가이드만 강조). 'mount'·'rigging'·'safety' 등 */
  focusSection?: 'install' | 'mount' | 'rigging' | 'safety' | 'warning' | 'digital'
}

export function FacilityGuidePanel({ venueName, open, onClose, focusSection }: Props) {
  const guide: VenueFacilityGuide | null = getFacilityGuide(venueName)

  if (!open) return null

  return (
    <div className="fixed inset-0 z-40 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md bg-white border-l border-slate-200 shadow-2xl h-full overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="sticky top-0 bg-white border-b border-slate-200 px-5 py-3 flex items-center justify-between">
          <div>
            <h2 className="text-slate-900 text-sm font-bold">행사장 시설 가이드</h2>
            <p className="text-slate-500 text-xs">{guide?.venue_name ?? venueName ?? '행사장 미지정'}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-slate-100 text-slate-500 transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        {!guide ? (
          <div className="px-5 py-8 text-center">
            <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-3" />
            <p className="text-slate-700 text-sm font-medium">학습된 가이드가 없습니다</p>
            <p className="text-slate-500 text-xs mt-2">
              ′{venueName}′ 행사장의 시설 가이드는 아직 등록되지 않았습니다.
              <br />
              관리자에게 매뉴얼 등록 요청해 주세요.
            </p>
          </div>
        ) : (
          <div className="px-5 py-4 space-y-5 text-xs">
            {/* 0. 행사장 특이사항 — 데이터 있을 때만 표시 */}
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
                      <span className="leading-relaxed">{note}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* 1. 설치 가능 품목 */}
            <Section icon={<Wrench className="w-3.5 h-3.5" />} title="1. 설치 가능 품목" highlight={focusSection === 'install'}>
              <div className="space-y-1.5">
                {guide.install_allowed.length === 0 && <p className="text-slate-400 text-[11px]">등록된 정보 없음</p>}
                {guide.install_allowed.map((item, i) => (
                  <div key={i} className="flex items-center justify-between py-1 border-b border-slate-100 last:border-0">
                    <span className="text-slate-800 font-medium">{item.category}</span>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={item.status} />
                      {item.note && <span className="text-slate-500 text-[10px] max-w-[180px] truncate" title={item.note}>{item.note}</span>}
                    </div>
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

            {/* 5. 주의·금지 */}
            <Section icon={<Ban className="w-3.5 h-3.5" />} title="5. 주의사항·금지조건" highlight={focusSection === 'warning'}>
              {guide.warnings.length === 0 ? (
                <p className="text-slate-400 text-[11px]">등록된 정보 없음</p>
              ) : (
                <ul className="space-y-1.5">
                  {guide.warnings.map((w, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-red-500 mt-0.5">●</span>
                      <div>
                        <span className="text-slate-800 font-medium">{w.type}</span>
                        <span className="text-slate-600"> — {w.description}</span>
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

            {/* 푸터 — 학습 시점만 (§11-6-2 v8 단순화) */}
            <div className="pt-3 border-t border-slate-200">
              <p className="text-slate-500 text-[11px] flex items-center gap-1.5">
                <Calendar className="w-3 h-3" />
                본 정보는 {guide.last_updated ?? '학습 시점 미확인'} 기준입니다.
              </p>
              {guide.notes && <p className="text-slate-400 text-[10px] mt-1 leading-relaxed">{guide.notes}</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function Section({ icon, title, highlight, children }: { icon: React.ReactNode; title: string; highlight?: boolean; children: React.ReactNode }) {
  return (
    <section className={highlight ? 'ring-2 ring-indigo-300 rounded-lg p-2 -m-2 transition' : ''}>
      <div className="flex items-center gap-1.5 mb-2 text-slate-700">
        {icon}
        <h3 className="font-semibold text-[12px]">{title}</h3>
      </div>
      {children}
    </section>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <dt className="text-slate-500 w-20 flex-shrink-0">{label}</dt>
      <dd className="text-slate-800">{value}</dd>
    </div>
  )
}
