// 학습 큐 실행 — 관리자가 admin/learning에서 트리거
// queued learning_jobs를 가져와 Gemini Vision 호출 → venues.specs_text에 결과 저장
//
// 회의록 학습 3종 ① ′방금 보여 드렸던 학 요거 올려 주세요라고 장소를 주셨을 경우′ 구현.
//
// POST /api/learning-jobs/run  body: { jobId }
// 관리자 권한 필수 (isAdmin check).

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/auth/role'
import { analyzeFloorPlan } from '@/lib/ai/visionFloorPlan'

export const runtime = 'nodejs'
export const maxDuration = 60   // Vision 호출 최대 60초

export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })
  if (!(await isAdmin(supabase))) {
    return NextResponse.json({ error: '관리자 권한 필요' }, { status: 403 })
  }

  let body: { jobId?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'invalid body' }, { status: 400 }) }
  const jobId = body.jobId
  if (!jobId) return NextResponse.json({ error: 'jobId 누락' }, { status: 400 })

  // 1) job + venue 조회
  const { data: job, error: jobErr } = await supabase
    .from('learning_jobs')
    .select('id, venue_id, source_url, status, job_type')
    .eq('id', jobId)
    .single()
  if (jobErr || !job) return NextResponse.json({ error: 'job not found' }, { status: 404 })
  if (job.status === 'processing') return NextResponse.json({ error: '이미 실행 중' }, { status: 409 })
  if (job.status === 'done') return NextResponse.json({ ok: true, alreadyDone: true })

  // 2) processing 상태로 마크
  await supabase.from('learning_jobs').update({ status: 'processing' }).eq('id', jobId)

  // 3) Vision 호출 (도면 분석)
  const result = await analyzeFloorPlan(job.source_url ?? '')

  if (result.error || !result.text) {
    await supabase.from('learning_jobs').update({
      status: 'failed',
      completed_at: new Date().toISOString(),
      error_message: result.error ?? '결과 비어있음',
    }).eq('id', jobId)
    return NextResponse.json({ error: result.error ?? '분석 실패' }, { status: 500 })
  }

  // 4) venues.specs_text 저장 (회의록 ′텍스트 파일 형태로 이거는 어떤 행사장이다가 나올 거예요′)
  if (job.venue_id) {
    await supabase.from('venues').update({
      specs_text: result.text,
      specs_updated_at: new Date().toISOString(),
    }).eq('id', job.venue_id)
  }

  // 5) job done
  await supabase.from('learning_jobs').update({
    status: 'done',
    completed_at: new Date().toISOString(),
  }).eq('id', jobId)

  return NextResponse.json({ ok: true, text: result.text.slice(0, 200) })
}
