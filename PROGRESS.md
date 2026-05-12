# 작업 이력

## 2026-05-12 (v9.17) — 천정배너 시드 데이터 + AI 프롬프트 주입

### 핵심 변경 (goals/current.md 즉시 작업 ① — 천정배너 카테고리 시드 데이터 확보)

#### 1. 천정배너 패턴 시드 신설 (dashboardSeed.ts)
- `CeilingBannerItem` / `CeilingBannerPattern` 인터페이스 추가
- `SEED_CEILING_BANNER_PATTERNS` 상수 추가
  - 킨텍스 제1전시장 5홀 / 2022 스마트국토엑스포 실측
    - 전시장 메인 천장: 7개 × 5500×4000mm
    - 비즈니스 라운지 천장: 1개 × 3500×3000mm
    - 컨퍼런스장 천장: 2개 × 3500×3000mm
  - (TODO 마킹) 코엑스·송도·ICC 등 추가 행사장 보강 예정
- `findCeilingBannerContext(venue)` 함수 추가
  - 행사장명 fuzzy 매칭 (공백 제거, 부분 일치)
  - 매칭 시 "[천정배너 설치 패턴]" 블록 문자열 반환

#### 2. AI 프롬프트 자동 주입 (recommendSignage.ts)
- `findCeilingBannerContext` import 추가
- `ceilingBannerBlock` 계산 후 `userText` 마지막에 연결
- SYSTEM_INSTRUCTION에 천정배너 추천 원칙 4개 항목 추가
  - 학습 데이터 있을 때 우선 참고 (수량 임의 축소 금지)
  - 컨벤션센터 + 전시회 → 천정배너 포함 검토
  - 학습 데이터 없으면 "[추천 없음 - 리깅 확인]" 비고 표기
  - mega 규모 전시홀 기준값 (5~10개)

### 효과
- 2022 스마트국토엑스포 시험에서 누락됐던 천정배너 10개를 AI가 인지하게 됨
- 같은 행사장(킨텍스 5홀)에서 동일 유형 행사 추천 시 수량 정확도 -20% → 목표 ±10%

### 검증
- TSC 0 에러 / Next 빌드 21/21 라우트 통과

## 2026-05-12 (v9.16) — 제작 완료 시 정보 취합 + 예외 패턴 학습

### 핵심 변경 (사용자 요청: "완료 데이터가 더 중요한 정보")

#### 1. PPT 다운로드도 finalized_at 설정 (ExportService.ts)
- 기존: `export_excel` 시에만 `finalized_at = now()` 설정
- 변경: `export_pptx` 시에도 동일하게 적용 — "PPT·엑셀 모두 제작 완료"

#### 2. 알랏 무시+완료 케이스를 누적 학습에 포함 (accumulatedContext.ts)
- `ExceptionPattern` 타입 신설 (rule/field/standard_value/user_value/count/finalized_count)
- `AccumulatedContext.exception_patterns[]` 필드 추가
- `buildAccumulatedContext()`: venue 매칭 프로젝트의 `facility_exception_log` 조회 + rule 기준 집계
- `formatAccumulatedContext()`: Gemini 프롬프트에 "[시설 가이드 예외 패턴]" 블록 추가
  → "완료 데이터 > 시설 가이드 규칙"을 AI가 인지하도록 명시 주입

#### 3. 예외 빈도 모니터 API (app/api/admin/exception-monitor/route.ts)
- venue+rule 기준 exception_log 집계
- `finalized_count` (실제 완료된 건수) 추가 산출
- `needs_review: true` if count >= 3 (가이드 데이터 검토 필요 플래그)
- Admin만 접근 가능

#### 4. 학습 관리자 UI — 예외 패턴 테이블 (LearningManagerClient.tsx)
- "시설 가이드" 섹션에 "가이드 예외 패턴" 테이블 추가
- 3회 이상: 황색 하이라이트 + "가이드 검토 필요" 배지
- 완료 건수(finalized_count) 별도 컬럼 표시

#### 5. Migration (migration_v9_16_exception_learning.sql)
- Admin SELECT policy 보강 (전체 exception_log 집계 가능하도록)
- 인덱스 추가: `design_items(project_id, finalized_at)` + `facility_exception_log(venue, rule)`

#### 신뢰도 계층 확정 (decisions.md 추가)
- 제작 완료(100%) > 컨펌(70%) > 중간(30%) > 시설 가이드 매뉴얼

