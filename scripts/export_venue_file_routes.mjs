#!/usr/bin/env node
// 5/22 사용자 명시 = 행사장별 파일 영역 루트 기준 엑셀 (파일 영역 영역 영역·행사장별 영역)

import XLSX from 'xlsx'
import fs from 'node:fs'
import path from 'node:path'

const OUT_PATH = 'C:/Users/EZPMP/Desktop/클로드 코드 활동용/★확인/자료조사_행사장별_파일루트_260522.xlsx'

const wb = XLSX.utils.book_new()

// ─────────────────────────────────────────────────────
// Sheet 1: 행사장별 파일 영역 루트 (메인)
// 각 행사장 = 1 행 = 데이터 영역 = 어떤 파일 영역에서 영역 = 매핑
// ─────────────────────────────────────────────────────
const venueRoutes = [
  ['행사장 (L1)', '영역', '파일 루트', '데이터 위치', '핵심 데이터', '관련 휘하 홀 (L2)', '관련 행사 (SEED)'],

  // ── 코엑스 ──
  ['코엑스', '마스터 정보', 'lib/venueIntel.ts', 'VENUE_LIST → key=′코엑스′', 'region: 서울특별시·type: 컨벤션·area: 36,007㎡·ceiling: 11.4m·rigging: true', '그랜드볼룸·아셈볼룸·오디토리움·컨퍼런스룸(북/남)·A~E홀 (10건)', '2018 스마트국토엑스포·2019 스마트국토엑스포·공정경제 전략회의·AdAsia 2023·기타'],
  ['코엑스', '휘하 홀', 'lib/venueIntel.ts', 'VENUE_HALLS → parent_key=′코엑스′', '10 홀 (그랜드볼룸·아셈볼룸·오디토리움·컨퍼런스룸(북)·컨퍼런스룸(남)·A·B·C·D·E)', '', ''],
  ['코엑스', '시설 가이드', 'lib/data/venueFacilityGuide.ts', 'VENUE_FACILITY_GUIDE_SEED → coex_grandballroom·coex_asembballroom·coex_d_hall·coex_conference_hall', '그랜드볼룸 max 4000×1200·아셈볼룸 max 3000×1000·포디움 600×200', '4건 분리 영역', ''],
  ['코엑스', '행사 SEED', 'lib/data/dashboardSeed.ts', 'SEED_EVENT_HISTORY → venue.includes(′코엑스′)', '7+ 행사', '', '183080·193700·182090·231004·...'],
  ['코엑스', 'L1 정규화', 'lib/venueIntel.ts', 'normalizeVenueName(′코엑스컨벤션센터′) → ′코엑스′', 'VENUE_ALIAS_MAP 매핑', '', ''],

  // ── 킨텍스 ──
  ['킨텍스', '마스터 정보', 'lib/venueIntel.ts', 'VENUE_LIST → key=′킨텍스′', 'region: 경기도 (고양시)·type: 전시장·area: 108,556㎡·rigging: true', '제1전시장 1~10홀·제2전시장 7A·8·9A·9B·10·그랜드볼룸 (10건)', 'WSCE 2022 등'],
  ['킨텍스', '휘하 홀', 'lib/venueIntel.ts', 'VENUE_HALLS → parent_key=′킨텍스′', '제1전시장 1·2홀·3·4·5홀·6·7·8홀·9·10홀·제2전시장 7A·8·9A·9B·10·그랜드볼룸', '', ''],
  ['킨텍스', '시설 가이드', 'lib/data/venueFacilityGuide.ts', 'VENUE_FACILITY_GUIDE_SEED → kintex_1_hall_5·kintex_1_hall_1_to_4·kintex_2_hall', '5홀 외벽 7600×2000·기둥 max 1200×600·가로등 600×1800·통천 max 24m×17m·천정배너 행잉 그리드 영역', '5홀·1~4홀·2전시장 3건 분리', ''],
  ['킨텍스', '행사 SEED', 'lib/data/dashboardSeed.ts', 'SEED_EVENT_HISTORY → venue.includes(′킨텍스′)', 'WSCE 2022 등', '', '222020 (WSCE 2022)'],
  ['킨텍스', 'L1 정규화', 'lib/venueIntel.ts', 'normalizeVenueName 영역 = ′킨텍스 제1전시장′ → ′킨텍스′', '복합 venue extractL1L2FromComplexVenue', '', ''],

  // ── 송도컨벤시아 ──
  ['송도컨벤시아', '마스터 정보', 'lib/venueIntel.ts', 'VENUE_LIST → key=′송도컨벤시아′', 'region: 인천광역시·type: 컨벤션·area: 54,000㎡', '1~4홀 등', '송도 영역 행사'],
  ['송도컨벤시아', '시설 가이드', 'lib/data/venueFacilityGuide.ts', 'VENUE_FACILITY_GUIDE_SEED → songdo_convensia', '로비 max 3000×1200·폴대 600×1800·포디움', '', ''],
  ['송도컨벤시아', 'L1 정규화', 'lib/venueIntel.ts', 'VENUE_ALIAS_MAP → ′인천 송도컨벤시아′ → ′송도컨벤시아′', '', '', ''],

  // ── ICC 제주 ──
  ['ICC JEJU', '마스터 정보', 'lib/venueIntel.ts', 'VENUE_LIST → key=′ICC JEJU′', 'region: 제주특별자치도·type: 컨벤션', '', '2022 IUCN리더스포럼·APEC 중소기업 장관회의·세계리더스보전포럼'],
  ['ICC JEJU', '시설 가이드', 'lib/data/venueFacilityGuide.ts', 'VENUE_FACILITY_GUIDE_SEED → icc_jeju', '세로현수막 600×1800·포디움 600×200', '', ''],
  ['ICC JEJU', '행사 SEED', 'lib/data/dashboardSeed.ts', 'SEED_EVENT_HISTORY → venue.includes(′ICC JEJU′·′제주국제컨벤션′·′제주컨벤시아′)', '3건', '', '223060·251004·183060'],
  ['ICC JEJU', 'L1 정규화', 'lib/venueIntel.ts', 'VENUE_ALIAS_MAP → ′제주국제컨벤션센터′·′제주컨벤시아′ → ′ICC JEJU′', '5/22 신규 영역', '', ''],

  // ── DDP ──
  ['DDP', '마스터 정보', 'lib/venueIntel.ts', 'VENUE_LIST → key=′DDP′', 'region: 서울특별시·type: 공공시설', '알림1관·알림2관·디자인올레·디자인전시관·어울림광장 (5건)', ''],
  ['DDP', '휘하 홀', 'lib/venueIntel.ts', 'VENUE_HALLS → parent_key=′DDP′', '5 홀', '', ''],
  ['DDP', '시설 가이드', 'lib/data/venueFacilityGuide.ts', 'VENUE_FACILITY_GUIDE_SEED → ddp_arthall_1', '포디움 600×200', '', ''],

  // ── 롯데호텔 ──
  ['롯데호텔', '마스터 정보', 'lib/venueIntel.ts', 'VENUE_LIST → key=′롯데호텔′', 'region: 서울특별시·type: 호텔', '서울·잠실·...', '제17차 한-중앙아 협력 포럼·환경 협력 네트워크 간담회'],
  ['롯데호텔', '시설 가이드', 'lib/data/venueFacilityGuide.ts', 'VENUE_FACILITY_GUIDE_SEED → lotte_seoul', '기본 컨벤션 가이드·호텔 영업팀 사전 협의', '', ''],
  ['롯데호텔', '행사 SEED', 'lib/data/dashboardSeed.ts', 'SEED_EVENT_HISTORY → venue.includes(′롯데호텔′)', '2건', '', '241014·252016'],
  ['롯데호텔', 'L1 정규화', 'lib/venueIntel.ts', 'VENUE_ALIAS_MAP → ′롯데호텔 서울′ → ′롯데호텔′', '', '', ''],

  // ── 그랜드 하얏트 ──
  ['그랜드하얏트', '마스터 정보', 'lib/venueIntel.ts', 'VENUE_LIST → key=′그랜드하얏트′', 'region: 서울특별시·type: 호텔', '', ''],
  ['그랜드하얏트', '시설 가이드', 'lib/data/venueFacilityGuide.ts', 'VENUE_FACILITY_GUIDE_SEED → grand_hyatt', '기본 컨벤션 가이드', '', ''],
  ['그랜드하얏트', 'L1 정규화', 'lib/venueIntel.ts', 'VENUE_ALIAS_MAP → ′그랜드 하얏트 서울′ → ′그랜드하얏트′', '', '', ''],

  // ── 웨스틴 조선 ──
  ['웨스틴조선', '마스터 정보', 'lib/venueIntel.ts', 'VENUE_LIST → key=′웨스틴조선′', 'region: 서울특별시·type: 호텔', '', '제16차 한·베트남 환경장관회의 등'],
  ['웨스틴조선', '시설 가이드', 'lib/data/venueFacilityGuide.ts', 'VENUE_FACILITY_GUIDE_SEED → westin_chosun', '기본 컨벤션 가이드', '', ''],
  ['웨스틴조선', '행사 SEED', 'lib/data/dashboardSeed.ts', 'SEED_EVENT_HISTORY → venue.includes(′웨스틴 조선′)', '1건', '', '241011'],
  ['웨스틴조선', 'L1 정규화', 'lib/venueIntel.ts', 'VENUE_ALIAS_MAP → ′웨스틴 조선 서울′ → ′웨스틴조선′', '', '', ''],

  // ── 광주 김대중컨벤션센터 ──
  ['김대중컨벤션센터', '마스터 정보', 'lib/venueIntel.ts', 'VENUE_LIST → key=′김대중컨벤션센터′', 'region: 광주광역시·type: 컨벤션', '', '광주 영역 행사'],
  ['김대중컨벤션센터', 'L1 정규화', 'lib/venueIntel.ts', 'VENUE_ALIAS_MAP → ′광주 김대중컨벤션센터′ → ′김대중컨벤션센터′', '', '', ''],

  // ── aT센터 ──
  ['aT센터', '마스터 정보', 'lib/venueIntel.ts', 'VENUE_LIST → key=′aT센터′ (있을 시)', 'region: 서울특별시·type: 전시장', '', ''],
  ['aT센터', 'L1 정규화', 'lib/venueIntel.ts', 'VENUE_ALIAS_MAP → ′aT 센터′ → ′aT센터′', '', '', ''],

  // ── 평창 알펜시아 ──
  ['평창 알펜시아', '마스터 정보', 'lib/venueIntel.ts', 'VENUE_LIST → key=′평창 알펜시아′ (있을 시)', 'region: 강원특별자치도·type: 리조트', '', '2020 평창평화포럼'],
  ['평창 알펜시아', '시설 가이드', 'lib/data/venueFacilityGuide.ts', 'VENUE_FACILITY_GUIDE_SEED → pyeongchang_alpensia', 'X배너·세로현수막·가로등·통천·포디움·리조트 영업팀 D-30 협의·동절기 동결 대비', '', ''],
  ['평창 알펜시아', '행사 SEED', 'lib/data/dashboardSeed.ts', 'SEED_EVENT_HISTORY → venue.includes(′평창′)', '핵심 영역 1건', '', '193960 (2020 평창평화포럼)·세로현수막 174·X배너 30·가로현수막 15·통천현수막 7·큐방 7·포디움 5'],

  // ── 경주 ──
  ['경주', '행사 SEED', 'lib/data/dashboardSeed.ts', 'SEED_EVENT_HISTORY → venue=′경주′', '2025 APEC 경제행사', '', '251014'],

  // ── 광화문 광장 ──
  ['광화문 광장', '행사 SEED', 'lib/data/dashboardSeed.ts', 'SEED_EVENT_HISTORY → venue=′광화문 광장·세종로공원′', '제100주년 3.1절', '', '192000 (analyzed_item_count 52·signage_breakdown 3건)'],

  // ── 서울스퀘어 ──
  ['서울스퀘어', '행사 SEED', 'lib/data/dashboardSeed.ts', 'SEED_EVENT_HISTORY → venue=′서울스퀘어′', '농식품 청년해외개척단', '', '191600'],

  // ── 미등록 행사장 영역 fallback ──
  ['미등록 행사장 (BEXCO·EXCO·DCC 등)', '시설 가이드 fallback', 'lib/data/venueFacilityGuide.ts', 'buildDefaultConventionGuide(venueName)', 'X배너·세로현수막·가로현수막(협의)·통천(협의)·천정배너(협의)·포디움·A4·A3 POP·기본 컨벤션 가이드', '', '5/22 신규 영역 fallback'],
  ['미등록 행사장', 'AI 추천', 'lib/data/signageCategoryStandards.ts', 'resolveCoverageForVenue → buildCoverageForUnregisteredVenue', 'venue_key = ′unregistered::<slug>′ 영역', '', ''],
]
const venueWs = XLSX.utils.aoa_to_sheet(venueRoutes)
venueWs['!cols'] = [{wch: 28}, {wch: 20}, {wch: 40}, {wch: 60}, {wch: 80}, {wch: 50}, {wch: 50}]
XLSX.utils.book_append_sheet(wb, venueWs, '1. 행사장별 파일 루트')

