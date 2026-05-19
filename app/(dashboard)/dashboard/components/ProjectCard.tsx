'use client'
import Link from 'next/link'
import { useState } from 'react'
import { Calendar, MapPin, Package, ArrowRight, Settings, AlertTriangle, CheckCircle2 } from 'lucide-react'
import type { ProjectWithCount, ProjectStatus, ProjectStage } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import { DeleteProjectButton } from './DeleteProjectButton'

const STAGES: ProjectStage[] = ['의뢰서작성', '발주완료', '시안검수', '수정중', '확정', '납품완료']
const STAGE_COLORS: Record<ProjectStage, string> = {
  '의뢰서작성': 'bg-slate-500',
  '발주완료':   'bg-blue-500',
  '시안검수':   'bg-violet-500',
  '수정중':     'bg-amber-500',
  '확정':       'bg-emerald-500',
  '납품완료':   'bg-slate-400',
}

const STATUS: Record<ProjectStatus, { label: string; className: string }> = {
  '준비중': {
    label: '준비중',
    className: 'text-amber-400 bg-amber-400/10 border border-amber-400/25',
  },
  '진행중': {
    label: '진행중',
    className: 'text-emerald-400 bg-emerald-400/10 border border-emerald-400/25',
  },
  '완료': {
    label: '완료',
    className: 'text-slate-500 bg-slate-400/10 border border-slate-400/25',
  },
}