### 검증
- TSC 0 에러 / Next 빌드 21/21 라우트 통과

### PM 후속 액션
1. Supabase Studio에서 `migration_v9_16_exception_learning.sql` 실행
2. `/admin/learning` → "시설 가이드" 섹션에서 예외 패턴 확인

## 2026-05-12 (v9.15) — 시설 가이드 규격 알림 강화 + UI 수정 요청 기능

### 팝업 투명도 버그 수정
- `OrderingSchedule.tsx`: 버튼 indigo 테마 / 팝업 `border-2 border-indigo-200 shadow-2xl z-[300]`
- `FacilityCheckModeToggle.tsx`: 버튼 amber 테마 / 팝업 동일 z-index 보강
- 툴바 배지: 행사 날짜가 아닌 "가장 임박한 미래 일정" 자동 표시

### venueFacilityGuide.ts 전면 보강 (v9.15 — 자체 완결 가이드)
- 킨텍스 5홀·1~4홀·2전시장 / 코엑스 / 송도컨벤시아 / ICC 제주 / DDP 6개 행사장 완성
- "조건부 + 매뉴얼 확인" → 구체적 규격·연락처·D-N 타임라인·주의 특이사항으로 전면 교체
- 이 파일만 보고 발주서 작성 가능한 수준 목표 달성

### 시설 가이드 기반 알림 로직 강화 (facilityValidator.ts)
- 기존: 카테고리 허용 여부 + 리깅 불가만 검증
- 추가 ①: `max_width_mm` / `max_height_mm` 초과 시 `warn` 알림 (예: 코엑스 그랜드볼룸 최대 4,000×1,200mm)
- 추가 ②: `standard_width_mm` / `standard_height_mm` 대비 ±100mm 초과 시 `info` 알림 (비표준 승인 안내)

### 타입 확장 (types.ts)
- `VenueFacilityGuide.install_allowed` 항목에 `max_width_mm?`, `max_height_mm?`, `standard_width_mm?`, `standard_height_mm?` 필드 추가

### venueFacilityGuide.ts 구조화 규격 데이터 추가
- 킨텍스 5홀: 외벽 7600×2000 표준 / 내부 기둥 max 1200×600 / 가로등배너·물통배너 600×1800 표준 / 포디움 600×200
- 킨텍스 1~4홀: 외벽 max 8000×2000 / 가로등배너 600×1800 / 포디움 600×200
- 킨텍스 2전시장: 외벽 8000×5000 표준 (1전시장과 높이 2.5배 차이 — 착오 방지)
- 코엑스: 그랜드볼룸 max 4000×1200 / 아셈볼룸 max 3000×1000 / 포디움 600×200
- 송도컨벤시아: 로비 max 3000×1200 / 폴대배너 600×1800 / 포디움 600×200
- ICC 제주: 세로현수막 600×1800 / 포디움 600×200
- DDP: 포디움 600×200

### FacilityGuidePanel — 데이터 수정 요청 기능
- 하단 우측 "정보 수정 요청" 버튼 (Flag 아이콘)
- 클릭 → 인라인 폼 (텍스트 입력 + 제출)
- localStorage `venue_correction_requests[]`에 저장 (venue/text/submitted_at)
- 제출 완료 시 3초 확인 메시지

### 검증
- TSC 0 에러 / Next 빌드 16/16 라우트 통과

## 2026-05-11 (v9.14) — 행사 유형별 추천 관리 페이지 신설

피그마 IA 5번째 학습 관리자 섹션.

- `LearningManagerClient` SECTIONS에 `event-types` 6번째 항목 추가 (MapPin 아이콘)
- 행사 유형 × 권장 환경장식물 × 비고 3컬럼 표 (8종: 컨퍼런스/전시회/시상식/포럼/박람회/체험/기념식/발표·런칭)
- SEED_SIGNAGE_TYPES join으로 한글명 표시
- 사용률 ≥70% 자동 추천 편입 안내 (다음 사이클 구현 예정)

## 2026-05-11 (v9.13) — 환경장식물 종류 섹션 시드 데이터 표

회의록 '환경장식물 종류/규격/기본 재질' 노출 요구 반영.

- `LearningManagerClient` 환경장식물 종류 섹션 — 종류명/레이아웃/너비/높이/기본 재질/분류 6컬럼 표
- 레이아웃 뱃지 색상 코딩 (세로=violet, 가로=blue, 정사각=slate)

