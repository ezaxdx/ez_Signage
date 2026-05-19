#!/usr/bin/env node
// scripts/check_v3_alignment.mjs
// 5/19 박제 룰 grep 4단계 자체 검증 자동화 (feedback-정합점검-체크리스트-260519 정합)
//
// 사용처: 광범위 시드·DB·SYSTEM_INSTRUCTION·UI 정합 작업 후 자동 점검
// 실행: node scripts/check_v3_alignment.mjs
//
// 검증 영역:
//   1. 신규 키 일관성 (v3 12 카테고리 모든 사용처 grep)
//   2. 구 키 잔존 (tongchun·podium_title = v3 영역 X·legacy v2만)
//   3. 외부 SOT 정합 (노션 §6-2 12 카테고리·§8-1 동의어)
//   4. fallback 값 (ExportService offset·매핑 fallback)

import { readFileSync, existsSync, readdirSync, statSync } from 'fs'
import { join, relative } from 'path'

const ROOT = process.cwd()

// 5/22 김연아 대리님 명시 = 엑셀 SOT `구분` 컬럼 12 카테고리 SOT (5/22 정합)
// - 삭제 5건 = i_banner·a4_portrait·a4_landscape·a3_portrait·a3_landscape
// - 신규 5건 = award_board·q_room·digital_signage·foam_board·picket_board
// - 표준명 정합 = '통천' → '통천 배너'·'동선 배너' → '동선 안내 배너'
const V3_CATEGORY_KEYS = [
  'x_banner', 'streetlight_banner', 'horizontal_banner',
  'vertical_banner', 'chunchen_banner', 'podium',
  'route_banner', 'award_board', 'q_room',
  'digital_signage', 'foam_board', 'picket_board',
]

// 5/19 발견·정정 영역 (재발 회피)
const DEPRECATED_KEYS = ['tongchun_banner', 'podium_title', 'i_banner', 'a4_portrait', 'a4_landscape', 'a3_portrait', 'a3_landscape']
const DEPRECATED_LABELS = ['X-배너', 'I-배너', '통천 배너 (이전 = 통천)', '동선 배너 (이전·5/22 동선 안내 배너 변경)']

// v3 활성 영역 파일 (v2 LEGACY 제외·glob 대신 직접 walk)
const V3_ACTIVE_DIRS = [
  'lib/data/v3',
  'lib/ai/v3',
  'app/(dashboard)',
]
const V3_ACTIVE_FILES = [
  'lib/ai/recommendSignage.ts',
  'lib/ai/agentPipeline.ts',
  'lib/ai/venueProfile.ts',
  'lib/data/dashboardSeed.ts',
  'lib/data/venueFacilityGuide.ts',
  'lib/data/signageCategoryStandards.ts',
  'lib/programParts.ts',
  'lib/constants.ts',
  'lib/services/itemService.ts',
  'lib/services/ExportService.ts',
  'supabase/migration_v11_notion_12cat_alignment.sql',
]

function walk(dir) {
  const results = []
  try {
    const entries = readdirSync(join(ROOT, dir))
    for (const entry of entries) {
      const fullPath = join(dir, entry)
      const absPath = join(ROOT, fullPath)
      let s
      try { s = statSync(absPath) } catch { continue }
      if (s.isDirectory()) {
        if (entry.startsWith('_legacy_') || entry === 'node_modules' || entry.startsWith('.')) continue
        results.push(...walk(fullPath))
      } else if (s.isFile() && /\.(ts|tsx)$/.test(entry)) {
        results.push(fullPath.replace(/\\/g, '/'))
      }
    }
  } catch {}
  return results
}

let totalChecks = 0
let totalPass = 0
let totalWarn = 0
let totalFail = 0
const issues = []

function check(name, fn) {
  totalChecks++
  try {
    const result = fn()
    if (result === true) {
      totalPass++
      console.log(`  ✓ ${name}`)
    } else if (typeof result === 'string' && result.startsWith('WARN:')) {
      totalWarn++
      console.log(`  ! ${name} — ${result.slice(5)}`)
      issues.push({ name, severity: 'warn', detail: result.slice(5) })
    } else {
      totalFail++
      console.log(`  ✗ ${name} — ${result}`)
      issues.push({ name, severity: 'fail', detail: result })
    }
  } catch (e) {
    totalFail++
    console.log(`  ✗ ${name} — exception: ${e.message}`)
    issues.push({ name, severity: 'fail', detail: e.message })
  }
}

function getFiles() {
  const files = [...V3_ACTIVE_FILES]
  for (const dir of V3_ACTIVE_DIRS) {
    files.push(...walk(dir))
  }
  return [...new Set(files.filter(f => existsSync(join(ROOT, f))))]
}

function grepActive(pattern) {
  const files = getFiles()
  const matches = []
  for (const f of files) {
    try {
      const content = readFileSync(`${ROOT}/${f}`, 'utf8')
      if (typeof pattern === 'string' && content.includes(pattern)) {
        matches.push(f)
      } else if (pattern instanceof RegExp && pattern.test(content)) {
        matches.push(f)
      }
    } catch {}
  }
  return matches
}

