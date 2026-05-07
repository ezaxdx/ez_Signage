'use client'

import { useState } from 'react'
import Link from 'next/link'
import { LayoutGrid, ArrowLeft, Tag, Shuffle, MapPin, Users, Calendar, ChevronRight } from 'lucide-react'

interface SignageType {
  id: string
  name: string
  width_mm: number
  height_mm: number
  material_default: string | null
  category: string | null
}

interface Synonym {
  id: string
  alias: string
  canonical_name: string
  note: string | null
}

interface Designer {
  id: string
  name: string
  company: string | null
  note: string | null
}

interface EventHistory {
  id: string
  project_name: string
  pm_dept: string | null
  year: number | null
  event_date: string | null
  venue: string | null
  client: string | null
  event_type: string | null
}

interface VenueInfo {
  id: string
  name: string
  region: string | null
  venue_type: string | null
  address: string | null
  note: string | null
}

interface Props {
  signageTypes: SignageType[]
  synonyms: Synonym[]
  designers: Designer[]
  eventHistory: EventHistory[]
  venues: VenueInfo[]
}

type TabKey = 'signage' | 'synonyms' | 'venues' | 'designers' | 'events'

const TABS: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: 'signage', label: '환경장식물 종류', icon: Tag },
  { key: 'synonyms', label: '동의어', icon: Shuffle },
  { key: 'venues', label: '행사장', icon: MapPin },
  { key: 'designers', label: '디자인 업체', icon: Users },
  { key: 'events', label: '행사 이력', icon: Calendar },
]

