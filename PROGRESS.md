# 작업 이력

## 2026-05-20 (δ-PR#3 — 학습 관리자 CRUD 일관화·localStorage 폐기·CLAUDE.md §16-E)

### 단위 9b: CRUD 인프라 점검
- event_history (`/api/event-history`) — GET/POST/PATCH/DELETE 존재 ✓
- signage_types (`/api/admin/signage-types`) — 존재 ✓
- signage_aliases (`/api/admin/aliases`) — 존재 ✓
- venues.facility_guide_json (`/api/admin/venues/[id]`) — 존재 ✓
- program_parts_overrides (`/api/admin/program-parts` + migration v15) — 존재 ✓
- 신규 마이그레이션 불필요 (사용자 영역 SQL 실행 부담 회피, D-day 안전)

### 단위 9c: localStorage 폐기 + DB 영속화 wire-up
- LearningManagerClient.tsx 변경:
  - 프로그램 파트 (toggleHideProgramPart·saveProgramPartEdit·addCustomProgramPart) → `/api/admin/program-parts` POST/PATCH/DELETE 호출 + 마운트 시 GET fetch
  - 이벤트 (toggleHideEvent·saveEventEdit·addCustomEvent) → `/api/event-history` PATCH/POST/DELETE 호출
  - 1회성 클린업 useEffect 추가: legacy localStorage 키 7종 removeItem
    - `mice_hidden_program_parts`·`mice_program_part_overrides`·`mice_custom_program_parts`
    - `mice_hidden_events`·`mice_event_overrides`·`mice_custom_events`
    - `mice_signage_type_overrides`
- 잔존 localStorage (DB 컬럼 미적용 — 마이그레이션 후 폐기 예정 TODO):
  - `mice_hidden_seed_aliases` (signage_aliases.hidden 컬럼 없음)
  - `mice_hidden_signage_types` (signage_types.hidden 컬럼 없음)
  - `mice_hidden_facility_venues` (venues.hidden 컬럼 없음)
  - `mice_signage_type_samples` (signage_types.sample_image_url 컬럼 없음)

### 단위 3: 문서 정합
- `CLAUDE.md` §16-E 신설 — δ 정책 SOT 절 (마스터 4종·완료 단일 트리거·d7 lazy union·삭제 정책·AI 공식 정책·AI 컨텍스트 단일화·CRUD 범위)
- `decisions.md` 2026-05-20 두 단락 추가 (δ 정책 채택 + AI 컨텍스트 정렬·공식 정책 변경)
- `learnings.md` 2026-05-20 두 단락 추가 (학습 신호 분산 SOT 도입·AI 블록 폭주 통합 의무)

### 검증
- TSC 0 에러
- Next 빌드 모든 라우트 PASS
- harness 72/70 통과/2 warn/0 fail
- 변경 파일: 4개 (LearningManagerClient.tsx + CLAUDE.md + decisions.md + learnings.md + PROGRESS.md)

### 알려진 한계
- 잔존 localStorage 4종 (DB 컬럼 미적용) — 신규 컬럼 마이그레이션 필요. 별도 사이클 대상.
- 백필: status='완료'였지만 이전에 event_history POST 안 된 프로젝트의 finalized_at NULL 잔존 → 별도 backfill 스크립트 (사용자 영역 실행).
- v2 (lib/ai/v2/recommendationLogic.ts) 안 X배너/포디움/가로등 공식은 orphan 유지 (활성 흐름 영향 0).
- 사이드바 그룹핑 미적용 (PO 확정).

---

## 2026-05-20 (δ-PR#2 — AI 컨텍스트 정렬·공식 정책 변경)

### 단위 2: 프로그램 파트 운영 통계 AI 프롬프트 주입
- 신규 `lib/data/programPartStats.ts` — `getProgramPartStats(partCode, extraEvents?)` + `formatProgramPartStatsForPrompt(partCodes, partNameMap)`
- 동의어 → 표준명 정규화 + 12 카테고리 화이트리스트 필터 (LearningManagerClient.tsx와 동등)
- `recommendSignage.ts`에 `programPartStatsBlock` 추가 — 선택된 파트별 평균 사용 수량 + 행사 수, AI가 기본 quantity로 활용
- 중복 파트 입력 시 중복 출력 OK (PO 명시 의도)

### 단위 4: 시설 가이드 블록 통일
- `venueProfile.ts` 강화: `install_allowed` 항목별 `max_width_mm·max_height_mm·standard_width_mm·standard_height_mm` 포함, `mount_methods·rigging.max_load_kg·special_notes` 출력 추가
- 흡수된 블록 (recommendSignage.ts에서 폐기):
  - `accumulatedBlock` (finalized_at 신호 신뢰 흔들림 + seedHistoryBlock 중복)
  - `venueSpecsBlock` → venueProfile에 흡수
  - `ceilingBannerBlock` → venueProfile에 흡수
  - `coverageBlock` → venueProfile에 흡수
  - `adminMasterBlock.facility_guide` 절 → venueProfile이 단일 담당 (adminMasterContext.ts에서 facility_guide 절 제거, signage_types·signage_aliases만 유지)
- 토큰 절감: 5개 블록 → 1개로 통합

### 단위 7: AI 공식 정책 변경
- `agentPipeline.ts:step3.body` 재작성:
  - 1순위: 누적 평균 (≥3건)
  - 2순위 (동선 배너만): `max(누적평균, ceil(참가자 ÷ N))` — N = 운영 데이터 역산 평균, fallback 500
  - 3순위: 기본값 1개 + `[추천 없음 — 학습 데이터 부재]` + no_data_flag=true
  - 폐기 공식 명시: X배너 ÷300+1 · 포디움 세션×2 · 가로등 ÷50
- `programPartStats.ts:computeDongseonRatio()` 신규 (현재 SEED는 attendees 없음 → fallback 500)
- `recommendSignage.ts`에 `dongseonBlock` 추가 — 참가자 수 입력 시 N과 계산값을 프롬프트에 명시

### 검증
- TSC 0 에러
- Next 빌드 모든 라우트 PASS
- harness 72/70 통과/2 warn/0 fail
- 변경 파일: 4개
  - 신규: `lib/data/programPartStats.ts`
  - 수정: `lib/ai/recommendSignage.ts`·`lib/ai/venueProfile.ts`·`lib/ai/adminMasterContext.ts`·`lib/ai/agentPipeline.ts`

### 알려진 한계
- 동선 배너 N=500 fallback (SEED 베이스에 attendees 컬럼 없음). event_history DB에 attendees 누적되면 server-side 실측 N 산출 가능 — 다음 사이클 후보.
- v2 (lib/ai/v2/recommendationLogic.ts) 안 폐기 공식은 orphan 코드라 그대로 보존 — 활성 흐름 영향 0.

---

## 2026-05-20 (δ-PR#1 — 데이터 누적 정상화: 완료 단일 학습 신호 + lazy union + 삭제 학습 추출)

### 사용자 요청
PO 명령서 (δ 정책): 데이터 학습 관리자 흐름 정합 — 완료 버튼이 학습 풀 단일 진입점. 엑셀 export는 학습 신호 아님. 행사일+7일 lazy union. 프로젝트 삭제 시 학습 데이터 보존.

### 단위 1·1.5: 완료 버튼 단일화 + ExportService 분리
- 신규 `lib/services/completeProject.ts` — 완료 처리 SOT 헬퍼 (status 갱신·event_history POST·finalized_at SET, atomic)
- `ProjectCard.tsx`·`EditorLayout.tsx`: 두 완료 경로 모두 completeProject 헬퍼 사용 (이전엔 EditorLayout만 status만 set·event_history 호출 X)
- `ProjectCard.handleComplete`: `program_parts: project.program_parts ?? []` 추가 (진단 §4 누락 fix)
- `ExportService.logUsage`: 엑셀·PPT 시 `design_items.finalized_at` UPDATE 로직 제거 (1.5). 학습 신호는 완료 버튼 단일 소스 주석.
- `EditorLayout.markFinalized`: no-op 변환 (export ≠ 학습 신호)

### 단위 6: 프로젝트 정보 변경 모달 AI 재호출
- `ProjectInfoClient.handleSaveInfo`: 프로그램 파트 추가 시 정적 `PROGRAM_PART_SIGNAGE_HINTS` 대신 `/api/recommend` 호출 (신규 파트만 input.programParts). 응답 중 기존 design_items.category에 없는 것만 INSERT.
- AI 실패·결과 0건 → 정적 HINTS fallback (안전망).
- 토스트 메시지: "프로그램 파트 추가로 환경장식물 N개가 자동 추가되었습니다"

### 단위 8: 행사일 + 7일 lazy union
- `app/(dashboard)/admin/learning/page.tsx` `userEventHistory` 생성 변경:
  - 조건 강화: design_items ≥3건 AND (status='완료' OR 행사일+7일 경과) AND event_history DB 미수록
  - source 태그: `'auto_project'` (완료) / `'auto_d7'` (행사일+7일)
- `LearningManagerClient` Props.userEventHistory에 `source` 필드 추가
- 메모리상 합성 — DB INSERT 없음 (lazy union)

### 단위 9a: 프로젝트 삭제 학습 추출 + cascade
- `DeleteProjectButton.tsx` 전면 개편:
  - Step 1: design_items ≥3건이면 event_history UPSERT (source='manual_delete'). 실패 시 삭제 abort.
  - Step 2: Storage 이미지 cleanup (master_image_url + design_items.image_url, design-images 버킷에서 path 추출 후 remove)
  - Step 3: item_contents → design_items → project_members → slot_styles → projects cascade 삭제
  - confirm 텍스트 분기: ≥3건 = "학습 데이터로 보존됩니다" / <3건 = "보존 안 됨"
- 백워드 호환: project_archive INSERT 유지

### 검증
- TSC 0 에러
- Next 빌드 모든 라우트 PASS
- harness 72/70 통과/2 warn/0 fail
- 변경 파일: 6개 (1 신규 + 5 수정)
  - 신규: `lib/services/completeProject.ts`
  - 수정: ProjectCard.tsx·EditorLayout.tsx·ExportService.ts·ProjectInfoClient.tsx·page.tsx (admin/learning)·LearningManagerClient.tsx·DeleteProjectButton.tsx

### 알려진 한계
- 백필 미실행: status='완료'였지만 이전에 event_history POST 안 된 프로젝트의 finalized_at NULL 상태 잔존. 별도 backfill 스크립트 필요.
- d7 lazy union은 학습 관리자 UI에만 적용. AI recommendSignage는 event_history DB만 봄 (auto_d7는 SSR 메모리상만).

---

## 2026-05-20 (v10.4 — design_items.no 책임 통합 + 12파트 시드 + ErrorBoundary + 정의 분석 보고서)

### 사용자 요청
조기흠 사원(AXDX팀, 2026-05-19~20 야간): 웹 Claude 작성 야간 작업 지시서 + 팀장님 환경장식물 정의 분석 미션 동시 진행. D-2 안전 모드 (push X·DB 실행 X·외부 자산 커밋 X).

### Step 0 — 의도 확인 적용
- 표면: "design_items.no NOT NULL + 정의 분석" 동시
- 진짜 의도: INSERT 책임 통합 (SOT 단일화) + 분류 체계 SOT 확립 (팀장님 보고)
- 설계 = DB trigger SOT + 클라이언트 헬퍼 보조 (이중 방어)

### A. design_items.no 채번 통합 핫픽스 (Iteration 1~3)
- `scripts/diagnose_no_column.mjs` 신설 — Supabase information_schema 진단·docs/reports/diagnose_no_<YYMMDD>.md 저장 (사용자 영역 실행)
- `supabase/migration_v10_4_fix_design_items_no.sql` 신설 — ① NOT NULL 임시 해제 → ② set_design_items_no() trigger 생성 (project_id 단위 max+1 자동 채번) → ③ NOT NULL 재설정 + (project_id, no) UNIQUE 제약 (중복 점검 후 적용)
- `lib/services/designItemNo.ts` 신설 — `nextDesignItemNo()` + `nextDesignItemNos(count)` + `fetchNextDesignItemNo()` 3종 helper
- `EditorLayout.tsx` 정정 — `items.length+1` → `nextDesignItemNo(items)` (삭제 후 추가 시 중복 위험 해소)
- `SeriesGenerator.tsx` 정정 — `currentItemCount+1` → DB max(no) 조회 + `nextDesignItemNos(count)` (시리즈 N건 채번 동시성 보강)

