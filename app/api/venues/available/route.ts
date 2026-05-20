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
import { normalizeVenueName } from '@/lib/venueIntel'

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

  const venueSet = new Map<string, VenueOption>()  // key: L1 정규화명

  // ── A) event_history.venue DISTINCT ──
  // HOTFIX 2026-05-20: event_history.venue가 "코엑스 그랜드볼룸" 등 L1+L2 합성 형식으로 저장됨
  //   (case-a/page.tsx:137 옵션 C 원본 venue 보존). 화면 L1 드롭다운엔 L1만 노출해야 함.
  //   normalizeVenueName으로 L1 추출. raw가 합성이면 L1만, 정규화 실패 시 raw 그대로 (fallback).
  try {
    const { data, error } = await supabase
      .from('event_history')
      .select('venue')
      .is('deleted_at', null)
      .not('venue', 'is', null)
      .limit(2000)
    if (!error && Array.isArray(data)) {
      for (const row of data as Array<{ venue: string | null }>) {
        const raw = (row.venue ?? '').trim()
        if (!raw || raw === '미정' || raw === '미상') continue
        const l1 = normalizeVenueName(raw) || raw
        if (!l1 || l1 === '미정' || l1 === '미상') continue
        if (!venueSet.has(l1)) venueSet.set(l1, { name: l1, source: 'event_history' })
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
            const raw = (row.name ?? '').trim()
            if (!raw) continue
            // HOTFIX 2026-05-20: 옛 합성 형식 데이터(예: "코엑스 그랜드볼룸") 잔존 대비 L1 정규화.
            const l1 = normalizeVenueName(raw) || raw
            if (!l1) continue
            const existing = venueSet.get(l1)
            venueSet.set(l1, existing
              ? { name: l1, source: 'both' }
              : { name: l1, source: 'venues' })
          }
        }
      }
    } else if (Array.isArray(first.data)) {
      for (const row of first.data as Array<{ name: string | null; is_hidden: boolean | null }>) {
        const raw = (row.name ?? '').trim()
        if (!raw) continue
        // is_hidden=true는 제외·is_hidden=false 또는 null은 포함
        if (row.is_hidden === true) continue
        // HOTFIX 2026-05-20: 옛 합성 형식 데이터 잔존 대비 L1 정규화.
        const l1 = normalizeVenueName(raw) || raw
        if (!l1) continue
        const existing = venueSet.get(l1)
        venueSet.set(l1, existing
          ? { name: l1, source: 'both' }
          : { name: l1, source: 'venues' })
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
