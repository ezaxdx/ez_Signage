// lib/services/designItemNo.ts
// design_items.no 채번 통합 헬퍼 (v10.4)
// 작성: 2026-05-19
// 의도 (Step 0):
//   표면 = "null value in column no" 7곳 INSERT 분산 정정
//   진짜 = INSERT 책임 통합·SOT는 DB 트리거·클라이언트는 보조 채번
//   설계 = 동일 로직 (max + 1) 양쪽 적용·트리거 fallback도 가능

/**
 * 기존 design_items에서 max(no) + 1 산출하여 '01'·'02' 형식 반환.
 *
 * 사용 예:
 *   const nextNo = nextDesignItemNo(existingItems)
 *   await supabase.from('design_items').insert({ project_id, no: nextNo, ... })
 *
 * 동시성 주의:
 *   클라이언트 채번은 race condition 가능.
 *   DB trigger (set_design_items_no)가 NEW.no IS NULL 시 max + 1로 fallback 채움.
 *   = 클라이언트가 잘못 보내도 DB가 정정.
 *
 * @param items - 기존 design_items 배열 (no 필드 포함)
 * @returns 다음 no 문자열 (예: '01', '02', '10', '100')
 */
export function nextDesignItemNo(items: Array<{ no?: string | null }>): string {
  const max = items.reduce((m, it) => {
    const raw = String(it.no ?? '').replace(/\D/g, '')
    const n = parseInt(raw, 10)
    return Number.isFinite(n) && n > m ? n : m
  }, 0)
  return String(max + 1).padStart(2, '0')
}

/**
 * N개 연속 INSERT 시 사용.
 * 시작 no부터 N개 채번 = ['03', '04', '05'] (startNo=3, count=3)
 *
 * 사용 예:
 *   const nos = nextDesignItemNos(existingItems, 5)
 *   const rows = newItems.map((item, i) => ({ ...item, no: nos[i] }))
 *
 * @param items - 기존 design_items 배열
 * @param count - 채번 개수
 * @returns no 문자열 배열
 */
export function nextDesignItemNos(items: Array<{ no?: string | null }>, count: number): string[] {
  if (count <= 0) return []
  const max = items.reduce((m, it) => {
    const raw = String(it.no ?? '').replace(/\D/g, '')
    const n = parseInt(raw, 10)
    return Number.isFinite(n) && n > m ? n : m
  }, 0)
  const result: string[] = []
  for (let i = 0; i < count; i++) {
    result.push(String(max + 1 + i).padStart(2, '0'))
  }
  return result
}

/**
 * Supabase에서 직접 project_id의 max(no) 조회 후 다음 채번.
 * 비동기 = race condition 위험 줄지만 round-trip 1회 추가.
 * 클라이언트 메모리에 items 없을 때만 사용.
 *
 * @param supabase - Supabase client
 * @param projectId - 프로젝트 ID
 * @returns 다음 no 문자열
 */
export async function fetchNextDesignItemNo(
  supabase: { from: (t: string) => { select: (s: string) => { eq: (k: string, v: string) => Promise<{ data: Array<{ no: string | null }> | null; error: unknown }> } } },
  projectId: string
): Promise<string> {
  const { data, error } = await supabase.from('design_items').select('no').eq('project_id', projectId)
  if (error || !data) return '01'
  return nextDesignItemNo(data)
}
