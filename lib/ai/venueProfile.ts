// 행사장 프로필 — 회의록 ′학습해 가지고 텍스트 파일 형태로 이거는 어떤 행사장이다가 나올 거예요′
// venues 테이블 메타 + venueFacilityGuide 시드 + facility_exception_log 누적을
// 텍스트로 압축해 AI(Gemini) 프롬프트에 ′이 행사장은 ~′ 형식으로 주입.

import { createClient } from '@/lib/supabase/server'
import { getFacilityGuide } from '@/lib/data/venueFacilityGuide'

export interface VenueProfileBlock {
  text: string                  // 프롬프트에 직접 박는 텍스트
  has_data: boolean             // 빈 경우 false → 호출 측에서 블록 자체 생략 가능
  exception_count: number       // 시설 가이드 ′그래도 진행′ 누적 건수 (매뉴얼 갱신 신호)
}

/**
 * 행사장 이름으로 venues 메타 + 시설 가이드 시드 + 예외 누적을 모아 텍스트로 압축.
 * Supabase 조회 실패 시 시드만이라도 반환.
 */
export async function buildVenueProfile(venueName: string | null | undefined): Promise<VenueProfileBlock> {
  const empty: VenueProfileBlock = { text: '', has_data: false, exception_count: 0 }
  if (!venueName?.trim()) return empty

  const lines: string[] = [`[행사장 프로필 — ${venueName}]`]
  let hasData = false

  // ① 시드 시설 가이드 (venueFacilityGuide.ts)
  const guide = getFacilityGuide(venueName)
  if (guide) {
    hasData = true
    if (guide.install_allowed?.length) {
      const allowed = guide.install_allowed
        .filter(it => it.status === 'allowed')
        .map(it => it.category).join(', ')
      const denied = guide.install_allowed
        .filter(it => it.status === 'denied')
        .map(it => it.category).join(', ')
      const cond = guide.install_allowed
        .filter(it => it.status === 'conditional')
        .map(it => it.category).join(', ')
      if (allowed) lines.push(`- 설치 가능: ${allowed}`)
      if (cond)    lines.push(`- 조건부: ${cond}`)
      if (denied)  lines.push(`- 설치 불가: ${denied}`)
    }
    if (guide.rigging?.available != null) {
      lines.push(`- 행잉: ${guide.rigging.available ? '가능' : '불가'}${guide.rigging.note ? ` (${guide.rigging.note})` : ''}`)
    }
    if (guide.safety) {
      const safety = [guide.safety.fire, guide.safety.fall, guide.safety.electric, guide.safety.weather].filter(Boolean).join(' / ')
      if (safety) lines.push(`- 안전: ${safety}`)
    }
    if (guide.warnings?.length) {
      lines.push(`- 주의: ${guide.warnings.slice(0, 3).map(w => w.description).join(' / ')}`)
    }
    if (guide.digital_signage?.allowed_locations?.length) {
      lines.push(`- 디지털 사이니지: ${guide.digital_signage.allowed_locations.join(', ')}`)
    }
    if (guide.last_updated) lines.push(`  ※ 시설 가이드 학습 시점: ${guide.last_updated}`)
  }

  // ② venues 테이블 메타 + ③ 예외 누적
  let exceptionCount = 0
  try {
    const supabase = createClient()
    const { data: venues } = await supabase
      .from('venues')
      .select('region, venue_type, has_hall_split, main_entrance_note, area_sqm')
      .ilike('name', `%${venueName.split(/[\s(]/)[0]}%`)
      .limit(1)
    const v = venues?.[0]
    if (v) {
      hasData = true
      if (v.region)             lines.push(`- 권역: ${v.region}`)
      if (v.venue_type)         lines.push(`- 유형: ${v.venue_type}`)
      if (v.area_sqm)           lines.push(`- 면적: ${v.area_sqm}㎡`)
      if (v.has_hall_split)     lines.push(`- 홀 단위 분리 운영`)
      if (v.main_entrance_note) lines.push(`- 주출입구: ${v.main_entrance_note}`)
    }

    // facility_exception_log — ′그래도 진행′ 누적 (회의록 학습 3종 ③)
    const { count } = await supabase
      .from('facility_exception_log')
      .select('*', { count: 'exact', head: true })
      .eq('venue', venueName)
    exceptionCount = count ?? 0
    if (exceptionCount >= 3) {
      lines.push(`- ⚠ 시설 가이드 예외 누적 ${exceptionCount}건 — 매뉴얼 기준이 실제와 다를 가능성`)
      hasData = true
    }
  } catch {
    // 미적용·권한 부족 — silent
  }

  if (!hasData) return empty

  return {
    text: lines.join('\n'),
    has_data: true,
    exception_count: exceptionCount,
  }
}