export function DataDashboard({ signageTypes, synonyms, designers, eventHistory, venues }: Props) {
  const [activeTab, setActiveTab] = useState<TabKey>('signage')

  const stats = [
    { label: '제작물 종류', value: signageTypes.length, color: 'text-indigo-400' },
    { label: '동의어 매핑', value: synonyms.length, color: 'text-emerald-400' },
    { label: '행사장', value: venues.length, color: 'text-amber-400' },
    { label: '행사 이력', value: eventHistory.length, color: 'text-violet-400' },
  ]

  return (
    <div className="min-h-screen bg-slate-950">
      {/* 헤더 */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
              <LayoutGrid className="w-4 h-4 text-white" />
            </div>
            <span className="text-slate-100 font-semibold text-sm tracking-tight">MICE 디자인 가이드</span>
          </div>
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 text-slate-400 hover:text-indigo-300 text-xs transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            대시보드로
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* 타이틀 */}
        <div>
          <h1 className="text-xl font-bold text-slate-100">데이터 관리</h1>
          <p className="text-slate-500 text-sm mt-0.5">AI 사전학습 데이터 — 동의어·행사장·행사 이력 관리</p>
        </div>

        {/* 통계 카드 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {stats.map(s => (
            <div key={s.label} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <p className="text-slate-500 text-xs">{s.label}</p>
              <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* 탭 */}
        <div className="flex gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1.5 flex-wrap">
          {TABS.map(t => {
            const Icon = t.icon
            return (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition whitespace-nowrap ${
                  activeTab === t.key
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            )
          })}
        </div>

        {/* 탭 콘텐츠 */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          {activeTab === 'signage' && (
            <SignageTab data={signageTypes} />
          )}
          {activeTab === 'synonyms' && (
            <SynonymsTab data={synonyms} />
          )}
          {activeTab === 'venues' && (
            <VenuesTab data={venues} />
          )}
          {activeTab === 'designers' && (
            <DesignersTab data={designers} />
          )}
          {activeTab === 'events' && (
            <EventsTab data={eventHistory} />
          )}
        </div>

        {/* 데이터 수집 계획 */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
          <h2 className="text-slate-300 font-semibold text-sm mb-3">데이터 수집 계획</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { step: '1', title: '동의어 검증', desc: '현장 실무자와 동의어 목록 확인·보완', status: '진행예정' },
              { step: '2', title: '행사 이력 분석', desc: '행사별 폴더 34개 → 카테고리·수량 패턴 추출', status: '진행예정' },
              { step: '3', title: '수행실적 연계', desc: 'PM 부서·발주처·행사유형 데이터 입력', status: '진행예정' },
              { step: '4', title: '이미지 카테고리화', desc: '환경장식물 샘플 → 종류별 분류 및 레이아웃 DNA 추출', status: '진행예정' },
            ].map(item => (
              <div key={item.step} className="flex items-start gap-3 p-3 bg-slate-800/40 rounded-lg">
                <div className="w-6 h-6 rounded-full bg-indigo-900/60 border border-indigo-700/50 flex items-center justify-center flex-shrink-0">
                  <span className="text-indigo-400 text-xs font-bold">{item.step}</span>
                </div>
                <div className="min-w-0">
                  <p className="text-slate-200 text-sm font-medium">{item.title}</p>
                  <p className="text-slate-500 text-xs mt-0.5">{item.desc}</p>
                </div>
                <span className="text-slate-600 text-xs flex-shrink-0">{item.status}</span>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}

function SignageTab({ data }: { data: SignageType[] }) {
  if (data.length === 0) return <EmptyState message="Supabase migration_v5 실행 후 데이터가 표시됩니다" />
  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="border-b border-slate-800">
          {['이름', '규격(mm)', '기본 재질', '카테고리'].map(h => (
            <th key={h} className="text-left text-slate-500 font-medium px-4 py-3">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map(row => (
          <tr key={row.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
            <td className="px-4 py-2.5 text-slate-200 font-medium">{row.name}</td>
            <td className="px-4 py-2.5 text-slate-400">{row.width_mm} × {row.height_mm}</td>
            <td className="px-4 py-2.5 text-slate-400">{row.material_default ?? '—'}</td>
            <td className="px-4 py-2.5 text-slate-500">{row.category ?? '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function SynonymsTab({ data }: { data: Synonym[] }) {
  if (data.length === 0) return <EmptyState message="Supabase migration_v5 실행 후 데이터가 표시됩니다" />
  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="border-b border-slate-800">
          {['별칭 (alias)', '표준명 (canonical)', '비고'].map(h => (
            <th key={h} className="text-left text-slate-500 font-medium px-4 py-3">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map(row => (
          <tr key={row.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
            <td className="px-4 py-2.5 text-amber-400">{row.alias}</td>
            <td className="px-4 py-2.5 text-slate-200 flex items-center gap-1.5">
              <ChevronRight className="w-3 h-3 text-slate-600" />
              {row.canonical_name}
            </td>
            <td className="px-4 py-2.5 text-slate-500">{row.note ?? '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function VenuesTab({ data }: { data: VenueInfo[] }) {
  if (data.length === 0) return <EmptyState message="Supabase migration_v5 실행 후 데이터가 표시됩니다" />
  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="border-b border-slate-800">
          {['행사장명', '지역', '유형', '주소', '비고'].map(h => (
            <th key={h} className="text-left text-slate-500 font-medium px-4 py-3">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map(row => (
          <tr key={row.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
            <td className="px-4 py-2.5 text-slate-200 font-medium">{row.name}</td>
            <td className="px-4 py-2.5 text-slate-400">{row.region ?? '—'}</td>
            <td className="px-4 py-2.5 text-slate-400">{row.venue_type ?? '—'}</td>
            <td className="px-4 py-2.5 text-slate-500 max-w-[200px] truncate">{row.address ?? '—'}</td>
            <td className="px-4 py-2.5 text-slate-600">{row.note ?? '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function DesignersTab({ data }: { data: Designer[] }) {
  if (data.length === 0) return <EmptyState message="Supabase migration_v5 실행 후 데이터가 표시됩니다" />
  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="border-b border-slate-800">
          {['이름', '업체명', '비고'].map(h => (
            <th key={h} className="text-left text-slate-500 font-medium px-4 py-3">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map(row => (
          <tr key={row.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
            <td className="px-4 py-2.5 text-slate-200 font-medium">{row.name}</td>
            <td className="px-4 py-2.5 text-slate-400">{row.company ?? '—'}</td>
            <td className="px-4 py-2.5 text-slate-500">{row.note ?? '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function EventsTab({ data }: { data: EventHistory[] }) {
  if (data.length === 0) return <EmptyState message="Supabase migration_v5 실행 후 데이터가 표시됩니다" />
  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="border-b border-slate-800">
          {['행사명', 'PM 부서', '연도', '행사장', '발주처', '행사 유형'].map(h => (
            <th key={h} className="text-left text-slate-500 font-medium px-4 py-3">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map(row => (
          <tr key={row.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
            <td className="px-4 py-2.5 text-slate-200 font-medium max-w-[180px] truncate">{row.project_name}</td>
            <td className="px-4 py-2.5 text-slate-400">{row.pm_dept ?? '—'}</td>
            <td className="px-4 py-2.5 text-slate-400">{row.year ?? '—'}</td>
            <td className="px-4 py-2.5 text-slate-400">{row.venue ?? '—'}</td>
            <td className="px-4 py-2.5 text-slate-400">{row.client ?? '—'}</td>
            <td className="px-4 py-2.5 text-slate-500">{row.event_type ?? '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="py-16 text-center">
      <p className="text-slate-600 text-sm">{message}</p>
    </div>
  )
}
