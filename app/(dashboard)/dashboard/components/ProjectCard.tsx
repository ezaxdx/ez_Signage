import Link from 'next/link'
import { Calendar, MapPin, Package, ArrowRight, Settings } from 'lucide-react'
import type { ProjectWithCount, ProjectStatus } from '@/lib/types'

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
    className: 'text-slate-400 bg-slate-400/10 border border-slate-400/25',
  },
}

interface Props {
  project: ProjectWithCount & { completedCount?: number }
  isOwner?: boolean
}

export function ProjectCard({ project, isOwner = true }: Props) {
  const status = STATUS[project.status] ?? STATUS['준비중']
  const itemCount = project.design_items?.[0]?.count ?? 0
  const formattedDate = project.event_date
    ? new Date(project.event_date).toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null

  return (
    <article className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col gap-3 hover:border-slate-700 hover:bg-slate-900/80 transition-all group">
      {/* 상단 뱃지 + 항목 수 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${status.className}`}>
            {status.label}
          </span>
          {!isOwner && (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full text-sky-300 bg-sky-500/10 border border-sky-500/25">
              초대됨
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
        <h3 className="text-slate-100 font-semibold text-sm leading-snug">{project.name}</h3>
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

      {/* CTA */}
      <div className="flex gap-2">
        <Link
          href={`/projects/${project.id}/info`}
          className="flex items-center justify-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-xs font-medium py-2 px-3 rounded-lg transition-all"
          title="프로젝트 정보 및 멤버 관리"
        >
          <Settings className="w-3.5 h-3.5" />
        </Link>
        <Link
          href={`/projects/${project.id}`}
          className="flex-1 flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white text-xs font-medium py-2 rounded-lg transition-all group-hover:bg-slate-700"
        >
          프로젝트 열기
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </article>
  )
}
