// v4 (v4.1 단위 8 + 갱신-E):
//   - v3 분석 + program_part 추론 (EZ 폴더링 40.04~40.20 코드)
//   - 폴더 내 도면 파일(pdf/jpg/png) 존재 여부 → has_floor_plan
//   - 행사 유형 폴더링 후보 추출 (단위 3-2 보강)
//   - 출력: lib/data/_signage_analysis_v4.json + _program_parts_distribution.json
// 사용: node scripts/parse_signage_lists_v4.mjs

import * as XLSX from 'xlsx'
import { readFileSync, readdirSync, statSync, writeFileSync } from 'fs'
import { join, basename } from 'path'

const ROOT = 'C:/Users/EZPMP/Desktop/클로드 코드 활동용/참고자료/환경장식물 행사별'
// 위 경로가 없으면 구 경로 fallback
const FALLBACK = 'C:/Users/EZPMP/Desktop/클로드 코드 활동용/제작물 디자인 의뢰 가이드/참고자료/환경장식물 행사별'

function pickRoot() {
  try { statSync(ROOT); return ROOT } catch {}
  try { statSync(FALLBACK); return FALLBACK } catch {}
  console.warn('⚠️ 참고자료 폴더를 찾을 수 없습니다. ROOT 경로를 확인하세요.')
  return ROOT
}

const ACTIVE_ROOT = pickRoot()

// ── EZ 폴더링 40.xx → 키워드 매핑 (lib/programParts.ts와 동기화) ──
const PROGRAM_PART_KEYWORDS = [
  { code: '40.04', name: '회의',                keywords: ['회의', '컨퍼런스', '세미나', '포럼', '심포지엄', 'conference', 'forum'] },
  { code: '40.05', name: '전시',                keywords: ['전시', '박람회', '엑스포', 'expo', 'exhibition'] },
  { code: '40.06', name: '비즈니스 매칭',       keywords: ['매칭', '바이어', 'matching', '1:1', '미팅'] },
  { code: '40.07', name: '비즈니스 프로그램',   keywords: ['프레젠테이션', '발표', 'IR', '데모데이'] },
  { code: '40.08', name: '공식행사',            keywords: ['개막', '폐막', 'MOU', '시상', '체결', '기념식'] },
  { code: '40.09', name: '부대행사 - 공모전형', keywords: ['공모전', '경진대회', '아이디어'] },
  { code: '40.10', name: '부대행사 - 체험형',   keywords: ['체험', 'VR', '시연', '워크샵', 'workshop'] },
  { code: '40.11', name: '부대행사 - 투어형',   keywords: ['투어', '시찰', 'tour'] },
  { code: '40.18', name: '의전',                keywords: ['VIP', '의전', '귀빈', '영접'] },
  { code: '40.19', name: '등록',                keywords: ['등록', '체크인', 'registration', '리셉션'] },
  { code: '40.20', name: '영접영송',            keywords: ['영접', '영송', '입퇴장'] },
  { code: '40.17', name: '홍보',                keywords: ['홍보', '광고', 'PR'] },
]

// 폴더명 / 시트명에서 program_part 추론 (다중 매칭 가능)
function inferProgramParts(text) {
  if (!text) return []
  const matched = new Set()
  for (const p of PROGRAM_PART_KEYWORDS) {
    for (const kw of p.keywords) {
      if (text.includes(kw)) { matched.add(p.code); break }
    }
  }
  return Array.from(matched)
}

// 도면 파일 패턴 검사
function detectFloorPlanFiles(dir) {
  let entries
  try { entries = readdirSync(dir) } catch { return [] }
  const found = []
  for (const e of entries) {
    const p = join(dir, e)
    let stat
    try { stat = statSync(p) } catch { continue }
    if (stat.isFile()) {
      // 파일명에 도면/배치도/평면 또는 확장자가 .pdf 인 경우
      if (/도면|배치도|평면도|동선|floor|plan/i.test(e)) found.push(p)
      else if (/\.(pdf)$/i.test(e) && /도면|배치|map|floor/i.test(e)) found.push(p)
    } else if (stat.isDirectory() && !/node_modules|\.git/.test(e)) {
      // 1단계만 더 들어감
      try {
        const sub = readdirSync(p)
        for (const s of sub) {
          if (/도면|배치도|평면도|동선|floor|plan/i.test(s) || /\.pdf$/i.test(s)) {
            found.push(join(p, s))
          }
        }
      } catch {}
    }
  }
  return found
}

