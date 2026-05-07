'use client'

import { useState, useMemo } from 'react'
import { ProjectCard } from './ProjectCard'
import type { ProjectWithCount, ProjectStage } from '@/lib/types'

const STAGE_TABS: { value: ProjectStage | 'all'; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: '의뢰서작성', label: '의뢰서 작성' },
  { value: '발주완료', label: '발주 완료' },
  { value: '시안검수', label: '시안 검수' },
  { value: '수정중', label: '수정 중' },
  { value: '확정', label: '확정' },
  { value: '납품완료', label: '납품 완료' },
]

function calcDdayDiff(eventDate: string | null): number {
  if (!eventDate) return Infinity
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const event = new Date(eventDate); event.setHours(0, 0, 0, 0)
  return Math.round((event.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

interface Props {
  projects: ProjectWithCount[]
  userId: string
}

export function DashboardContent({ projects, userId }: Props) {
  const [activeStage, setActiveStage] = useState<ProjectStage | 'all'>('all')

  const stageCounts = useMemo(() => {
    const counts: Partial<Record<ProjectStage | 'all', number>> = { all: projects.length }
    for (const p of projects) {
      if (p.stage) counts[p.stage] = (counts[p.stage] ?? 0) + 1
    }
    return counts
  }, [projects])

  const filtered = useMemo(() => {
    const base = activeStage === 'all'
      ? projects
      : projects.filter(p => p.stage === activeStage)

    return [...base].sort((a, b) => {
      const da = calcDdayDiff(a.event_date)
      const db = calcDdayDiff(b.event_date)
      // Urgent (0–7 days remaining) → top
      const aUrgent = da >= 0 && da <= 7
      const bUrgent = db >= 0 && db <= 7
      if (aUrgent !== bUrgent) return aUrgent ? -1 : 1
      // Upcoming (not past) second
      const aUpcoming = da > 0
      const bUpcoming = db > 0
      if (aUpcoming !== bUpcoming) return aUpcoming ? -1 : 1
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
  }, [projects, activeStage])

  return (
    <div>
      {/* Stage filter tabs */}
      <div className="flex gap-1 flex-wrap mb-5 pb-3 border-b border-slate-800">
        {STAGE_TABS.map(tab => {
          const count = stageCounts[tab.value] ?? 0
          const active = activeStage === tab.value
          return (
            <button
              key={tab.value}
              onClick={() => setActiveStage(tab.value)}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full transition-all ${
                active
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-900/50'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {tab.label}
              <span className={`text-[10px] font-mono ${active ? 'text-indigo-200' : 'text-slate-600'}`}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Project grid */}
      {filtered.length === 0 ? (
        <div className="h-32 flex items-center justify-center text-slate-600 text-sm">
          {activeStage === 'all'
            ? '아직 프로젝트가 없습니다'
            : `"${activeStage}" 단계의 프로젝트가 없습니다`}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(project => (
            <ProjectCard
              key={project.id}
              project={project}
              isOwner={project.owner_id === userId}
            />
          ))}
        </div>
      )}
    </div>
  )
}
