#!/usr/bin/env node
// 5/22 사용자 명시 = 자료조사 영역 종합 엑셀 작성
// 파일 흐름·데이터 매핑·학습 내용 영역 통합

import XLSX from 'xlsx'
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(process.cwd())
const OUT_PATH = 'C:/Users/EZPMP/Desktop/클로드 코드 활동용/★확인/자료조사_종합_260522.xlsx'

const wb = XLSX.utils.book_new()

// ── Sheet 1: 데이터 흐름 영역 ─────────────────────────────────
const flowRows = [
  ['#', '엔트리', '경로', '참조 파일', '핵심 데이터', '비고'],
  [1, '사용자 = 신규 프로젝트', '/dashboard → NewProjectButton', 'app/(dashboard)/dashboard/components/NewProjectButton.tsx', 'PROGRAM_PARTS · PROGRAM_PART_SIGNAGE_DETAILS · SEED_SIGNAGE_TYPES', '파트 다중 선택 → 환경장식물 자동 INSERT'],
  [2, '사용자 = AI 추천 입력', '/projects/new/case-a', 'app/(dashboard)/projects/new/case-a/page.tsx', 'PROGRAM_PART_SIGNAGE_DETAILS · SEED_SIGNAGE_TYPES · venueIntel.normalizeVenueName', '행사장·파트·도면 입력 → /api/recommend'],
  [3, 'API = 추천 호출', '/api/recommend → recommendSignage()', 'lib/ai/recommendSignage.ts', 'SYSTEM_INSTRUCTION (12 카테고리 enum) · PROGRAM_PART_SIGNAGE_HINTS · DETAILS', 'Gemini 2.5 Flash REST 호출·responseSchema'],
  [4, '컨텍스트 영역 누적', 'recommendSignage 내부', 'lib/ai/accumulatedContext.ts · venueProfile.ts · adminMasterContext.ts', 'event_history DB · signage_types DB · venues.facility_guide_json', '학습 관리자 영역 데이터 영역 자동 주입'],
  [5, '시설 가이드 영역', 'getFacilityGuideAsync(venue)', 'lib/data/venueFacilityGuide.ts', 'VENUE_FACILITY_GUIDE_SEED 15+ 행사장', '시설 가이드 미등록 영역 = buildDefaultConventionGuide fallback'],
  [6, '동의어 변환', 'resolveCategoryName(category)', 'lib/data/dashboardSeed.ts (SEED_SYNONYMS) + signage_aliases DB', '70+ 동의어 매핑 → 12 카테고리 표준명', '실제 발주 표기 → 표준명 자동 변환'],
  [7, '학습 관리자 표시', '/admin/learning', 'app/(dashboard)/admin/learning/page.tsx · LearningManagerClient.tsx', 'unifiedEventHistory = SEED + DB + userEventHistory + customEvents', '7 메뉴: 행사장 학습 현황·행사장 관리·프로그램 파트·행사 관리·환경장식물·동의어·시설 가이드'],
  [8, '편집 창', '/projects/[id]', 'app/(dashboard)/projects/[id]/EditorLayout.tsx · EditorGrid.tsx', 'DEFAULT_COLS (20컬럼·사용 목적 제거·발주 담당자 hidden)', '엑셀·PPT 다운로드 영역'],
  [9, '엑셀·PPT 출력', 'ExportService.exportToExcelDynamic/exportToPPT', 'lib/services/ExportService.ts', '21컬럼 동적·날짜 자동 (OrderingSchedule)', 'finalized_at 자동 영역·event_history 자동 적재'],
  [10, '시설 가이드 패널', 'FacilityGuidePanel', 'app/components/facility/FacilityGuidePanel.tsx', 'install_allowed · warnings · rigging · safety · digital_signage · special_notes', 'admin = 6 영역 모두 직접 편집 (5/22 신규)'],
]
const flowWs = XLSX.utils.aoa_to_sheet(flowRows)
flowWs['!cols'] = [{wch: 4}, {wch: 22}, {wch: 32}, {wch: 50}, {wch: 60}, {wch: 50}]
XLSX.utils.book_append_sheet(wb, flowWs, '1. 데이터 흐름')