// ─────────────────────────────────────────────────────
// Sheet 2: 행사장 데이터 들어가는 영역 (코드 → 화면)
// ─────────────────────────────────────────────────────
const dataFlowRows = [
  ['#', '행사장 데이터', '시작 파일', '경유 파일', '표시 화면', '비고'],
  [1, '행사장 마스터 (region·type·area·ceiling·rigging)', 'lib/venueIntel.ts (VENUE_LIST)', 'app/(dashboard)/admin/learning/page.tsx (SSR fetch) → LearningManagerClient.tsx', '/admin/learning → 행사장 관리 메뉴', '25+ venue 영역'],
  [2, '휘하 홀 (L2)', 'lib/venueIntel.ts (VENUE_HALLS)', 'getHallsByVenueName(venueName) → LearningManagerClient.tsx 행사장 관리·시설 가이드 학습 현황', '/admin/learning → 행사장 관리 L1 펼침 → L2 휘하 홀', '코엑스 10·킨텍스 10·DDP 5 = 25+ 영역'],
  [3, '시설 가이드 (설치 가능·주의·리깅·안전·디지털·특이사항)', 'lib/data/venueFacilityGuide.ts (VENUE_FACILITY_GUIDE_SEED)', 'getFacilityGuide(venueName) → app/components/facility/FacilityGuidePanel.tsx', '편집 창 → ′행사장 가이드 보기′ + admin = ✎ 가이드 수정', 'admin 영역 = 6 영역 모두 직접 편집 (5/22)'],
  [4, '시설 가이드 DB 영역 영역 영역', 'venues.facility_guide_json (Supabase DB)', 'getFacilityGuideAsync(venueName, supabase) → SSR fetch → FacilityGuidePanel', '편집 창 + 학습 관리자 영역', 'PATCH /api/admin/venues/<id>'],
  [5, '행사 이력 (1차 살 SEED)', 'lib/data/dashboardSeed.ts (SEED_EVENT_HISTORY 44건)', 'unifiedEventHistory (LearningManagerClient useMemo) = SEED + DB + user + custom', '/admin/learning → 행사 관리 메뉴', 'venue 매칭 = filter(ev.venue.includes(venueName))'],
  [6, '행사 이력 (2차 살 DB)', 'event_history (Supabase DB)', 'SSR fetch (page.tsx) → serverEventHistory → unifiedEventHistory', '/admin/learning → 행사 관리·행사장 관리·환경장식물 빈도', '5/22 영역 = SSR 영역 SSR (laggy 회피)'],
  [7, '사용자 프로젝트 (2차 살)', 'projects + design_items (Supabase DB)', 'page.tsx 영역 = userEventHistory 영역 자동 추출 → LearningManagerClient', '/admin/learning → 행사장 관리·행사장 학습 현황', 'event_venue → normalizeVenueName 정규화'],
  [8, '커스텀 행사 (admin 영역)', 'localStorage (mice_custom_events)', 'customEvents state → unifiedEventHistory', '/admin/learning → 행사 관리 ✎+', '향후 DB 영역 이전 영역'],
  [9, 'AI 추천 영역 = 행사장 컨텍스트', 'lib/ai/recommendSignage.ts → buildVenueProfile + getFacilityGuideAsync + accumulatedContext', 'recommendSignage(input) → Gemini 2.5 Flash REST', '/projects/new/case-a 추천 결과', 'venue 매칭 영역 = 모든 영역 통합 자동 주입'],
  [10, '환경장식물 사용 빈도 (행사장별)', 'unifiedEventHistory + signage_breakdown', 'LearningManagerClient venueAggregateByName useMemo (venue → Set<signage>)', '/admin/learning → 행사장 관리 L2 펼침 ▽ 환경장식물 표', '사용 확률 % · 평균 수량 · 가장 많이 사용한 규격'],
  [11, '복합 venue 자동 분리', 'lib/venueIntel.ts extractL1L2FromComplexVenue', '예: ′코엑스 그랜드볼룸·아셈볼룸′ → L1=′코엑스′·L2=[′그랜드볼룸′·′아셈볼룸′]', 'LearningManagerClient L1 그룹핑', '시드 매칭 X 영역도 자동 분리'],
  [12, 'L1 정규화 영역', 'lib/venueIntel.ts normalizeVenueName', 'VENUE_ALIAS_MAP 매핑 + 부분 매칭 + VENUE_LIST fuzzy', '사용자 프로젝트 영역 venue → 기존 행사장 표준명', '5/22 신규 영역'],
]
const flowWs = XLSX.utils.aoa_to_sheet(dataFlowRows)
flowWs['!cols'] = [{wch: 4}, {wch: 32}, {wch: 50}, {wch: 60}, {wch: 50}, {wch: 50}]
XLSX.utils.book_append_sheet(wb, flowWs, '2. 데이터 흐름')

