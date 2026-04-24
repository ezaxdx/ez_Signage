import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { EditorLayout } from './EditorLayout'
import type { Project, DesignItem } from '@/lib/types'

interface Props {
  params: { id: string }
}

export default async function ProjectEditorPage({ params }: Props) {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: project }, { data: items }] = await Promise.all([
    supabase
      .from('projects')
      .select('*')
      .eq('id', params.id)
      .single(),
    supabase
      .from('design_items')
      .select('*')
      .eq('project_id', params.id)
      .order('no'),
  ])

  if (!project) notFound()

  return (
    <EditorLayout
      project={project as Project}
      initialItems={(items ?? []) as DesignItem[]}
      userEmail={user.email ?? ''}
    />
  )
}