// ── Sheet 2: 파일 인덱스 ─────────────────────────────────
const fileRows = [
  ['영역', '파일 경로', '역할', 'SOT 영역'],
  ['파트', 'lib/programParts.ts', 'PROGRAM_PARTS 12·PROGRAM_PART_SIGNAGE_HINTS·DETAILS', '5/22 엑셀 SOT'],
  ['환경장식물', 'lib/data/dashboardSeed.ts', 'SEED_SIGNAGE_TYPES 12·SEED_SYNONYMS 70+', '5/22 엑셀 SOT'],
  ['v3 카테고리', 'lib/data/v3/signageCategoriesSeedV3.ts', 'SIGNAGE_CATEGORIES_V3 12 영역 (legacy 12 → 신규 12)', '5/22 엑셀 SOT'],
  ['행사 SEED', 'lib/data/dashboardSeed.ts', 'SEED_EVENT_HISTORY 44건 (5/22 1차 살)', '사용자 영역 제공'],
  ['시설 가이드', 'lib/data/venueFacilityGuide.ts', 'VENUE_FACILITY_GUIDE_SEED 15+ 행사장', '코엑스·킨텍스·송도·ICC 제주·DDP·롯데호텔·평창 등'],
  ['행사장 마스터', 'lib/venueIntel.ts', 'VENUE_LIST 25+·VENUE_HALLS 25+·normalizeVenueName', '노션 §9 정합 (5/21)'],
  ['표준 분류', 'lib/data/signageCategoryStandards.ts', 'StandardCategoryKey·STANDARD_CATEGORIES (12 + legacy 6)', '5/22 정합'],
  ['AI 추천', 'lib/ai/recommendSignage.ts', 'SYSTEM_INSTRUCTION·buildSystemInstruction·Gemini REST', 'GEMINI_API_KEY .env.local'],
  ['AI 컨텍스트', 'lib/ai/accumulatedContext.ts', 'buildSeedEventHistoryContext (DB + SEED 통합)', 'event_history DB SSR'],
  ['AI 행사장', 'lib/ai/venueProfile.ts', 'buildVenueProfile (venues + 시설 가이드 + facility_exception_log)', 'venue 매칭 영역'],
  ['v3 추천 로직', 'lib/ai/v3/recommendationLogicV3.ts', 'PROGRAM_PART_RECOMMENDATION 12 파트', '5/22 엑셀 SOT 정합'],
  ['학습 관리자', 'app/(dashboard)/admin/learning/LearningManagerClient.tsx', '7 메뉴·통합 관리표·3 댑스 영역', 'unifiedEventHistory = SEED + DB + user + custom'],
  ['학습 관리자 페이지', 'app/(dashboard)/admin/learning/page.tsx', 'SSR fetch: venues·venue_requests·learning_jobs·projects·design_items·signage_aliases·event_history', 'isAdmin 가드'],
  ['시설 가이드 패널', 'app/components/facility/FacilityGuidePanel.tsx', '6 영역 모두 직접 편집 (5/22 신규)', 'PATCH /api/admin/venues/<id>'],
  ['엑셀·PPT 출력', 'lib/services/ExportService.ts', 'DEFAULT_ORDER 20컬럼·purpose 제거·날짜 자동', '21컬럼 → 20컬럼 (사용 목적 삭제)'],
  ['편집 그리드', 'app/(dashboard)/projects/[id]/components/EditorGrid.tsx', 'DEFAULT_COLS 20·DEFAULT_HIDDEN_COLS (발주 담당자 추가)', '비고(직접 입력) → 내용 (5/22)'],
  ['프로젝트 정보', 'app/(dashboard)/projects/[id]/info/ProjectInfoClient.tsx', '파트 추가/제거 알랏·design_items INSERT/DELETE', '뒤로 = 편집 창 (5/22)'],
  ['신규 프로젝트', 'app/(dashboard)/dashboard/components/NewProjectButton.tsx', '3단계 위자드·DETAILS 영역 표시', '파트 다중 선택'],
  ['API event_history', 'app/api/event-history/route.ts', 'GET·POST·PATCH·DELETE', 'silent fail fallback (42P01·42501)'],
  ['DB 마이그레이션', 'supabase/migration_v13_event_history.sql', 'event_history 테이블 신규', '5/22 영역 영역 영역'],
  ['DB SEED', 'supabase/seed_event_history.sql', '44건 INSERT (1차 살)', '사용자 영역 Supabase Studio 실행'],
  ['DB 신규 5건', 'supabase/seed_signage_types_v22.sql', 'signage_types 5건 INSERT (5/22 신규)', '사용자 영역 실행 의무'],
  ['DB 동의어', 'supabase/seed_synonyms_v22.sql', 'signage_aliases 20+ INSERT (5/22 정합)', '사용자 영역 실행 의무'],
]
const fileWs = XLSX.utils.aoa_to_sheet(fileRows)
fileWs['!cols'] = [{wch: 18}, {wch: 60}, {wch: 60}, {wch: 50}]
XLSX.utils.book_append_sheet(wb, fileWs, '2. 파일 인덱스')