// ─────────────────────────────────────────────────────
// Sheet 3: 행사장 → AI 추천 영역 = 학습 관리자 정보 자동 주입 영역
// ─────────────────────────────────────────────────────
const aiInputRows = [
  ['#', '주입 영역', '파일', '함수', '입력', '출력 (AI 프롬프트 블록)'],
  [1, '시드 행사 이력 컨텍스트', 'lib/ai/accumulatedContext.ts', 'buildSeedEventHistoryContext(venue, programParts)', 'venue (예: ICC JEJU) · programParts (예: [40.04, 40.19])', '[시드 행사 이력] 영역 = 매칭 행사 + program_parts + signage_breakdown'],
  [2, '행사장별 환경장식물 통계', 'lib/data/venueSignageHelper.ts', 'findSimilarVenueSignage(venue) + formatVenueSignageContext', 'venue', '[행사장 환경장식물 통계] 영역 = 사용 빈도·평균 수량'],
  [3, '천정배너 패턴 (킨텍스 영역)', 'lib/data/dashboardSeed.ts', 'findCeilingBannerContext(venue)', 'venue', '[천정배너 설치 패턴] 영역 = 5/22 영역 = 킨텍스 5홀 영역'],
  [4, '시설 가이드 커버리지', 'lib/data/signageCategoryStandards.ts', 'resolveCoverageForVenue + formatCoverageForPrompt', 'venue', '[학습 카테고리 커버리지] 영역 = 6대 표준 + 학습 데이터 부재 영역 명시'],
  [5, '프로그램 파트 매핑 (1순위)', 'lib/programParts.ts', 'PROGRAM_PART_SIGNAGE_DETAILS + PROGRAM_PART_SIGNAGE_HINTS', 'programParts', '[1순위 — 프로그램 파트 매핑] 영역 = 엑셀 SOT 환경장식물 + 역할(상세 구분)'],
  [6, '어드민 마스터 자료', 'lib/ai/adminMasterContext.ts', 'buildAdminMasterContext(venue)', 'venue', '[어드민 마스터] 영역 = signage_types DB + venues.facility_guide_json + signage_aliases'],
  [7, '행사장 프로필 (Vision 영역 specs_text)', 'lib/ai/venueProfile.ts', 'buildVenueProfile(venue)', 'venue', '[행사장 프로필] 영역 = venues + 시설 가이드 + facility_exception_log'],
  [8, '도면 Vision 보강 (선택)', 'lib/ai/visionFloorPlan.ts', 'analyzeFloorPlan(imageUrl) - Gemini 2.5 Vision', 'floorPlanImageUrl', '[보강 — 행사장 배치도] 영역 = 동선·설치 위치 추출'],
  [9, '동의어 자동 변환', 'lib/data/dashboardSeed.ts (SEED_SYNONYMS) + signage_aliases DB', 'resolveCategoryName(category)', '비표준 명칭', '표준 12 카테고리 영역 자동 변환 (예: 큐방 → Q방·기념촬영보드 → 시상보드)'],
]
const aiWs = XLSX.utils.aoa_to_sheet(aiInputRows)
aiWs['!cols'] = [{wch: 4}, {wch: 26}, {wch: 50}, {wch: 50}, {wch: 30}, {wch: 80}]
XLSX.utils.book_append_sheet(wb, aiWs, '3. AI 영역 자동 주입')

// 저장
const outDir = path.dirname(OUT_PATH)
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })
XLSX.writeFile(wb, OUT_PATH)
console.log('✓ 행사장별 파일 루트 엑셀 작성 완료')
console.log('  → ' + OUT_PATH)
console.log('  → 3 시트 (행사장별 파일 루트 / 데이터 흐름 / AI 자동 주입)')
