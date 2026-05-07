import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { recommendSignage, type RecommendInput } from '@/lib/ai/recommendSignage'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  // 인증 확인 (서버사이드 — Anthropic API 키 보호)
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

  try {
    const result = await recommendSignage(body)
    return NextResponse.json(result)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : '추천 생성 실패'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