// ── Sheet 3: PROGRAM_PARTS 12 영역 ──────────────────────
const partsRows = [
  ['코드', '파트명', '그룹', 'hint', '권장 환경장식물 (HINTS)', '역할 (DETAILS purposes)'],
  ['40.04', '회의', 'program', '컨퍼런스·세미나·포럼·심포지엄', 'podium·vertical_banner·horizontal_banner', '포디움 [개회식·세션·토론·시상식] / 세로현수막 [무대 배경·세션장 입구·회의장 내부] / 가로현수막 [무대 배경·세션장 입구·회의장 내부]'],
  ['40.05', '전시', 'program', '부스 전시·기업관·테마관', 'x_banner·route_banner·chunchen_banner', 'X배너 [전시존 안내·참가기업 안내·체험존 안내·프로그램 안내·QR 코드 안내] / 동선 안내 배너 [입구 유도·출구 유도·층별 이동] / 천장 배너 [구역 표시·메인 동선 표시]'],
  ['40.06', '비즈니스 매칭', 'program', '1:1 미팅·바이어 매칭', 'x_banner', 'X배너 [매칭존 안내·상담 절차 안내·대기 안내]'],
  ['40.07', '비즈니스 프로그램', 'program', '정책 발표·기업 IR', 'x_banner·route_banner·podium·award_board', 'X배너·동선 안내 배너·포디움(폼포드 출력)·시상보드(폼포드 출력)'],
  ['40.08', '공식행사', 'program', '개막식·폐막식·MOU·시상', 'podium·award_board·x_banner·horizontal_banner·vertical_banner·chunchen_banner', '포디움 [개회식·환영사·축사·시상식·토론] / 시상보드(폼포드 출력) / X배너 [프로그램 안내] / 가로현수막 [무대 배경·행사장 입구·무대 측면·입구/로비] / 세로현수막 [무대 배경·행사장 입구·무대 측면·입구/로비] / 통천 [무대 측면]'],
  ['40.09', '부대행사 - 공모전형', 'program', '경진대회·아이디어 공모', 'award_board·x_banner·podium·horizontal_banner·vertical_banner', '시상보드 / X배너 [공모전 안내·시상식 안내] / 포디움(폼포드 출력) / 가로현수막 [시상식 무대] / 세로현수막'],
  ['40.10', '부대행사 - 체험형', 'program', '체험존·VR·시연', 'horizontal_banner·vertical_banner·x_banner', '가로현수막·세로현수막·X배너'],
  ['40.11', '부대행사 - 투어형', 'program', '시찰·산업 투어·문화 체험', 'horizontal_banner·q_room', '가로현수막 [사진용] / Q방'],
  ['40.17', '홍보', 'promotion', '옥외 광고·외부 사인·SNS 콘텐츠', 'x_banner·streetlight_banner', 'X배너 [유관기관 오프라인 홍보 진행 시] / 가로등 배너 [행사 홍보·장소 유도·외부 홍보·게시 일자 고려]'],
  ['40.19', '등록', 'attendee', '현장 등록 데스크·체크인', 'x_banner·route_banner·horizontal_banner', 'X배너 [입장 확인 QR 배너·프로그램 안내 배너] / 동선 안내 배너 / 가로현수막 [야외용인 경우]'],
  ['40.20', '영접영송', 'attendee', '입퇴장 안내·동선 사인', 'picket_board', '피켓보드 [입출국 일자 고려하여 발주 필요]'],
  ['40.21', '기타 조성', 'other', '로비·외벽·입구 등 부대시설·외부 홍보', 'streetlight_banner·x_banner·digital_signage·foam_board·horizontal_banner·vertical_banner·chunchen_banner', '빵빠레 배너 / X배너+디지털 사이니지+폼보드 [부대시설 장소 안내 (PCO사무국·발주처 사무국)] / 가로현수막 [외부·입구 홍보] / 세로현수막 [외부·입구 홍보] / 통천 [외벽·로비 홍보]'],
]
const partsWs = XLSX.utils.aoa_to_sheet(partsRows)
partsWs['!cols'] = [{wch: 8}, {wch: 22}, {wch: 12}, {wch: 28}, {wch: 50}, {wch: 100}]
XLSX.utils.book_append_sheet(wb, partsWs, '3. 프로그램 파트 12')