## 2026-05-11 (v9.12) — 다크 톤 잔재 일괄 라이트 변환

2차 피드백 '흰색/밝은 배경' 요구 — 로그인·가입·사이드바·가이드·share 페이지 일괄 변환.

- `(auth)/login·signup` bg-slate-900 → bg-white
- `ItemSidebar`, `StepIndicator`, `GuideBox`, `ClientReviewView`, `dashboard` 라이트 톤 일괄 적용
- bg-slate-9xx/8xx → bg-white/slate-50/100 / text-slate-100~300 → text-slate-700~900

## 2026-05-11 (v9.11) — 편집기 가로/세로 분할 토글

회의록 '한번 생각해 봅시다' 시도 — 위아래/좌우 레이아웃 선택 가능.

- `EditorLayout` 상단에 '레이아웃: 위·아래 / 좌·우' 토글 추가
- 좌·우 모드: 그리드 50% + 캔버스 50% 수평 배치
- 사용자 선호 `localStorage` 저장 (`mice_editor_split`), 기본값 horizontal

## 2026-05-11 (v9.10) — ProjectInfo 다크 → 라이트 톤

- `ProjectInfoClient` 전체 bg/text/border 클래스 라이트 톤으로 전환

## 2026-05-11 (v9.9) — 마스터 시안 전체 배경 일괄 적용

회의록 '마스터 시안 = 모든 환경장식물에 배경 일괄 제공' 구현.

- `CanvasBoard` masterImageUrl prop 추가
- `item.image_url` 우선 → 없으면 `project.master_image_url` 사용
- 캔버스 빈 배경색: 다크 → 흰색 (라이트 톤 일관성)

## 2026-05-11 (v9.8) — 동의어 인라인 추가/삭제

회의록 학습 관리자 IA ′환경장식물별 동의어 추가/삭제 가능′ 충족.

- `app/api/admin/aliases/route.ts` 신설 (POST/DELETE, isAdmin 필수)
- `LearningManagerClient` 동의어 섹션 상단에 ′별칭 → 표준명′ 입력 폼 + 추가 버튼
- DB 동의어(signage_aliases) 표 행에 ✕ 삭제 버튼 (emerald 배경 강조)
- 시드 동의어는 기존대로 read-only

## 2026-05-11 (v9.7) — 학습 관리자 안내문 추가 단축

3개 안내문(동의어/시설가이드/푸터) 줄여 사용자에게 핵심만 표시.

## 2026-05-11 (v9.6) — AI 학습 백엔드 연결

회의록 학습 3종 + 추천 흐름 백엔드 구현.

- `lib/ai/visionFloorPlan.ts` — Gemini 2.5 Vision으로 도면 → 텍스트 분석
- `app/api/learning-jobs/run/route.ts` — POST { jobId } → Vision 호출 → venues.specs_text 저장
- `lib/ai/venueProfile.ts` — venues + 시설 가이드 시드 + facility_exception_log를 텍스트 압축
- `recommendSignage`에 venueProfileBlock 자동 통합 (seed + venueSignage + accumulated + venueProfile 4종)
- migration_v9: venues.specs_text + specs_updated_at 컬럼 추가
- admin/learning UI에 ′Vision 분석′ 버튼 (queued/failed 상태에서 실행)

## 2026-05-11 (v9.5) — 위자드 직행 흐름 보장 + 행 추가 복구

- handleCreate에서 selectedList 비면 ′미정′ 행 1건 자동 생성 (편집기 빈 화면 방지)
- EditorGrid 상단에 ′+ 행 추가′ 작은 버튼 복구 (emerald 색조로 컬럼 관리와 구분)
- step 2 ′팀원 초대′ 안내문 단축 + 개발자 내부 문구 제거

## 2026-05-11 (v9.4) — 새 발주 양식(인쇄제작물 시트) 21컬럼 적용

회의록 ′이게 기본 양식′ 반영.

- 신규 13컬럼 추가 (space_type / place_detail / place_contact / unit + type_kind / supplier / install_date / install_time / usage_period / uninstall_date / uninstall_time / order_contact / order_date)
- DEFAULT_ORDER 재배열 — 새 양식 순서 그대로 (NO/공간유형/사용목적/장소명칭/세부장소/.../비고)
- 기존 part·language·material·editor·design_vendor·print_vendor 노출 제거 (DB 데이터는 보존)
- 엑셀 컬럼 너비 조정 — 내용/사용기간 넓게, 단위/시간/수량 좁게

