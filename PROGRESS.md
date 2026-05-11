# 작업 이력

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
