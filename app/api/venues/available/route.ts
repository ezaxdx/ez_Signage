// HOTFIX (2026-05-20): 사용 가능한 행사장 드롭다운 데이터 소스.
//
// 신규 프로젝트 만들기 위자드에 노출할 행사장 목록 = 다음 union:
//   A) event_history.venue DISTINCT (누적 1건 이상)
//   B) venues 테이블 is_hidden=FALSE OR IS NULL (admin 명시 등록)
//
// 신규 행사장 = 사용자 직접 입력 + 완료 처리 시 자동으로 event_history INSERT → 다음 프로젝트부터 노출.
//
// graceful degradation:
//   - event_history 테이블 부재 → A skip
//   - venues.is_hidden 컬럼 부재 → B는 모든 venues
//   - 둘 다 실패 → 빈 배열 (클라이언트가 VENUE_LIST 시드 fallback)

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface VenueOption {
  name: string
  source: 'event_history' | 'venues' | 'both'
}

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ items: [], error: '인증 필요' }, { status: 401 })
  }

  const venueSet = new Map<string, VenueOption>()  // key: trimmed name

  // ── A) event_history.venue DISTINCT ──
  try {
    const { data, error } = await supabase
      .from('event_history')
      .select('venue')
      .is('deleted_at', null)
      .not('venue', 'is', null)
      .limit(2000)
    if (!error && Array.isArray(data)) {
      for (const row of data as Array<{ venue: string | null }>) {
        const v = (row.venue ?? '').trim()
        if (!v || v === '미정' || v === '미상') continue
        if (!venueSet.has(v)) venueSet.set(v, { name: v, source: 'event_history' })
      }
    } else if (error) {
      console.error('[venues/available] event_history GET 실패:', error.message, error.code)
    }
  } catch (e) {
    console.error('[venues/available] event_history GET Exception:', e)
  }

  // ── B) venues 테이블 (is_hidden=false OR NULL) ──
  // 1차: is_hidden 포함 select
  // 2차 fallback: is_hidden 컬럼 unknown 시 전체 select
  try {
    const first = await supabase
      .from('venues')
      .select('name, is_hidden')
      .order('name', { ascending: true })
    if (first.error) {
      console.error('[venues/available] venues 1차 실패:', first.error.message, first.error.code)
      if (/column .* is_hidden|column .* does not exist/i.test(first.error.message)) {
        // 2차: is_hidden 제외 (마이그레이션 v19 미적용 graceful)
        const fallback = await supabase
          .from('venues')
          .select('name')
          .order('name', { ascending: true })
        if (!fallback.error && Array.isArray(fallback.data)) {
          for (const row of fallback.data as Array<{ name: string | null }>) {
            const v = (row.name ?? '').trim()
            if (!v) continue
            const existing = venueSet.get(v)
            venueSet.set(v, existing
              ? { name: v, source: 'both' }
              : { name: v, source: 'venues' })
          }
        }
      }
    } else if (Array.isArray(first.data)) {
      for (const row of first.data as Array<{ name: string | null; is_hidden: boolean | null }>) {
        const v = (row.name ?? '').trim()
        if (!v) continue
        // is_hidden=true는 제외·is_hidden=false 또는 null은 포함
        if (row.is_hidden === true) continue
        const existing = venueSet.get(v)
        venueSet.set(v, existing
          ? { name: v, source: 'both' }
          : { name: v, source: 'venues' })
      }
    }
  } catch (e) {
    console.error('[venues/available] venues GET Exception:', e)
  }

  // 정렬: 한국어 가나다 (Intl)
  const items = Array.from(venueSet.values()).sort((a, b) =>
    a.name.localeCompare(b.name, 'ko'),
  )

  return NextResponse.json({ items, count: items.length })
}