## 2026-05-11 (v9.3) — 회의록 1차·2차 일괄 반영

- 1단계 발주서 엑셀 드랍 / 3단계 ′제작물 선택′ 홀딩 → 2단계에서 바로 편집기 직행
- 관리자 페이지 KPI에서 ′실적 매칭·PM 사업부·발주처·행사 폴더′ 4개 제거
- ′프로그램 파트 (다중선택 — 추천 정확도 핵심)′ → ′(다중선택 가능)′ 단순화
- 행사장 등록 요청 모달 안내문 단순화 (사용자에게 ′학습/AI′ 노출 X)
- `docs/AI_LEARNING_FLOW_260511.md` 신설 (회의록 AI 적용 흐름 정리)

## 2026-05-11 (v9.2) — 데이터 연결 ① finalized_at + ② 시설가이드 예외 로그

- ExportService.logUsage가 export_excel 시점에 design_items.finalized_at = now() + confirmed = true 일괄 UPDATE
- EditorLayout.onProceed: facility_exception_log INSERT + review_note에 ′[시설 가이드 외] 사용자 확인 진행′ 자동 표기

## 2026-05-11 (v9.1) — 2차 수정 회의록 위자드 흐름 변경

- STEP_LABELS = [기본 정보, 팀원 초대] 2단계로 축소
- step 2 ′팀원 초대′ 완료 시 바로 ′프로젝트 만들기′ 버튼

## 2026-05-11 (v9 ++) — 재검증 + 자동 채우기 + localStorage 마이그레이션

### 자동 채우기 (시도 후 ★ 전면 롤백)
- 시도: `autoFill.ts`로 event_date + OrderingSchedule offset → ′D-1 (YYYY-MM-DD)′ 표시
- **롤백 사유 (사용자 검증)**: 실제 발주엑셀 4건 점검 결과 — 1차안 결과물 안.xlsx 데이터 행은 빈칸 / 2020 평창평화포럼·2018 스마트국토엑스포는 컬럼 자체 없음 / KME 2019는 ′설치장소′만 존재. 실무에선 행사 당일로 통일 표기하지도 않고 행사마다 다름. D-1 추론값은 잘못된 가정이 됨.
- 결과: `lib/services/autoFill.ts` 삭제 / EditorGrid·EditorLayout·ExportService 모두 원복. install_time·uninstall_time은 사용자 직접 입력 컬럼으로 환원.

### localStorage 마이그레이션 (v8 → v9)
- `EditorGrid.loadColState`: v9 키 없으면 v8 데이터를 읽어 변환·저장. order·hidden·customCols·customValues 보존, 신규 excludedFromExcel·excludedFromPpt는 기본값
- `ExportService.loadEditorColState`: v9 미존재 시 v8 폴백 (마이그레이션 저장 직전에 호출돼도 정상 작동)

### 정리
- 미사용 상수 `PPT_EXCLUDED_COLS` 제거 (dead code)

### 검증
- TSC 0 / Next 빌드 16/16

## 2026-05-11 (v9 +) — 기획 문서 미구현 사항 추가 적용

### 학습 관리자 IA 4섹션 + KPI 카드 (§13-3 완성)
- 상단 KPI 3카드: 학습된 행사장 / 환경장식물 종류 / 동의어 매핑
- 동의어 매핑 섹션 — `SEED_SYNONYMS` 표 + 검색 필터
- 시설 가이드 학습 현황 섹션 — 행사장별 ′설치 가능 카테고리·주의사항·정보 완성도(6분의)·학습 시점′ 표
- `page.tsx` 서버 측에서 시드 가공 후 prop 전달

### 컬럼 우클릭 메뉴 (§14-3,4 완성)
- `EditorGrid.tsx`: 컬럼 헤더 우클릭 → 컨텍스트 메뉴 (편집 화면 표시 / 엑셀에서 제외 / PPT에서 제외)
- `SavedColState`에 `excludedFromExcel` · `excludedFromPpt` 추가, 기본 PPT 제외 3개 사전 설정
- 컬럼 헤더에 ⛔X / ⛔P 뱃지 — 제외 상태 시각 표시
- localStorage 키 `v8` → `v9` 갱신 (마이그레이션은 폴백 기본값 처리)
- `ExportService.exportToExcelDynamic` — `excludedFromExcel` 컬럼 자동 제거