// ── Sheet 4: SIGNAGE_TYPES 12 카테고리 ──────────────────
const typeRows = [
  ['id', '이름', '기본 너비 (mm)', '기본 높이 (mm)', '기본 재질', '분류', '레이아웃', '비고'],
  ['x_banner',           'X배너',           600,  1800, 'PET',       '입구·등록',    '세로', '자체 스탠드'],
  ['streetlight_banner', '가로등 배너',     600,  1800, '현수막',    '외부 동선',    '세로', '폴 클램프'],
  ['horizontal_banner',  '가로 현수막',     5000, 900,  '현수막',    '메인·외벽',    '가로', '외벽 부착'],
  ['vertical_banner',    '세로 현수막',     900,  5000, '현수막',    '로비·천장',    '세로', '기둥·난간·계단'],
  ['chunchen_banner',    '통천 배너',       1000, 5000, '현수막',    '천장 대형',    '세로', '5/22 = 통천 → 통천 배너'],
  ['podium',             '포디움 타이틀',   600,  200,  '스티커',    '연단',         '가로', '연단 전면 폼보드'],
  ['route_banner',       '동선 안내 배너',  600,  1500, '현수막',    '실내 동선',    '세로', '5/22 = 동선 배너 → 동선 안내 배너'],
  ['award_board',        '시상보드',        1200, 1800, '폼보드 5T', '시상·공식행사', '세로', '5/22 신규 (엑셀 SOT)'],
  ['q_room',             'Q방',             600,  1800, '폼보드',    '등록·안내',    '세로', '5/22 신규 (엑셀 SOT)'],
  ['digital_signage',    '디지털 사이니지', 1080, 1920, 'LED',       '디지털·전광판','세로', '5/22 신규 (엑셀 SOT)'],
  ['foam_board',         '폼보드',          600,  900,  '폼보드 5T', '부대시설 안내','세로', '5/22 신규 (엑셀 SOT)'],
  ['picket_board',       '피켓보드',        300,  450,  '폼보드 3T', '영접영송',     '세로', '5/22 신규 (엑셀 SOT)'],
]
const typeWs = XLSX.utils.aoa_to_sheet(typeRows)
typeWs['!cols'] = [{wch: 18}, {wch: 16}, {wch: 12}, {wch: 12}, {wch: 12}, {wch: 14}, {wch: 8}, {wch: 30}]
XLSX.utils.book_append_sheet(wb, typeWs, '4. 환경장식물 12')

// ── Sheet 5: 동의어 매핑 (주요) ─────────────────────────────
const synonymRows = [
  ['별칭 (alias)', '표준명 (canonical)', '비고'],
  ['스프링배너·롤업배너·배너스탠드·물통배너·A배너·기타 배너', 'X배너', '거치대·재질 변형'],
  ['빵빠레배너·폴대·폴배너', '가로등 배너', '외부 동선용'],
  ['MOU 현수막·MOU·투어용 현수막·상단 배너·실사출력', '가로 현수막', '재질 기반 통칭'],
  ['드롭배너·난간배너·세로배너', '세로 현수막', '천장·기둥 부착'],
  ['천장배너·천정배너·통천현수막·통천배너·행잉 배너·출입구 천정 배너', '통천 배너', '천장 매다는 대형'],
  ['연단·포디움 1·포디움 2·1인용 포디움·개막식 포디움', '포디움 타이틀', '연단 단상'],
  ['유도사인·동선안내·화살표·방향 안내·동선 배너', '동선 안내 배너', '실내 유도'],
  ['기념촬영보드·포토월', '시상보드', '5/22 = 시상보드 = 독립 카테고리 (이전 A3 가로)'],
  ['큐방·큐방시트·셔틀버스 큐방시트·Q룸', 'Q방', '5/22 = Q방 = 독립 (이전 A4 가로)'],
  ['DID·LED 사이니지·전광판·디지털사이니지', '디지털 사이니지', '5/22 신규'],
  ['폼포드·안내폼보드·컨설팅폼보드·좌석배치도 안내사인·웰컴보드·L보드·안내사인·A4안내·A3안내·A3안내POP·스탠드POP', '폼보드', '5/22 = 폼보드 = 독립 (이전 A4·A3·I배너)'],
  ['영접피켓·입출국피켓·피켓 A4·피켓A4·피켓 A3·피켓A3·영접A4·명패·웰컴 피켓·명패(대)', '피켓보드', '5/22 = 피켓보드 = 독립 (이전 A4·A3 가로)'],
]
const synWs = XLSX.utils.aoa_to_sheet(synonymRows)
synWs['!cols'] = [{wch: 80}, {wch: 16}, {wch: 50}]
XLSX.utils.book_append_sheet(wb, synWs, '5. 동의어 매핑')

