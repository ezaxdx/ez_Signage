#!/usr/bin/env node
// ────────────────────────────────────────────────────────────
// 하네스 (Harness) — 프로젝트 건강도 자동 점검
// 사용: npm run check:harness
// ────────────────────────────────────────────────────────────

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const GREEN = '\x1b[32m'
const RED = '\x1b[31m'
const YELLOW = '\x1b[33m'
const CYAN = '\x1b[36m'
const BOLD = '\x1b[1m'
const RESET = '\x1b[0m'

let pass = 0
let fail = 0
let warn = 0

function ok(label) { pass++; console.log(`  ${GREEN}✓${RESET} ${label}`) }
function err(label, detail = '') { fail++; console.log(`  ${RED}✗${RESET} ${label}${detail ? `\n      ${RED}${detail}${RESET}` : ''}`) }
function warning(label, detail = '') { warn++; console.log(`  ${YELLOW}!${RESET} ${label}${detail ? `\n      ${YELLOW}${detail}${RESET}` : ''}`) }
function section(title) { console.log(`\n${BOLD}${CYAN}━━ ${title} ━━${RESET}`) }

function fileExists(rel) {
  return fs.existsSync(path.join(__root, rel))
}

function readFile(rel) {
  try { return fs.readFileSync(path.join(__root, rel), 'utf8') } catch { return null }
}

function grepFile(rel, pattern) {
  const content = readFile(rel)
  if (!content) return false
  return pattern instanceof RegExp ? pattern.test(content) : content.includes(pattern)
}

// ────────────────────────────────────────────────────────────
console.log(`${BOLD}${CYAN}🔍 MICE Design Guide — 하네스 점검${RESET}`)
console.log(`   ${new Date().toLocaleString('ko-KR')}`)

// ── 1. 핵심 파일 존재 ────────────────────────────────────
section('1. 핵심 파일 존재 여부')
const coreFiles = [
  'app/layout.tsx',
  'app/globals.css',
  'app/(dashboard)/dashboard/page.tsx',
  'app/(dashboard)/projects/[id]/page.tsx',
  'app/(dashboard)/projects/[id]/EditorLayout.tsx',
  'app/(dashboard)/projects/[id]/info/page.tsx',
  'app/(dashboard)/projects/[id]/info/ProjectInfoClient.tsx',
  'app/(dashboard)/projects/[id]/components/CanvasBoard.tsx',
  'app/(dashboard)/projects/[id]/components/EditorGrid.tsx',
  'app/(dashboard)/projects/[id]/components/EditorToolbar.tsx',
  'app/(dashboard)/projects/[id]/components/ItemSidebar.tsx',
  'app/(dashboard)/projects/[id]/components/SlotPanel.tsx',
  'app/(dashboard)/projects/[id]/components/SeriesGenerator.tsx',
  'app/(dashboard)/projects/[id]/components/PreflightModal.tsx',
  'app/(dashboard)/projects/[id]/components/FormatSelector.tsx',
  'app/(dashboard)/dashboard/components/NewProjectButton.tsx',
  'app/(dashboard)/dashboard/components/RecommenderWidget.tsx',
  'app/(dashboard)/dashboard/components/ProjectCard.tsx',
  'app/(dashboard)/archive/page.tsx',
  'app/(dashboard)/archive/ArchiveClient.tsx',
  'app/share/[token]/page.tsx',
  'app/share/[token]/ClientReviewView.tsx',
  'app/api/analyze-layout/route.ts',
  'lib/types.ts',
  'lib/constants.ts',
  'lib/services/ExportService.ts',
  'lib/services/imageUtils.ts',
  'lib/services/itemService.ts',
  'lib/services/qrService.ts',
  'lib/services/preflightCheck.ts',
  'supabase/migration_all.sql',
  'public/fonts/Pretendard-Regular.ttf',
  'public/fonts/HGGGOTHICSSI_40G.OTF',
]
for (const f of coreFiles) {
  if (fileExists(f)) ok(f)
  else err(`누락: ${f}`)
}