### 검증
- TSC 0 / Next 빌드 16/16

## 2026-05-11 (v9) — 점진적 정확도 향상 + 장소+행사 선택 시 누적 데이터 AI 주입

### 윗선 명문화 반영
- "기존 + 신규 앱 사용 데이터 누적 → 점차 정확도 상승"
- "장소 + 행사 유형 선택 시 누적 정보 전체를 AI에 주입 → 최종 출력"

### 핵심 구현
- `lib/ai/accumulatedContext.ts` (★ 신설) — Supabase에서 venue 매칭 프로젝트 5건의 design_items를 단계별 가중치(10·30·70·100%)로 압축. `buildAccumulatedContext()` + `formatAccumulatedContext()`.
- `lib/ai/recommendSignage.ts` — seed + venueSignageHelper + accumulatedContext 3종을 단일 Gemini 프롬프트로 자동 통합.
- 별도 학습 트리거 없음 — `confirmed=true` / `finalized_at` 컬럼만 채우면 다음 추천부터 자동 누적.

### 학습 관리자 가시화
- `app/(dashboard)/admin/learning/page.tsx` — projects + design_items 조인하여 venue별 단계 집계 (입력/중간/컨펌/완료) + 정확도 추정 산출
- `LearningManagerClient.tsx` — ′행사장별 학습 현황′ 섹션 신설 (9컬럼 표: 행사장 / 프로젝트 / 항목 / 입력 / 중간 / 컨펌 / 완료 / 정확도 / 학습 카테고리). 정확도 70%+ emerald / 40~70% amber / 40% 미만 rose
- ProjectAdminTab(`/data`) 5 KPI + 9컬럼 IA 표 완성 (Figma spec)

### 문서
- `docs/91.2_AI업무파트너기획_..._260511.md` §14-A 신설 (3단계 정확도 곡선 + 흐름도 + 자가 강화 루프 + 구현 위치)
- `decisions.md` v9 결정 추가 (단계별 가중치 분리, 자동 누적, 환각 방지 짝 정책)

### 검증
- TSC 0 에러 / Next 빌드 16/16 라우트 통과



> 이 파일은 자율 작업 완료 시 자동 갱신합니다.
> 큰 결정은 `decisions.md`, 실패 패턴은 `learnings.md`에 들어갑니다.

## 2026-05-07 (세션 복구) — PreflightModal 에디터 연결

이전 세션에서 구현된 PreflightModal/preflightCheck.ts가 EditorLayout/EditorToolbar와 연결되지 않은 상태였음. 연결 완료.

- `EditorToolbar.tsx`: `onPreflight?: () => void` prop 추가 + "발주 전 점검" 버튼 (ClipboardCheck 아이콘, 인디고 색상)
- `EditorLayout.tsx`: `showPreflight` 상태 추가 + PreflightModal import + 모달 렌더링 + `onGoToItem` 연결 (해당 제작물 선택 후 모달 닫기)
- 발주 파일 생성 버튼 클릭 시 Excel + PPT 동시 내보내기
- TSC 0 에러 / 빌드 17/17 라우트 통과 / harness 70/72 통과 (실패 0)

## 2026-05-06 — 자율 작업 인프라 셋업

- CLAUDE.md에 one-shot completion 정책 + 자율 작업 가이드 섹션 추가
- PROGRESS.md / learnings.md / decisions.md / goals/current.md 초기화
- .claude/commands/pavr.md, fix-bug.md 추가
- automation/po_loop.sh 생성 (PO 무중단 자율 루프)

## 2026-05-07 — 1단계 (8장) 완료 + 데이터 대시보드 신설

### 핵심 변경
- AI 엔진 Anthropic → **Gemini 2.5 Flash** 전환 (`recommendSignage.ts`)
- `.env.local`에 `GEMINI_API_KEY` 적재 (gitignore 적용)
- 행사 정보만으로 추천 가능 — 입력 필드 17개 (행사 유형 10종, 세팅·철거일, 참가자 수, 언어, 국제·VIP·야외·예산제약)
- 추천 리뷰 화면에 "엑셀로만 다운로드" 버튼 추가 (17컬럼 발주서)
- 풍부한 입력 필드 메인 위자드(NewProjectButton)에도 동기화