// ── Sheet 6: SEED_EVENT_HISTORY 영역 (44건) ──────────────────
// dashboardSeed.ts 영역 영역 영역 영역 = 직접 추출 영역
const eventRows = [
  ['project_name', 'project_code', 'year', 'venue', 'category_tag', 'has_excel', 'has_image', 'analyzed_item_count', 'program_parts', 'signage_breakdown 영역 영역', '비고'],
  ['2018 스마트국토엑스포', '183080', 2018, '코엑스 D2·컨퍼런스룸', '일반', true, true, 41, '40.05·40.04·40.19·40.18', '4건 (코엑스 D2·컨퍼런스룸·개막식장·인터컨티넨탈)', '실제 발주 영역 영역'],
  ['2019 스마트국토엑스포', '193700', 2019, '코엑스', '일반', true, true, '', '40.05·40.04·40.19·40.18', '미정', ''],
  ['공정경제 전략회의', '182090', 2018, '코엑스', '일반', true, true, '', '40.04·40.08·40.18', '미정', ''],
  ['제33차 아시아광고대회 (AdAsia 2023 Seoul)', '231004', 2023, '코엑스 그랜드볼룸·아셈볼룸·오디토리움', '일반', true, true, '', '40.04·40.08·40.18·40.19', '미정', ''],
  ['제6회 월드 스마트시티 엑스포 (WSCE 2022)', '222020', 2022, '킨텍스 제1전시장 3·4·5홀', '핵심', true, true, '', '40.05·40.04·40.19·40.18', '미정', '핵심 영역'],
  ['APEC 중소기업 장관회의', '251004', 2025, 'ICC JEJU 및 인근호텔', '일반', true, true, '', '40.04·40.08·40.18·40.19', '미정', ''],
  ['2022 제주 IUCN리더스포럼', '223060', 2022, '제주국제컨벤션센터 (ICC JEJU)', '일반', true, true, '', '40.04·40.08·40.18', '미정', ''],
  ['제2회 세계리더스보전포럼', '183060', 2018, '제주국제컨벤션센터 (ICC JEJU)', '일반', true, true, 33, '40.04·40.08·40.18·40.19', '5건 (참가자안내·안내·전문가세션·VIP 의전·프레스 센터)', ''],
  ['제17차 한-중앙아 협력 포럼', '241014', 2024, '롯데호텔 서울', '일반', true, true, '', '40.04·40.18·40.19', '미정', ''],
  ['환경 협력 네트워크 구축 주한공관장 초청 간담회', '252016', 2025, '롯데호텔 서울', '일반', true, true, '', '40.04·40.18', '미정', ''],
  ['제16차 한·베트남 환경장관회의', '241011', 2024, '웨스틴 조선 서울 라일락+튤립', '일반', true, true, '', '40.04·40.08·40.18', '미정', ''],
  ['2025년 APEC 경제행사 대행 용역', '251014', 2025, '경주', '일반', true, true, '', '40.04·40.08·40.18·40.11', '미정', ''],
  ['제100주년 3.1절 중앙기념식', '192000', 2019, '광화문 광장·세종로공원', '일반', true, true, 52, '40.08·40.18·40.19', '3건 (행사장·야외·실내)', ''],
  ['농식품 청년해외개척단 8기 발대식', '191600', 2019, '서울스퀘어', '일반', true, true, '', '40.08·40.18', '미정', ''],
  ['2020 평창평화포럼', '193960', 2020, '평창 알펜시아', '핵심', true, true, 251, '40.04·40.18·40.19', '6건 (세로현수막 174·X배너 30·가로현수막 15·통천현수막 7·큐방 7·포디움 5)', '핵심 영역'],
  ['한일 우정상 수여식 행사', '193600', 2019, '미분류', '미분류', true, true, '', '40.08·40.18', '미정', ''],
  ['그 외 28건 (총 44건)', '', '', '', '', '', '', '', '', '', 'dashboardSeed.ts SEED_EVENT_HISTORY 영역 영역 영역'],
]
const evWs = XLSX.utils.aoa_to_sheet(eventRows)
evWs['!cols'] = [{wch: 45}, {wch: 12}, {wch: 6}, {wch: 30}, {wch: 8}, {wch: 8}, {wch: 8}, {wch: 12}, {wch: 30}, {wch: 60}, {wch: 30}]
XLSX.utils.book_append_sheet(wb, evWs, '6. 행사 SEED (1차 살)')