// 폴더 트리 순회 (최대 깊이 4)
function walkEvents(dir, depth = 0, eventDirs = []) {
  if (depth > 3) return eventDirs
  let entries
  try { entries = readdirSync(dir) } catch { return eventDirs }
  for (const e of entries) {
    const p = join(dir, e)
    let stat
    try { stat = statSync(p) } catch { continue }
    if (!stat.isDirectory()) continue
    // 행사 폴더 패턴: 4자리 숫자 + 텍스트, 또는 "{년도} {행사명}"
    const looksEvent = /^(20\d{2}|19\d{2})/.test(e) || /행사|사업/.test(e) || depth >= 1
    if (looksEvent) {
      eventDirs.push({ path: p, name: e, depth })
      walkEvents(p, depth + 1, eventDirs)
    } else {
      walkEvents(p, depth + 1, eventDirs)
    }
  }
  return eventDirs
}

// 메인
function main() {
  console.log(`▶ ROOT: ${ACTIVE_ROOT}`)
  const eventDirs = walkEvents(ACTIVE_ROOT)
  console.log(`▶ 행사 폴더 후보: ${eventDirs.length}개`)

  const events = []
  const programPartsDistribution = new Map()
  const folderTypeFreq = new Map()  // 행사 유형 폴더링 후보

  for (const ev of eventDirs) {
    const folderName = ev.name
    const inferredParts = inferProgramParts(folderName)
    const floorPlans = detectFloorPlanFiles(ev.path)

    // 폴더링 패턴 추출 (유형 후보)
    // "2025 OO포럼", "2024 OO엑스포" 형태에서 후미 키워드 추출
    const tail = folderName.replace(/^(20\d{2}|19\d{2})\s*/, '').trim()
    if (tail.length >= 2 && tail.length <= 30) {
      // 유형 키워드 후보 (마지막 단어)
      const lastWord = tail.split(/\s+/).pop()
      if (lastWord && lastWord.length >= 2 && lastWord.length <= 8) {
        folderTypeFreq.set(lastWord, (folderTypeFreq.get(lastWord) ?? 0) + 1)
      }
    }

    for (const code of inferredParts) {
      programPartsDistribution.set(code, (programPartsDistribution.get(code) ?? 0) + 1)
    }

    events.push({
      name: folderName,
      path: ev.path,
      depth: ev.depth,
      program_parts: inferredParts,
      has_floor_plan: floorPlans.length > 0,
      floor_plan_count: floorPlans.length,
      floor_plan_examples: floorPlans.slice(0, 3).map(p => basename(p)),
    })
  }

  // 출력 1: 행사별 v4 분석
  const out1 = {
    generated_at: new Date().toISOString(),
    root: ACTIVE_ROOT,
    total_events: events.length,
    events_with_floor_plan: events.filter(e => e.has_floor_plan).length,
    events,
  }
  writeFileSync('lib/data/_signage_analysis_v4.json', JSON.stringify(out1, null, 2))
  console.log(`✅ lib/data/_signage_analysis_v4.json (${events.length}개 행사)`)

  // 출력 2: 프로그램 파트 분포 + 폴더 유형 후보
  const out2 = {
    generated_at: new Date().toISOString(),
    program_parts: Array.from(programPartsDistribution.entries())
      .sort(([, a], [, b]) => b - a)
      .map(([code, count]) => ({
        code,
        name: PROGRAM_PART_KEYWORDS.find(p => p.code === code)?.name ?? code,
        count,
      })),
    folder_type_candidates: Array.from(folderTypeFreq.entries())
      .filter(([, c]) => c >= 2)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 30)
      .map(([word, count]) => ({ word, count })),
  }
  writeFileSync('lib/data/_program_parts_distribution.json', JSON.stringify(out2, null, 2))
  console.log(`✅ lib/data/_program_parts_distribution.json`)

  // 콘솔 요약
  console.log(`\n📊 프로그램 파트 분포 TOP 5:`)
  for (const p of out2.program_parts.slice(0, 5)) {
    console.log(`   ${p.code} ${p.name}: ${p.count}건`)
  }
  console.log(`\n📁 폴더링 유형 후보 TOP 5:`)
  for (const t of out2.folder_type_candidates.slice(0, 5)) {
    console.log(`   ${t.word}: ${t.count}건`)
  }
  console.log(`\n📐 도면 보유 행사: ${out1.events_with_floor_plan}/${events.length}`)
}

main()