### 데이터 대시보드 (`/data` 페이지) 신설 — 명세 6번 매핑
- `lib/data/dashboardSeed.ts` — 시드 데이터 단일 소스 (Supabase 미사용 시 폴백)
- 13개 탭: 개요 · 실측분석 · 행사이력(54건) · PM사업부 · 발주처 · 행사분류통계 · 환경장식물(11종) · 동의어 · 행사장 · 분류·권장 · 재질 · 디자인업체 · 납기패턴
- 8개 통계 카드 (실적매칭·PM사업부·발주처 카운트 표시)

### 실측 분석 (스크립트 → 시드 임베드)
- `scripts/parse_perflist.mjs` → 수행실적 엑셀 176행 파싱, 폴더 17건 매칭
- `scripts/parse_signage_lists.mjs` → 행사 폴더 8개 / 281개 제작물 행 분석
- 결과: **비표준 규격 37%(105/281)** — 명세 6.1.b.iii.3 답: "다수 확인됨"
- 재질 분포 9종 실측 — 현수막 22% · 폼보드 20% · PET 11% 등

### AI 추천 컨텍스트 강화 (명세 5번)
- `findSimilarPastEvents()` — 행사장·발주처·분류·PM부서 가중 점수 기반 5건 자동 추출
- Gemini 프롬프트에 "[과거 유사 행사 (수행실적 매핑)]" 블록 자동 주입
- Case A 폼: 발주처·행사장 자동완성 (datalist) — 과거 17건 활용

### UI/UX 개선
- 메인 대시보드: D-7 긴급·이번달·진행중 통계 + 단계 필터 + D-day 자동 정렬
- `/data` 안내 카드 추가 (54건·17건·11종·10건 요약)
- SlotPanel: 3×3 위치 격자(좌상~우하 snap) + W%(너비) 필드 + 레이아웃 템플릿 저장(localStorage)
- EditorGrid: 규격(mm) 셀 더블클릭 편집
- 프로젝트 생성: 시안/배치도/품목별 시안 업로드 분리

### 검증
- TSC 0 에러 / Next 빌드 16/16 라우트 통과
- harness.mjs 70/72 통과 (실패 0)

## 2026-05-07 (야간) — v4.1 대전환: 학습 기반 추천으로 방향 전환

명령본 v4.1 통합본 수신 → 9개 단위 + 갱신 5개 + 신규 2개 일괄 처리.

### 단위 2 + 신규-F: 메인 페이지 정리 + 명칭 변경 일괄
- 시스템명: "MICE 디자인 가이드" → **"제작물 리스트 가이드"** (UI/문서/PPT 파일명)
- 메인 헤더 4메뉴 분리: 프로젝트 / 관리자 페이지 / 데이터 학습 관리자 / 저장된 제작물
- AI 사전학습 카드 메인에서 삭제 (관리자 페이지로 이동)
- 단계 필터 7개 탭 (의뢰서작성·발주완료·시안검수·수정중·확정·납품완료) 삭제
- ExportService 파일명 prefix: "제작물리스트_{name}_{date}.{ext}"
- 영향 파일: 12개 (헤더·라벨·메타데이터·SQL 코멘트 등)

### 단위 3 + 갱신-A: 새 프로젝트 폼 재설계 + 프로그램 파트
- 행사장: datalist → optgroup 드롭다운 (권역별 + 학습 안된 amber 경고)
- VenueRequestModal 신설: "신규 행사장 등록 요청" 도면 첨부 가능
- 본인 요청 행사장은 즉시 "내가 요청한" 그룹에 노출
- lib/programParts.ts: EZ 폴더링 40.04~40.20 12종 정의
- 행사 유형 단일 → 프로그램 파트 다중선택 + 권장 환경장식물 자동 체크
- supabase/migration_v6_v4_1.sql: program_parts text[] + venues + venue_halls + venue_requests + learning_jobs + usage_logs 통합 마이그레이션

### 단위 4: "내용" 컬럼 자유 텍스트 + #N prefix
- EditorGrid 'content': 슬롯 합산 → purpose 매핑 자유 텍스트 (placeholder "예: 등록 안내 배너, 화살표")
- EditorGrid 'bigarea': 같은 카테고리 2개+ 시 "X-배너 #1" 자동 prefix
- ExportService 'bigarea': items 인자 추가 + #N suffix 동기화

