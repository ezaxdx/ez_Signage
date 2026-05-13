'use client'

import { useMemo } from 'react'
import { ProjectCard } from './ProjectCard'
import type { ProjectWithCount } from '@/lib/types'

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
  const sorted = useMemo(() => {
    return [...projects].sort((a, b) => {
      const da = calcDdayDiff(a.event_date)
      const db = calcDdayDiff(b.event_date)
      const aUrgent = da >= 0 && da <= 7
      const bUrgent = db >= 0 && db <= 7
      if (aUrgent !== bUrgent) return aUrgent ? -1 : 1
      const aUpcoming = da > 0
      const bUpcoming = db > 0
      if (aUpcoming !== bUpcoming) return aUpcoming ? -1 : 1
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
  }, [projects])

  if (sorted.length === 0) {
    return (
      <div className="h-32 flex items-center justify-center text-slate-600 text-sm">
        아직 프로젝트가 없습니다
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {sorted.map(project => (
        <ProjectCard
          key={project.id}
          project={project}
          isOwner={project.owner_id === userId}
        />
      ))}
    </div>
  )
}