// ── Sheet 7: VENUE_FACILITY_GUIDE 영역 ──────────────────────
const guideRows = [
  ['venue_key', 'venue_name', '설치 가능 카테고리', '주의사항', '리깅', '비고'],
  ['kintex_1_hall_5', '킨텍스 제1전시장 5홀', 'X배너·가로현수막 외벽(7600×2000)·가로현수막 기둥(max 1200×600)·세로현수막 가로등(600×1800)·통천 외벽 max 24m×17m·통천 구름다리(3000×1500)·천정배너 행잉 (그리드 좌표 확인 필수)·포디움 600×200', '리깅 좌표 확인 필수·하중 50kg/조 (확인 의무)', '가능 (그리드 위치 좌표 = 운영팀 직접 확인)', '킨텍스 매뉴얼 §3·WSCE 2021·2022'],
  ['kintex_1_hall_1_to_4', '킨텍스 제1전시장 1~4홀', 'X배너·가로현수막 외벽(max 8000×2000)·세로현수막 가로등(600×1800)·포디움 600×200', '확인 필요', '확인 필요', ''],
  ['kintex_2_hall', '킨텍스 제2전시장', 'X배너·가로현수막 외벽(8000×5000)·세로현수막·포디움', '높이 2.5배 (1전시장 대비)', '확인 필요', '높이 영역 1전시장 영역 차이 영역 영역 영역 영역'],
  ['coex_grandballroom', '코엑스 그랜드볼룸', 'X배너·가로현수막(max 4000×1200)·아셈볼룸 영역 영역·포디움 600×200', '코엑스 영업팀 사전 협의', '가능 (코엑스 지정 리거)', ''],
  ['coex_asembballroom', '코엑스 아셈볼룸', 'X배너·가로현수막(max 3000×1000)·포디움 600×200', '확인 필요', '가능', ''],
  ['songdo_convensia', '송도컨벤시아', 'X배너·세로현수막 폴대(600×1800)·로비 max 3000×1200·포디움', '운영팀 협의', '가능', ''],
  ['icc_jeju', 'ICC 제주', 'X배너·세로현수막(600×1800)·포디움 600×200', '제주 영업팀 사전 협의', '확인 필요', ''],
  ['ddp_arthall_1', 'DDP 아트홀1', 'X배너·포디움 600×200', 'DDP 운영팀 영역', '확인 필요', ''],
  ['lotte_seoul', '롯데호텔 서울', '기본 컨벤션 가이드', '호텔 영업팀 사전 협의 의무', '확인 필요', '시설 가이드 영역 영역 = 운영팀 영역'],
  ['grand_hyatt', '그랜드 하얏트 서울', '기본 컨벤션 가이드', '호텔 영업팀 영역', '확인 필요', ''],
  ['westin_chosun', '웨스틴 조선 서울', '기본 컨벤션 가이드', '호텔 영업팀 영역', '확인 필요', ''],
  ['the_plaza', '더플라자', '기본 컨벤션 가이드', '호텔 영업팀 영역', '확인 필요', ''],
  ['kdj_convention', '광화문 광장 / 김대중컨벤션센터', 'X배너·가로현수막·세로현수막·포디움', '광주광역시 영역 영역', '확인 필요', ''],
  ['at_center', 'aT센터', '기본 컨벤션 가이드', '운영팀 영역', '확인 필요', ''],
  ['pyeongchang_alpensia', '평창 알펜시아', 'X배너·세로현수막·가로등·통천·포디움', '리조트 영업팀 D-30 협의·동절기 동결 대비', '확인 필요', '5/22 신규 영역'],
  ['default_convention', '미등록 행사장 fallback', 'X배너·세로현수막·가로현수막(협의)·통천(협의)·천정배너(협의)·포디움·A4·A3 POP', '운영팀 사전 협의 의무', '가능 (운영팀 도면)', '5/22 buildDefaultConventionGuide 영역 fallback'],
]
const guideWs = XLSX.utils.aoa_to_sheet(guideRows)
guideWs['!cols'] = [{wch: 24}, {wch: 28}, {wch: 100}, {wch: 50}, {wch: 30}, {wch: 40}]
XLSX.utils.book_append_sheet(wb, guideWs, '7. 시설 가이드 (15+)')