### 단위 5-1: 관리자 페이지 정리 + 프로젝트 관리 탭
- 행사이력·레이아웃 DNA 탭 삭제
- 프로젝트 관리 탭 신설: 4 KPI + 행사장 분포 + 파트 분포 + 학습 요청 대기

### 단위 5-2: 데이터 학습 관리자 (/admin/learning)
- 4개 섹션: 행사장 추가 / 사용자 요청 대기 / 도면 학습 큐 / 학습된 행사장
- 도면 업로드 시 자동 learning_jobs INSERT (Vision 호출은 다음 사이클)
- venue_requests 승인 시 venues + 학습 큐 자동 트리거

### 단위 5-3: 헤더 admin 메뉴 라우팅
- /data, /admin/learning, /archive 헤더 라벨 정합화

### 단위 6 + 갱신-C: docs/IA_v4.md
- 페이지 트리·권한 매트릭스·자동 누적 학습 사이클 다이어그램
- EZ 폴더링 가이드 ↔ 본 시스템 매핑표

### 단위 7 + 갱신-B/D: docs/AI_LEARNING_PIPELINE.md + 동선배너 룰
- INPUT 4종 (발주리스트·결과보고서·도면·라이브) 정의
- 컨벤션센터·호텔 우선 카테고리
- lib/recommendation/dongseonBanner.ts: 룰베이스 (인원/200 + 홀분리 + 주출입구 + 대형행사장)

### 단위 8 + 갱신-E: parse_signage_lists_v4.mjs
- 행사 폴더 203개 분석 → program_parts 추론 + 도면 보유 여부
- 도면 보유: 33/203
- 프로그램 파트 분포 TOP 5: 전시 23, 회의 19, 공식행사 7, 홍보 5, 등록 5

### 신규-G: PPT 빈 슬라이드 + usage_logs
- PPT 시안 없을 때: dashed 빈 박스 "디자이너 작업 영역"
- 다운로드 시 usage_logs INSERT (best-effort)

### 검증
- TSC 0 / 빌드 17/17 (신규 /admin/learning) / harness 70/72 통과 (실패 0)
- 9개 commits 누적 (이전 29 + v4.1 9)

### PM 후속 액션
1. Supabase Studio에서 `migration_v6_v4_1.sql` 실행 (필수)
2. 본인 profiles.role = 'admin' 확인
3. /admin/learning 진입해 컨벤션센터·호텔 도면 5~10건 등록 권장
4. 현재 ahead commits push: `git push v2 auto/v4-stage-20260507:main`

---

## 2026-05-07 (저녁) — UX 단순화 + 데이터 연결 강화 사이클

### 신규 프로젝트 흐름 단순화
- 4단계 위자드 → **3단계** ("사용 목적" 단계 제거 — 행사 유형과 기능 중복)
- 시안 업로드 step 1 → step 3 (제작물 선택 단계로 통합)
- 행사 유형 선택 시 권장 환경장식물 자동 체크 (명세 6.2.6 — `EVENT_TYPE_RECOMMEND`)
- 행사 장소 입력 시 과거 행사 매칭 알림 표시 (명세 6.2.4 — `matchVenueHistory`)

### 새 기능
- **DeleteProjectButton** — owner만 프로젝트 삭제 (제작물·슬롯·연관 데이터 cascade)
- **엑셀 헤더 매핑 강화** — 12컬럼 별칭 다양화 (예: `구 분 1`, `사 이 즈`, `연 번` 등 다양한 양식 대응)
- **메인 대시보드 stage 표시** — `project.stage` 우선 표시 (없으면 status fallback)

### UI 정리
- 📝 이모지 잔존 제거 (ArchiveClient 비고 표시)
- README.md 신설 — 외부 공유용 진입 가이드

### Case A 동기화
- NewProjectButton과 동일하게 발주처·행사장 매칭 알림 표시 (UX 일관성)

### 검증
- TSC 0 / 빌드 16/16 / harness 70/72 (실패 0)
- 5개 commit 누적: NewProjectButton 단순화 + 행사 유형 자동 체크 + venue 매칭(NPB) + venue 매칭(Case A) + README

---

## 2026-05-06 (저녁) — v3 1차안 Phase 1~6 완료