function main() {
  console.log('━━ v3 정합 자체 점검 (5/19 박제 룰·grep 4단계) ━━')
  console.log()

  // ── 1. 신규 키 일관성 (12 카테고리 모든 SOT) ──
  console.log('[1] 신규 키 일관성 (12 카테고리)')
  for (const key of V3_CATEGORY_KEYS) {
    const found = grepActive(key)
    check(`  ${key} 사용처`, () => {
      if (found.length === 0) return `사용처 0건 (시드만 정의·실 코드 사용 X 점검 필요)`
      if (found.length < 2) return `WARN:사용처 ${found.length}건 (1건은 시드 자체·실 사용 X)`
      return true
    })
  }

  // ── 2. 구 키 잔존 (v3 영역 X) ──
  console.log()
  console.log('[2] 구 키 잔존 (v3 영역 X·legacy만 OK)')
  for (const key of DEPRECATED_KEYS) {
    const found = grepActive(key)
    check(`  ${key} 잔존`, () => {
      if (found.length === 0) return true
      return `v3 활성 영역에 ${found.length}건 잔존: ${found.slice(0, 3).join(', ')}`
    })
  }

  // ── 3. legacy 라벨 잔존 (대시 표기·정합 후보) ──
  console.log()
  console.log('[3] legacy 라벨 잔존 (대시 표기)')
  for (const label of DEPRECATED_LABELS) {
    const found = grepActive(label)
    check(`  '${label}' 잔존`, () => {
      if (found.length === 0) return true
      // itemService.ts·dashboardSeed.ts·코멘트 = 호환 영역 (OK)
      const nonComment = found.filter(f => !f.includes('_signage_analysis_') && !f.includes('itemService'))
      if (nonComment.length === 0) return `WARN:호환 영역 ${found.length}건만 잔존 (itemService·legacy 텍스트)`
      return `WARN:${nonComment.length}건 잔존 (코멘트·통계 영역 가능): ${nonComment.slice(0, 2).join(', ')}`
    })
  }

  // ── 4. 외부 SOT (노션 §6-2 12 카테고리) ──
  console.log()
  console.log('[4] 외부 SOT 정합 (노션 §6-2)')
  const seedPath = `${ROOT}/lib/data/v3/signageCategoriesSeedV3.ts`
  check('  signageCategoriesSeedV3.ts 12 카테고리 정의', () => {
    if (!existsSync(seedPath)) return 'SOT 파일 누락'
    const content = readFileSync(seedPath, 'utf8')
    const keyMatches = V3_CATEGORY_KEYS.filter(k => content.includes(`key: '${k}'`))
    if (keyMatches.length !== 12) return `12 카테고리 중 ${keyMatches.length}건만 정의`
    return true
  })

  // ── 5. fallback 값 (ExportService offset·노션 §3-2) ──
  console.log()
  console.log('[5] fallback 값 (노션 §3-2)')
  const exportPath = `${ROOT}/lib/services/ExportService.ts`
  check('  ExportService fallback order offset = -3 (노션 §3-2)', () => {
    if (!existsSync(exportPath)) return 'ExportService.ts 누락'
    const content = readFileSync(exportPath, 'utf8')
    if (content.includes(`{ key: 'order', offset: -3 }`)) return true
    if (content.includes(`{ key: 'order', offset: -14 }`)) return `fallback offset = -14 (구값) 잔존`
    return `WARN:fallback offset 패턴 X·확인 필요`
  })

  // ── 6. SEED_SYNONYMS 정합 (노션 §8-1 동의어 영역) ── 5/19 확장
  console.log()
  console.log('[6] SEED_SYNONYMS 정합 (노션 §8-1)')
  const seedSynonymsPath = `${ROOT}/lib/data/dashboardSeed.ts`
  // 노션 §8-1 영역 핵심 6건 영역 (5/19 push 22 추가 영역) — 누락 시 fail
  // 폼보드·시트지·백월·포토월 = 노션 §5 제외 영역 (메모리 reference_환경장식물_종류_SOT_260518 정합)
  const NOTION_8_1_CORE_SYNONYMS = [
    '명패', '웰컴보드', 'MOU', '시상보드',  // 5/19 신규 추가 영역
    '유도사인',  // 동선 배너 영역
    '스프링배너',  // X배너 영역
  ]
  check('  SEED_SYNONYMS 핵심 7건 모두 포함 (노션 §8-1)', () => {
    if (!existsSync(seedSynonymsPath)) return 'dashboardSeed.ts 누락'
    const content = readFileSync(seedSynonymsPath, 'utf8')
    const missing = NOTION_8_1_CORE_SYNONYMS.filter(s => !content.includes(`alias: '${s}'`))
    if (missing.length === 0) return true
    return `${missing.length}건 누락: ${missing.join(', ')}`
  })
  // 대시 표기 영역 잔존 점검 (X-배너·I-배너 영역 영역 정정 영역)
  check('  SEED_SYNONYMS 대시 표기 잔존 X (X배너·I배너)', () => {
    if (!existsSync(seedSynonymsPath)) return 'dashboardSeed.ts 누락'
    const content = readFileSync(seedSynonymsPath, 'utf8')
    const dashCount = (content.match(/canonical_name: 'X-배너'/g) || []).length +
                      (content.match(/canonical_name: 'I-배너'/g) || []).length
    if (dashCount === 0) return true
    return `대시 표기 ${dashCount}건 잔존 (X-배너·I-배너 → X배너·I배너 정정 필요)`
  })

  // ── 요약 ──
  console.log()
  console.log('━━ 요약 ━━')
  console.log(`   총 점검: ${totalChecks}`)
  console.log(`   ✓ 통과: ${totalPass}`)
  console.log(`   ! 경고: ${totalWarn}`)
  console.log(`   ✗ 실패: ${totalFail}`)
  if (totalFail === 0) {
    console.log()
    console.log('✓ v3 정합 점검 통과 — 환경장식물 v3 코드 영역 = 오류 0건')
  } else {
    console.log()
    console.log(`✗ ${totalFail}건 실패 — 정합 정정 의무`)
    process.exit(1)
  }
}

try { main() } catch (e) { console.error(e); process.exit(1) }
