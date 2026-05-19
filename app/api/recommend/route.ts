import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { recommendSignage, type RecommendInput } from '@/lib/ai/recommendSignage'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  // 인증 확인 (서버사이드 — Gemini API 키 보호. v9.44: 주석 정정 — 2026-05-07에 Anthropic→Gemini로 전환됨)
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })

  let body: RecommendInput
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: '잘못된 요청 본문' }, { status: 400 })
  }

  if (!body.eventName?.trim() || !body.venue?.trim()) {
    return NextResponse.json({ error: '행사명·장소는 필수' }, { status: 400 })
  }

  // 5/22 사용자 명시 = silent fail 완전 제거 = INSERT 코드를 recommendSignage 결과와 분리.
  // 이전 구조 = recommendSignage 실패 → fallback 200 → INSERT 코드 미도달 (recommend_count 0건 유지).
  // 신규 구조 = 호출 자체 시점에 무조건 INSERT (recommendSignage 성공·실패 영역 무관·호출 카운트 정합).
  // 결과 분기 = result_status (success / fallback / error) metadata 영역 부착.

  let result: Awaited<ReturnType<typeof recommendSignage>> | null = null
  let resultStatus: 'success' | 'fallback' | 'error' = 'success'
  let recommendErrorMsg: string | null = null
  let httpStatus = 200

  try {
    result = await recommendSignage(body)
  } catch (recommendErr) {
    console.error('[recommend] recommendSignage 실패:', recommendErr)
    recommendErrorMsg = recommendErr instanceof Error ? recommendErr.message : '추천 생성 실패'
    if (/GEMINI_API_KEY|event_history|relation|column/.test(recommendErrorMsg)) {
      resultStatus = 'fallback'
    } else {
      resultStatus = 'error'
      httpStatus = 500
    }
  }

  // ★ INSERT = 호출 자체 시점에 무조건 실행 (recommendSignage 결과와 무관)
  try {
    const { error: logError } = await supabase.from('usage_logs').insert({
      user_id: user.id,
      project_id: null,
      action: 'recommend',
      metadata: {
        venue: body.venue,
        event_name: body.eventName,
        item_count: result?.items?.length ?? 0,
        result_status: resultStatus,
        ...(recommendErrorMsg ? { error: recommendErrorMsg } : {}),
      },
    })
    if (logError) {
      console.error('[usage_logs] INSERT failed:', logError.message, logError.code, logError.details)
    } else {
      console.log(`[usage_logs] ✓ recommend INSERT (status=${resultStatus})`)
    }
  } catch (logEx) {
    console.error('[usage_logs] Exception:', logEx)
  }

  // 응답 분기
  if (resultStatus === 'error') {
    return NextResponse.json({ error: recommendErrorMsg }, { status: httpStatus })
  }
  if (resultStatus === 'fallback') {
    return NextResponse.json({ items: [], skipped: true, error: recommendErrorMsg }, { status: 200 })
  }
  return NextResponse.json(result)
}