// ── 2. 핵심 기능 코드 존재 검증 ─────────────────────────
section('2. 핵심 기능 코드 검증')
const featureChecks = [
  { file: 'lib/types.ts', pattern: 'DEFAULT_SLOTS_PORTRAIT', label: '규격별 기본 레이아웃 3종' },
  { file: 'lib/types.ts', pattern: 'pickDefaultSlots', label: 'aspect ratio 기반 레이아웃 선택' },
  { file: 'lib/types.ts', pattern: 'is_master', label: 'DesignItem.is_master 필드' },
  { file: 'lib/types.ts', pattern: 'review_status', label: 'DesignItem.review_status 필드' },
  { file: 'lib/constants.ts', pattern: 'PURPOSE_PRESETS', label: '사용 목적 5종' },
  { file: 'lib/constants.ts', pattern: 'TEMPLATE_PRESETS', label: '실제 샘플 기반 템플릿 라이브러리' },
  { file: 'lib/constants.ts', pattern: 'STYLE_PRESETS', label: '6종 스타일 프리셋' },
  { file: 'app/(dashboard)/projects/[id]/info/ProjectInfoClient.tsx', pattern: 'FONT_OPTIONS', label: '폰트 옵션 (45+종)' },
  { file: 'lib/services/itemService.ts', pattern: 'setAsMaster', label: '마스터 지정 함수' },
  { file: 'lib/services/preflightCheck.ts', pattern: 'runPreflight', label: '발주 전 자동 점검' },
  { file: 'lib/services/ExportService.ts', pattern: 'exportToExcel', label: 'Excel 내보내기' },
  { file: 'lib/services/ExportService.ts', pattern: 'exportToPPT', label: 'PPT 내보내기' },
  { file: 'lib/services/ExportService.ts', pattern: 'exportToPDF', label: 'PDF 인쇄용 출력' },
  { file: 'lib/services/qrService.ts', pattern: 'generateQrDataUrl', label: 'QR 자동 생성' },
  { file: 'app/(dashboard)/projects/[id]/EditorLayout.tsx', pattern: 'slot_history', label: '감사 로그 (변경 이력)' },
  { file: 'app/(dashboard)/projects/[id]/EditorLayout.tsx', pattern: 'handleSetAsMaster', label: '마스터 지정 핸들러' },
  { file: 'app/(dashboard)/projects/[id]/components/CanvasBoard.tsx', pattern: 'object:scaling', label: '리사이즈 중 반응형 폰트' },
  { file: 'app/(dashboard)/projects/[id]/components/CanvasBoard.tsx', pattern: 'splitByGrapheme', label: '한글 자유 줄바꿈' },
  { file: 'app/(dashboard)/projects/[id]/components/CanvasBoard.tsx', pattern: 'syncSlotImages', label: '슬롯 내 이미지 렌더링' },
  { file: 'app/globals.css', pattern: 'Pretendard', label: '로컬 Pretendard 폰트 @font-face' },
  { file: 'app/globals.css', pattern: 'HG꼬딕씨', label: '로컬 HG꼬딕씨 폰트 @font-face' },
  { file: 'supabase/migration_all.sql', pattern: 'share_token', label: '클라이언트 공유 토큰 컬럼' },
  { file: 'supabase/migration_all.sql', pattern: 'client_reviews', label: '클라이언트 코멘트 테이블' },
  { file: 'supabase/migration_all.sql', pattern: 'supabase_realtime', label: 'Realtime publication' },
  { file: 'supabase/migration_all.sql', pattern: 'design-images', label: 'Storage 버킷 SQL' },
]
for (const c of featureChecks) {
  if (grepFile(c.file, c.pattern)) ok(c.label)
  else err(c.label, `파일 ${c.file} 에 ${c.pattern} 없음`)
}

// ── 3. 환경 변수 점검 ───────────────────────────────────
section('3. 환경 변수')
const env = readFile('.env.local')
if (!env) {
  err('.env.local 없음')
} else {
  if (env.includes('NEXT_PUBLIC_SUPABASE_URL')) ok('NEXT_PUBLIC_SUPABASE_URL')
  else err('NEXT_PUBLIC_SUPABASE_URL 누락')
  if (env.includes('NEXT_PUBLIC_SUPABASE_ANON_KEY')) ok('NEXT_PUBLIC_SUPABASE_ANON_KEY')
  else err('NEXT_PUBLIC_SUPABASE_ANON_KEY 누락')
  if (env.includes('GEMINI_API_KEY')) ok('GEMINI_API_KEY (AI 슬롯 분석 활성)')
  else warning('GEMINI_API_KEY 없음 — AI 슬롯 분석은 휴리스틱 폴백')
}

// ── 4. dev 서버 포트 대기 ────────────────────────────────
section('4. dev 서버 연결 시도 (localhost:3000)')
try {
  const res = await fetch('http://localhost:3000/login', { signal: AbortSignal.timeout(2000) })
  if (res.ok) ok(`dev 서버 정상 (HTTP ${res.status})`)
  else warning(`dev 서버 응답 ${res.status}`)
} catch {
  warning('dev 서버 미실행 — `npm run dev` 로 시작하세요')
}

// ── 5. Supabase 연결 시도 ───────────────────────────────
section('5. Supabase 연결')
const urlMatch = env?.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/)
if (urlMatch) {
  const url = urlMatch[1].trim()
  try {
    const r = await fetch(url + '/rest/v1/', {
      headers: { apikey: env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.+)/)?.[1]?.trim() ?? '' },
      signal: AbortSignal.timeout(3000),
    })
    if (r.ok || r.status === 404) ok(`Supabase REST 접근 가능 (${url})`)
    else warning(`Supabase HTTP ${r.status}`)
  } catch (e) {
    warning('Supabase 연결 실패: ' + e.message)
  }
}

// ── 6. 라우트 개수 ──────────────────────────────────────
section('6. 라우트 확인')
const routes = [
  'app/page.tsx',
  'app/(auth)/login/page.tsx',
  'app/(auth)/signup/page.tsx',
  'app/(dashboard)/dashboard/page.tsx',
  'app/(dashboard)/projects/[id]/page.tsx',
  'app/(dashboard)/projects/[id]/info/page.tsx',
  'app/(dashboard)/archive/page.tsx',
  'app/share/[token]/page.tsx',
  'app/api/analyze-layout/route.ts',
]
for (const r of routes) {
  if (fileExists(r)) ok(r.replace('/page.tsx', '').replace('/route.ts', ' [API]').replace('app/', '/'))
  else err(`라우트 누락: ${r}`)
}

// ── 7. TypeScript 에러 카운트 (간이) ────────────────────
section('7. 요약')
const total = pass + fail + warn
console.log()
console.log(`   ${BOLD}총 검사:${RESET} ${total}`)
console.log(`   ${GREEN}✓ 통과:${RESET} ${pass}`)
console.log(`   ${YELLOW}! 경고:${RESET} ${warn}`)
console.log(`   ${RED}✗ 실패:${RESET} ${fail}`)

if (fail === 0) {
  console.log(`\n${GREEN}${BOLD}✓ 하네스 통과 — 프로젝트 건강도 양호${RESET}\n`)
  process.exit(0)
} else {
  console.log(`\n${RED}${BOLD}✗ ${fail}개 실패 — 위 항목을 확인하세요${RESET}\n`)
  process.exit(1)
}
