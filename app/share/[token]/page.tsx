import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Project, DesignItem, ContentsMap, SlotContent } from '@/lib/types'
import { ClientReviewView } from './ClientReviewView'

interface Props { params: { token: string } }

export default async function ClientSharePage({ params }: Props) {
  const supabase = createClient()

  // 공유 토큰으로 프로젝트 조회 (인증 불필요 — 토큰만으로 접근)
  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('share_token', params.token)
    .eq('share_enabled', true)
    .maybeSingle()

  if (!project) notFound()

  const [{ data: items }, { data: contents }] = await Promise.all([
    supabase.from('design_items').select('*').eq('project_id', project.id).order('no'),
    supabase.from('item_contents').select('item_id, slot_key, slot_value').in('item_id',
      (await supabase.from('design_items').select('id').eq('project_id', project.id)).data?.map(i => i.id) ?? []
    ),
  ])

  const allContents: Record<string, ContentsMap> = {}
  for (const row of contents ?? []) {
    if (!row.slot_value) continue
    try {
      if (!allContents[row.item_id]) allContents[row.item_id] = {}
      allContents[row.item_id][row.slot_key] = JSON.parse(row.slot_value) as SlotContent
    } catch {}
  }

  return (
    <ClientReviewView
      project={project as Project}
      items={(items ?? []) as DesignItem[]}
      allContents={allContents}
    />
  )
}