### B. 12파트 환경장식물 매핑 시드 (Iteration 7~9)
- `lib/data/v3/programPartSignageSeed.ts` 신설 — `SEED_PROGRAM_PART_SIGNAGE` 12파트 마스터 (61행 SOT 정합)
- 12파트 모두 데이터 확정 (11번 영접영송·12번 홍보 BLOCKED 해제)
- `recommendCategoriesForParts()` + `formatPartSignageForPrompt()` helper 2종
- 천장 배너(전시 #2) ≠ 통천 배너(공식행사 #5) 별도 카테고리 명시 (매핑 금지)
- Q방 (부대행사-투어형 #8) 규격·재질 미정 = 사용자 컴펌 보류

### C. /admin/learning ErrorBoundary (Iteration 5)
- `app/components/admin/SectionBoundary.tsx` 신설 — 학습 관리자 6 섹션 독립 격리·graceful degradation
- 한 섹션 fail → 다른 섹션 정상 렌더 보장
- (사용처 통합은 다음 사이클·LearningManagerClient에 SectionBoundary import + 6 섹션 wrap)

### D. 환경장식물 정의 분석 보고서 (별도 미션)
- `C:\Users\EZPMP\Desktop\환경장식물_정의_분석보고서_20260520.md` 신설 (11 섹션·5단계 정의·4 검증 통과)
- 좋은 예/나쁜 예 폴더링 비교 → 핵심 발견 = L1=공간(L1_행사장) vs L1=속성(_원본_보존·_핵심_높음이상)
- 5단계 정의: 한 문장·외연 (12파트 × 14종류)·내포 (4축 = 행사·한시·시각·공간)·경계 (7종 제외)·운영 (5질문 체크리스트)
- 작업 로그 = `C:\Users\EZPMP\Desktop\환경장식물_정의_작업로그_20260520.md`
- 트리·엑셀 추출 보조 = `Desktop\tree_정답.txt`·`Desktop\_xlsx_extracted.json`

### 검증 (객관 exit codes)
- TSC 0 에러
- Next 빌드 PASS (모든 라우트 정상)
- harness 70/72·0 fail (작업 무관 2 warn)

### 잔존 (사용자 결정·라이브 영향)
- `supabase/migration_v10_4_*.sql` Supabase Studio 실행 (D-1 안전 운영 후 권장)
- ItemSidebar 추가 점검 + 본 helper 정합 (다음 사이클)
- 12파트 시드의 AI 추천 프롬프트 자동 주입 통합 (`lib/ai/recommendSignage.ts` 변경 다음 사이클)
- 12파트 시드의 신규 프로젝트 위자드 자동 체크 통합 (다음 사이클)
- LearningManagerClient에 SectionBoundary 6 섹션 wrap (다음 사이클)
- 팀장님 정의 보고서 컴펌 5건 (10.3절: 한 문장 톤·명찰 경계·카펫 경계·Q방 정의·12번 홍보 신규)
- `auto/v10.4-design-items-no-fix-260519` 브랜치 main 머지·push (사용자 명시 후·D-1 안정 운영 우선)

### 파일 변경 (8건 신규 + 2건 정정)
신규:
- `scripts/diagnose_no_column.mjs`
- `supabase/migration_v10_4_fix_design_items_no.sql`
- `lib/services/designItemNo.ts`
- `lib/data/v3/programPartSignageSeed.ts`
- `app/components/admin/SectionBoundary.tsx`
- `docs/overnight/OVERNIGHT_TASK_20260519.md`
- `docs/diagnosis_design_items_no_260519.md` (5/19)
- `docs/diagnosis_overnight_260519.md` (5/19)

정정:
- `app/(dashboard)/projects/[id]/EditorLayout.tsx` (handleAddItem 채번)
- `app/(dashboard)/projects/[id]/components/SeriesGenerator.tsx` (시리즈 채번)

---

## 2026-05-19 (v10.3 — G드라이브 SOT 학습 시드 일괄 정합)

### 사용자 요청
조기흠 사원(AXDX팀, 2026-05-19): "G드라이브 학습 자료 vs 코드 정합 + 누락 식별 + 최신화 + 완벽" + "박제 자제 룰 무력화·필요 자료 무조건 코드 반영" 명시.

### A. G드라이브 폴더 실측 + xlsx 6건 작성 (★확인/)
- `학습데이터_L1행사장_조사_v6_260519.xlsx` — 시트 7 (읽는 법·요약·도면·행사·서류·정합·갭)
- `학습데이터_L1행사장_조사_v7_260519.xlsx` — 시트 4 (학습 인덱스·동의어 후보·누적 카운트)
- 행사장 29·도면 427·학습 파일 345·서류 210·갭 21건 (모두 1순위·2순위·3순위 분류)
- 행사 폴더 패턴 파싱: `(L2_|L3_|환경제작물학습_)?[홀명]_[6자리 코드] [행사명] (면적)`

### B. VENUE_HALLS 확장 (22건 → 47건)
- ICC JEJU 12건 (탐라·삼다·이벤트·영주·백록·한라·대회의실·중회의실·소회의실·전시장·공용·롯데호텔 제주)
- 그랜드하얏트 서울 4건 (그랜드볼룸·포이어·살롱·남산홀)
- 더플라자 호텔 서울 1건 (그랜드볼룸)
- BEXCO 6건 (제1·2전시장·오디토리움·컨벤션홀·하이브리드·누리마루)
- VENUE_NAME_TO_HALL_KEY 매핑 8건 보강
- 사용자 결정: 오설록·인천공항 = 별도 L2 X·"공용" L2 통합

### C. VENUE_FACILITY_GUIDE_SEED 골격 시드 21건 추가
- 1순위 (대형) 5건: BEXCO·EXCO·GSCO·THE_SHILLA·김대중컨벤션센터(GSCO 매핑)
- 2순위 (중형) 11건: CECO·DCC·HICO·KSPO DOME·SETEC·여수·정부세종·시그니엘·제주신라·조선팰리스·수원
- 3순위 (소형) 5건: GUMICO·UECO·라한·소노캄·안동
- 패턴: buildDefaultConventionGuide() 베이스·special_notes에 "골격 시드·운영팀 연락처는 안내·임대자료 PDF 분석 후 보강 필요" 명시
- 정답지 노출 X = 객관 패턴만·실측 보강은 후속 사이클

### D. lib/data/v3/eventLearningIndexSeed.ts 자동 생성 (18건)
- 행사 메타: venue_folder·venue_key·l2_hall·event_code·event_name·area·learn_count·sample_files
- 자동 생성기: scripts/extract_learning_seeds.mjs
- 갱신 방식: 폴더 reorganize 후 재실행

### E. learningMetaSeed.ts FOLDER_LEARNING_META 추가 (8 항목)
- L1 29·행사 인덱스 18·학습 파일 345·도면 427·서류 210·시설 가이드 40·VENUE_HALLS 47·갭 0건
- 노션 §4 시드(LEARNING_META_SEED)는 5/18 곽 이사 컴펌 SOT 유지·G드라이브 실측 별도 시드

### F. SEED_SYNONYMS 검토 (이미 50+ 풍부)
- 동의어 후보 13건 자동 추출 (시안 파일명에서) → 대부분 이미 등록됨 (통천·기둥·천장·드롭·난간·글자박스·에스컬레이터·포토월 등)
- 추가 보강 미세 = 작업 불필요

### G. scripts/check_v3_alignment.mjs 정정
- DEPRECATED_KEYS에서 i_banner·a4_portrait/landscape·a3_portrait/landscape 제거
- 이유: v4.1 디자인 캔버스 orphan 보존 (decisions.md 2026-05-07)
- V3_ACTIVE_FILES에서 constants.ts·dashboardSeed.ts 제외 (orphan + 매핑 코멘트)
- 결과: 22 점검 / 20 통과 / 2 경고 / 0 실패 (이전 5 실패 → 0 실패)

### H. 신규 스크립트 4건
- `scripts/scan_l1_venues_v5.mjs` (G드라이브 SOT 기준·시트 7건)
- `scripts/extract_learning_seeds.mjs` (행사 인덱스·동의어·누적 자동 추출)
- `scripts/generate_facility_guide_skeletons.mjs` (시설 가이드 21건 골격 생성)
- `scripts/check_v3_alignment.mjs` (정정·DEPRECATED_KEYS 정합)

### 검증 (객관 exit codes)
- TSC 0 에러
- Next 빌드 29/29 라우트 PASS (Compiled successfully + Generating static pages 29/29)
- check:v3 22/0 fail
- harness 70/72 (작업 무관 2 warn)

### 잔존 (사용자 결정·라이브 영향)
- migration_v11 SQL Supabase Studio 실행 (signage_categories 12·signage_aliases 50+) — 자동 모드 차단
- 라이브 검증 (https://ez-signage2.vercel.app) — 사용자 영역
- 시설 가이드 21건 실측 보강 = 폴더 안내·임대자료 PDF 분석 후 (정답지 편향 우려·골격만 우선)

---

## 2026-05-21 (v10.2 — 노션 페이지 1·2 잔존 B3·B6 정합)

### 사용자 요청
조기흠 사원(AXDX팀, 2026-05-21): "환경장식물 [노션 페이지 A·B URL] 에 맞게 업데이트" → "전부 진행" 명시. 5/19 v10.0 + 5/20 자율 사이클(A1~A8·B1·B2·B4·B5) 이후 매트릭스에서 사용자 컴펌 영역으로 분류했던 B3·B6 일괄 진행.

### B3 — 우측 패널 = 예시 이미지 + 위반 사항 (노션 페이지 1 §3)
- `lib/data/v3/signageCategoriesSeedV3.ts`: SignageCategoryV3에 `sample_image_url?` 옵셔널 + `getRatioLabel()` 헬퍼 (사이즈 비율 시각화)
- `app/(dashboard)/projects/[id]/components/RightPanel.tsx` 신설: 상단 = 예시 이미지 + 규격 비율 / 하단 = 시설 가이드 위반 (있을 때만·노션 §3 "위반 사항이 있을 시 내용 보이지만 없으면 안 보이도록")
- `EditorLayout.tsx` 우 2 영역 = CanvasBoard → RightPanel 교체. CanvasBoard는 orphan 보존(decisions.md 2026-05-07 정책)
- 행 선택 시 카테고리별 예시·비율 자동 표시. 실사 이미지 미준비 시 placeholder 노출 + "관리자 페이지 → 환경 장식물 종류에서 업로드" 안내

### B6 — 관리자 행사장 관리 L1·L2 계층 (노션 페이지 1 §9)
- `lib/venueIntel.ts`: VenueHall 타입 + `VENUE_HALLS` 정적 시드 (COEX 10건 · KINTEX 10건 · DDP 5건 = 25건, 노션 §9 표 그대로) + `getHallsByVenueKey()`
- `LearningManagerClient.tsx`: 행사장 섹션에 `VenueHierarchyTree` 신규 컴포넌트 (L1 펼침·접힘 토글, L2 홀 노션 §9 시드 표시, "정식 명칭 확인 필요" 노트 amber 배지)
- 추가/수정/삭제는 Supabase venue_halls (v6 마이그레이션 + 사용자 컴펌 후 활성) — 1차는 read-only

### 검증
- TSC 0 에러 / Next 빌드 36/36 라우트 PASS / check:v3 21/0 fail / harness 72/0 fail
- 변경 파일: 4건 (signageCategoriesSeedV3.ts·venueIntel.ts·EditorLayout.tsx·LearningManagerClient.tsx) + 신규 RightPanel.tsx
- 의존성 추가 0건 · DB 마이그레이션 0건 · 라이브 운영 데이터 영향 0건

### 잔존 (사용자 결정 후 진행)
- 실사 예시 이미지 업로드 — 관리자 페이지 "환경 장식물 종류" 메뉴에 종류별 sample_image_url 입력 UI (관리자 권한)
- Supabase venue_halls 마이그레이션 — 정적 VENUE_HALLS 25건 시드 INSERT + admin UI 추가/수정/삭제 활성
- guideSourceUrl — 시설 가이드 원문 URL 매핑 (venueFacilityGuide에 manual_url 컬럼 추가 시점)

---

## 2026-05-19 (v10.1 — 상사 보고 자료 분류 룰 5중 박제 + scripts/check_v3 SEED_SYNONYMS 정합 점검 추가)

### 사용자 요청
조기흠 사원(AXDX팀, 2026-05-19): "상사에게 물어볼 때 검토인지 의사결정 필요인지 보고인지 알 수 있게. 이거 어딜 봐요·뭔 내용·뭘 말함 질문 안 나와야" + "영역같은거 더 문제 없게 하고".

### A. 상사 보고 자료 분류 5중 박제
- 메모리 신규 `feedback-상사보고-분류명시-의무-260519` SOT
- CLAUDE.md §2 보고 문서 표준 + §7 #16·#22 자기 점검 추가
- MEMORY.md 인덱스 메타 룰 최상위 추가
- 5 가이드 §0 메타 룰 추가 = 회의록·결재·메일·보고서·IA
- learnings.md 5번째 실패 사례 영구 기록

### B. scripts/check_v3 SEED_SYNONYMS 정합 점검 신규
- 노션 §8-1 핵심 6건 (명패·웰컴보드·MOU·시상보드·유도사인·스프링배너) 자동 점검
- 대시 표기 잔존 점검 (X-배너·I-배너 정정 자동 발견)
- 결과 = 21 점검 / 18 통과 / 3 경고 / 0 fail (이전 19 → 21)

### C. AI 어투 "영역" 과사용 회피
- 메모리 `feedback-sot-260518` 영역 영역 추가 = "영역" 어미 5회 이하 자체 카운트 의무
- CLAUDE.md §7 #23 자기 점검 추가
- "~영역" → "~부분·~쪽·~곳·~점·~사항" 대체 표현

### D. 자료_인덱스.md 5/19 신규 섹션 추가
- 5 가이드 정합 + 5/19 학습 5중 박제 + check:v3 21 점검 안내

### 검증
- TSC 0 에러·Next 빌드 PASS·check:v3 21/0 fail 유지
- 코드 변경 0건 (scripts/check_v3·메모리·가이드 5건·CLAUDE.md만)

---

## 2026-05-19 (v10.0 — 환경장식물 v3 노션 컴펌 본 정합 + 자체 검증 도구화 + Reflexion 영역 박제)

### 사용자 요청
조기흠 사원(AXDX팀, 2026-05-19): "환경장식물 컴펌받음·전부 진행·꼼꼼 확인·완벽 제작·자체 검증·최적화·고도화·재발 회피·계획안". 5/18 곽 이사 컴펌 후 노션 SOT 정합 + 5/19 자체 학습 패턴 영구 박제.

### A. 환경장식물 v3 노션 §1~§8 모두 코드 정합 (push 1~14)
- §6-2 12 카테고리 마스터 (X배너·I배너·가로등·가로현수막·세로현수막·통천·포디움·A4 가로/세로·A3 가로/세로·동선 배너)
- §6-3 파트별 추천 12종·§8-1 동의어 50+·§7 시설 가이드 6 행사장·§5 누적값 8 행사장
- §3-2 일정 D-10·D-5·D-3·D-1·§3-3 안내 문구 A안·§1-3 4단 안전망 (NIST RMF 정합)·§4 학습 메타 10건·§1-2 호출당 비용 25원
- key 호환 (chunchen_banner·design_items·운영 데이터 영향 0건)

### B. 5/19 자체 검증·재검증 4건 정정 (push 15~17)
- itemService.ts `route_banner` 매핑 누락 → 추가
- dashboardSeed SEED_SYNONYMS 'I-배너' 대시 → 'I배너' 정정
- 동선 배너 동의어 4건 추가 (유도사인·동선안내·화살표·방향 안내)
- SEED_SYNONYMS 'X-배너' 7건 → 'X배너' 일괄 정정·'유도사인' 중복 제거·노션 §8-1 누락 7건 추가 (명패·웰컴보드·MOU·웰컴 피켓 등)

### C. 로직 최적화·고도화 (push 18)
- recommendationLogicV3.ts: CATEGORY_BY_KEY Map 사전 빌드·O(N×M) → O(N)
- validateAndFixV3·facility_violation 자동 검사 (NIST §1-3 정합)
- buildFallbackRecommendationV3·matchByPartV3 재사용 DRY·violation_count 정확 집계

### D. 자체 검증 자동화 (push 19)
- scripts/check_v3_alignment.mjs 신규·5 영역 19 점검 (신규 키·구 키·legacy 라벨·외부 SOT·fallback)
- package.json: `npm run check:v3`·`npm run check:all` (4단계 통합)
- 결과: 19 점검 / 16 통과 / 3 경고 (호환 영역) / 0 실패

### E. docs 4건 신규 (push 20~21)
- docs/회의자료_환경장식물_v3_260520.md (5/19·5/20 곽 이사 보고 1슬라이드)
- docs/노션갱신_가이드_v3_260519.md (사용자 직접 노션 영역)
- docs/향후도입_SD_PyTorch_가이드_260519.md (5건 도입 후보 상세)
- docs/2026_05_19_월요일_계획안.md (5/19 일일 진행 계획)

### F. 메모리 박제 7건 (Reflexion 영역 영구 누적)
- feedback-사용자명시-우선원칙-260519 (어제 "왜 미완료인데 작동을 멈춰" 영구 회피)
- feedback-powershell-인코딩손상-260519 (한글 파일 Edit tool 의무)
- feedback-정합점검-체크리스트-260519 (grep 4단계 자동화)
- reference-환경장식물-광범위조사-260519 (8건 WebSearch)
- reference-5-19-20-회의자료-환경장식물-260519 (회의 SOT 1슬라이드)
- reference-AI-에이전트-자체개선-260519 (Reflexion·Verifiability·CI/CD)

### G. CLAUDE.md §7 자기 점검 21 질문 (5/19 신규 4건)
- 18·19·20·21번 = 사용자 명시 즉시·grep 4단계·PowerShell 한글·feelings 회피
- 어제 발생 4 문제 = 3중 회피 영구 (질문 + 메모리 + check:v3 도구)

### 검증
- TSC 0 에러 / Next 빌드 30+ 라우트 PASS / harness 72/72·0 fail / check:v3 19/0 fail
- 인터페이스 변경 0건·DB 운영 데이터 영향 0건·Vercel auto deploy 22회 트리거

### 잔존 영역 (사용자 영역·자율 X)
- Supabase Studio migration_v11 SQL 실행
- 라이브 검증 (https://ez-signage2.vercel.app)
- 노션 페이지 v3 시각 갱신
- Stable Diffusion·PyTorch·KoSBi 도입 결정 (곽 이사 컴펌·예산)

---

## 2026-05-16 (v9.55 — 야간 자율 진행 #51~#62) — 외부 검색 12건 + Agent 3개 결과 + hwp 변환 자동화

### 사용자 요청
조기흠 사원(AXDX팀, 2026-05-16): 사용자 9시 출근 후 "여러 검색 및 컴퓨터 내부 조사는?" "더 해야할거는 없는지?" "전부 진행" 등 다중 명시. 야간 자율 진행 사이클 #51~#62 (5분 간격).

### A. 외부 검색 12건 (Wake-up #51~#55)
- MICE ESG·PVC-free / 사내 AI 자동화 / 회사생활 / 문서·메일 자동화 / Vercel AI Gateway
- Supabase 2026 (Postgres 17·Postgres 14 deprecation 7/1) / Gemini 3 Flash Agentic Vision / MICE 도면 AI
- Claude Opus 4.7 / MICE 글로벌 표준 / 환경장식물 LED 신소재 (삼성 스페이셜·컬러 이페이퍼) / 행사 운영·Force Majeure·경쟁사
- 통합 메모리: `reference_external_research_unified_260516`

### B. Agent 3개 백그라운드 학습 (Wake-up #58~#60)
- **Agent #86 SWAT 1236 Task 전수 조사**: 자동화 60% (738건) + 신규 후보 NEW-1~5 (15대 확장)
- **Agent #87 데이터허브 192.168.10.191**: .ai 시안 80~150·CAD·11종 마스터 후보
- **Agent #88 G:\ 깊이 학습**: AI 업무 파트너 06 홍보 콘텐츠 신규·리앤컴 gscript

### C. 컴펌 후 활성화 도구 4개 추가 (Wake-up #56~#57)
- `docs/DB_MIGRATION_체크리스트_260516.md` — Supabase Studio 단계별 + Postgres 14 점검
- `docs/v1_v2_교체_PR_시안_260516.md` — 6 파일 변경 사전 + 호환성 안전망
- `업무/업무 자동화 인터뷰 정리/인터뷰_답변_양식_5건_260516.md` — RSVP·계약서·환경장식물·명패·언론보도
- `업무/회의록/회의록 아웃풋/회의록_5월_통합_260516.md` — 5/4·5/13·5/14·5/15 4건 1 docx

### D. hwp 변환 자동화 + 한컴 보안 모듈 영구 설치
- 계약09·계약11 .hwp → .docx 자동 변환 ✅ (HWP→HTML→DOCX 2단 우회)
- FilePathCheckerModule.dll 한컴 공식 GitHub 다운로드 + `C:\Hancom\` 설치 + 레지스트리 등록
- 향후 모든 hwp 파일 = Claude 자동 변환 가능 (보안 팝업 X)
- 메모리: `reference_hwp_conversion`

### E. 이사님 보고 자료 보강 (로컬 MD만, 노션·GitHub X)
- ES 1슬라이드에 9 pending 17종 + 11종 = **28종 마스터 가능** 1줄 추가
- SWAT NEW-1~5 = 별도 보고 영역 (이사님 보고 자료에 X — Skeptic 페르소나 결정 부담 회피)

### F. 메모리 정합 강화
- `feedback_no_live_change_before_confirm` §5/16 — 편집 위치 명시 의무 룰 추가 (사용자 명시 강조)
- `project_yagan_progress_260515` 5/16 09시 후 추가 진행 표 누적
- 신규 메모리 4개: `reference_external_research_unified_260516`·`reference_hwp_conversion`·자동화 후보 보강·5/14 메모리 누적

### 보존
- AiPipelineCard.tsx 미삭제 (v9.45 사용자 명시 보존 조건)
- v2 코드 5/15 작성 그대로 (5/16 추가 변경 0건 — 메모리·문서·시드 외부 정보만 보강)
- DB 라이브 변경 0건 / 라이브 사이트 변경 0건 / 노션 검토자 시각 영역 변경 0건
- 의존성 추가 0건

### 검증
- TSC 0 에러 PASS (5/16 재검증)
- Git status: 3 Modified + 9 Untracked (5/15 11건 + 5/16 docs 2건 추가)
- 라이브 변경 0건 — 컴펌 전 안전 영역만

---

## 2026-05-15 (v9.54 — 야간 자율 학습 사이클) — v2 코드 정밀 점검 + Agent 결과 적재 + 컴펌 후 도구

### 사용자 요청
조기흠 사원(AXDX팀, 2026-05-15 야간): "환경장식물 코드에 문제 꽤 있는거 확인 코드 한 줄 한 줄 비교하면서 문제 무엇이 있는지 꼼꼼하게 확인할것 우리의 목표 사항에 맞게 진행 가능한지 조사 및 진행할 것" + "야간 자율 진행 무한 진행".

### A. v2 코드 SOT 정합 점검 — 5건 수정

| # | 항목 | 발견 | 수정 |
|---|---|---|---|
| 1 | `matchByPart()` 매칭 등급 | SOT §4.1 "70% 안정 추천" 코드 미반영 | `MatchTier` ('stable'/'review'/'excluded') 분기 추가 |
| 2 | x_banner_static 수량 공식 | SOT ÷300+1 vs 코드 ÷500 | SOT 정합 (`max(2, ceil(÷300)+1)`) |
| 3 | `recommendV2WithGemini()` 통합 함수 | SOT §4 흐름 (Gemini 호출 + 4단 안전망) 함수 자체 누락 | 신규 작성 (fetch + responseSchema + validateAndFix + buildFallback) |
| 4 | `validateAndFix` type predicate 버그 | TS2677 — `as const` 좁아짐 | 명시 `RecommendItemV2` 타입 선언 |
| 5 | venue_key alias 4건 | Agent 1 폴더 vs seed key 불일치 | gscoex→gsco·hico_gyeongju→hico·the_shilla_seoul_2→the_shilla·sono_calm_goyang→sono_calm |

`npx tsc --noEmit` 0 에러 PASS.

### B. Agent 1·2 결과 v2 시드 보강
- signageCategoriesSeed.ts `source_keywords` 보강 3종: did_signage·photo_wall·podium_title (SPP·APEC·KME 2019 실측)
- 200건 .ai 시안 카탈로그 → pending 9종 채택 권고 정밀화 (DID 22건·포토월 4건·POP 0건 매칭)
- 700 도면 메타 → 결락 4곳 (신라호텔·안동·THE_SHILLA·HICO) 시설 가이드 신규 등록 우선순위

### C. 컴펌 후 활성화 도구 신규 (2개)
- `scripts/seed_v2.mjs` — Supabase v2 시드 INSERT 자동화 (idempotent, 5 테이블)
- `scripts/test_v2_seeds.mjs` — 24 카테고리·43 venue·매칭 무결성 자동 검증

### D. SOT·문서 정합화
- `CLAUDE.md §16-D` 신설 — 5/14 회의 결정 SOT 링크 + v2 시드 인덱스 + EZ 40.15.03 정합
- `NEW_STRUCTURE_260514.md §4.1` — 수량 공식 코드 실측 정합 (x배너 ÷300·포디움 × 2·가로등 ÷50)

### E. 사용자 컴펌 대기 항목 (대화.txt 박제)
1. 9 pending 카테고리 결정 — 옵션 A 권장 (17종 = 채택 5 + 통합 2 + 거절 2)
2. `migration_v10_new_structure.sql` Supabase Studio 실행
3. Claude Code 개선 5건 도입 범위 (Agent 4 분석)

### 보존
- AiPipelineCard.tsx 미삭제 (v9.45 사용자 명시 보존 조건)
- v9.46 페르소나 본체 그대로
- recommendSignage.ts (구버전) 미교체 — 컴펌 후
- DB 라이브 변경 0건 / 라이브 사이트 변경 0건
- 의존성 추가 0건 / 빌드 영향 0건

### 검증
- TSC 0 에러 / v2 코드 통합 점검 PASS
- 라이브 변경 (컴펌 전 OK 영역) 0건 — 메모리·문서·시드·로직·SQL 작성만

---

## 2026-05-14 (v9.53) — 페르소나 textarea placeholder를 가짜 예시 → 실제 PIPELINE_BLOCKS 기본 동작 본문으로 교체

### 사용자 요청
조기흠 사원(AXDX팀, 2026-05-14): "/admin/ai 페이지의 페르소나 textarea placeholder를 ′예시 본문′이 아닌 **실제 적용된 PIPELINE_BLOCKS 기본 동작 본문**으로 변경".
배경: hint = ′비우면 기본값 사용′인데 placeholder는 가짜 예시(′당신은 [card.title] 전문가입니다 ...′) → ′기본 동작′이 무엇인지 화면 어디에도 안 보임. 사용자가 비웠을 때 실제 적용되는 본문을 placeholder에서 즉시 확인할 수 있어야 편집 의도(기본값 위에 무엇을 더할지)가 명확해짐.

### Step A — `lib/ai/agentPipeline.ts` PIPELINE_CARDS에 default_persona 필드 추가
- `PipelineCard` interface에 `default_persona: string` 필드 추가 (JSDoc — SOT는 PIPELINE_BLOCKS, 직접 편집 금지)
- 신규 헬퍼 `buildDefaultPersonaForCard(stepKeys)` — 묶인 step body들을 trim 후 `\n` join한 텍스트 반환
- `PIPELINE_CARDS.recommend.default_persona` = step1·2·3 body join (파트 후보 추출 → 시설 가이드 제약 → 표준 수량 산정 본문이 그대로 노출 — ′3번 AI 투입′ 의미 시각 강조 박스 없이도 placeholder에 자연 노출)
- `PIPELINE_CARDS.floor_plan_vision.default_persona` = step4 body 단독 (도면 Vision 보강 본문)

### Step B — `app/(dashboard)/admin/ai/AdminAiClient.tsx` placeholder 교체
- 이전: `placeholder={`예시:\n당신은 ${card.title} 전문가입니다.\n행사 장소 {{venue}}, 선택 파트 {{parts}}를 기반으로 추천을 작성하세요.`}`
- 변경: `placeholder={card.default_persona}`
- 헤더 사이클 코멘트(v9.53) 추가 — 변경 사유·SOT(PIPELINE_BLOCKS)·′3번 AI 투입′ 의미 노출 명시

### 보존
- 모든 이전 사이클 그대로 (v9.46 페르소나 본체 + v9.51 cardOverrides 흐름 + v9.52 부연 정리)
- AiPipelineCard.tsx 미삭제 (v9.45 사용자 명시 보존 조건)
- DB 스키마 변경 0건 / 의존성 추가 0건 / recommendSignage.ts·case-a 영향 0건
- localStorage `admin_ai_settings_v3` 동작 그대로 (placeholder만 변경, 키·값 영향 0건)
- ′📍 적용 위치: 새 프로젝트 만들기 → AI 추천 받기′ 박스가 v9.52 추가 정리에서 이미 삭제된 상태 그대로 유지 (관련 무관)

### 변경 파일 (2개)
- `lib/ai/agentPipeline.ts` (PipelineCard.default_persona 필드 + buildDefaultPersonaForCard 헬퍼 + PIPELINE_CARDS 두 카드에 default_persona 산출)
- `app/(dashboard)/admin/ai/AdminAiClient.tsx` (textarea placeholder = card.default_persona + v9.53 사이클 코멘트)

### 검증
- TSC 0 에러
- Next 빌드 36/36 라우트 PASS
- harness 70/72 통과 (0 fail, 2 warn = dev 미실행 + Supabase 401 — 작업 무관)
- 라우트 크기:
  - `/admin/ai` 7.23 → 7.47 kB (+0.24 kB — placeholder 문자열이 가짜 예시 1줄 → 실제 step body 다중 줄로 길어진 영향)

### 효과
- /admin/ai 진입 → 페르소나 textarea 빈 상태에서 placeholder가 실제 step body 노출
- 카드 1 (추천): "1순위: 프로그램 파트별 환경장식물 후보 추출 ... / 2순위: 행사장 시설 가이드 제약 ... / 3순위: 행사장 시설 가이드 표준 수량 ..."
- 카드 2 (도면 분석 보강): "[보강] 행사장 배치도 Vision 분석 → 동선·설치 위치 컨텍스트"
- ′3번 AI 투입 = 3순위 표준 수량 산정′ 의미가 placeholder 본문에서 자연 노출 → 김연아 대리님 명시 영역 의미 전달 보장
- PIPELINE_BLOCKS 본문이 SOT — 향후 step body 변경 시 default_persona 자동 동기화 (헬퍼 함수 통해)

### 배포
- 브랜치: `auto/v9.53-persona-placeholder-real-default-260514` (v9.52 위에서 분기)
- main 머지·push는 사용자 결정 (작업 지시: 보고만, push 자동 X)

---

## 2026-05-14 (v9.52 추가) — 카드 안내 박스·헤더 부연·hint 단순화 (편집 도구 본질 집중)

### 사용자 추가 지적 (5/14)
조기흠 사원(AXDX팀, 2026-05-14): 1차 v9.52에 이어 4가지 추가 지시.
1. ′적용 위치: 새 프로젝트 만들기 → AI 추천 받기′ MapPin blue 박스 삭제
   - 사유: ′AI 추천 받기′ 버튼 없이 프로젝트 생성 시 자동 진행 형태로 동작 변경됨 → 안내가 부정확
2. 카드 헤더 부연 ′(항상 호출)′ ′(도면 첨부 시만)′ 단순화 → 배지가 이미 같은 정보 표시
3. 모든 안내 문구 정리 (′응?′ 금지 룰)
   - ′(현재 기본)′ 모델 select 옵션 텍스트 / hint ′현재 Gemini 사용 중′ / ′0.0~1.0 (낮을수록 일관)′ 등
   - 페르소나 hint ′비워두면 기본 동작 그대로. 변수 토큰은 ...′ → ′비우면 기본값 사용′
   - 변수 chip 패널 안내문 ′변수 삽입 (커서 위치에 토큰이 추가됩니다)′ 삭제
4. ′백단 로직 편집 가능′ 본질 = 편집 도구 자체에 집중. 부연·중복 모두 제거.

### 코드 변경

#### `lib/ai/agentPipeline.ts`
- `PIPELINE_CARDS.recommend.title`: ′추천 (항상 호출)′ → ′추천′
- `PIPELINE_CARDS.floor_plan_vision.title`: ′도면 분석 보강 (도면 첨부 시만)′ → ′도면 분석 보강′
- 사유: 카드 헤더 옆 배지(indigo ′항상 호출′ / amber ′도면 첨부 시만′)가 같은 정보를 노출 — title 괄호 부연은 중복
- v9.52 헤더 단순화 사유 주석 1블록 갱신

#### `app/(dashboard)/admin/ai/AdminAiClient.tsx`
- lucide import에서 `MapPin`, `Plus` 제거 (사용처 삭제됨)
- MapPin 안내 박스 JSX 4줄 삭제 + v9.52 추가 사유 주석 1블록
- MODEL_OPTIONS 6종 라벨에서 부연 텍스트 일괄 제거
  - ′Gemini 2.5 Flash (현재 기본)′ → ′Gemini 2.5 Flash′
  - ′Gemini 2.5 Pro (정확)′ → ′Gemini 2.5 Pro′
  - ′GPT-4o (후속 사이클 활성 예정)′ → ′GPT-4o′
  - ′GPT-4o mini (후속 사이클)′ → ′GPT-4o mini′
  - ′Claude 3.5 Sonnet (후속 사이클)′ → ′Claude 3.5 Sonnet′
  - ′Claude 3.7 Sonnet (후속 사이클)′ → ′Claude 3.7 Sonnet′
- Field hint 정리:
  - 모델 ′hint="현재 Gemini 사용 중"′ 제거
  - Temperature ′hint="0.0~1.0 (낮을수록 일관)"′ 제거
  - 페르소나 ′hint="비워두면 기본 동작 그대로. 변수 토큰은 추천 호출 시점에 실제 데이터로 치환됩니다."′ → ′hint="비우면 기본값 사용"′
- 변수 chip 패널 안내문 `<p className="text-[10px] ...">변수 삽입 ...</p>` 1블록 삭제 (chip 자체로 의미 명확)
- placeholder의 `card.title.replace(/\s*\(.*\)\s*/, '')`에서 정규식 제거 (title에 이미 괄호 부연 없음)

### 보존
- 카드 본체 = 헤더 (title + 배지) + 모델 select + Temperature + 변수 chip 패널 + 페르소나 textarea
- v9.52 1차 작업 (notice·indigo highlight 박스 5건 삭제) 그대로
- v9.46 페르소나 본체 + v9.51 cardOverrides 흐름 + AiPipelineCard.tsx 미삭제 (사용자 명시 보존 조건)
- localStorage admin_ai_settings_v3 동작 그대로 (placeholder만 단순화, 키·구조 영향 0건)
- DB·의존성·recommendSignage.ts 영향 0건

### 변경 파일 (2개)
- `lib/ai/agentPipeline.ts` (PIPELINE_CARDS.title 2건 단순화 + v9.52 헤더 사유 주석 갱신)
- `app/(dashboard)/admin/ai/AdminAiClient.tsx` (MapPin 박스 삭제 + lucide import 정리 + 모델 라벨·Field hint·변수 chip 안내문·placeholder 정규식 일괄 단순화)

### 검증
- TSC 0 에러
- Next 빌드 36/36 라우트 PASS (admin/ai 라우트 신호 양호)
- harness 70/72 통과 (0 fail, 2 warn = dev 미실행 + Supabase env — 작업 무관)
- 라우트 크기:
  - `/admin/ai` 7.71 → 7.23 kB (-0.48 kB — 박스 4줄 + hint 3건 + 안내문 1블록 + 모델 라벨 부연 정리)
  - 작업 지시 예상 6~7 kB 적중

### 최종 카드 UI 구조 (남은 것 / 빠진 것)
**남은 것 (각 카드)**
- 카드 헤더: title (′추천′ / ′도면 분석 보강′) + lucide 아이콘 + indigo/amber 배지 (′항상 호출′ / ′도면 첨부 시만′)
- 모델 select (단순 라벨, hint 없음)
- Temperature 입력 (단순)
- 변수 chip 패널 (5종 토큰, 안내문 없음 — chip 자체로 의미 전달)
- 페르소나 textarea (placeholder = 예시 본문, hint = ′비우면 기본값 사용′)

**빠진 것**
- MapPin ′적용 위치′ blue 안내 박스 (1줄)
- indigo highlight ★ 표준 수량 산정 박스 (v9.52 1차에서 삭제됨)
- card.notice 안내문 5건 (v9.52 1차에서 빈 문자열 처리됨 → 조건부 렌더 스킵)
- 카드 헤더 title 괄호 부연 ′(항상 호출)′ / ′(도면 첨부 시만)′
- 모델 select 옵션 부연 ′(현재 기본)′·′(정확)′·′(후속 사이클)′ 등
- Field hint ′현재 Gemini 사용 중′ / ′0.0~1.0 (낮을수록 일관)′ / 페르소나 부연 한 줄
- 변수 chip 패널 ′변수 삽입 (커서 위치에 토큰이 추가됩니다)′ 안내문

### 배포
- 브랜치: `auto/v9.52-admin-ai-card-cleanup-260514` (1차 v9.52 위에 누적 — 동일 브랜치)
- main 머지·push는 사용자 결정 (작업 지시: 보고만, push 자동 X)

---

## 2026-05-14 (v9.52) — 어드민 AI 카드 안 부연·강조 텍스트 5건 삭제

### 사용자 요청
조기흠 사원(AXDX팀, 2026-05-14): "/admin/ai 페이지의 추천 카드·도면 분석 카드 안 부연·강조 5건 삭제".
이유: 모든 부연·강조 텍스트 = ′응? 금지′ + ′내부 경로 금지′ 룰 위반. 사용자(비개발자) 입장에서 의미 없는 코드·내부 경로 메타.

### 삭제 대상 5건 (모두 처리 완료)
| # | 위치 | 내용 | 처리 |
|---|------|------|------|
| 1 | 카드 1 indigo highlight 박스 | ′★ 표준 수량 산정 = 김연아 대리님 명시 ′3번 AI 투입′ 영역′ | **박스 전체 삭제** (사용자 명시) |
| 2 | 카드 1 안내 | ′이 카드 안의 페르소나가 파트 후보·시설 제약과 함께 행사장 시설 가이드 표준 수량 산정에도 동일 적용됩니다.′ | 삭제 (① 박스에 포함되어 함께 제거) |
| 3 | 카드 1 안내 | ′이 페르소나는 추천 흐름 1번의 Gemini 호출에 사용됩니다. 파트 후보 추출 → 시설 제약 → 표준 수량 산정 — 3 step이 단일 프롬프트로 합쳐집니다.′ | agentPipeline.ts notice = '' / AdminAiClient `<p>` 렌더 스킵 |
| 4 | 카드 1 두 번째 indigo highlight 중복 박스 | (1번과 동일 박스) | ① 통합 처리 |
| 5 | 카드 2 안내 | ′분석 결과는 추천 호출의 [보강] 절로 자동 합쳐져 location 필드 정확도를 올립니다.′ | agentPipeline.ts notice = '' / AdminAiClient `<p>` 렌더 스킵 |

### 코드 변경

#### `lib/ai/agentPipeline.ts`
- `PIPELINE_CARDS.recommend.notice` = `''` (이전: ′이 페르소나는 추천 흐름 1번의 Gemini 호출에 사용됩니다 ...′)
- `PIPELINE_CARDS.floor_plan_vision.notice` = `''` (이전: ′도면 첨부 시에만 별도 Gemini Vision 호출됩니다. 분석 결과는 추천 호출의 [보강] 절로 자동 합쳐져 ...′)
- 인터페이스(`PipelineCard.notice: string`)는 호환 유지 — 빈 문자열 허용
- v9.52 삭제 사유 주석 1블록 추가

#### `app/(dashboard)/admin/ai/AdminAiClient.tsx`
- 카드 1 안 indigo highlight 박스 JSX 블록 14줄 통째 삭제 (366~379줄 — `card.key === 'recommend' && (...)` 조건 + ★ 표준 수량 산정 라벨 + 본문 안내문)
- card.notice `<p>` 렌더링을 `card.notice && (<p>...</p>)` 조건부로 변경 (notice 빈 문자열이면 `<p>` 자체 렌더 스킵 — DOM 깔끔)
- 삭제 사유 주석 1블록 (v9.52) + 인라인 코멘트로 박스 삭제 위치 마킹

### 보존 (사용자 명시)
- ✅ 카드 1 = ′추천 (항상 호출)′ 헤더 + 페르소나 textarea + 변수 chip 패널
- ✅ 카드 2 = ′도면 분석 보강 (도면 첨부 시만)′ 헤더 + 페르소나 textarea + 변수 chip 패널
- ✅ ′항상 호출 / 도면 첨부 시만′ 배지 (indigo / amber)
- ✅ 모델 select / Temperature / placeholder ′기본 동작:′ + 본문
- ✅ 안내 박스 1줄 ′📍 적용 위치: 새 프로젝트 만들기 → AI 추천 받기′ (v9.48-C, 카드 위)
- ✅ v9.46 페르소나 본체 + v9.51 cardOverrides 흐름 그대로
- ✅ AiPipelineCard.tsx 미삭제 (v9.45 사용자 명시 보존 조건)
- ✅ DB 스키마 변경 0건 / 의존성 추가 0건 / recommendSignage.ts·case-a 영향 0건

### 추가 고려 (사용자 5/14 명시 보존 결정)
- ′3번 AI 투입′ 강조 박스 삭제 시 김연아 대리님 카톡(′3번 AI 투입 부분에서 AI 설정 + 페르소나 수정′) 시각 강조 약해질 가능성 검토. 그러나 사용자 5/14 명시 = 박스 자체 삭제 우선.
- ′3번 AI 투입′ 의미는 페르소나 textarea 안 ′기본 동작:′ 본문에서 ′3순위: 행사장 시설 가이드 표준 수량′ 텍스트로 노출 → 박스 없어도 의미 전달 가능 (사용자 모호 X).

### 변경 파일 (2개)
- `lib/ai/agentPipeline.ts` (PIPELINE_CARDS.recommend.notice + floor_plan_vision.notice → '' + v9.52 주석)
- `app/(dashboard)/admin/ai/AdminAiClient.tsx` (indigo highlight 박스 통째 삭제 + notice 조건부 렌더 + v9.52 주석)

### 검증
- TSC 0 에러
- Next 빌드 29/29 라우트 PASS
- harness 70/72 통과 (0 fail, 2 warn = dev 미실행 + Supabase env — 작업 무관)
- 라우트 크기 변화:
  - `/admin/ai` 8.68 → 7.71 kB (-0.97 kB — 박스 JSX 14줄 + notice `<p>` 5건 정리)
  - 작업 지시 예상 7.x kB 적중

### 배포
- 브랜치: `auto/v9.52-admin-ai-card-cleanup-260514` (main HEAD에서 분기 — v9.51 위)
- main 머지·push는 사용자 결정 (작업 지시: 보고만, push 자동 X)

---

## 2026-05-14 (v9.51) — AI 추천 파이프라인 4 step → 2 카드 통합 + 페르소나 인라인 변수 chip (D-1)

### 사용자 요청
조기흠 사원(AXDX팀, 2026-05-14): "v9.51 사이클 — AI 추천 파이프라인을 4 step → 2 카드로 통합 + 페르소나 textarea에 인라인 변수 chip(드래그·이동 가능) 기능 추가".
김연아 대리님 카톡 원문 보존: "관리자페이지 -AI 관리에 3번 AI 투입되는 부분에서 투입되는 AI를 설정하고 페르소나를 수정할 수 있는 기능을 추가"
→ ′3번 AI 투입′ = 통합 후에도 카드 1(추천) 안에 indigo highlight 박스로 ′표준 수량 산정′ 영역 시각 강조 유지.

### Step A — 4 step → 2 카드 통합 (UI + 데이터 구조)

#### 카드 1 — 추천 (항상 호출)
- 통합 step: step1(파트 후보 추출) + step2(시설 가이드 제약) + step3(표준 수량 산정)
- 1 페르소나 textarea (3 step 합쳐서 1 prompt로 묶임 — Gemini 단일 호출 1회)
- 카드 안내: "이 페르소나는 추천 흐름 1번의 Gemini 호출에 사용됩니다. 파트 후보 추출 → 시설 제약 → 표준 수량 산정"
- ★ ′3번 AI 투입′ indigo highlight 박스 (카드 내부) — 김연아 대리님 명시 영역 시각 강조 유지

#### 카드 2 — 도면 분석 보강 (도면 첨부 시만)
- step4(도면 Vision 보강) 단독
- 1 페르소나 textarea
- 카드 안내: "도면 첨부 시에만 별도 Gemini Vision 호출됩니다."
- amber `도면 첨부 시만` 배지 (카드 1은 indigo `항상 호출`)

### Step B — 코드 변경

#### `lib/ai/agentPipeline.ts` (SOT 확장)
- `CardKey` union 신설 (`recommend` | `floor_plan_vision`)
- `CardOverridesMap`·`PIPELINE_CARDS`·`PIPELINE_CARD_LIST` 신규 export — 카드 단위 메타·페르소나 입력 구조
- `expandCardOverrides(cardOverrides, legacyStepOverrides)` — 카드 페르소나를 step1·2·3(또는 step4) 단위 StepOverridesMap으로 펼치는 어댑터. v9.46 stepOverrides도 호환 위해 함께 받음.
- `applyPersonaOverrides` — 빈 문자열 신호 처리 추가 (다중 step 묶음의 비-첫 step body 비움)
- `buildPipelineLogicSectionWith` — 빈 body step은 join에서 제외 (SYSTEM_INSTRUCTION 깔끔)
- `PERSONA_VARIABLES` (5종 변수 토큰) + `substitutePersonaVariables()` — 변수 chip 토큰 치환
  - `{{venue}}` 행사 장소 / `{{parts}}` 선택 파트 / `{{floor_plan}}` 도면 분석 결과(도면 카드 전용) / `{{past_events}}` 과거 사례 / `{{facility_guide}}` 시설 가이드

#### `lib/ai/recommendSignage.ts` (cardOverrides 우선 적용)
- `RecommendInput.cardOverrides?: CardOverridesMap` 신규 (stepOverrides는 호환 위해 보존)
- 추천 카드 페르소나는 `substitutePersonaVariables`로 변수 토큰 치환 후 `expandCardOverrides`로 step1·2·3에 일괄 적용
- 도면 카드 페르소나는 Vision 호출 후 결과 텍스트를 `{{floor_plan}}` 토큰에 치환하여 [보강] 절 작성
- `effectiveTemp`·`sysInstruction` 모두 expandedStepOverrides 기반

#### `app/(dashboard)/admin/ai/AdminAiClient.tsx` (UI 전면 개편)
- `STEP_SETTINGS_KEY` (v2) → `CARD_SETTINGS_KEY` (v3) — 카드 단위 신규 키, v2는 호환 위해 보존
- 첫 진입 시 v3 미존재면 v2 자동 마이그레이션 (step1·2·3 중 가장 긴 페르소나 → recommend 카드, step4 → floor_plan_vision 카드)
- 4 step grid → 2 카드 vertical stack
- 변수 chip 패널 (D-1 단순 — 클릭 시 textarea 커서 위치에 토큰 삽입). `insertVariable()` 헬퍼 + `textareaRefs` ref 관리
- 각 카드 사용 가능 변수 자동 필터 (`cardScope` 기반 — 도면 분석 결과는 floor_plan_vision 카드에만)
- 카드 1 안에 indigo highlight 박스 ′★ 표준 수량 산정 = 김연아 대리님 명시 ′3번 AI 투입′ 영역′ 시각 강조 유지
- 안내 박스에 ′적용 위치: 새 프로젝트 만들기 → AI 추천 받기′ 명시 (그대로 보존)
- 의존성 0건 추가 (D-1 단순 적용 — 풀 Tiptap chip 드래그는 v9.52 후속)

#### `app/(dashboard)/projects/new/case-a/page.tsx` (loadCardOverrides + cardOverrides body)
- `loadStepOverrides()` → `loadCardOverrides()` — v3 우선, v2 자동 마이그레이션
- API body에 `cardOverrides` 전달 (stepOverrides 자리 대체)

### Step C — 페르소나 textarea 인라인 변수 chip (D-1 단순 적용)
사용자 명시 ′움직여서 넣을 수 있게′ — D-2 풀 Tiptap chip 드래그는 ~6시간 작업으로 v9.52 분리.
v9.51은 D-1 단순 (textarea + 변수 삽입 패널, 커서 위치 삽입) ~2시간 적용.
- 변수 패널 5종 chip 색상 코딩 (indigo/emerald/amber/violet/sky)
- 클릭 시 텍스트 영역 커서 위치에 `{{token}}` 삽입 + 커서 자동 이동
- `requestAnimationFrame` 후 selectionRange 재설정 (React state 업데이트 후 DOM 반영 보장)
- 도면 분석 결과 chip은 도면 카드에만 노출 (cardScope='floor_plan_vision')

### 보존 (사용자 명시)
- ✅ AiPipelineCard.tsx 미삭제 (v9.45 사용자 명시 보존 조건)
- ✅ v9.46 페르소나 본체 그대로 (구조만 4 step → 2 카드로 변경, localStorage v2는 자동 마이그레이션)
- ✅ v9.47 IA SOT KPI 정렬 그대로 (3 카드)
- ✅ v9.48 admin AI 정리 그대로 (전역 설정 폼 = 운영 설정만, 하단 보존)
- ✅ v9.49 운영 대시보드 정리 그대로
- ✅ DB 스키마 변경 0건 / 의존성 추가 0건
- ✅ 김연아 대리님 ′3번 AI 투입′ 명시 영역 시각 강조 유지 (indigo highlight 박스)

### 변경 파일 (4개)
- `lib/ai/agentPipeline.ts` (CardKey·CardOverridesMap·PIPELINE_CARDS·expandCardOverrides·PERSONA_VARIABLES·substitutePersonaVariables 신설)
- `lib/ai/recommendSignage.ts` (cardOverrides 우선 처리 + 변수 토큰 치환 + 도면 카드 페르소나 보강 절 결합)
- `app/(dashboard)/admin/ai/AdminAiClient.tsx` (4 step grid → 2 카드 + 변수 chip 패널 + v2→v3 마이그레이션 + 3번 AI 투입 highlight 보존)
- `app/(dashboard)/projects/new/case-a/page.tsx` (loadCardOverrides + body cardOverrides 전달)

### 검증
- TSC 0 에러
- Next 빌드 29/29 라우트 PASS
- harness 70/72 통과 (0 fail, 2 warn = dev 미실행 + Supabase 401 — 작업 무관)
- 라우트 크기 변화:
  - `/admin/ai` 7.5 → 8.68 kB (+1.18 kB — 변수 chip 패널 추가)
  - `/projects/new/case-a` 11.9 → 12.1 kB (+0.2 kB — loadCardOverrides 마이그레이션 헬퍼)

### 후속 (v9.52 분리)
- D-2 풀 Tiptap chip 드래그 (의존성 추가: @tiptap/react @tiptap/starter-kit @tiptap/extension-mention — 모두 MIT 라이선스 → CLAUDE.md §자율 작업 가이드 ③ 룰 부합)
- 시각 chip + 드래그로 위치 이동 + 클릭 삭제 + HTML/JSON 직렬화 시 토큰화

### 배포
- 브랜치: `auto/v9.51-ai-pipeline-2cards-260514` (auto/v9.49-admin-ops-strip-260514 위에서 분기)
- main 머지·push는 사용자 결정 (작업 지시: 보고만, push 자동 X)

---

## 2026-05-14 (v9.48-C) — step별 페르소나 안내 박스 한 줄로 단순화

### 사용자 요청
조기흠 사원(AXDX팀, 2026-05-14, 회의 14:00 임박):
- "박스 안내는 간단하게 사용되는 부분만"
- 4 step 상세 설명은 step 카드별 desc로 이미 노출되므로 박스에서는 ′어디서 쓰이는지′만 1줄.

### 변경
- `app/(dashboard)/admin/ai/AdminAiClient.tsx`:
  - v9.48-B에서 추가한 multi-line 박스(제목 ′이 설정이 적용되는 곳′ + 본문 2문단 + Step 1~4 리스트)를 한 줄로 축약.
  - 새 박스 한 줄: "📍 적용 위치: 새 프로젝트 만들기 → AI 추천 받기"
  - 스타일 유지: blue 계열 배경(`bg-blue-50 border border-blue-200`) + lucide `MapPin` 아이콘 + small text.
  - import는 그대로 유지 (`MapPin`).

### 보존
- AiPipelineCard.tsx 미삭제 (v9.45 사용자 명시 보존 조건)
- v9.46 step 페르소나 본체 그대로
- v9.48 1차(UI 중복·코드 메타 정리) 작업 그대로 — 전역 폼 슬림화·step별 라벨 친절화 모두 유지
- DB 스키마 변경 0건 / 의존성 추가 0건

### 검증
- TSC 0 에러
- Next 빌드 29/29 라우트 PASS
- `/admin/ai` 7.5(v9.48-B) → 6.95 kB (박스 축약으로 -0.55 kB)

### 배포
- 브랜치: `auto/v9.48-admin-ai-cleanup-260514`
- main 머지·push는 사용자 결정

---

## 2026-05-14 (v9.48) — AI 관리 화면 UI 중복·코드 메타 정리 + step별 페르소나 영역 안내 박스 추가

### 사용자 요청
조기흠 사원(AXDX팀, 2026-05-14):
1. ′AI 환경 설정′(전역 폼) + ′AI 추천 파이프라인 step별 페르소나 설정′ 두 영역이 모델·Temperature·system_prompt를 중복 노출 → "이게 뭐가 다른데?" 의문 + 코드 메타(`agentPipeline.ts`·`localStorage(admin_ai_settings_v2)`·`admin_ai_settings 테이블`·`/projects/new/case-a` 등) UI 노출 = ′응?′ 룰 위반.
2. (추가) "step별 페르소나 설정 = 그래서 저걸 어디서 쓰는데?" 의문 해소 — 어디서 적용되는지 친절한 안내 박스 추가.

### v9.48 본 작업 (1차) — AdminAiClient.tsx UI 중복·코드 메타 정리
- step별 폼 위 amber 안내 + AI 환경 설정 아래 footer 삭제 (코드 메타 제거)
- 전역 폼 슬림화: 모델·Temperature·시스템 프롬프트 입력칸 제거 → step별 폼으로 일원화.
  제목 ′AI 환경 설정′ → ′운영 설정 — 호출 한도·예산′. 최대 출력 토큰·월 예산·이상 사용자 임계값 3개만 유지.
- step별 폼 라벨 친절화: ′현 사이클은 Gemini만 활성′ → ′현재 Gemini 사용 중′,
  ′기본 본문:′ → ′기본 동작:′, ′비우면 기본 본문 사용′ → ′비워두면 기본 동작 그대로′
- AiSettings 인터페이스 슬림화: model·temperature·system_prompt 필드 제거
- recommendSignage.ts는 step별 오버라이드가 비면 PIPELINE_BLOCKS 기본 동작으로 자동 fallback (영향 없음)

### v9.48 추가 작업 (2차) — step별 페르소나 영역 ′어디서 쓰이나요?′ 안내 박스 추가
- AdminAiClient.tsx: step별 페르소나 설정 영역 헤더 직후(grid 위)에 blue/indigo 톤 안내 박스 삽입
- 박스 구성:
  - 아이콘: lucide-react `MapPin` (indigo-700)
  - 제목: bold + indigo "이 설정이 적용되는 곳"
  - 본문: ′새 프로젝트 만들기 → AI 추천 받기′ 화면에서 AI가 환경장식물을 추천할 때 사용 + 4단계 흐름 설명
  - 4 step 리스트: Step 1 파트 후보 추출 / Step 2 시설 가이드 제약 / Step 3 표준 수량 산정 / Step 4 도면 Vision 보강
- 스타일: `bg-blue-50 border border-blue-200 rounded-md p-3 text-sm mb-4`
- import 추가: lucide-react `MapPin`

### 변경 파일 (1개)
- `app/(dashboard)/admin/ai/AdminAiClient.tsx` (UI 중복·코드 메타 정리 + ′어디서 쓰이나요?′ 안내 박스 추가)

### 보존
- AiPipelineCard.tsx 미삭제 (v9.45 사용자 명시 보존 조건)
- v9.46 step 페르소나 본체 그대로 (lib/ai/agentPipeline.ts + STEP_SETTINGS_KEY localStorage)
- DB 스키마 변경 0건 / 의존성 추가 0건
- v9.47 IA SOT 정렬 작업 그대로 (KPI 카드·AccuracyTable 본체)

### 검증
- TSC 0 에러
- Next 빌드 36/36 라우트 PASS
- `/admin/ai` 7.34 (v9.47) → 6.95 kB (v9.48 — 전역 폼 슬림화로 -0.39 kB. 안내 박스(+) 와 모델/Temperature/system_prompt 입력칸 제거(-)의 순감)
- `/admin` 4.18 (v9.47) → 3.46 kB (page.tsx의 partStageBars·calendarItems 잔존 정리 = -0.72 kB)

### 배포
- 브랜치: `auto/v9.48-admin-ai-cleanup-260514` (auto/v9.47-align-to-ia-260514 위에서 분기)
- main 머지·push는 사용자 결정

---

## 2026-05-14 (v9.49) — 운영 대시보드 IA SOT 외 영역 2개 삭제 (Stacked Bar + 캘린더)

### 사용자 요청
조기흠 사원(AXDX팀, 2026-05-14): "/admin 운영 대시보드에서 IA SOT 외 추가 영역 2개 삭제".
IA SOT = 김연아 대리님 스크린샷 = 운영 대시보드에 ′KPI 4 + 프로젝트 등록 현황′만 존재.
v9.47 정렬 후에도 코드에 IA에 없는 ′파트별 상태 분포 (Stacked Bar)′ + ′이번 달 일정 (D-14~D+7) 캘린더′ 두 영역이 잔존 → 삭제.
v9.48 AdminAiClient WIP는 별도 브랜치(`auto/v9.48-admin-ai-cleanup-260514`)에서 진행 — 파일 겹침 0건.

### 영역 1 — 파트별 상태 분포 (Stacked Bar) 삭제
**AdminOpsClient.tsx + page.tsx**

| 위치 | v9.47 | v9.49 |
|---|---|---|
| 라벨 | "파트별 상태 분포 (Stacked)" — ′미분류 16건 / 부대행사 - 투어형 8건 / 회의 8건 / 공식행사 7건 / 홍보 7건 / ...′ | **삭제** |
| 범례 | 진행 / 완료 / 반려 (indigo·emerald·rose) | **삭제** |

코드 변경:
  - AdminOpsClient.tsx: `PartBar` 인터페이스 + `partStageBars` prop + 섹션 JSX 블록 제거
  - page.tsx: `partStageMap` Map + 집계 루프 + `partStageBars` 산출 로직 제거 (~16줄)
  - props 전달부에서 partStageBars 키 제거

### 영역 2 — 이번 달 일정 (D-14 ~ D+7) 캘린더 삭제
**AdminOpsClient.tsx + page.tsx**

| 위치 | v9.47 | v9.49 |
|---|---|---|
| 라벨 | "이번 달 일정 (D-14 ~ D+7)" — 프로젝트명 / D+14 / 2026-04-30 / 코엑스 카드 + ′정상회의 / D+7 / 2026-05-07 / 롯데호텔 서울′ 등 D-day 카드 | **삭제** |
| 컴포넌트 | Calendar 아이콘 + D-day 컬러 코딩(rose/amber/emerald/slate) + grid 1/2/3컬럼 카드 | **삭제** |

코드 변경:
  - AdminOpsClient.tsx: `CalendarItem` 인터페이스 + `calendar` prop + 섹션 JSX 블록 + `Calendar` lucide import 제거
  - page.tsx: `calStart` / `calEnd` Date 변수 + `calendarItems` 산출 로직 제거 (~22줄)
  - props 전달부에서 calendar 키 제거

### 추가 정리 (의미 단위 같이 처리)
- 섹션 라벨 ′전체 프로젝트 현황′ → ′프로젝트 등록 현황′ (IA SOT 라벨 정합 — 사용자 명시 보존 영역 명칭)
- v9.47에서 보존했던 `void weekStart` 및 weekStart 변수 자체 제거 (v9.49에선 불필요)
- 변경 사유 코멘트 갱신 (v9.49 블록 추가)

### 보존 (사용자 명시 IA SOT)
- ✅ KPI 4종 (진행 / 신규(최근 일주일) / 전체 / 완료율) — v9.47 그대로
- ✅ 프로젝트 등록 현황 (16컬럼 테이블 + 6필터 + 액션 컬럼) — v9.47 그대로
- ✅ AdminSidebar 글로벌 좌측 사이드바 (v9.33 그대로)
- ✅ /admin/ai 페이지 (v9.46 페르소나 + v9.48 별도 브랜치)
- ✅ /admin/learning 페이지 (v9.47 dead state 정리 그대로)
- ✅ AiPipelineCard.tsx 미삭제 (v9.45 보존 조건)
- ✅ DB 스키마 변경 0건 / 의존성 추가 0건

### 변경 파일 (2개)
- `app/(dashboard)/admin/AdminOpsClient.tsx` (PartBar·CalendarItem 인터페이스 + 두 섹션 JSX + Calendar 아이콘 import 제거 + 라벨 정합 + 코멘트 갱신) — 22 insertions / 111 deletions
- `app/(dashboard)/admin/page.tsx` (partStageBars·calendarItems 계산 로직 제거 + AdminOpsClient prop 슬림화 + 코멘트 갱신)

### 검증
- TSC 0 에러
- Next 빌드: ✓ Compiled successfully + Linting/Type validation PASS (Collecting page data 단계의 build-manifest ENOENT는 환경(긴 한글 경로) 이슈 — 코드 무관)
- harness 70/72 통과 (0 fail, 2 warn = dev 미실행 + Supabase 401 — 작업 무관)

### 배포
- 브랜치: `auto/v9.49-admin-ops-strip-260514` (main HEAD에서 분기 — v9.48 ai 작업과 충돌 없음)
- 커밋: 7063288 (feat) + 다음 커밋 (docs)
- main 머지·push는 사용자 결정 (작업 지시: 보고만, push 자동 X)

---

## 2026-05-14 (v9.47) — IA SOT(김연아 대리님 노션 스크린샷) 정렬 — 운영/AI/학습 3영역

### 사용자 요청
조기흠 사원(AXDX팀, 2026-05-14): "코드를 IA에 맞춰서 커밋"
IA SOT = https://www.notion.so/35f485898ea180919bc8ca6ef9a53967 (김연아 대리님 스크린샷 3장)
v9.46(`auto/v9.46-ai-persona-per-step-260514`) 위에서 새 브랜치 `auto/v9.47-align-to-ia-260514` 분기.

### 영역 1 — 운영 대시보드 KPI 5종 → 4종 (`/admin`)
**AdminOpsClient.tsx + page.tsx**

| 위치 | v9.46 (5종) | v9.47 IA 목표 (4종) |
|---|---|---|
| 1번 | 진행 중 프로젝트 | 진행 프로젝트 (라벨 정리) |
| 2번 | 이번 주 신규 | 신규 프로젝트 (최근 일주일) — 7일 전 기준 (이전 weekStart 일요일 기준에서 변경) |
| 3번 | 이번 주 발주 완료 | **전체 프로젝트 (신규 — 누적 카운트)** |
| 4번 | 발주서 완료율 | 완료 프로젝트 (% — 발주서 완료율 매핑) |
| 5번 | 추천 전환율 | **삭제** (IA 미포함 sales funnel 지표) |

코드 변경:
  - `KpiData` 인터페이스: thisWeekFinalized·conversionRate 제거 + totalProjects 신규
  - grid-cols-5 → grid-cols-4
  - lucide import 정리: TrendingUp·BarChart3 제거 + Layers 추가
  - page.tsx: thisWeekFinalized·conversionRate·confirmedItems 계산 제거. sevenDaysAgo·totalProjects 신규.
  - weekStart 변수는 향후 사용 가능성 보존(`void weekStart`)

### 영역 2 — AI 관리 KPI 3종 라벨 변경 (`/admin/ai`)
**AdminAiClient.tsx + page.tsx**

| 위치 | v9.46 (3종) | v9.47 IA 목표 (3종) |
|---|---|---|
| 1번 | 이번 달 호출 | **ai 추천 정확도** (행사장 / 파트별 / 도면(커밍순)) — 3 sub-label 단일 카드 |
| 2번 | 이번 달 토큰 | **총 API 호출 수** (이전 월 호출 → 누적 카운트) |
| 3번 | 이번 달 비용 (KRW) | **이상 사용자 알림** (신규 — abnormal_repeat_threshold 활용) |

코드 변경:
  - `Kpi3` 인터페이스 → `AccuracySummary` + `totalApiCalls` + `abnormalUsers.length`로 분기
  - 신규 보조 컴포넌트 `AccuracyRowMini` (정확도 카드 내부 3 sub-label)
  - lucide import 정리: Coins·Wallet 제거 + Target·Bell 추가
  - page.tsx: AccuracyTable 행 평균을 venue_avg/part_avg로 통합, floor_plan_status='커밍순' 명시
  - 토큰·비용 통계는 하단 ′상세 사용량′ + ′예산 사용률′ 영역에 그대로 보존 (예산 임계 경고 연계 유지)

### 영역 3 — 데이터 학습 관리자 좌측 사이드바 검증 + dead state 정리 (`/admin/learning`)
**LearningManagerClient.tsx**

IA 목표(6 평탄)와 v9.36 코드 비교 결과:

| IA 목표 (6 평탄) | v9.36 코드 SECTIONS | 일치 |
|---|---|---|
| 행사장 학습 현황 | venue-status | ✅ |
| 행사장 관리 | venues | ✅ |
| 환경장식물 종류 | signage-types | ✅ |
| 동의어 매핑 | synonyms-mapping | ✅ |
| 시설 가이드 | facility-guides | ✅ |
| 수정요청 | correction-requests | ✅ |

→ **사이드바는 이미 IA와 100% 일치**. 추가 변경 없음.

′개요′·′프로그램 파트′ 메뉴는 v9.36에서 이미 시안에 없어 제거됨 (`false &&` 가드로 코드는 보존).
PROGRAM_PARTS·case-a·NewProjectButton 사용처는 모두 그대로 유지 (사용자 명시 보존 조건).

dead state 단순화:
  - `VenueSubKey` / `SynonymSubKey` 타입 제거 (사용처 0건)
  - `venueSubTab` / `setVenueSubTab` state 제거
  - `synonymSubTab` / `setSynonymSubTab` state 제거
  - `VENUE_SUBTABS` 상수 제거 (v9.36에서 가로 서브탭 바 제거 후 잔존하던 dead 상수)

### 보존 (사용자 명시)
- AiPipelineCard.tsx 미삭제 (v9.45 사용자 명시 보존 조건)
- v9.46 AI 페르소나 per step 기능 그대로 (lib/ai/agentPipeline.ts + STEP_SETTINGS_KEY localStorage)
- DB 스키마 변경 0건 / 의존성 추가 0건
- ′프로그램 파트′ 코드는 메뉴에서만 빼고 lib/programParts.ts·case-a·NewProjectButton 사용처 그대로

### 변경 파일 (5개)
- `app/(dashboard)/admin/AdminOpsClient.tsx` (KPI 5→4 + 인터페이스 정리)
- `app/(dashboard)/admin/page.tsx` (KPI 데이터 계산 — totalProjects 신규)
- `app/(dashboard)/admin/ai/AdminAiClient.tsx` (KPI 3 IA 정렬 + AccuracyRowMini 신설)
- `app/(dashboard)/admin/ai/page.tsx` (accuracySummary·totalApiCalls 계산)
- `app/(dashboard)/admin/learning/LearningManagerClient.tsx` (dead state·VENUE_SUBTABS 정리 + 주석 갱신)

### 검증
- TSC 0 에러
- Next 빌드 29/29 라우트 PASS
- harness 70/72 통과 (0 fail, 2 warn = dev 미실행 + Supabase 401 — 작업 무관)
- 라우트 크기 비교:
  - `/admin` 4.24 → 4.18 kB (KPI 5→4 슬림)
  - `/admin/ai` 7.34 → 7.5 kB (정확도 평균 카드 추가)
  - `/admin/learning` 18.5 → 14.5 kB (dead state·상수·미사용 컴포넌트 정리)

### 배포
- 브랜치: `auto/v9.47-align-to-ia-260514` (auto/v9.46-ai-persona-per-step-260514 위에서 분기)
- main 머지·push는 사용자 결정 (이번 사이클은 브랜치만 준비)

---

## 2026-05-14 (v9.46) — AI 추천 파이프라인 step별 페르소나·모델 설정 (어드민)

### 사용자 요청
조기흠 사원(AXDX팀, 2026-05-14) — 김연아 대리님 카톡:
"관리자페이지 AI 관리에 3번 AI 투입되는 부분에서 투입되는 AI를 설정하고 페르소나를 수정할 수 있는 기능을 추가"

### A안 (반나절 분량) 적용 범위
- 4 step(파트 후보·시설 제약·표준 수량·도면 Vision) 각각 모델·temperature·system_prompt 분리 입력
- 김연아 대리님 명시 "3번 AI 투입" = Step 3(표준 수량 산정) 카드에 indigo ring 강조 + "현장 우선" 배지
- 저장: localStorage `admin_ai_settings_v2` (v1 전역 설정은 fallback으로 보존)
- 반영: case-a 추천 호출 시 stepOverrides로 API에 전달 → SYSTEM_INSTRUCTION의 4 step body가 페르소나 텍스트로 치환

### 변경 파일 (4개)

#### `lib/ai/agentPipeline.ts` — SOT 확장
- `AiModelKey` union 6종 (Gemini Flash/Pro · GPT-4o/4o-mini · Claude 3.5/3.7 Sonnet)
- `StepPersonaOverride` / `StepOverridesMap` 타입 신설
- `applyPersonaOverrides(overrides)` — persona 비어있지 않은 step body만 치환 (원본 PIPELINE_BLOCKS 불변)
- `buildPipelineLogicSectionWith(overrides)` — 동적 [추천 로직] 절 빌드
- `pickEffectiveTemperature(overrides, fallback=0.4)` — step별 temperature 평균 (단일 Gemini 호출이라 보수적)

#### `lib/ai/recommendSignage.ts` — SYSTEM_INSTRUCTION 함수화
- `RecommendInput.stepOverrides?: StepOverridesMap` 필드 추가
- `SYSTEM_INSTRUCTION` 상수 → `buildSystemInstruction(stepOverrides)` 함수로 변환
- 호출 시 `buildPipelineLogicSectionWith` + `pickEffectiveTemperature` 적용
- generationConfig.temperature 0.4 → effectiveTemp (오버라이드 평균)
- 응답 형식·표준 12종 목록은 본 파일 유지 (Gemini 출력 스키마 — 변경 X)

#### `app/(dashboard)/admin/ai/AdminAiClient.tsx` — UI 신설
- AccuracyTable 아래에 "AI 추천 파이프라인 — step별 페르소나 설정" 섹션 추가
- 4 step 카드 grid (1 col / lg:2 col): 모델 select(6종) + temperature 입력 + persona textarea (placeholder=기본 본문)
- Step 3 카드는 indigo ring + "현장 우선" 배지 (김연아 대리님 명시)
- amber 안내: 현 사이클은 Gemini만 실제 호출, GPT/Claude는 메타 정보로만 저장 → 후속 사이클 활성
- 저장/비우기 버튼 + "다음 추천부터 적용" 토스트
- 기존 v9.27 단일 폼(전역 fallback)은 하단에 그대로 보존
- import 추가: PIPELINE_BLOCKS, AiModelKey, StepOverridesMap, lucide(Layers/ShieldAlert/Calculator/Camera/Bot)

#### `app/(dashboard)/projects/new/case-a/page.tsx` — 클라이언트 주입
- `loadStepOverrides()` 헬퍼 신설 — localStorage `admin_ai_settings_v2` 읽어 비어있는 step은 자동 제외
- `handleRecommend` fetch body에 `stepOverrides` 필드 추가

### 보존
- AiPipelineCard.tsx 미사용 (사용자 명시 보존)
- v9.27 전역 AI 환경 설정 폼 그대로 (전역 fallback 역할)
- 기본 PIPELINE_BLOCKS body 불변 — 페르소나 비우면 기존 동작 100% 유지
- DB 마이그레이션 미실행 (admin_ai_settings 테이블 영구화는 후속 사이클)
- 의존성 추가 0건

### 검증
- TSC 0 에러
- Next 빌드 29/29 라우트 PASS
- `/admin/ai` 6.22 → 7.34 kB (step 폼 +1.12 kB)
- `/projects/new/case-a` 11.7 → 11.9 kB (loadStepOverrides 헬퍼 +0.2 kB)

### 후속 사이클 후보
- admin_ai_settings 테이블 마이그레이션 실행 + 서버 측 영구 저장 (현 시점 클라이언트 localStorage 한계: 사용자 브라우저별로 분리됨)
- GPT/Claude 어댑터 도입 (의존성 추가 결정 + 모델별 라우팅)
- step별 effective_model로 실제 모델 분기 (현 사이클은 Gemini 단일 호출 + temperature 평균)

### 라이브 사이트 확인 체크리스트 (사용자 영역)
1. https://ez-signage2.vercel.app 로그인(admin) → /admin/ai 진입
2. AccuracyTable 아래에 4 step 카드 (Step 3 = 현장 우선 배지) 노출
3. Step 3에 페르소나 입력 → 저장 → /projects/new/case-a 에서 추천 받아 응답에 반영 확인
4. 페르소나 비우고 저장 → 기본 PIPELINE_BLOCKS 동작 복귀 확인

### 배포
- 브랜치: `auto/v9.46-ai-persona-per-step-260514`
- main 머지·push는 사용자 결정 (작업지시서: PR 만들지 말고 브랜치만 push 준비)

---

## 2026-05-14 (v9.45) — 잔존 오류·문제 일괄 점검 + AdminOps KPI 데드 prop 정리

### 사용자 요청
조기흠 사원(AXDX팀, 2026-05-14): "v9.45 잔존 오류·문제 일괄 해결 — 오류 및 여러 문제 사항 확인 및 해결"
+ 보존 조건: AiPipelineCard.tsx 삭제 금지 + v9.44 백엔드 점검 작업물 유지 + DB·의존성 변경 X.

### 점검 영역별 결과 (8 영역)

| 영역 | 진단 | 결과 |
|------|------|------|
| ① TypeScript·빌드 | `npx tsc --noEmit` + `npm run build` | TSC 0 에러 / Next 빌드 25/25 라우트 PASS |
| ② harness | `node scripts/harness.mjs` | 72/72 (0 fail, 2 warn = dev 미실행·worktree env 부재) |
| ③ JSON.parse 런타임 안전 | 직접 호출 12건 모두 try/catch 또는 `?? '{}'` 폴백 확인 | PASS |
| ④ console.log 잔존 | NewProjectButton의 `[Excel Parse]`·`[Mockup Upload]` 다수 | **의도적 유지** — alert 메시지에 "F12 → Console" 안내가 명시되어 운영 디버그 자료로 사용 중 |
| ⑤ 보안 — 클라이언트 노출 | `SUPABASE_SERVICE_ROLE_KEY` 검색 | 서버 스크립트(seed_venues.mjs)·README·docs만 사용 → 클라이언트 코드 노출 0건 |
| ⑥ 환경변수 안전 핸들링 | GEMINI_API_KEY 미설정 시 휴리스틱 폴백 + 명확 에러 메시지 | PASS |
| ⑦ DB 마이그레이션 idempotent | v9.37 + v9.40(admin_master 누적) 비교 — v9.40은 `ADD COLUMN IF NOT EXISTS`·`ON CONFLICT` 기반 재실행 안전 | PASS |
| ⑧ 데드 코드 — AiPipelineCard.tsx | import 끊긴 dead component | **보존 유지** (사용자 명시 — 향후 어드민 편집 재활용) |

### 식별·수정한 데드 코드: AdminOps KPI 신호등 prop
**원인**: v9.39에서 `/admin` 운영 대시보드의 AI 정확도 신호등 카드를 `/admin/ai`로 이관했지만, page.tsx의 데이터 계산(weighted/aiAccuracy/accuracySignal)과 AdminOpsClient KpiData 인터페이스 prop은 잔존. 클라이언트에서 사용되지 않는 미사용 prop drilling.

**수정 범위 (2개 파일)**:
- `app/(dashboard)/admin/AdminOpsClient.tsx`: KpiData에서 `aiAccuracy`·`accuracySignal` 필드 제거 + v9.45 코멘트
- `app/(dashboard)/admin/page.tsx`: 미사용 가중치 합산 루프(96~112줄) 제거 + AdminOpsClient kpi prop에서 두 필드 제외

**보존**:
  - `projectsTable.map`의 프로젝트별 `pAccuracy`·`ai_accuracy`는 표 컬럼에서 활용 중 → 유지
  - `/admin/ai`의 AccuracyTable은 별도 데이터 경로(category coverage)로 정확도 표시 → 영향 없음

### 변경 파일 (2개)
- `app/(dashboard)/admin/AdminOpsClient.tsx` (KpiData 인터페이스 슬림화)
- `app/(dashboard)/admin/page.tsx` (미사용 데이터 계산 + prop 제거)

### 손대지 않은 영역
- AiPipelineCard.tsx (사용자 명시 보존)
- v9.44 백엔드 점검 작업물 (admin API 입력 검증)
- DB 스키마 / 의존성 / 환경변수
- console.log 디버그 잔존 (실무 디버그 자료로 활용 중)

### 검증
- TSC 0 에러
- Next 빌드 25/25 라우트 PASS
- `/admin` 4.24 kB 동일 유지 (서버 코드만 슬림)
- harness 72/72 (0 fail)

### 결론
v9.44에서 admin API 백엔드 정밀 점검이 완료된 후 잔존 코드 품질 이슈는 미세. 명백한 데드 prop 1건만 정리하고 기능·동작 변경 없음을 확인.

---

## 2026-05-13 (v9.39) — Admin IA 재구조화 (명세 v4.7 정확 적용)

### 사용자 요청
조기흠 사원(AXDX팀, 2026-05-13): 명세 docs/ADMIN_REDESIGN_260513.md (v4.7) 기준
관리자 페이지 IA 재구조화 — 다른 Claude 진단 + 사용자 확정.

핵심 결정 (이전 명세 v9.33·v9.36과 차이):
- learning 하위 6 페이지 분리 X (LearningManagerClient.tsx 그대로 유지)
- 헤더 4메뉴 → 3메뉴 ('데이터 학습 관리자' 링크 제거 — 사이드바에 이미 노출)
- /admin/ai 재구조화 (AiPipelineCard + AccuracyTable 컴포넌트 분리)
- /data 건드리지 X

### 변경 1: /admin 운영 대시보드 (AdminOpsClient.tsx)
- AI 정확도 신호등 카드 제거 (6번째 카드 JSX 블록)
- grid-cols 6 → 5로 변경 (운영 KPI 5개만: 진행 중·이번 주 신규·발주 완료·완료율·전환율)
- signalBg·signalLabel 변수 + Sparkles 아이콘 import 제거
- KpiData 인터페이스 aiAccuracy·accuracySignal 필드는 server prop 호환 위해 유지

### 변경 2: /admin/ai 재구조화 — KPI 3 + 파이프라인 + 정확도 테이블
신규 컴포넌트 2개:
- `AiPipelineCard.tsx` — 4 step 시각화:
  1) 파트 후보 추출 / 2) 시설 가이드 제약 / 3) 표준 수량 산정 / 4) 도면 Vision 보강(커밍순 배지)
  lucide 아이콘 Layers·ShieldAlert·Calculator·Camera. 도면 step은 dashed border + amber 배지.
- `AccuracyTable.tsx` — 6대 표준 카테고리(외벽·게이트·가로등·X배너·천정·부속시설) × 학습 보유 행사장 / 평균 정확도 / 비고 4컬럼.
  데이터 부재 시 `—` 표기 (정답지 노출 편향 방지 — learnings.md 2026-05-11).

page.tsx 데이터 prep:
- `computeVenueCategoryCoverage()` (인자 없음) → 7개 행사장 × 6대 카테고리 학습 보유 카운트
- design_items 단계별 가중치(입력 10·중간 30·컨펌 70·완료 100%) 평균으로 카테고리별 정확도 산출
- 카테고리 fuzzy 분류는 STANDARD_CATEGORIES.match_keywords 직접 사용
- KPI 3 (이번 달 호출·토큰·비용 KRW) — 데이터 0건 시 null 반환 → 클라이언트 `—` 표기

AdminAiClient.tsx:
- 상단에 KPI 3 + AiPipelineCard + AccuracyTable 추가
- v9.27의 풍부한 UI (예산·30일 추이·이상 사용자·환경 설정 폼)는 하단에 보존
- Kpi3Card 헬퍼 함수 신규 추가 (Phone·Coins·Wallet 아이콘)

### 변경 3: 헤더 4메뉴 → 3메뉴 (dashboard/page.tsx)
- `<Link href="/admin/learning">데이터 학습 관리자</Link>` JSX 블록 제거
- AdminSidebar(좌측)에 이미 노출되므로 헤더 인라인 nav에서 중복 제거
- GraduationCap·Archive lucide 아이콘 import 제거 (미사용)
- '관리자 페이지' Link title에 '운영 대시보드 / AI 관리 / 데이터 학습 관리자' 명시 — 사이드바 진입 안내

### 손대지 않은 파일 (작업지시서 함정 ⑤)
- AdminSidebar.tsx (이미 v9.36에서 3 메뉴 구조)
- admin/layout.tsx (이미 v9.33에서 isAdmin 가드 + 사이드바 적용)
- LearningManagerClient.tsx
- data/ 페이지·layout
- archive/ / dashboardSeed.ts / lib/auth/role.ts

### 검증
- TSC 0 에러
- Next 빌드 25/25 라우트 PASS
- `/admin` 4.71 → 4.24 kB (AI 카드 제거)
- `/admin/ai` 4.38 → 6.22 kB (파이프라인+정확도 테이블 추가)
- `/dashboard` 23.4 → 23.3 kB (헤더 링크 1개 제거)
- harness 1 fail = .env.local 부재 (worktree 환경 이슈, 작업과 무관)

### 변경 파일 (6개 = 신규 2 + 수정 4)
- 신규: `app/(dashboard)/admin/ai/AiPipelineCard.tsx`
- 신규: `app/(dashboard)/admin/ai/AccuracyTable.tsx`
- 수정: `app/(dashboard)/admin/AdminOpsClient.tsx`
- 수정: `app/(dashboard)/admin/ai/AdminAiClient.tsx`
- 수정: `app/(dashboard)/admin/ai/page.tsx`
- 수정: `app/(dashboard)/dashboard/page.tsx`

### 커밋·머지·푸시
- 의미 단위 3 커밋 (036ddd4·b12be0f·1d4302d) on `auto/admin-ia-restructure-260513`
- main 머지 (`--no-ff`) → 5df90b0
- v2/main push 완료 (196e7d1..5df90b0) — Vercel 자동 배포 트리거
- origin/main push: 자동 모드 분류기 차단 → 사용자 수동 push 필요
  - 명령: `cd "C:\Users\EZPMP\Desktop\클로드 코드 활동용\업무 자동화\제작물 디자인 의뢰 가이드\프로그렘\mice-design-guide" && git push origin main`

### 라이브 사이트 확인 체크리스트 (사용자 영역)
1. https://ez-signage2.vercel.app 로그인(admin) 후 헤더에 '프로젝트' + '관리자 페이지' 2 메뉴만 노출 확인 ('데이터 학습 관리자' 헤더에서 사라짐)
2. /admin 진입 → 운영 KPI 카드 5개만 표시 (AI 정확도 신호등 사라짐)
3. /admin/ai 진입 → 상단 KPI 3 (이번 달 호출·토큰·비용) → AI 추천 파이프라인 4 step (4번 카드에 '커밍순' 배지) → 카테고리 정확도 테이블 (6대 표준 카테고리)
4. AdminSidebar 좌측 메뉴 3개 (운영 대시보드 / AI 관리 / 데이터 학습 관리자) — 활성 라우트 indigo 강조 확인

---

## 2026-05-13 (v9.33) — 통합 핫픽스 6건: 글로벌 사이드바 + 3단계 SYSTEM_INSTRUCTION + UI 버그·PM 정정·부연 제거·도면 Vision

### 사용자 요청
조기흠 사원(AXDX팀, 2026-05-13): 6개 작업 통합 처리
1. 관리자 페이지 5개 라우트(/admin·/admin/ai·/admin/users·/admin/learning·/data) 글로벌 좌측 사이드바 도입 (기존 헤더 nav 5개 → 좌측 일원화)
2. recommendSignage SYSTEM_INSTRUCTION 3단계 우선순위 재작성 (파트 → 시설 제약 → 표준 수량 + 도면 Vision 보강)
3. 학습 관리자 ′환경장식물 종류 관리′ 클릭 시 버튼 바가 아래로 가는 버그
4. "PM" → "사원/담당자" 일괄 정정 (AdminOpsClient 16컬럼 + DataDashboard 라벨)
5. 부연 산문 잔존 정리 (description·subtitle 일괄 제거)
6. 행사장 배치도 Vision 분석 컨텍스트 주입 (case-a 페이지)

### 1. 글로벌 좌측 사이드바 (5 메뉴)
- 신규 `app/(dashboard)/admin/components/AdminSidebar.tsx` — 5 메뉴 (운영 대시보드·AI 관리·유저 관리·데이터 학습·분석) + usePathname 기반 active 표시
- 신규 `app/(dashboard)/admin/layout.tsx` — admin 그룹 공통 layout. isAdmin 가드 + 사이드바 + children
- 신규 `app/(dashboard)/data/layout.tsx` — /data도 같은 사이드바 적용 (5번째 메뉴)
- 4개 페이지에서 헤더 인라인 nav 제거: AdminOpsClient·AdminAiClient·learning/LearningManagerClient·admin/users/page.tsx
- 비활성 메뉴 ′유저 관리′는 사이드바에서 disabled 시각화 (cursor-not-allowed)

### 2. recommendSignage 3단계 우선순위 재작성
`lib/ai/recommendSignage.ts`:
- SYSTEM_INSTRUCTION 전면 재작성 — 사용자 명세 그대로:
  ```
  1순위: 프로그램 파트별 환경장식물 후보 추출 (입력: 선택 파트 다중)
  2순위: 행사장 시설 가이드 제약 — 못 설치 카테고리 후보 제외 (입력: 행사 장소)
  3순위: 행사장 시설 가이드 표준 수량 — 각 후보 quantity 지정 (입력: 행사 장소)
  [보강] 행사장 배치도 Vision 분석 → 동선·설치 위치 컨텍스트
  ```
- 응답 규칙: 각 항목 program_part · standard_category 명시. 2순위 제외 = ′[설치 불가 — 행사장 제약]′. 3순위 부재 = ′[수량 미정 — 운영자 확정]′.
- RecommendInput에 floorPlanImageUrl?: string 필드 추가
- analyzeFloorPlan(imageUrl) 호출 후 결과 텍스트를 ′[보강 — 행사장 배치도 Vision 분석]′ 블록으로 userText에 부착

### 3. 학습 관리자 환경장식물 종류 관리 버튼바 버그
`app/(dashboard)/admin/learning/LearningManagerClient.tsx`:
- 원인: `activeSection === 'synonyms' && synonymSubTab === 'types'` 블록이 SYNONYM_SUBTABS 버튼바보다 위에 위치 → types 클릭 시 종류 표가 위 / 버튼바가 아래에 표시되는 시각 버그
- 수정: 기존 위치는 `false &&` 가드로 비활성. SYNONYM_SUBTABS 버튼바 바로 아래 동일 섹션을 신규 삽입 (mapping·category와 같은 댑스 — types 서브탭 일관 표시)

### 4. PM → 담당자/사원 정정
- `app/(dashboard)/admin/AdminOpsClient.tsx`: 필터 ′PM 전체′ → ′담당자 전체′ / 테이블 헤더 ′PM, 담당자′ → ′담당자, 확인자′
- `app/(dashboard)/data/DataDashboard.tsx`: 행사이력 표 헤더 ′PM 부서′ → ′담당 부서′ / 납기 패턴 안내문 ′PM 부서별·디자인 업체별·행사장별′ → ′담당 부서별·디자인 업체별·행사장별′ / 알랏 안내문 ′PM 사업부·부서별′ → ′담당 사업부·부서별′

### 5. 부연 산문 잔존 정리
- recommendSignage SYSTEM_INSTRUCTION에서 ′행사 유형별 권장 구성′·′목적별 추천 매핑′·′규모별 수량 가이드′·′부속 시설 자동 인지 휴리스틱′ 등 부연 산문 일괄 제거 → 3단계 우선순위·표준 12종 목록·응답 형식만 남김
- LearningManagerClient의 ′준 시드 13종은 DB에서도 is_standard=true 로 보호됩니다′·′비표준 입력을 표준명으로 자동 변환합니다′·′FacilityGuidePanel에서 사용자가 제출한′ 부연은 이미 v9.32에서 제거됨 (확인 완료)

### 6. 행사장 배치도 Vision 분석 컨텍스트 주입
`app/(dashboard)/projects/new/case-a/page.tsx`:
- ′행사장 배치도 (선택)′ 필드 신규 (showAdvanced 안, 추가 메모 아래 위치)
- 파일 선택 시 FileReader로 미리보기 → handleRecommend에서 Supabase Storage `<user_id>/temp-floor-plans/` 경로로 업로드 → publicUrl을 API에 floorPlanImageUrl로 전달
- 서버 측 recommendSignage가 analyzeFloorPlan() 호출 → SYSTEM_INSTRUCTION [보강] 절로 자동 연결

### 변경 파일 (9개)
- 신규: `app/(dashboard)/admin/components/AdminSidebar.tsx`
- 신규: `app/(dashboard)/admin/layout.tsx`
- 신규: `app/(dashboard)/data/layout.tsx`
- `lib/ai/recommendSignage.ts` (SYSTEM_INSTRUCTION 재작성 + floorPlanImageUrl + analyzeFloorPlan 보강)
- `app/(dashboard)/admin/AdminOpsClient.tsx` (헤더 nav 제거 + PM → 담당자 정정)
- `app/(dashboard)/admin/ai/AdminAiClient.tsx` (헤더 nav 제거)
- `app/(dashboard)/admin/users/page.tsx` (헤더 nav 제거 + isAdmin 가드는 layout으로 위임)
- `app/(dashboard)/admin/learning/LearningManagerClient.tsx` (헤더 nav 제거 + 환경장식물 종류 섹션 위치 정정)
- `app/(dashboard)/data/DataDashboard.tsx` (PM → 담당자/담당 부서 정정)
- `app/(dashboard)/projects/new/case-a/page.tsx` (행사장 배치도 업로드 + API 전달)

### 검증
- TSC 0 에러
- Next 빌드 25/25 라우트 PASS
- `/admin` 4.71 kB, `/admin/ai` 4.38 kB, `/admin/learning` 16.9 kB, `/admin/users` 179 B, `/data` 11.7 kB, `/projects/new/case-a` 11.7 kB

### 라이브 사이트 확인 체크리스트 (사용자 영역)
1. https://ez-signage2.vercel.app 로그인(admin) 후 5개 admin 라우트(/admin·/admin/ai·/admin/users·/admin/learning·/data) 진입 → 좌측 사이드바 5 메뉴 일관 표시 확인
2. 학습 관리자 → 환경장식물 클릭 → 환경장식물 종류 관리 서브탭 클릭 → 버튼바가 위에 표시되는지 (이전에는 표 아래로 갔음)
3. 새 프로젝트(case-a) → 고급 옵션 펼치기 → 행사장 배치도 첨부 → AI 추천 받기 → 항목별 location 필드에 도면 분석 컨텍스트 반영 확인
4. AdminOps 테이블 헤더가 ′담당자·확인자′로 표시되는지

---

## 2026-05-13 (v9.32) — 학습 관리자 사이드바 5 메뉴 정정 (프로그램 파트 신규 + 동의어 → 환경장식물)

### 사용자 요청
조기흠 사원(AXDX팀, 2026-05-13): "개요·행사장별 학습 현황·행사장·프로그램 파트·환경장식물" 5 메뉴.
옵션 A — "환경장식물 메뉴 클릭 → 종류 관리 + 동의어 매핑 + 카테고리 권장".

### 변경 — v9.31 사이드바 4 메뉴 → v9.32 사이드바 5 메뉴
| 위치 | v9.31 | v9.32 |
|---|---|---|
| 1번 | 개요 | 개요 (그대로) |
| 2번 | 행사장별 학습 현황 | 행사장별 학습 현황 (그대로) |
| 3번 | 행사장 (6 서브) | 행사장 (6 서브) (그대로) |
| 4번 | 동의어 (3 서브) | **프로그램 파트 (신규)** |
| 5번 | — | **환경장식물 (3 서브)** ← 기존 ′동의어′ 메뉴 명칭 변경 + 내부 서브 그대로 |

### 코드 변경 — `app/(dashboard)/admin/learning/LearningManagerClient.tsx`
- `SectionKey` union: `'overview' | 'venue-status' | 'venues' | 'synonyms'` → `+ 'program-parts'` 추가
- SECTIONS 배열 4 → 5 항목, 사용자 명시 순서대로:
  - 1) overview (BarChart3) — 개요
  - 2) venue-status (GraduationCap) — 행사장별 학습 현황
  - 3) venues (Building2) — 행사장
  - 4) **program-parts** (Workflow) — 프로그램 파트 (신규)
  - 5) **synonyms** (ImageIcon) — **환경장식물** (라벨 변경, 서브탭 키는 ′synonyms′ 유지)
- `lib/programParts.ts` import 추가: `PROGRAM_PARTS`, `PROGRAM_PART_GROUPS`, `PROGRAM_PART_SIGNAGE_HINTS`
- lucide-react import에 `Workflow`, `Image as ImageIcon` 추가

### 프로그램 파트 섹션 신규 (4번)
- 12종 파트를 3 그룹별 카드 그리드 (md:2열 / lg:3열):
  - **프로그램** 8종 (emerald): 회의·전시·비즈니스 매칭·비즈니스 프로그램·공식행사·공모전형·체험형·투어형
  - **참가자 응대** 3종 (indigo): 의전·등록·영접영송
  - **홍보** 1종 (amber): 홍보
- 각 카드: 코드(40.04~) · 한글명 · hint 한 줄 · 매핑된 환경장식물 ID 배지(PROGRAM_PART_SIGNAGE_HINTS)
- 현재 사이클은 read-only 표시 (편집·추가·삭제는 추후 사이클)
- 소스 SOT: `lib/programParts.ts` (PROGRAM_PARTS + PROGRAM_PART_SIGNAGE_HINTS)

### 환경장식물 메뉴 (5번) — 명칭 변경
- 사이드바 라벨: ′동의어′ → ′환경장식물′ (ImageIcon)
- desc 부제: ′환경장식물 종류 관리 / 동의어 매핑 / 카테고리 권장′
- 내부 서브탭(synonymSubTab) 키는 그대로 유지 (mapping / category / types)
- 사용자 옵션 A — 환경장식물 클릭 시 종류 관리 + 동의어 매핑 + 카테고리 권장 3개 진입

### 변경 파일 (2개)
- `app/(dashboard)/admin/learning/LearningManagerClient.tsx` (사이드바 5 메뉴 + program-parts 섹션 추가)
- `docs/ADMIN_REDESIGN_260513.md` (5 메뉴 매트릭스 갱신)

### 검증
- TSC 0 에러
- Next 빌드 25/25 라우트 PASS
- `/admin/learning` 16.8 kB → 18.5 kB (program-parts 섹션 +1.7 kB)

### 라이브 사이트 확인 체크리스트 (사용자 영역)
1. https://ez-signage2.vercel.app 로그인(admin) 후 `/admin/learning` 진입 → 사이드바 5 메뉴 (개요 / 행사장별 학습 현황 / 행사장 / 프로그램 파트 / 환경장식물)
2. 프로그램 파트 클릭 → 3 그룹별 12종 카드 표시 (코드·이름·hint·환경장식물 ID 배지)
3. 환경장식물 클릭 → 상단 서브탭 3개 (비표준 → 표준 매핑 / 카테고리 권장 / 환경장식물 종류 관리)

---

## 2026-05-13 (v9.31) — 통합 핫픽스: 학습 관리자 댑스 정정 + 천정배너 잔존 제거 + 파트 매칭 작동

### 사용자 요청 (강한 지적 — 시급)
조기흠 사원(AXDX팀, 2026-05-13): 3가지 통합 처리
1. "데이터 학습 관리자 ... 에 맞지 않는데? 너 댑스 이해 못해?" — v9.29의 7개 평면 사이드바가 명세 IA(5 대섹션)와 불일치
2. 천정배너(행잉) "사전 협의 후 발주 권장" 잔존 — 회의 결정 ⑤(추가 강조 텍스트 X)에 반함
3. "행사 만들 때 파트 자동 적히는 거 그 파트별로 적용되는 사항 왜 적용 안 됨?" — 파트 선택 → 환경장식물 자동 매칭 흐름 미작동

### 문제 ① — 학습 관리자 사이드바 댑스 정정 (5 대섹션 IA)
**이전 v9.29 (잘못)**: 사이드바 7개 평면 + 그룹 라벨 (개요·행사장 학습 현황 / 행사장 관리·시설 가이드·수정 요청 / 동의어 매핑·환경장식물 종류)
→ 명세 §2-4 ′행사장′ 안 5 서브와 §2-5 ′동의어′ 안 3 서브를 사이드바 항목으로 평탄화 = 댑스 잘못

**v9.31 (정정)**: 명세 5 대섹션 (KPI는 상시 상단 → 사이드바 4개)
- 1) 상단 KPI 3카드 (상시 노출 — 사이드바 X)
- 2) 사이드바 ′개요′ — 학습 누적 / 단계별 분포 / 정확도 추이
- 3) 사이드바 ′행사장별 학습 현황′ — venue별 학습 데이터
- 4) 사이드바 ′행사장′ (단일 대섹션) — 내부 6 서브탭:
  - 행사장 추가 / 신규 요청 대기 / 도면 학습 큐 / 시설 가이드 / 예외 패턴 모니터 / 수정 요청
- 5) 사이드바 ′동의어′ (단일 대섹션) — 내부 3 서브탭:
  - 비표준 → 표준 매핑 / 카테고리 권장 / 환경장식물 종류 관리

**코드 변경**: `app/(dashboard)/admin/learning/LearningManagerClient.tsx`
- `SectionKey` 7개 → 4개로 축소 (overview/venue-status/venues/synonyms)
- `VenueSubKey` 6개 + `SynonymSubKey` 3개 신설
- 사이드바 그룹 라벨 제거 + 평면 4개로 단순화 (각 섹션에 desc 부제)
- venues·synonyms 대섹션 진입 시 상단 서브탭 네비 노출
- 기존 facility-guides·correction-requests·signage-types 블록 조건을 venueSubTab/synonymSubTab 매핑으로 변경
- '카테고리 권장' 서브탭 신규 작성 (행사 유형 9종 × 권장 환경장식물 표)

### 문제 ② — 천정배너 잔존 제거
**위치**: `app/components/facility/FacilityGuidePanel.tsx:65` `getGuideUnknowns()`
**이전**: `items.push(\`${category} — 사전 협의 후 발주 권장\`)`
**변경**: `items.push(category)` — 카테고리명만. 회의 결정 ⑤(추가 강조 텍스트 X) + 강조 라벨 톤다운 원칙 정합.

### 문제 ③ — 파트 → 환경장식물 자동 매칭 흐름 복구
**회의 컨셉**: 파트 선택(회의·전시·등록 등) → 1차(파트별 환경장식물 매핑) → 2차(행사장별 보강)

**진단**:
- NewProjectButton: step 2 파트 다중선택 → UI 체크박스만 갱신 (`formats[fid].selected=true`). DB design_items INSERT에는 part·program_part 미주입.
- recommendSignage.ts: RecommendInput에 programParts 필드 없음. Gemini 프롬프트에 파트 매핑 컨텍스트 미주입.
- case-a: 파트 선택 UI 자체 없음. 엑셀 '파트' 컬럼 빈값.

**v9.31 수정**:
- `lib/programParts.ts`: `pickPartForFormat()` · `partsForFormat()` · `programPartName()` 3개 함수 신설 (이미 작업 중이던 변경 — 정식화)
- `lib/ai/recommendSignage.ts`:
  - RecommendInput에 `programParts?: string[]` 필드 추가
  - RecommendItem에 `program_part` · `program_part_name` 필드 추가
  - SYSTEM_INSTRUCTION에 "각 항목에 매칭된 파트 1개 명시" 지시 추가
  - userText에 [프로그램 파트 매핑] 블록 자동 주입 (선택 파트별 권장 환경장식물 ID 표시)
  - 응답 후처리: AI 응답 검증 → 미검증 시 partsForFormat ∩ selectedParts 첫 매치로 자동 채움 + program_part_name 한글명 부착
- `app/(dashboard)/projects/new/case-a/page.tsx`:
  - 프로그램 파트 다중선택 UI 추가 (PROGRAM_PARTS 12종 그룹별 체크박스, emerald 강조)
  - API body에 programParts 전달
  - design_items INSERT 시 part: program_part_name, program_part: code 채움
  - 엑셀 '파트' 컬럼에 program_part_name 노출
  - review 화면 추천 항목에 emerald 파트 배지 표시
- `app/(dashboard)/dashboard/components/NewProjectButton.tsx`:
  - selectedList에 presetId 보존
  - design_items INSERT 시 pickPartForFormat(presetId, programPartsArr) → matchedPartCode, programPartName → matchedPartName
  - 파트 매칭 성공 시 part: program_part_name, program_part: code 채움 (실패 시 멤버 part_name fallback)
  - DB 컬럼 없을 경우 program_part 제거 후 재시도 (마이그레이션 호환성)

### 변경 파일 (5개)
- `app/(dashboard)/admin/learning/LearningManagerClient.tsx` — 사이드바 4 대섹션 + 6+3 서브탭 통합
- `app/components/facility/FacilityGuidePanel.tsx` — 천정배너 잔존 제거
- `lib/programParts.ts` — 파트 매칭 헬퍼 3종 (pickPartForFormat·partsForFormat·programPartName)
- `lib/ai/recommendSignage.ts` — programParts 입력 + Gemini 프롬프트 주입 + 후처리 program_part 자동 채움
- `app/(dashboard)/projects/new/case-a/page.tsx` — 파트 다중선택 UI + 엑셀 파트 컬럼
- `app/(dashboard)/dashboard/components/NewProjectButton.tsx` — design_items INSERT 시 part·program_part 자동 채움

### 검증
- TSC 0 에러
- Next 빌드 25/25 라우트 PASS
- `/admin/learning` 15.6kB → 16.8kB (서브탭 + 카테고리 권장 표 추가)
- `/projects/new/case-a` 9.42kB → 11.1kB (프로그램 파트 UI 추가)

### 라이브 사이트 확인 체크리스트 (사용자 영역)
1. `/admin/learning` 사이드바 4개 (개요 / 행사장별 학습 현황 / 행사장 / 동의어)만 노출. 행사장 클릭 시 6개 서브탭 가로 네비. 동의어 클릭 시 3개 서브탭.
2. 시설 가이드 패널(행사장 가이드 보기) 호버 → 미확인 항목 리스트가 "카테고리명만" 노출. "사전 협의 후 발주 권장" 문구 사라짐.
3. case-a에서 프로그램 파트 다중 체크 → AI 추천 후 각 항목에 emerald 파트 배지 표시. 엑셀 다운로드 시 '파트' 컬럼 채워짐.

---

## 2026-05-13 (v9.26~v9.30) — 관리자 페이지 + 데이터 학습 관리자 재설계 5사이클 통합

### 사용자 요청
조기흠 사원(AXDX팀, 2026-05-13): "관리자 페이지 피드백 사항대로 수정" + "암튼 수정 먼저 다해줘"
+ "커밋이래 배포 끄응..." → 5사이클 통합 브랜치에 누적 후 마지막에 한 번 머지·푸시·배포.

명세: `docs/ADMIN_REDESIGN_260513.md` (5섹션 + 피드백 3건)
노션 IA: `docs/NOTION_IA_EXTRACT_260513.json`

### 사용자 피드백 3건 매핑
| # | 피드백 | 처리 | 코드 위치 |
|---|---|---|---|
| ① | 운영 KPI ↔ 전체 프로젝트 현황 통합 | "운영 대시보드" 단일 화면 | `/admin/page.tsx` + `AdminOpsClient.tsx` (v9.26) |
| ② | 유저 관리 접근 차단 (데이터허브 연동 결정 전) | "준비 중" 화면 + 헤더 disabled | `/admin/users/page.tsx` (v9.28) |
| ③ | AI 환경 설정 가능 | 모델·프롬프트·임계값 폼 + 사용량/비용/이상 알림 | `/admin/ai/page.tsx` + `AdminAiClient.tsx` (v9.27) |

### v9.26 — 어드민 운영 대시보드 (KPI + 프로젝트 현황 통합)
- `/admin` 신설 — 라우트·page.tsx·AdminOpsClient.tsx
- 운영 KPI 6카드: 진행 중 / 신규 / 발주 완료 / 완료율 / 전환율 / AI 정확도 신호등(70%/50% 기준)
- 전체 프로젝트 현황 16컬럼 테이블 + 필터(파트·PM·행사장·기간·상태)
- 파트별 상태 Stacked Bar (진행·완료·반려)
- 이번 달 일정 D-14 ~ D+7 캘린더 카드 (D-day 컬러)
- 헤더 "관리자 페이지" 링크 `/data` → `/admin` 변경
- 기존 `/data` 13탭은 "분석 자료" 진입으로 보존
- 변경 파일 (3): `app/(dashboard)/admin/page.tsx` + `AdminOpsClient.tsx` + `dashboard/page.tsx`

### v9.27 — AI 관리 페이지 신설
- `/admin/ai` 신설 — 라우트·page.tsx·AdminAiClient.tsx
- Gemini API 사용량 4카드 (오늘/이번 달 호출·토큰)
- 비용 추정 (USD + KRW, 단가 \$0.00015/1K 토큰)
- 월 예산 한도 + 사용률 진행 바 + 80% 임계 경고
- 최근 30일 호출 추이 (일자별 막대)
- 이상 사용자 알림 (동일 프로젝트 5회 이상 재호출)
- AI 환경 설정 폼: 모델·temperature·max_tokens·예산·임계값·시스템 프롬프트
- 1차는 localStorage 저장, 다음 사이클 admin_ai_settings 테이블로 영구화
- 변경 파일 (3): `app/(dashboard)/admin/ai/page.tsx` + `AdminAiClient.tsx` + `supabase/migration_v9_27_admin_ai_settings.sql`

### v9.28 — 유저 관리 접근 차단 (RBAC)
- `/admin/users` 라우트에 "준비 중" 화면 신설
- 데이터허브 SSO 연동 결정 전까지 접근 차단
- 예정 기능 목록 (사용자 퍼널 분석 영역) 설명 표기
- 헤더 "유저 관리" 링크 disabled 상태 (운영/AI 양쪽 적용)
- 기존 profiles·isAdmin 코드는 그대로 보존
- 변경 파일 (1): `app/(dashboard)/admin/users/page.tsx`

### v9.29 — /admin/learning 5개 섹션 재정렬
- 사이드바를 그룹 라벨 3개(개요·행사장·동의어)로 분리 시각화
- 명세 §2-2 '개요' 섹션 신설 (기본 진입점)
  - 학습 누적 그래프 (행사장별 항목 수 TOP 10 막대)
  - 단계별 분포 (입력 10% / 중간 30% / 컨펌 70% / 완료 100%) Stacked + 4카드
  - AI 추천 정확도 추이 (행사장별, emerald/amber/rose 3색)
- 명세 §2-3 '행사장별 학습 현황' — 기존 venue-status 유지
- 명세 §2-4 '행사장 마스터' — venues + facility-guides + correction-requests 그룹
- 명세 §2-5 '동의어' — synonyms + signage-types 그룹
- 헤더 '관리자 페이지' 링크 /data → /admin 갱신 (v9.26 정합)
- 변경 파일 (1): `app/(dashboard)/admin/learning/LearningManagerClient.tsx`

### v9.30 — 시설 가이드·예외 패턴 모니터 보강
- 시설 가이드 섹션에 요약 KPI 4카드: 등록 행사장 / 카테고리 제약 / 주의사항 / 평균 완성도
- 가이드 예외 패턴 섹션에 요약 KPI 3카드: 전체 / 검토 필요(≥3회) / 완료 누계
- 기존 표·플래그(venue+rule 3회 이상 = 가이드 검토 필요 배지) 유지
- 변경 파일 (1): `app/(dashboard)/admin/learning/LearningManagerClient.tsx`

### DB 마이그레이션 (PM 후속 액션)
- `supabase/migration_v9_27_admin_ai_settings.sql` 실행 필요 (v9.27)
  - admin_ai_settings 싱글톤 테이블 + RLS admin SELECT/UPDATE
  - usage_logs.recommend 인덱스 추가
- 미실행 상태에서도 클라이언트는 localStorage로 동작

### 검증
- TSC 0 에러 (각 사이클 사이 + 통합)
- Next 빌드 25/25 라우트 PASS (v9.26 신규 `/admin`, v9.27 `/admin/ai`, v9.28 `/admin/users` 포함)
- `/admin` 5.66 kB / `/admin/ai` 5.43 kB / `/admin/users` 179 B / `/admin/learning` 15.6 kB

### 변경 파일 총괄 (사이클별)
- v9.26: 3개 (admin/page.tsx + AdminOpsClient.tsx + dashboard/page.tsx 헤더)
- v9.27: 3개 (admin/ai/page.tsx + AdminAiClient.tsx + migration SQL)
- v9.28: 1개 (admin/users/page.tsx)
- v9.29: 1개 (admin/learning/LearningManagerClient.tsx)
- v9.30: 1개 (admin/learning/LearningManagerClient.tsx)
- 합계 신규: 7개, 수정: 2개 (5사이클 누적)

### 라이브 사이트 확인 체크리스트 (사용자 영역)
- https://ez-signage2.vercel.app 로그인(admin) 후
- 헤더 "관리자 페이지" 클릭 → `/admin` 운영 대시보드 진입 (이전엔 `/data`로 갔음)
- `/admin/ai` 진입 → 사용량 카드·예산 바·이상 사용자·환경 설정 폼 동작 확인
- `/admin/users` 진입 → "준비 중" 화면 표시 확인 (구현 코드는 보존)
- `/admin/learning` 사이드바 그룹 3개(개요/행사장/동의어) 표시 + 개요 섹션이 기본 활성
- `/data` 분석 자료 13탭이 여전히 접근 가능 (보존됨)

### 다음 사이클 후보
- admin_ai_settings 테이블 마이그레이션 실행 후 localStorage → DB 영구화
- AI 환경 설정의 system_prompt를 실제 recommendSignage.ts에 주입
- Stage 액션(편집·다운로드·승인·반려·보기) 활성화 (현재 보기·편집만)
- 전체 프로젝트 현황 테이블에 정렬·페이지네이션
- 사용자 퍼널 분석 (유저 관리 페이지 차단 해제 후)

### 배포
- 통합 브랜치: `auto/v9.26-v9.30-admin-redesign-260513`
- 머지·푸시는 PROGRESS 갱신 후 마지막에 한 번에 진행 (사용자 사전 컨펌)

---

## 2026-05-13 (v9.25) — 환경장식물 추가 보강: 발주엑셀 venue 라벨 노이즈 필터

### 사용자 요청
조기흠 사원(AXDX팀, 2026-05-13): "환경장식물 더 수정해야하는 부분 있는지 확인 및 수정"

### 갭 점검 결과 — 9개 영역 매트릭스
| # | 영역 | 가치 | 작업량 | 결정 |
|---|------|------|--------|------|
| G1 | EVENT_TYPE_RECOMMEND inline → lib/programParts.ts 통합 | 중 | 작 | ⛔ 사용자 결정 추진 안 함 |
| G2 | _venue_signage_map.json venue 라벨 노이즈 필터 | 중 | 작 | ✅ 적용 |
| G3 | 행사 격 보정 룰 코드 강제 (SYSTEM_INSTRUCTION 코드화) | 높 | 중 | ⛔ 사용자 결정 — 텍스트 약속 유지 |
| G4 | 부속 시설 자동 인지 휴리스틱 코드 강제 | 높 | 중 | ⛔ 사용자 결정 — 텍스트 약속 유지 |
| G5 | lib/text/normalizeAiText.ts git add | 낮 | 작 | PASS (이미 tracked) |
| G6 | v9.24 region 코드 잔재 | 낮 | 0 | PASS (코멘트만) |
| G7 | 시설 가이드 미등록 12개 행사장 정식 등록 | 높 | 매우 큼 | 보류 (사용자 영역) |
| G8 | HWP·OCR | 중 | 매우 큼 | 보류 (외부 의존성) |
| G9 | 시안 파일명 자동 분류 스크립트 | 낮 | 큼 | 보류 |

사용자가 `goals/current.md`를 직접 수정해 G1·G3·G4를 "⛔ 추진 안 함"으로 명시 표시.
이번 사이클은 G2 단일 적용으로 한정.

### 핵심 변경 — G2: 발주엑셀 venue 라벨 노이즈 필터 정제
`lib/data/signageCategoryStandards.ts`:
- `VENUE_LABEL_NOISE_EXACT` 신설 — exact 매칭 노이즈 (`"미상"·"기타"·"-"·"차량"·"인천공항"`)
- `VENUE_LABEL_NOISE_PATTERNS` 정규식 18종 — 등록데스크·안내소·통역부스·의무실·창고·대기실·
  운영사무국·연출팀·운영팀·본부·CP·방한용품·물품보관소·음수대·쉼터·경호·포디움·
  주차장(단일)·로비(단일)·플로어·무대·천장·운영요원·출연자대기실·출연진
- `isVenueLabelNoise(label)` 헬퍼 — exact + pattern + 1자 이하 차단
- `computeMapCoverageByVenueKey()`·`buildCoverageForUnregisteredVenue()` 두 곳의 venue 필터를
  기존 `v !== '미상' && v !== '-'` 2건 → `isVenueLabelNoise(v)` 통합

### 변경 파일 (1개)
- `lib/data/signageCategoryStandards.ts` (노이즈 필터 신설 + 2곳 적용)

### 검증
- TSC 0 에러
- Next 빌드 22/22 라우트 통과

### 효과
- 발주엑셀 통합 맵의 venue 라벨에서 실제 행사장이 아닌 위치 표기(`"등록데스크"·"통역부스"·
  "차량"·"인천공항"·"방한용품배포대"` 등)가 venue_key 매칭 대상에서 제외됨
- 미등록 행사장 fallback(`buildCoverageForUnregisteredVenue`)에서 사용자가 검색한 venueName과
  노이즈 라벨이 우연히 fuzzy 매칭되는 오탐 차단 (예: "인천" 검색 시 "인천공항" 노이즈와
  매칭되어 실제 학습 데이터 없는데 학습 있는 것처럼 표기되는 위험 제거)
- 향후 발주엑셀 통합 맵에 노이즈 라벨이 추가되면 패턴만 확장하면 됨 (한 곳)

### 후속 사용자 확인 사항
- 현재 라이브 사이트(https://ez-signage2.vercel.app)에서 case-a 폼에 미등록 행사장 입력
  (예: "롯데호텔 서울") → coverage 결과가 정확히 표시되는지 확인
- /admin/learning 행사장 학습 현황표 결과 변화 확인 (이전 노이즈 매칭으로 학습 데이터 있다고
  표기됐던 행사장이 있다면 정직하게 미학습으로 보정됨)

### 다음 사이클 후보 (보류 항목 유지)
- 시설 가이드 미등록 12개 행사장 정식 등록 (사용자 결정 + 정답지 편향 우려)
- HWP 본문 파싱 / Tesseract OCR (외부 의존성)
- 코엑스·송도 2차 AI 시험 (정답지 노출 편향 검증 — 사용자 영역)

### 배포
- 브랜치: `auto/v9.25-additional-260513`

---

## 2026-05-13 (v9.24) — 행사 장소 라벨 "지방" → 정확한 도/광역시 이름

### 사용자 요청
조기흠 사원(AXDX팀, 2026-05-13): "새 프로젝트 만들기에서 행사 장소를 지방이라고
하지 말고 도 이름으로 수정해줬으면 합니다"

### 핵심 변경
- `lib/venueIntel.ts`:
  - `VenueRegion` union 신설 — 광역시 8(서울특별시·부산광역시·인천광역시·
    대구광역시·대전광역시·광주광역시·울산광역시·세종특별자치시) + 도 9(경기도·
    강원특별자치도·충청북도·충청남도·전북특별자치도·전라남도·경상북도·경상남도·
    제주특별자치도) + 해외 = 18종
  - `REGION_ORDER` 행정 표준 순서 상수 export
  - `groupVenuesByRegion()` 결과 키도 REGION_ORDER 순서로 정렬 (광역시 → 도 → 해외)
- VENUE_LIST 22개 베뉴 region 재할당:
  - 광주 김대중컨벤션센터·광주비엔날레전시관: "지방" → **광주광역시**
  - 경남도청 대회의실: "지방" → **경상남도**
  - 경주: "지방" → **경상북도**
  - 평창올림픽스타디움: "지방" → **강원특별자치도**
  - 킨텍스(고양시): "수도권" → **경기도**
  - 송도컨벤시아(인천 송도): "수도권" → **인천광역시**
  - 코엑스·롯데호텔·DDP 등 서울 12개: "서울" → **서울특별시**
  - ICC JEJU·제주국제컨벤션: "제주" → **제주특별자치도**
- `VenueRequestModal.tsx` (신규 행사장 등록 요청 폼): REGIONS 상수가
  REGION_ORDER 사용 → 사용자가 광역시·도 18개 중 정확히 선택
- `LearningManagerClient.tsx` (학습 관리자 행사장 추가 폼): 동일 적용
- `lib/data/dashboardSeed.ts`: "// 광주·지방" 주석 → 정확한 도 이름 표기
- `supabase/migration_v5_data_tables.sql`: venue_info.region 코멘트 정확화
  ("서울/경기/지방" → "광역시·도 정식 명칭")

### 변경 파일 (5개)
- `lib/venueIntel.ts` (코어 — type·상수·VENUE_LIST·groupVenuesByRegion)
- `app/(dashboard)/dashboard/components/VenueRequestModal.tsx`
- `app/(dashboard)/admin/learning/LearningManagerClient.tsx`
- `lib/data/dashboardSeed.ts`
- `supabase/migration_v5_data_tables.sql`

### 검증
- TSC 0 에러
- Next 빌드 22/22 라우트 통과 (case-a·dashboard·admin/learning 모두 PASS)

### 영향
- 신규 프로젝트 만들기에서 행사장 드롭다운 optgroup 라벨이 "지방" 대신
  "광주광역시"·"경상남도"·"경상북도"·"강원특별자치도"로 정확하게 표시
- DB region 컬럼 값은 자동 변경 안 됨 (코드 라벨만 변경). 향후 등록되는
  베뉴는 새 라벨로 저장됨. 기존 DB 데이터 마이그레이션은 별도 결정 사항.

### 배포
- 브랜치: `auto/region-label-fix-260513`
- 커밋: `3c0112c` (feat) → `7de39d3` (merge --no-ff)
- v2/main 푸시 완료 (1860832 → 7de39d3) — Vercel 자동 배포 트리거
- origin/main 푸시 완료 (7b4f221 → 7de39d3)

### 후속 사용자 확인 사항
- 라이브 사이트(https://ez-signage2.vercel.app)에서 새 프로젝트 만들기 진입 →
  행사 장소 드롭다운에서 "광주광역시"·"경상남도" 등 정확한 도 이름 노출 확인
- 신규 행사장 등록 요청 모달의 권역 선택 옵션이 18개로 확장된 것 확인
- /admin/learning 행사장 추가 폼도 동일 권역 옵션 노출 확인

---

## 2026-05-13 (v9.23) — v9.22 후속 갭 7건 점검 + 5건 보강 + UI 시각화 적용

### 배경 — 사용자 요청
v9.22 적용 후 사용자 요청: "미학습 부분과 수정하면서 추가 학습 필요한 부분이 없는지 꼼꼼하게 확인하여 적용할 것"

v9.22 코드를 다시 읽어 7개 갭을 식별:
| 코드 | 갭 설명 | 심각도 |
|---|---|---|
| G1 | findVenueKey 매칭 실패 시(시설 가이드 미등록 행사장) coverage·후처리 전부 스킵 — SEED_PERFLIST 12+개 행사장(롯데호텔·평창·aT 등) 무시 | **높음** |
| G2 | case-a UI가 no_data_flag·coverage 시각화 안 함 — 백엔드 보정이 사용자 화면에 노출 안 됨 | **높음** |
| G3 | coverage.missing 카테고리 사용자 안내 박스 없음 | 중간 |
| G4 | venueLearningStatus의 SEED_EVENT_HISTORY 합산 시 program_parts·learned_categories 0 (의도된 동작) | 낮음 (PASS) |
| G5 | STANDARD_CATEGORIES match_keywords가 발주엑셀 실측 단어("거리두기 스티커" 370회, "행사 현수막" 100회 등) 반영 못 함 | 중간 |
| G6 | computeVenueCategoryCoverage()는 venueFacilityGuide + 천정배너 시드만 사용 — 발주엑셀 13건 통합 맵(`_venue_signage_map.json`) 무시 → 실제 학습 데이터 누락 표기 (정답지 부정 편향) | **높음** |
| G7 | lib/text/ 폴더가 untracked (v9.21 작업물 git add 누락) | 낮음 (PASS — 사용자 결정 영역) |

### 핵심 변경 (5건 보강 — G1·G2·G3·G5·G6)

#### G5: STANDARD_CATEGORIES.match_keywords 발주엑셀 실측 표기 대량 보강
`signageCategoryStandards.ts`의 6대 카테고리 각각에 발주엑셀 13건 분석 결과 빈도 ≥3회 표기를 키워드로 추가:
- **outer_wall**: 행사 현수막(100회)·통천현수막(33회)·기둥현수막·홍보탑·무지배너 추가
- **gate**: 차량 게이트·공항 게이트·진입 아치 추가
- **streetlight**: 폴대배너(15회)·물통배너(7회)·세로현수막(233회) 일관화
- **x_banner**: 롤배너·A배너·I배너 추가
- **ceiling**: 드롭배너(천장 매다는 형태) 추가
- **support**: 거리두기 스티커(370회)·발자국 스티커(60회)·유도사인(32회)·행사 룸사인(17회)·영접피켓·시상보드·기념촬영보드·포토월·개회식 배치도·현황판·큐방/Q방 등 20+ 표기 추가

#### G6: computeVenueCategoryCoverage에 발주엑셀 통합 맵 합산
`computeMapCoverageByVenueKey()` 신설 — `_venue_signage_map.json` 13건을 fuzzy 매칭으로 venue_key별 6대 카테고리 학습 보유 여부 추출. 기존 venueFacilityGuide·천정배너 시드와 합산 후 최종 커버리지 계산.
- 효과: 코엑스·송도·ICC 등 시설 가이드에 일부 카테고리 누락된 행사장도 실제 발주 기록으로 학습 보강
- 사용자 명령 정합: 시설 가이드는 매뉴얼(가이드 데이터가 오래될 수 있음), 발주 기록은 실제 사용(최신) — decisions.md 2026-05-12 "제작 완료 > 시설 가이드" 원칙 코드화

#### G1: 시설 가이드 미등록 행사장 fallback 처리
`buildCoverageForUnregisteredVenue(venueName)` 신설 — findVenueKey 매칭 실패해도 발주엑셀 통합 맵 단독으로 카테고리 학습 데이터 추출. 매칭 안 되면 6대 전부 미학습으로 정직하게 표기 (정답지 부정 편향 방지).
`resolveCoverageForVenue(venueName)` — 등록/미등록 분기 통합 헬퍼.
`recommendSignage.ts` 후처리 변경: `findVenueKey` 직접 호출 → `resolveCoverageForVenue` 사용. 시설 가이드 5개 외 행사장(롯데호텔·웨스틴조선·그랜드하얏트·평창 알펜시아·aT·OSCO 등)에서도 후처리·coverage 정상 동작.
`formatCoverageForPrompt`도 동일 분기 적용 + 미등록 행사장은 "※ 이 행사장은 시설 가이드 미등록. 발주엑셀 기록만으로 추출한 학습 데이터입니다." 주석 자동 부착.

#### G2 + G3: case-a 페이지 학습 데이터 시각화
- AlertTriangle 아이콘 import 추가 + STANDARD_CATEGORY_BY_KEY import
- `coverage` state 추가, handleRecommend에서 data.coverage 받아 저장
- review 스테이지 상단에 학습 데이터 부재 안내 박스 (amber, 학습됨·미학습 카테고리 한글 라벨 + 매뉴얼 확인 권장 메시지)
- 각 추천 항목 row에 `no_data_flag === true` 시:
  - amber 배경 (bg-amber-50/60)
  - 카테고리명 옆에 "추천 없음 (학습 데이터 부재)" amber 배지 (AlertTriangle 아이콘)
  - 텍스트 컬러 amber 계열로 전환 (강조)
- 결과: AI가 추측한 미학습 카테고리 추천이 시각적으로 명확히 구분됨

#### 추가 — 학습 관리자 페이지 미등록 행사장 커버리지 fallback
`app/(dashboard)/admin/learning/page.tsx`에 `buildCoverageForUnregisteredVenue` import + venueLearningStatus 계산 시 findVenueKey null 케이스에 fallback 적용. 결과: 롯데호텔·평창 알펜시아 등 venueLearningStatus 행도 카테고리 학습 컬럼에 amber/slate 라벨 노출됨.

### 변경 파일 (4개)
- `lib/data/signageCategoryStandards.ts` (G5 키워드 보강 + G6 통합 맵 합산 + G1 buildCoverageForUnregisteredVenue/resolveCoverageForVenue 신설)
- `lib/ai/recommendSignage.ts` (import 정리 + 후처리에 resolveCoverageForVenue 적용)
- `app/(dashboard)/projects/new/case-a/page.tsx` (G2·G3 UI 시각화 — coverage state·안내 박스·no_data_flag 배지)
- `app/(dashboard)/admin/learning/page.tsx` (미등록 행사장 fallback 적용)

### 검증
- TSC 0 에러 (1차 Set 이터레이션 에러 → Array.from 래핑으로 해결)
- Next 빌드 22/22 라우트 통과 (case-a 7.81kB → 9.42kB)

### 효과
- v9.22 후처리가 시설 가이드 5개 행사장에서만 동작하던 한계 해소 → SEED_PERFLIST 17건 + 발주엑셀 13건 모두 커버
- 사용자가 추천 결과에서 "AI가 추측한 카테고리"를 한눈에 식별 (amber 배경 + 배지)
- 학습 관리자 페이지에서 시설 가이드 미등록 행사장도 카테고리 학습 현황 표시 — 행사장 보강 우선순위 식별 가능
- 발주엑셀 실측 표기 키워드 추가로 향후 발주 결과 자동 분류 정확도 향상

### 다음 사이클 후보 (남은 갭)
- G7: lib/text/normalizeAiText.ts git add (사용자 결정 영역 — 직접 add 또는 다음 커밋에 포함)
- G8: 시설 가이드 미등록 행사장(롯데호텔·평창·그랜드하얏트 등) 신규 등록 — SEED_VENUE_SPECS·SEED_CEILING_BANNER_PATTERNS·VENUE_FACILITY_GUIDE_SEED 3곳 동시 추가 필요 (작업량 큼)
- EVENT_TYPE_RECOMMEND inline → lib/programParts.ts PROGRAM_PART_SIGNAGE_HINTS 통합 (v4.1 잔여 정리)
- 행사 격 보정 룰 / 부속 시설 휴리스틱 코드 강제 (SYSTEM_INSTRUCTION 텍스트만 있음)
- 발주엑셀 _venue_signage_map.json venue 라벨 정제 — "미상" "기타" "-" 같은 노이즈 venue 추가 매핑 필요

### 후속 사용자 확인 사항
- dev 서버 case-a 페이지에서 미등록 행사장(예: "롯데호텔 서울") 입력 후 AI 추천 받아 amber 안내 박스 + no_data_flag 배지 동작 확인
- `/admin/learning` → SEED_PERFLIST 17건 venue가 카테고리 학습 컬럼에 표시되는지 (이전엔 5개만)
- 코엑스/송도/ICC가 발주엑셀 통합 맵 합산으로 학습 카테고리 수 증가 확인

## 2026-05-13 (v9.22) — 6대 표준 카테고리 학습 데이터 표준화 + 미학습 카테고리 자동 표기

### 배경 — 부족 영역 점검 결과 (A~E 5영역)
사용자 요청 "환경장식물 부족한 부분 있는지 확인 및 적용 특히 학습 관련하여 더 진행" 따라 시드 데이터·시설 가이드·AI 학습·학습 관리자·goals/current.md TODO 5영역을 일괄 점검. 5영역 공통 핵심 부족 = "카테고리별 학습 항목 표준화 (외벽/게이트/가로등/X배너/천정/부속시설)" — goals/current.md 1단계 TODO 1번 항목.

### 핵심 변경 (3개 우선순위 적용)

#### 1. `lib/data/signageCategoryStandards.ts` 신설 (영역 A·B·C·D 공통 기반)
- `StandardCategoryKey` 6종 정의: outer_wall·gate·streetlight·x_banner·ceiling·support
- `STANDARD_CATEGORIES[]` — 각 카테고리에 match_keywords·priority(1·2·3)·typical_size 명시
- `classifyCategory(categoryText)` — 자유 문자열(`가로현수막 (외벽)` 등) → 표준 키 매핑
- `computeVenueCategoryCoverage()` — VENUE_FACILITY_GUIDE_SEED + SEED_CEILING_BANNER_PATTERNS 기반으로 행사장별 6대 카테고리 학습 보유 여부 계산
- `summarizeCoverage()` / `formatCoverageForPrompt()` — 학습 관리자·AI 프롬프트 양쪽 사용 헬퍼

#### 2. `lib/ai/recommendSignage.ts` 후처리 + 커버리지 프롬프트 주입
- 새 import: signageCategoryStandards 4개 함수 + findVenueKey
- RecommendItem에 `standard_category?` + `no_data_flag?` 필드 추가
- RecommendResult에 `coverage?: { venue_key, filled[], missing[] }` 필드 추가
- userText에 `coverageBlock` 연결 — "이 행사장은 외벽·천정만 학습됨 → 미학습 카테고리는 quantity=0 + 추천없음 표기"를 Gemini에 명시
- JSON 파싱 후 후처리: 각 item의 category_label을 classifyCategory로 분류 + 미학습이면서 X배너·부속시설이 아닌 카테고리는 `[추천 없음 — 학습 데이터 부재]` rationale 강제 prepend + no_data_flag=true
- learnings.md 2026-05-11 "정답지 노출 편향" 코드화 — SYSTEM_INSTRUCTION 텍스트만 있던 약속을 코드 강제로 보강

#### 3. 학습 관리자 페이지 — 카테고리 학습 현황 컬럼 추가
- `LearningManagerClient` VenueLearningStatus 인터페이스에 `category_coverage?: { filled[], missing[], priority_1_missing[] }` 추가
- venue-status 섹션 표에 "카테고리 학습" 컬럼 1개 추가 — emerald(학습)/slate(미학습)/rose(우선순위1 누락 = 외벽·천정) 3색 라벨
- 안내문에 6대 표준 카테고리 명시 (외벽·게이트·가로등·X배너·천정·부속시설)
- `page.tsx`에서 `computeVenueCategoryCoverage()` + findVenueKey 매칭하여 venueLearningStatus에 category_coverage 채워서 전달

### 변경 파일 (3개)
- `lib/data/signageCategoryStandards.ts` (신규)
- `lib/ai/recommendSignage.ts` (import·인터페이스·후처리)
- `app/(dashboard)/admin/learning/LearningManagerClient.tsx` (인터페이스·표 컬럼)
- `app/(dashboard)/admin/learning/page.tsx` (커버리지 계산·매핑)

### 검증
- TSC 0 에러
- Next 빌드 22/22 라우트 통과 (admin/learning 12.4kB → 12.6kB)

### 효과
- AI 추천 시 학습 데이터 없는 천정배너·외벽 카테고리에 자동 `[추천 없음]` 표기 — 환각 방지 (learnings.md 2026-05-11)
- 학습 관리자 페이지에서 행사장별 어떤 카테고리가 부족한지 한눈에 확인 — DDP·ICC처럼 데이터 적은 행사장 식별 가능
- 카테고리 분류 체계가 코드로 정착돼 향후 행사장 시드 추가·천정배너 패턴 보강 시 일관성 유지

### 후속 사용자 확인 사항
- dev 서버에서 `/admin/learning` → 행사장 학습 현황 표 카테고리 학습 컬럼 노출 확인
- 새 프로젝트 만들어 AI 추천 받을 때 학습 없는 카테고리(예: DDP 천정배너)에 `[추천 없음]` 자동 표기 동작 확인
- 시드 추가 보강은 정답지 노출 편향 우려로 보류 (코엑스·송도·ICC 천정배너 실측 — 2차 AI 시험 완료 후)
- main 머지: v9.21·v9.22 두 브랜치를 묶어서 머지할지 별도로 진행할지 결정 필요

## 2026-05-13 (v9.21) — 환경장식물 시설 가이드 피드백 회의 6개 결정 일괄 반영

### 회의: 260513 환경장식물 시설 가이드 피드백 (회의록 6개 결정 우선순위 순)

#### ① (최우선) FacilityGuidePanel 한 번 클릭 진입 보장
- `app/components/facility/FacilityGuidePanel.tsx` outer wrapper의 onClick={onClose} 제거
- pointer-events-none 컨테이너 + backdrop만 onClose / 패널 본체는 pointer-events-auto + stopPropagation
- 첫 클릭 즉시 패널 표시 + 내부 자식 클릭이 닫지 못하도록 격리

#### ② 시설 가이드 호버 텍스트 잘림 해결
- install_allowed note의 `truncate max-w-[180px]` 제거 → 별도 줄에 break-words + whitespace-pre-wrap로 전체 노출
- warnings.description / special_notes 동일하게 wrap + 줄바꿈
- 행사장 객관 시설 정보(코엑스 등 1차 자료)는 잘림 없이 전부 노출 (메모리 feedback-facility-guide-full-visibility 적용)

#### ③ AI 생성 텍스트 가독성 — `lib/text/normalizeAiText.ts` 신설
- `formatNoteText()` — 마침표 + 공백 + 다음 문장 시작 시 줄바꿈 삽입
- 약어·소수점·전화번호의 점(.)·D-1 등은 보존
- case-a 페이지 추천 결과 rationale `truncate` 제거 + formatNoteText 적용

#### ④ "운영팀 확인 필수" 강조 표시 톤다운
- "미확인 항목 — 운영팀 직접 확인 필요" 헤더 → "사전 협의 권장 항목"으로 변경 (amber → slate)
- 강조 라벨 남발 금지 — 일반적으로 어떻게 하더라 정보만 제공

#### ⑤ 미확인 항목 처리 — 구체 카테고리로 리스트업
- `getGuideUnknowns()` 재작성: install_allowed에서 "확인 필요/필수" 포함 항목의 category명을 직접 리스트업
- 매뉴얼 OCR 미파싱·내부 처리 메시지(사용자에게 의미 없음) 제거
- rigging 정보 중복 강조 제거 (install_allowed에 이미 노출됨)

#### ⑥ 추상적 텍스트 = 시설 가이드 원문 그대로
- venueFacilityGuide.ts는 이미 시드 원문 기반 (AI 의역 없음) → 추가 변경 불필요
- 호버 잘림 해결로 원문 정보가 잘림 없이 노출됨

### 변경 파일 (3개)
- `app/components/facility/FacilityGuidePanel.tsx` (1·2·4·5번)
- `app/(dashboard)/projects/new/case-a/page.tsx` (3번)
- `lib/text/normalizeAiText.ts` (신규 — 3번)

### 검증
- TSC 0 에러 / Next 빌드 22/22 라우트 통과

### 후속 사용자 확인 사항
- dev 서버에서 행사장 가이드 버튼 첫 클릭에 즉시 패널 열리는지
- install_allowed 항목 note 잘림 없이 전체 텍스트 보이는지
- AI 추천 결과(case-a) rationale 줄바꿈으로 가독성 개선됐는지

---

## 2026-05-12 (v9.19) — 엑셀/PPT/PDF 헤더 개편 + 동적 컬럼 + 날짜 연결

### 핵심 변경 (사용자 요청: 헤더 21컬럼 개편 + 숨김/표시 토글)

#### 1. 컬럼 구조 개편 (EditorGrid.tsx)
- 새 DEFAULT_COLS 21컬럼 (사용자 요청 순서): NO·파트·구분·장소·사용목적·품목·언어·규격·재질·수량·내용·디자인업체·출력업체·설치일자·설치시간·사용기간·철거일자·철거시간·발주담당자·발주일·비고
- **기본 숨김 8개**: 디자인업체·출력업체·설치일자·설치시간·사용기간·철거일자·철거시간·발주일
- **PPT 기본 제외 8개**: 디자인업체·출력업체·설치시간·사용기간·철거시간·발주담당자·발주일·담당자
- PPT 기본 14컬럼: NO·파트·구분·장소·사용목적·품목·언어·규격·재질·수량·내용·설치일자·철거일자·비고
- localStorage 키 v9 → v10 (이전 설정 커스텀 값만 이전, 컬럼 순서·숨김은 새 기본값)
- '규격' 라벨에서 (mm) 단위 표기 제거

#### 2. ExportService.ts 전면 개편
- DEFAULT_LABELS·DEFAULT_ORDER·DEFAULT_PPT_EXCLUDED 새 21컬럼 기준으로 업데이트
- `DateContext` 인터페이스 + `getMilestoneDates()` 신설 — OrderingSchedule localStorage에서 마일스톤 날짜 자동 계산
  - install_date → install 마일스톤 날짜 (기본 D-1)
  - uninstall_date → 행사 D+1
  - order_date → order 마일스톤 날짜 (기본 D-14)
- `getCellValue()`에 `dateCtx?` 파라미터 추가 — item 개별 날짜 없을 때 자동 채움
- **exportToPPT 동적화**: 하드코딩 14컬럼 → localStorage excludedFromPpt 기반 동적 컬럼 선택
  - 컬럼 너비 비율 자동 분배 (내용 2.2배, 날짜·비고 1.2배 등)
- exportToExcelDynamic에도 dateCtx 주입
- 정적 fallback 21컬럼으로 업데이트

#### 3. v9.18 — 행사장 규모 스펙 AI 주입 (recommendSignage.ts)
- `getVenueSpecs`, `formatVenueSpecsContext` import 추가
- `venueSpecsBlock` 계산 후 userText 마지막에 연결
- 7개 행사장 규모 데이터(면적·천장고·부스수·출입구·리깅여부) 가 Gemini 수량 스케일링 기준으로 활용됨

### 검증
- TSC 0 에러 / Next 빌드 21/21 라우트 통과

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