function calcDday(eventDate: string | null): { label: string; urgent: boolean; past: boolean } | null {
  if (!eventDate) return null
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const event = new Date(eventDate); event.setHours(0, 0, 0, 0)
  const diff = Math.round((event.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  if (diff === 0) return { label: 'D-Day', urgent: true, past: false }
  if (diff < 0)  return { label: `D+${Math.abs(diff)}`, urgent: false, past: true }
  return { label: `D-${diff}`, urgent: diff <= 7, past: false }
}

interface Props {
  project: ProjectWithCount & { completedCount?: number }
  isOwner?: boolean
}

export function ProjectCard({ project, isOwner = true }: Props) {
  const status = STATUS[project.status] ?? STATUS['준비중']
  const itemCount = project.design_items?.[0]?.count ?? 0
  const dday = calcDday(project.event_date)
  const [completing, setCompleting] = useState(false)
  const [completed, setCompleted] = useState(project.status === '완료')

  // 5/20 노션 §7 정합 = 다운로드 ≠ 완료·별도 완료 버튼 클릭 시 status·finalized_at 갱신
  // 5/22 사용자 명시 = 완료 버튼 = 행사 종료·event_history 영역 자동 누적·다른 영역 모두 영향
  const handleComplete = async () => {
    if (!isOwner) {
      alert('프로젝트 소유자만 완료 처리할 수 있습니다.')
      return
    }
    if (!confirm(`'${project.name}' 프로젝트를 완료 처리하시겠습니까?`)) return
    setCompleting(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('projects')
      .update({ status: '완료' })
      .eq('id', project.id)
    if (error) {
      alert('완료 처리 실패: ' + error.message)
    } else {
      setCompleted(true)
      // 5/22 = 완료 버튼 클릭 = event_history UPSERT (signage_breakdown 자동 집계)
      try {
        const { data: items } = await supabase
          .from('design_items')
          .select('category, quantity, width_mm, height_mm')
          .eq('project_id', project.id)
        const sigByCategory = new Map<string, { quantity: number; sizes: Set<string> }>()
        for (const it of (items ?? []) as Array<{ category: string | null; quantity: number | null; width_mm: number | null; height_mm: number | null }>) {
          if (!it.category) continue
          const prev = sigByCategory.get(it.category) ?? { quantity: 0, sizes: new Set() }
          prev.quantity += it.quantity ?? 1
          if (it.width_mm && it.height_mm) prev.sizes.add(`${it.width_mm}×${it.height_mm}`)
          sigByCategory.set(it.category, prev)
        }
        const signage_breakdown = Array.from(sigByCategory.entries())
          .map(([category, v]) => ({ category, quantity: v.quantity, sizes: Array.from(v.sizes).join('·') || undefined }))
          .sort((a, b) => b.quantity - a.quantity)
        await fetch('/api/event-history', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            project_code: project.id.slice(0, 12),
            project_name: project.name,
            year: project.event_date ? new Date(project.event_date).getFullYear() : new Date().getFullYear(),
            venue: project.event_venue || '미정',
            program_parts: [],
            signage_breakdown,
            analyzed_item_count: items?.length ?? 0,
            source: 'auto_project',
          }),
        })
      } catch (e) {
        console.warn('[event-history] 완료 시 영역 자동 누적 실패:', e)
      }
    }
    setCompleting(false)
  }
  const formattedDate = project.event_date
    ? new Date(project.event_date).toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null

  return (
    <article className={`bg-white border rounded-xl p-5 flex flex-col gap-3 transition-all group ${
      dday?.urgent
        ? 'border-red-700/60 hover:border-red-600/80'
        : 'border-slate-200 hover:border-slate-300 hover:bg-white/80'
    }`}>
      {/* 상단 뱃지 + D-day + 항목 수 — stage가 있으면 stage 표시, 없으면 status (사용자 요청) */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 flex-wrap">
          {project.stage ? (
            <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
              {project.stage}
            </span>
          ) : (
            <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${status.className}`}>
              {status.label}
            </span>
          )}
          {!isOwner && (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full text-sky-300 bg-sky-500/10 border border-sky-500/25">
              초대됨
            </span>
          )}
          {dday && !dday.past && (
            <span className={`flex items-center gap-0.5 text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full border ${
              dday.urgent
                ? 'text-red-300 bg-red-500/15 border-red-500/40'
                : 'text-slate-500 bg-slate-200/40 border-slate-300'
            }`}>
              {dday.urgent && <AlertTriangle className="w-2.5 h-2.5 flex-shrink-0" />}
              {dday.label}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 text-slate-500">
          <Package className="w-3.5 h-3.5" />
          <span className="text-xs">{itemCount}개</span>
        </div>
      </div>

      {/* 프로젝트명 */}
      <div>
        <h3 className="text-slate-900 font-semibold text-sm leading-snug">{project.name}</h3>
        {project.client_name && (
          <p className="text-indigo-400/70 text-xs mt-0.5">{project.client_name}</p>
        )}
      </div>

      {/* 메타 정보 */}
      <div className="flex-1 space-y-1.5">
        {formattedDate && (
          <div className="flex items-center gap-1.5 text-slate-500">
            <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="text-xs">{formattedDate}</span>
          </div>
        )}
        {project.event_venue && (
          <div className="flex items-center gap-1.5 text-slate-500">
            <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="text-xs truncate">{project.event_venue}</span>
          </div>
        )}
      </div>

      {/* 행사 단계 진행 표시줄 — 사용자 결정으로 제거 (2026-05-11) */}

      {/* CTA */}
      <div className="flex gap-2">
        <Link
          href={`/projects/${project.id}/info`}
          className="flex items-center justify-center gap-1 bg-slate-50 hover:bg-slate-200 text-slate-500 hover:text-slate-800 text-xs font-medium py-2 px-3 rounded-lg transition-all"
          title="프로젝트 정보 및 멤버 관리"
        >
          <Settings className="w-3.5 h-3.5" />
        </Link>
        {/* 5/22 사용자 명시 = 맨 처음 화면 = 삭제 불가능 (회의 §7 = 사용자 불가·관리자만). 삭제는 /admin 운영 대시보드에서만 */}
        {/* 5/22 사용자 명시 = 진행 중·완료 라벨 분리 (회색 "완료" 버튼 = 완료된 것처럼 보이는 문제 해결) */}
        {isOwner && (
          <button
            onClick={handleComplete}
            disabled={completing || completed}
            className={`flex items-center justify-center gap-1 text-xs font-medium py-2 px-3 rounded-lg transition-all ${
              completed
                ? 'bg-emerald-100 text-emerald-700 cursor-default'
                : 'bg-indigo-50 hover:bg-emerald-50 text-indigo-700 hover:text-emerald-700 disabled:opacity-50'
            }`}
            title={completed ? '완료됨' : '클릭 시 완료 처리'}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            {completed ? '완료' : completing ? '...' : '진행 중'}
          </button>
        )}
        <Link
          href={`/projects/${project.id}`}
          className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-medium py-2 rounded-lg transition-all ${
            dday?.urgent
              ? 'bg-red-700/30 hover:bg-red-600 text-red-200 hover:text-white'
              : 'bg-slate-50 hover:bg-indigo-600 text-slate-400 hover:text-white group-hover:bg-slate-200'
          }`}
        >
          프로젝트 열기
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </article>
  )
}