세션 a16141be (Storage 진단·수정 + 기획안 v3 적용) 이어받아 끝까지 진행.

### 백업
- 코드 전체 스냅샷: `구버전/프로그렘/mice-design-guide_v1_260506/` (87파일, 28MB)
- 문서: `archive/CLAUDE_v1_260506.md` (CLAUDE.md SHA 동일 확인)
- git 커밋 `4aab9743` 으로도 v1 복원 가능

### Phase 1 — Storage 진단
- `docs/phase1-report.md` 작성 (12항목 점검 결과)
- `supabase/diagnostic_storage.sql` (read-only 진단 SQL)
- 핵심 결함 3건 발견: path 사용자 분리 없음 / DELETE 정책 누락 / WebP 변환 검증 누락

### Phase 2 — Storage 정상화
- `lib/services/storagePaths.ts` 신규 (path 첫 폴더=auth.uid() 강제)
- `lib/services/imageUtils.ts` 검증 보강 (size 0 / mime 검증)
- 5개 업로드 위치 일괄 수정 (EditorToolbar / SlotPanel ×2 / ProjectInfoClient master+logo)
- SQL: `supabase/migration_v3_all.sql` Phase 2 섹션 (4정책 신설)

### Phase 3 — 역할 2분할 (admin/user)
- `lib/types.ts` UserRole / Profile / SignageAlias / ShareToken 타입 추가
- `lib/auth/role.ts` 신규 (fetchUserRole, isAdmin)
- SQL: profiles.role enum + is_admin() SECURITY DEFINER + share_tokens 테이블

### Phase 4 — 4가지 시작 케이스 + Claude API 추천
- `@anthropic-ai/sdk` 설치
- `lib/ai/recommendSignage.ts` (Claude Sonnet 4.6 호출)
- `app/api/recommend/route.ts` (Server Route Handler, 인증 필수)
- `/projects/new` (2×2 grid 케이스 선택)
- `/projects/new/case-a` (AI 추천 → 추천 리뷰 → 프로젝트 생성)
- `/projects/new/case-b` (엑셀 17컬럼 fuzzy match + alias 자동 변환)
- `/projects/new/case-c` (시안 이미지 → master로 업로드 → /info 이동)
- `/projects/new/case-d` (텍스트만 → 빈 X-배너 1장)
- 대시보드에 "AI 추천으로 시작" CTA 버튼 추가

### Phase 5 — 동의어 통합
- `lib/services/aliasResolver.ts` (10분 캐시 + sync/async 변환)
- 7개 시드 (스프링배너→X배너 / 드롭배너·난간배너→세로현수막 / 천장배너→통천배너 / 빵빠레배너→가로등배너 / 피켓A4·A3→A4·A3)
- Case B에 자동 적용 (엑셀 카테고리 → 표준명 변환)

### Phase 6 — 진행 가이드 UI 4종
- `app/components/guide/StepIndicator.tsx` (5단계 sticky stepper)
- `app/components/guide/GuideBox.tsx` (WHY/HOW/TIP 3층)
- `app/components/guide/NextStepBanner.tsx` (다음 단계 CTA 배너)
- `app/components/guide/MissingFieldAlert.tsx` (inline + summary 두 형태)
- `/projects/new` + `/case-a` 에 StepIndicator·GuideBox 통합

### 검증 결과
- `npx tsc --noEmit` : exit 0 (타입 에러 0)
- `npm run build` : 14 라우트 모두 PASS (5개 신규 추가)
- `node scripts/harness.mjs` : 72개 검사 / 69 통과 / 3 경고 / **0 실패**
  - 경고: GEMINI_API_KEY 없음 (휴리스틱 폴백) / dev 미실행 / Supabase 401 (실행 환경 외 영향)

### PM이 후속으로 직접 실행해야 하는 작업
1. **Supabase Studio → SQL Editor**에서 `supabase/migration_v3_all.sql` 전체 RUN
2. **Supabase Dashboard → Storage → design-images → Settings**:
   - File size limit: 10485760 (10MB)
   - Allowed MIME types: `image/webp, image/jpeg, image/png`
   - Public bucket: ON 유지 (1차안)
3. **`.env.local`** 에 `ANTHROPIC_API_KEY=sk-ant-...` 추가 (Case A 추천에 필수)
4. `npm run dev` 후 `/projects/new` 에서 4-case 흐름 직접 확인