// ── Sheet 8: AI 추천 로직 영역 ───────────────────────
const logicRows = [
  ['#', '영역', '로직', '입력', '출력', '비고'],
  [1, '1순위 = 프로그램 파트 매핑', 'recommendSignage = programPartsBlock 영역 (PROGRAM_PART_SIGNAGE_DETAILS)', '사용자 선택 파트 (40.04 등 다중)', '파트별 권장 환경장식물 + 역할(purposes) 영역 1순위 후보', '엑셀 SOT 정합·signage + purposes 묶음'],
  [2, '2순위 = 시설 가이드 제약', 'getFacilityGuideAsync(venue) + resolveCoverageForVenue', '행사장명', '설치 가능/불가/조건부 카테고리 + 미등록 영역 fallback', 'denied 카테고리 = 자동 제외'],
  [3, '3순위 = 표준 수량 산정', 'getVenueSpecs(venue) + venueProfile 영역', '행사장 + 참가자 + 천장고 + 부스 + 출입구', '면적·참가자 기준 quantity', '학습 데이터 부재 시 quantity=0 + no_data_flag=true'],
  [4, '[보강] = 도면 Vision', 'analyzeFloorPlan(imageUrl) - Gemini 2.5 Vision', '행사장 배치도 이미지', '동선·설치 위치 컨텍스트', 'optional·도면 첨부 시만'],
  [5, '컨텍스트 누적', 'buildSeedEventHistoryContext + buildAccumulatedContext + buildVenueProfile + buildAdminMasterContext', 'event_history DB + SEED + 사용자 프로젝트 + venues.facility_guide_json', '학습 관리자 영역 SOT 통합', '사용자 명시 = 학습 관리자 = AI 입력'],
  [6, '동의어 자동 변환', 'resolveCategoryName(category) = signage_aliases + SEED_SYNONYMS', '비표준 명칭 (예: 큐방·기념촬영보드)', '표준명 (Q방·시상보드)', '70+ 동의어 매핑'],
  [7, '후처리 검증', 'classifyCategory(category_label) + standard_category 영역 강제', 'Gemini 응답 items', '12 카테고리 enum 영역 강제·미학습 영역 no_data_flag', 'NIST AI RMF Manage'],
  [8, '학습 누적', '/api/event-history POST (NewProjectButton·ProjectCard 영역)', '신규 프로젝트 영역 = event_history INSERT (auto_project)·완료 영역 = UPSERT', '2차 살 = DB 영역 자동 누적', '향후 = item_edit_log 영역 정확도 측정 (migration_v16)'],
]
const logicWs = XLSX.utils.aoa_to_sheet(logicRows)
logicWs['!cols'] = [{wch: 4}, {wch: 24}, {wch: 60}, {wch: 50}, {wch: 60}, {wch: 50}]
XLSX.utils.book_append_sheet(wb, logicWs, '8. AI 추천 로직')

