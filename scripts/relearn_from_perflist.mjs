#!/usr/bin/env node
// scripts/relearn_from_perflist.mjs
// 새 발주 자료 → 자동 분류·시드 보강 diff 출력 (v10.4 스켈레톤)
// 사용: node scripts/relearn_from_perflist.mjs <발주엑셀_경로>
//
// 의도 (Step 0):
//   표면 = "학습 데이터 최신본 자동 반영"
//   진짜 = 새 발주 자료 추가 시 시드 갱신 후보 자동 추출·사용자 검토 후 반영
//   설계 = diff JSON 출력만·자동 시드 갱신 X (정답지 노출 편향 회피·learnings.md 2026-05-11)
//
// 동작:
//   1) 입력 엑셀 파싱 (xlsx)
//   2) 각 행의 환경장식물 카테고리·종류명 추출
//   3) classifyCategory() fuzzy 매칭으로 6대 표준 카테고리 분류
//   4) 비표준 종류명 → 동의어 보강 후보 추출
//   5) 행사장·파트·종류 분포 변화 → SEED_SIGNAGE_ANALYSIS 갱신 후보
//   6) 출력 = docs/reports/relearn_diff_<YYMMDD>.json
//
// 사용자 검토 후 수동으로 시드 갱신·자동 갱신 X.

import XLSX from 'xlsx'
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

function loadSignageCategoryStandards() {
  // signageCategoryStandards.ts의 STANDARD_CATEGORIES + classifyCategory 로직 단순화 버전
  // 실제 통합 시 TypeScript 컴파일 결과 또는 동등 로직 require
  return [
    { key: 'outer_wall', match_keywords: ['외벽', '가로현수막', '통천현수막', '기둥현수막'] },
    { key: 'gate', match_keywords: ['게이트', '아치', '차량 게이트', '진입'] },
    { key: 'streetlight', match_keywords: ['가로등', '폴대', '물통배너', '빵빠레'] },
    { key: 'x_banner', match_keywords: ['X배너', 'x-배너', '스프링배너', '롤업', 'A배너', 'I배너'] },
    { key: 'ceiling', match_keywords: ['천장', '천정', '행잉', '드롭배너'] },
    { key: 'support', match_keywords: ['포디움', '시상보드', '피켓보드', '폼포드', '디지털 사이니지', '거리두기 스티커', '유도사인', '포토월'] },
  ]
}

function classifyCategory(text, standards) {
  if (!text) return null
  const t = String(text).toLowerCase().replace(/\s+/g, '')
  for (const std of standards) {
    for (const kw of std.match_keywords) {
      if (t.includes(kw.toLowerCase().replace(/\s+/g, ''))) {
        return std.key
      }
    }
  }
  return null
}

function main() {
  const input = process.argv[2]
  if (!input) {
    console.error('사용: node scripts/relearn_from_perflist.mjs <발주엑셀_경로>')
    console.error('예: node scripts/relearn_from_perflist.mjs "C:/Users/EZPMP/Desktop/2024_발주.xlsx"')
    process.exit(1)
  }

  if (!existsSync(input)) {
    console.error(`FAIL: 파일 없음 = ${input}`)
    process.exit(1)
  }

  console.log(`입력: ${input}`)
  const wb = XLSX.readFile(input)
  const standards = loadSignageCategoryStandards()

  const result = {
    timestamp: new Date().toISOString(),
    input_file: input,
    sheet_count: wb.SheetNames.length,
    rows_total: 0,
    rows_classified: 0,
    rows_unclassified: 0,
    category_distribution: {},
    new_synonyms_candidates: [],
    venue_distribution: {},
    unclassified_samples: [],
  }

  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName]
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', blankrows: false })
    if (rows.length < 2) continue

    const header = rows[0].map(h => String(h).trim())
    // 카테고리·구분·종류·품목 같은 컬럼 자동 식별
    const catIdx = header.findIndex(h => /구분|종류|품목|category/i.test(h))
    const venueIdx = header.findIndex(h => /행사장|venue|장소/i.test(h))

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i]
      const catRaw = catIdx >= 0 ? String(row[catIdx] ?? '').trim() : ''
      const venue = venueIdx >= 0 ? String(row[venueIdx] ?? '').trim() : '(미명시)'

      if (!catRaw) continue
      result.rows_total++

      const classified = classifyCategory(catRaw, standards)
      if (classified) {
        result.rows_classified++
        result.category_distribution[classified] = (result.category_distribution[classified] ?? 0) + 1
        // 비표준 표기 = 동의어 보강 후보
        const standardKeyword = standards.find(s => s.key === classified)?.match_keywords[0]
        if (catRaw !== standardKeyword && !result.new_synonyms_candidates.some(c => c.alias === catRaw)) {
          result.new_synonyms_candidates.push({
            alias: catRaw,
            canonical_key: classified,
            sample_venue: venue,
          })
        }
      } else {
        result.rows_unclassified++
        if (result.unclassified_samples.length < 30) {
          result.unclassified_samples.push({ category_raw: catRaw, venue })
        }
      }

      if (venue) {
        result.venue_distribution[venue] = (result.venue_distribution[venue] ?? 0) + 1
      }
    }
  }

  // 출력
  const yymmdd = new Date().toISOString().slice(2, 10).replace(/-/g, '')
  const reportDir = join(ROOT, 'docs', 'reports')
  if (!existsSync(reportDir)) mkdirSync(reportDir, { recursive: true })
  const outPath = join(reportDir, `relearn_diff_${yymmdd}.json`)
  writeFileSync(outPath, JSON.stringify(result, null, 2), 'utf-8')

  console.log('\n=== 재학습 diff 요약 ===')
  console.log(`총 행: ${result.rows_total}`)
  console.log(`분류 성공: ${result.rows_classified}`)
  console.log(`분류 실패: ${result.rows_unclassified}`)
  console.log(`동의어 보강 후보: ${result.new_synonyms_candidates.length}건`)
  console.log(`출력: ${outPath}`)
  console.log('\n사용자 검토 후 수동으로 SEED_SYNONYMS·programPartSignageSeed.ts 갱신 권장.')
}

main()
