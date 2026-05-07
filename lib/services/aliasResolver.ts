// 환경장식물 동의어 → 표준명 변환.
// signage_aliases 테이블에서 한 번 fetch 후 메모리 캐시.

import type { SupabaseClient } from '@supabase/supabase-js'
import type { SignageAlias } from '@/lib/types'

let cache: SignageAlias[] | null = null
let cachedAt = 0
const TTL = 1000 * 60 * 10 // 10분

export async function loadAliases(supabase: SupabaseClient): Promise<SignageAlias[]> {
  const now = Date.now()
  if (cache && now - cachedAt < TTL) return cache
  const { data } = await supabase
    .from('signage_aliases')
    .select('alias_name, canonical_name, kind, default_size, note')
  cache = (data ?? []) as SignageAlias[]
  cachedAt = now
  return cache
}

export interface ResolveResult {
  canonical: string         // 표준명 (변환 결과 또는 원본)
  matched: SignageAlias | null
  isAlias: boolean
}

const norm = (s: string) => s.replace(/[\s\-_·\(\)\[\]]/g, '').toLowerCase()

export function resolveAliasSync(input: string, aliases: SignageAlias[]): ResolveResult {
  const q = norm(input)
  if (!q) return { canonical: input, matched: null, isAlias: false }

  // 정확 일치 우선
  const exact = aliases.find(a => norm(a.alias_name) === q)
  if (exact) return { canonical: exact.canonical_name, matched: exact, isAlias: true }

  // 부분 포함 (alias_name이 input에 포함되거나 그 반대)
  const partial = aliases.find(a => {
    const an = norm(a.alias_name)
    return an && (q.includes(an) || an.includes(q))
  })
  if (partial) return { canonical: partial.canonical_name, matched: partial, isAlias: true }

  // 표준명과 이미 같으면 그대로
  return { canonical: input, matched: null, isAlias: false }
}

export async function resolveAlias(supabase: SupabaseClient, input: string): Promise<ResolveResult> {
  const aliases = await loadAliases(supabase)
  return resolveAliasSync(input, aliases)
}