// ── Sheet 9: 학습 관리자 7 메뉴 ──────────────────────
const adminRows = [
  ['메뉴', '경로', '데이터 영역', '주요 표시', '편집 가능 영역'],
  ['행사장 학습 현황', '/admin/learning (venue-status)', 'unifiedEventHistory + venueAggregateByName', 'L1 행사장 그룹 → L2 휘하 홀 (그랜드볼룸·아셈볼룸 등) + AI 추천 정확도 + 환경장식물 종류 + 프로그램 파트', '읽기 전용 (집계)'],
  ['행사장 관리', '/admin/learning (venues)', 'venues + unifiedEventHistory venue 자동 보강', 'L1 그룹·L2 휘하 홀 + ▽ 펼침 = 환경장식물 사용 확률·평균·가장 많이 사용 규격', '✎ venue 정보 편집'],
  ['프로그램 파트 관리', '/admin/learning (program-parts)', 'PROGRAM_PARTS + customProgramParts + programPartOverrides', '12 파트 ▶ 펼침 = 환경장식물 평균 수량 + 사용된 행사', '✎ 편집·✕ 삭제·+ 추가 (localStorage 오버라이드)'],
  ['행사 관리', '/admin/learning (events)', 'unifiedEventHistory = SEED + DB + user + custom', '5대 영역 (행사명·행사장·연도·파트·수량) + signage_breakdown ▶ 펼침', '✎ 편집·✕ 삭제·+ 추가'],
  ['환경장식물 관리', '/admin/learning (signage-types)', 'signage_types DB + SEED_SIGNAGE_TYPES (12 카테고리)', '12 영역 + sample_image_url 업로드', '✎ 편집·✕ 삭제·+ 추가 + sample_image_url'],
  ['동의어 매핑', '/admin/learning (synonyms-mapping)', 'signage_aliases DB + SEED_SYNONYMS', '70+ 동의어 → 12 표준명 매핑', '✎ 편집·✕ 삭제·+ 추가'],
  ['시설 가이드', '/admin/learning (facility-guides)', 'VENUE_FACILITY_GUIDE_SEED + venues.facility_guide_json', 'L1 그룹·L2 휘하 홀 + 가이드 보기 (FacilityGuidePanel 6 영역 모두 편집)', '✎ 편집·정보 채움 (6/6) 시각화·행사장 규칙 추가 요청 (사용자 요청 시만 표시)'],
]
const adminWs = XLSX.utils.aoa_to_sheet(adminRows)
adminWs['!cols'] = [{wch: 18}, {wch: 36}, {wch: 60}, {wch: 80}, {wch: 60}]
XLSX.utils.book_append_sheet(wb, adminWs, '9. 학습 관리자 7 메뉴')

// ── Sheet 10: 아키텍처 영역 (뼈대·1차·2차·3차 살) ─────
const archRows = [
  ['층위', '영역', '내용', '파일·테이블', '상태'],
  ['뼈대', 'PROGRAM_PARTS · PROGRAM_PART_SIGNAGE_DETAILS · SEED_SIGNAGE_TYPES · SIGNAGE_CATEGORIES_V3', '엑셀 SOT 영역 = 파트 12 × 환경장식물 12 × 역할(상세 구분) 영역 묶음', 'lib/programParts.ts · lib/data/dashboardSeed.ts · lib/data/v3/signageCategoriesSeedV3.ts', '✅ 5/22 정합'],
  ['1차 살', 'SEED_EVENT_HISTORY 44건 + SEED_SYNONYMS 70+', '사용자 영역 = 과거 행사 영역 실 데이터 영역', 'lib/data/dashboardSeed.ts · supabase/seed_event_history.sql · seed_signage_types_v22.sql · seed_synonyms_v22.sql', '✅ 코드 영역·DB 영역 = 사용자 영역 Supabase Studio 실행 의무'],
  ['2차 살', 'event_history DB + userEventHistory + customEvents + venues.facility_guide_json', '신규 프로젝트 영역 자동 누적 · 실 사용 데이터 영역', 'app/api/event-history/route.ts · NewProjectButton · ProjectCard · LearningManagerClient unifiedEventHistory', '✅ 자동 누적 영역 작동'],
  ['3차 살', 'item_edit_log + ai_accuracy_score (migration_v16)', 'AI 추천 vs 사용자 수정 영역 = 정확도 정확 측정', 'supabase/migration_v16_accuracy_tracking.sql', '⏸️ DB 마이그레이션 영역 (사용자 영역 실행 의무)'],
]
const archWs = XLSX.utils.aoa_to_sheet(archRows)
archWs['!cols'] = [{wch: 10}, {wch: 50}, {wch: 60}, {wch: 60}, {wch: 30}]
XLSX.utils.book_append_sheet(wb, archWs, '10. 아키텍처 영역')

// 저장
const outDir = path.dirname(OUT_PATH)
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })
XLSX.writeFile(wb, OUT_PATH)
console.log('✓ 자료조사 종합 엑셀 영역 작성 완료')
console.log('  → ' + OUT_PATH)
console.log('  → 10 시트 영역 (데이터 흐름·파일 인덱스·파트 12·환경장식물 12·동의어·SEED 16건+·시설 가이드 15+·AI 추천 로직·학습 관리자 7 메뉴·아키텍처)')
