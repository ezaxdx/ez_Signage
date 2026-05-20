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
  let userFacingMsg: string | null = null
  let httpStatus = 200

  try {
    result = await recommendSignage(body)
  } catch (recommendErr) {
    // HOTFIX (2026-05-20 버그 4): 에러 종류별 분기 + 서버 로그에 stack trace 명시.
    //   라이브(Vercel)에서 500 발생 시 Functions 로그에서 정확한 원인 추적 가능.
    const errStack = recommendErr instanceof Error ? recommendErr.stack : null
    console.error('[recommend] recommendSignage 실패:', {
      message: recommendErr instanceof Error ? recommendErr.message : String(recommendErr),
      stack: errStack,
      eventName: body.eventName,
      venue: body.venue,
    })
    recommendErrorMsg = recommendErr instanceof Error ? recommendErr.message : '추천 생성 실패'

    // 에러 종류별 분기 — 사용자 친화 메시지 + HTTP status 코드 차별화
    if (/GEMINI_API_KEY/i.test(recommendErrorMsg)) {
      // 환경변수 미설정 = 운영 설정 누락
      resultStatus = 'error'
      httpStatus = 500
      userFacingMsg = 'AI 서비스 환경 설정이 누락되었습니다. 관리자에게 문의해주세요.'
    } else if (/429|quota|rate.?limit/i.test(recommendErrorMsg)) {
      // Gemini quota 초과 = 일시적 한도
      resultStatus = 'error'
      httpStatus = 429
      userFacingMsg = 'AI 추천 한도가 초과되었습니다. 잠시 후 재시도해주세요.'
    } else if (/503|unavailable|overload/i.test(recommendErrorMsg)) {
      // Gemini 일시적 다운
      resultStatus = 'error'
      httpStatus = 503
      userFacingMsg = 'AI 서비스가 일시적으로 응답하지 않습니다. 잠시 후 재시도해주세요.'
    } else if (/event_history|relation|column|table .* does not exist/i.test(recommendErrorMsg)) {
      // DB 마이그레이션 미적용 = 정적 fallback으로 graceful degradation
      resultStatus = 'fallback'
    } else {
      // 기타 — stack trace는 서버 로그에만, 사용자엔 일반 메시지
      resultStatus = 'error'
      httpStatus = 500
      userFacingMsg = 'AI 추천 생성 중 오류가 발생했습니다. 정적 추천으로 대체됩니다.'
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
        // 5/22 사용자 명시: 실제 비용 매핑 = Gemini usageMetadata 영역 토큰 저장.
        // 무료 tier 청구 0원·유료 전환 시 정확 산출. admin/ai 화면 영역 평균 추정 → 실제값.
        prompt_tokens: result?.usage?.prompt_tokens ?? null,
        output_tokens: result?.usage?.output_tokens ?? null,
        total_tokens: result?.usage?.total_tokens ?? null,
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

  // 응답 분기 — 사용자 친화 메시지 우선·디버그 메시지는 별도 필드
  if (resultStatus === 'error') {
    return NextResponse.json({
      error: userFacingMsg ?? recommendErrorMsg ?? '추천 생성 실패',
      debug: recommendErrorMsg,  // 클라이언트는 사용 안 함·디버그 용
    }, { status: httpStatus })
  }
  if (resultStatus === 'fallback') {
    return NextResponse.json({
      items: [],
      skipped: true,
      error: recommendErrorMsg,
      message: '정적 추천(HINTS) fallback 사용',
    }, { status: 200 })
  }
  return NextResponse.json(result)
}
