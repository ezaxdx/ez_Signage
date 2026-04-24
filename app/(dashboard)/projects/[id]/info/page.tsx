import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Project, ProjectMember } from '@/lib/types'
import { ProjectInfoClient } from './ProjectInfoClient'

interface Props {
  params: { id: string }
}

export default async function ProjectInfoPage({ params }: Props) {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: project }, { data: members }] = await Promise.all([
    supabase.from('projects').select('*').eq('id', params.id).single(),
    supabase.from('project_members').select('*').eq('project_id', params.id).order('invited_at'),
  ])

  if (!project) notFound()

  return (
    <ProjectInfoClient
      project={project as Project}
      members={(members ?? []) as ProjectMember[]}
      isOwner={project.owner_id === user.id}
      userEmail={user.email ?? ''}
    />
  )
}
