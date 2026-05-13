# IA v4.2 — 제작물 리스트 가이드 (상세본)

> 작성: 2026-05-08
> 기반: IA_v4.md (v4.1) + 코드베이스 전수조사 (라우트 16개·API 2개·테이블 11개·서비스 모듈 12개)
> 대상 독자: PM·신규 개발자·외부 검토자
> 위치: `docs/IA_v4_2_detailed.md`

이 문서는 IA_v4.md(요약본)의 **확장본**이다. v4.1의 큰 그림은 그대로 유지하면서 페이지·DB·서비스·권한·데이터 흐름을 **실제 코드 기준**으로 한 줄도 빠짐없이 풀어둔다.

---

## 0. 시스템 정체성

| 항목 | 값 |
|---|---|
| 시스템명 (UI/문서) | **제작물 리스트 가이드** |
| 시스템명 (구) | MICE 제작물 디자인 의뢰 가이드 |
| repo / DB / env | `mice-design-guide` (변경 X) |
| 핵심 목적 | 행사 정보 입력 → 환경장식물 추천 리스트 → 발주용 엑셀(17컬럼) + PPT(빈 슬라이드) 자동 생성 |
| 사용자 그룹 | ① AXDX팀 PM·실무자 (admin·user) ② 외주 디자이너 (token 기반 사외 공유) |
| 방향 | 디자인 편집기 X. 학습 기반 추천 + 발주 가이드 도구 (v4.1, 2026-05-07 회의 결정) |

---

## 1. 라우트 전체 지도 (16 페이지 + 2 API)

### 1-A. 페이지 트리

```
/                                       Public — 루트 리다이렉터 (auth 상태에 따라 /dashboard ↔ /login)
│
├── (auth) 라우트 그룹 — 헤더 없음
│   ├── /login                          Public — Supabase Auth 로그인
│   └── /signup                         Public — 회원가입 (handle_new_user 트리거 → profiles 자동 생성)
│
├── (dashboard) 라우트 그룹 — 공통 헤더(메뉴 4종 + LogoutButton)
│   ├── /dashboard                      로그인 — 메인. 프로젝트 카드 그리드 + KPI(D-7·이번달·진행중)
│   │
│   ├── /projects/new                   로그인 — 4-케이스 선택 화면 (StepIndicator)
│   │   ├── /projects/new/case-a        AI 추천 시작 (Gemini)
│   │   ├── /projects/new/case-b        엑셀 업로드 시작 (XLSX 17컬럼 fuzzy match + alias)
│   │   ├── /projects/new/case-c        시안 이미지 업로드 시작 (WebP·2000px → Storage)
│   │   └── /projects/new/case-d        텍스트만 시작 (빈 X-배너 1장)
│   │
│   ├── /projects/[id]                  멤버 — 메인 에디터
│   │   │                               EditorLayout = 상단 17컬럼 그리드(40%) + 하단 Fabric.js 캔버스(60%)
│   │   │                                              + 좌측 ItemSidebar + 우측 SlotPanel + 상단 Toolbar
│   │   └── /projects/[id]/info         멤버 — 프로젝트 정보 / 팀원 / 마스터 시안 / 슬롯 기본 서식
│   │
│   ├── /archive                        admin only — 저장된 제작물 검수 (전체 500건 최근순)
│   ├── /data                           admin only — 13탭 관리자 대시보드 (KPI + 시드 마스터)
│   └── /admin/learning                 admin only — 행사장·도면 학습 큐 관리
│
├── /share/[token]                      Token 기반 (로그인 X) — 사외 공유, v4 보류 상태
│
└── /api
    ├── /api/recommend                  POST — Gemini 2.5 Flash 환경장식물 추천 (인증 필수)
    └── /api/analyze-layout             POST — Gemini Vision 마스터 시안 → 슬롯 bbox 추출
```

### 1-B. 라우트별 핵심 컴포넌트 매핑

| 경로 | 핵심 컴포넌트 | 핵심 데이터 |
|---|---|---|
| `/dashboard` | `DashboardContent`, `NewProjectButton`, `LogoutButton` | `projects` SELECT (owner) + design_items count |
| `/projects/new` | `StepIndicator` 4-card grid | (입력 없음) |
| `/projects/new/case-a` | `StepIndicator`, `GuideBox`, `MissingFieldAlert` | `/api/recommend` POST |
| `/projects/new/case-b` | XLSX 파싱(SheetJS), `aliasResolver` | 파일 → `design_items` 일괄 INSERT |
| `/projects/new/case-c` | 이미지 WebP 변환, `storagePaths.buildStoragePath('master')` | Storage 업로드 → `projects.master_image_url` |
| `/projects/new/case-d` | (텍스트 입력만) | 기본 X-배너 1행 INSERT |
| `/projects/[id]` | `EditorLayout` → `EditorToolbar` + `EditorGrid` + `CanvasBoard` + `ItemSidebar` + `SlotPanel` + `PreflightModal` | `design_items` + `item_contents` Realtime |
| `/projects/[id]/info` | `ProjectInfoClient` | `slot_styles`, `project_members`, `master_image_url` |
| `/archive` | `ArchiveClient` | `design_items` LEFT JOIN `projects` + `item_contents` (LIMIT 500) |
| `/data` | `DataDashboard` (13탭) | `lib/data/dashboardSeed.ts` 시드 폴백 + Supabase |
| `/admin/learning` | `LearningManagerClient` | `venues`, `venue_requests`, `learning_jobs` |
| `/share/[token]` | `ClientReviewView` | `share_tokens.token` 검증 → 읽기 전용 |

### 1-C. Middleware 보호 규칙 (`middleware.ts`)

```
미인증 + 보호경로(/dashboard*, /projects*, /archive, /data, /admin/*)
  → /login 리다이렉트 (returnTo 쿼리 보존)

인증 + 인증경로(/login, /signup)
  → /dashboard 리다이렉트
```

페이지 수준에서 `isAdmin()` 체크 (admin only 4페이지: /archive, /data, /admin/learning)

### 1-D. API 엔드포인트 상세

#### POST `/api/recommend`
- **입력**: `RecommendInput` — eventName, venue, eventType[], expectedAttendees, languages[], setupDate, isInternational, hasVIP, isOutdoor, budgetConstraint
- **처리**:
  1. `findSimilarPastEvents()` — 행사장(+4) · 발주처(+5) · 분류(+3) · PM부서(+2) 가중치 점수로 상위 5건 추출
  2. Gemini 2.5 Flash REST 호출 (`responseMimeType: 'application/json'`)
  3. 17컬럼 형식 JSON 강제 (no, category, location, purpose, language, width_mm, height_mm, material, quantity, content, remark)
- **출력**: `{ items: RecommendItem[], summary: string, inferredScale: 'small'|'medium'|'large' }`
- **인증**: Supabase Session 필수

#### POST `/api/analyze-layout`
- **입력**: `{ imageUrl: string }` (Storage URL)
- **처리**: Gemini Vision으로 슬롯 bbox 추출 (0~1000 정규화)
- **출력**: `{ slots: [{ key, label, x%, y%, w%, fontSize }] }`
- **인증**: 선택 (마스터 시안 업로드 시 호출)

---

## 2. 권한 매트릭스 (3계층)

| 자원 | 일반 사용자 | 멤버 (allowed_users) | admin |
|---|---|---|---|
| `/dashboard` | R/W (본인 owner) | R (멤버 프로젝트) | R/W (전체) |
| `/projects/new/*` | R/W | R/W | R/W |
| `/projects/[id]` | ✗ | R/W | R/W |
| `/projects/[id]/info` | ✗ | R/W (owner는 권한 변경 가능) | R/W |
| `/archive` | → /dashboard | → /dashboard | R/W |
| `/data` | → /dashboard | → /dashboard | R/W |
| `/admin/learning` | → /dashboard | → /dashboard | R/W |
| `/share/[token]` | (token만 있으면 ✓) | ✓ | ✓ |
| **DB: projects, design_items, item_contents, slot_styles** | owner만 ALL | (RLS는 owner 기준, allowed_users는 앱 레이어 체크) | ALL |
| **DB: venues, venue_halls** | SELECT | SELECT | ALL |
| **DB: venue_requests** | 본인 요청만 SELECT/INSERT | 본인만 | ALL |
| **DB: learning_jobs** | ✗ | ✗ | ALL |
| **DB: usage_logs** | 본인 SELECT/INSERT | 본인 | ALL |
| **DB: signage_aliases** | SELECT | SELECT | ALL |
| **DB: profiles** | authenticated SELECT, 본인만 UPDATE | 동일 | ALL |

`is_admin()` SQL 함수(SECURITY DEFINER) — `profiles.role = 'admin'` 체크. RLS 정책에서 동적 호출.

---

## 3. DB 스키마 (테이블 11개)

### 3-A. 도메인 테이블 (5개)

#### `projects` — 프로젝트(행사) 단위
| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | uuid PK | |
| name | text | 행사명 |
| owner_id | uuid → auth.users | RLS 기준 |
| client_name | text | 발주처 |
| event_venue | text | 행사장 (datalist 자동완성) |
| event_date | date | 행사 시작일 |
| status | text | 'draft'/'active'/'completed' |
| stage | text | (v4.1 신설) 상세 단계 |
| allowed_users | text[] | 앱 레이어 권한 체크 |
| program_parts | text[] | (v4.1) EZ 폴더링 코드 다중선택 |
| program_parts_legacy | text | v3 event_type 백업 |
| master_image_url | text | 프로젝트 마스터 시안 Storage URL |
| share_token | text | 사외 공유 토큰 (legacy) |
| share_enabled | boolean | |
| created_at, updated_at | timestamptz | 트리거 자동 갱신 |

#### `design_items` — 환경장식물 1개 = 1행
| 컬럼 | 설명 |
|---|---|
| id, project_id (→ projects), no | 순번 "01"·"02" |
| part | 업무파트 자유텍스트 (legacy) |
| program_part | (v4.1) 코드 단일/쉼표분리 — 엑셀 출력 시 한글 자동 변환 |
| category | "X-Banner"·"현수막" 등 |
| location, purpose, language, quantity, material | 발주 메타 |
| width_mm, height_mm | 규격 |
| image_url | Storage URL (시안 이미지) |
| layout_dna | jsonb — 슬롯 좌표 메타 |
| review_status | 'pending'/'approved'/'rejected' (검수) |
| last_edited_by, updating_by | 협업 잠금/표시 |
| is_master | boolean — 마스터 시안 (같은 category 전파) |

#### `item_contents` — 슬롯별 텍스트 (Realtime 구독 대상)
- (item_id, slot_key) UNIQUE
- slot_value JSON: `{ ko, en, x%, y%, fontSize, color, align, ... }`
- `ALTER PUBLICATION supabase_realtime ADD TABLE item_contents` 적용됨

#### `slot_styles` — 프로젝트 레벨 슬롯 기본 서식
- (project_id, slot_key) UNIQUE
- font_face, font_size, color, align — 같은 slot_key는 프로젝트 내 모든 제작물에서 공유
- `item_contents.slot_value.fontSize`로 개별 override 가능

#### `share_tokens` — 사외 공유 토큰 (v4 보류)
- token UNIQUE, expires_at, enabled, created_by

### 3-B. 학습·운영 테이블 (5개, v4.1 신설)

#### `venues` — 행사장 마스터
| 컬럼 | 설명 |
|---|---|
| id, name, region, venue_type | 권역(서울/경기/...) + 유형(컨벤션센터/호텔/...) |
| has_hall_split | boolean — 홀 분리 여부 |
| floor_plan_url | 도면 Storage URL |
| capacity, address | 부가 정보 |

#### `venue_halls` — 행사장 내 홀 분리
- venue_id → venues, hall_name, capacity, floor_plan_url

#### `venue_requests` — 사용자 신규 행사장 등록 요청
- name, requested_by, status('pending'/'approved'/'rejected')
- floor_plan_url (도면 첨부 가능)
- approved_venue_id → venues (승인 시 자동 매핑)
- 사용자 본인 INSERT/SELECT, admin 승인

#### `learning_jobs` — 도면 학습 큐 (스켈레톤)
- job_type ('floor_plan_analyze' / 'venue_meta_enrich' / ...)
- venue_id → venues, source_url
- status ('queued' / 'processing' / 'done' / 'failed')
- result jsonb — Vision 분석 결과 저장 (다음 사이클)
- admin only

#### `usage_logs` — 사용량 추적
- user_id, project_id, action ('export_excel' / 'export_pptx' / 'recommend' / ...)
- metadata jsonb, created_at
- 본인 SELECT/INSERT, admin ALL

### 3-C. 권한·매핑 테이블 (1개)

#### `signage_aliases` — 환경장식물 동의어 (DB + 시드 병합)
- alias_name, canonical_name, kind, default_size, note
- 7+10 시드 (스프링배너→X배너 / 드롭배너→세로현수막 / 천장배너→통천 등)

### 3-D. 인증 (Supabase Auth)

#### `profiles` (auth.users 확장)
- id (FK auth.users), email, display_name
- role ('admin' / 'user')
- `handle_new_user()` 트리거로 신규 가입 시 자동 생성

### 3-E. 트리거·함수 카탈로그

| 이름 | 유형 | 역할 | DEFINER |
|---|---|---|---|
| `handle_updated_at()` | TRIGGER FUNC | created_at/updated_at 자동 갱신 (4테이블) | — |
| `is_admin()` | SQL FUNC | profiles.role 체크 | **SECURITY DEFINER** |
| `handle_new_user()` | TRIGGER FUNC | auth.users INSERT → profiles INSERT | **SECURITY DEFINER** |
| `on_auth_user_created` | TRIGGER | auth.users → handle_new_user() | — |

### 3-F. 인덱스 카탈로그 (주요 17건)

- B-tree: projects(owner_id), design_items(project_id), item_contents(item_id), share_tokens(project_id), share_tokens(token UNIQUE), slot_styles(project_id), signage_aliases(kind), projects(event_venue), design_items(program_part), venue_requests(status), venue_requests(requested_by), learning_jobs(status), learning_jobs(venue_id), usage_logs(user_id, created_at desc), usage_logs(action, created_at desc)
- GIN: projects(program_parts) — 다중선택 검색
- UNIQUE: item_contents(item_id, slot_key), slot_styles(project_id, slot_key)

### 3-G. 마이그레이션 파일 시간 순서

| 파일 | 적용 |
|---|---|
| `schema.sql` | 기본 6테이블 + Realtime |
| `migration_v3_all.sql` | Storage RLS 4정책 + is_admin() + share_tokens + signage_aliases (7건) |
| `migration_v5_data_tables.sql` | 학습용 5테이블 (signage_types/synonyms/designers/event_history/venue_info) |
| `migration_v6_v4_1.sql` | **v4.1 대전환** — venues, venue_halls, venue_requests, learning_jobs, usage_logs, program_parts, indices |

> ⚠️ PM 후속 액션: `migration_v6_v4_1.sql` Supabase Studio에서 직접 실행 필요.

---

## 4. 컴포넌트·서비스 카탈로그

### 4-A. UI 컴포넌트 (`app/components`)

#### 가이드 컴포넌트 (4종)
| 컴포넌트 | 위치 | 역할 |
|---|---|---|
| `StepIndicator` | guide/StepIndicator.tsx | 5단계 sticky 진행 표시 |
| `GuideBox` | guide/GuideBox.tsx | WHY/HOW/TIP 3층 인라인 도움말 |
| `NextStepBanner` | guide/NextStepBanner.tsx | 단계 완료 → 다음 CTA 배너 |
| `MissingFieldAlert` | guide/MissingFieldAlert.tsx | 누락 항목 inline + summary 2형식 |

#### 에디터 컴포넌트 (Fabric.js 캔버스)
| 컴포넌트 | 역할 |
|---|---|
| `EditorLayout` | 전체 레이아웃 컨테이너 |
| `EditorToolbar` | 시안 업로드, Excel/PPT 다운로드, 발주 전 점검 진입 |
| `EditorGrid` | 17컬럼 테이블 (더블클릭 셀 편집) |
| `CanvasBoard` | Fabric.js IText 캔버스 (드래그 + 더블클릭 직접 타이핑) |
| `ItemSidebar` | 제작물 목록, 추가/삭제, 마스터 지정 |
| `SlotPanel` | 슬롯 텍스트/위치 편집 (3×3 격자 + W% + 레이아웃 템플릿 저장) |
| `PreflightModal` | 발주 전 18가지 자동 점검 결과 모달 |

#### 프로젝트 정보·생성
| 컴포넌트 | 역할 |
|---|---|
| `NewProjectButton` | 3단계 위자드 모달 (행사정보 → 파트 → 제작물 종류) |
| `VenueRequestModal` | 신규 행사장 등록 요청 (도면 첨부 가능) |
| `ProjectInfoClient` | /info 페이지 — 마스터 시안, 슬롯 기본 서식, 팀원 |
| `DeleteProjectButton` | owner 전용 cascade 삭제 |

#### admin 페이지
| 컴포넌트 | 역할 |
|---|---|
| `DataDashboard` | /data 13탭 (개요·실측·행사이력·PM·발주처·분류·환경장식물·동의어·행사장·분류권장·재질·디자인업체·납기) |
| `LearningManagerClient` | /admin/learning 4섹션 (행사장 추가·요청 대기·학습 큐·학습 완료) |
| `ArchiveClient` | /archive 500건 검수 |

### 4-B. 서비스 모듈 (`lib/services`)

| 모듈 | 핵심 export | 역할 |
|---|---|---|
| `storagePaths.ts` | `buildStoragePath()`, `explainStorageError()` | RLS 준수 경로 빌드 — userid 첫 폴더 강제 (5종 kind: item-image/slot-image/qr/master/logo) |
| `imageUtils.ts` | `dataUrlToBlob()`, WebP 변환 | 업로드 전 WebP·2000px 리사이징 |
| `preflightCheck.ts` | `runPreflight()`, `groupIssues()` | 18가지 자동 검증 (규격 누락·언어 혼재·QR 미지정·텍스트 오버플로우 등) — error/warning/info 3단계 |
| `aliasResolver.ts` | `loadAliases()`, `resolveAlias()`, `resolveAliasSync()` | 동의어 → 표준명 변환 (10분 캐시, DB+시드 병합) |
| `itemService.ts` | `insertDefaultSlotsForItem()`, `setAsMaster()`, `unsetMaster()` | 신규 아이템 슬롯 초기화 + 마스터 전파 (같은 category 범위, 텍스트 보존) |
| `ExportService.ts` | `getCellValue()`, `gatherContentText()`, `detectRemarks()` | 엑셀 17컬럼 + PPT 슬라이드 변환 — program_part 코드→한글 자동, bigarea #N suffix |
| `qrService.ts` | `generateQrDataUrl()` | 브라우저 QR 생성 (qrcode lib, 400px, M 오류수정) |

### 4-C. 데이터 계층 (`lib/data`)

| 모듈 | 역할 |
|---|---|
| `dashboardSeed.ts` ⭐ | **시드 단일 소스** — SEED_SIGNAGE_TYPES(11종), SEED_SYNONYMS(32건), SEED_EVENT_HISTORY(54건), SEED_PERFLIST(17건), SEED_SIGNAGE_ANALYSIS(281개 실측), SEED_EVENT_CATEGORIES(8종), `findSimilarPastEvents()`, `findLayoutDNA()` |
| `liveStats.ts` | 누적 학습 통계 — 5분 캐시 만료 후 자동 재집계 (avgItemCountByVenue, categoryFrequency 등) |
| `v4FloorPlanLookup.ts` | (스켈레톤) Vision API 도면 분석 결과 저장소 |

### 4-D. 추천 로직

| 모듈 | 역할 |
|---|---|
| `lib/recommendation/dongseonBanner.ts` | 룰베이스 동선배너 — 인원/200 + 홀분리 + 주출입구 + 대형행사장 가산 |
| `lib/ai/recommendSignage.ts` | Gemini 2.5 Flash REST 호출 — RecommendInput → 17컬럼 JSON. 과거 유사 행사 컨텍스트 자동 주입 |

### 4-E. 매핑·상수

| 모듈 | 핵심 export |
|---|---|
| `lib/programParts.ts` | `PROGRAM_PARTS[]`(40.04~40.20 12종), `PROGRAM_PART_BY_CODE`, `PROGRAM_PART_SIGNAGE_HINTS`, `recommendSignageByParts()`, `programPartNames()`, `migrateLegacyEventType()` |
| `lib/constants.ts` | `TEMPLATE_PRESETS[]`(30+), `SLOT_MAX_CHARS{}`, `STYLE_PRESETS[]`(6종), `PURPOSE_PRESETS[]`(5종), `PRODUCTION_FORMATS[]`(11종), `findTemplates()`, `calcCanvasDimensions()` |
| `lib/types.ts` | DB 테이블 1:1 매핑 + DEFAULT_SLOTS_PORTRAIT/LANDSCAPE/SQUARE |

---

## 5. 데이터 흐름 (5종 시퀀스)

### 5-1. 사용자 가입 → profiles 자동 생성
```
/signup 폼 → Supabase Auth signUp()
   └─> auth.users INSERT
        └─> on_auth_user_created TRIGGER → handle_new_user()
             └─> profiles INSERT (id, email, role='user')
```

### 5-2. 신규 프로젝트 생성 (Case A — AI 추천)
```
/projects/new/case-a 폼 입력
   ↓
findSimilarPastEvents() — 가중치 점수 (장소+4, 발주처+5, 분류+3, PM+2)
   ↓
POST /api/recommend → Gemini 2.5 Flash
   ↓
응답 JSON: { items[], summary, inferredScale }
   ↓
리뷰 화면 — 수량 조정 → "엑셀 다운로드" or "프로젝트 생성"
   ↓
projects INSERT (program_parts 다중선택 포함)
   ↓
design_items 일괄 INSERT (카테고리별 N개)
   ↓
itemService.insertDefaultSlotsForItems() → item_contents 기본 슬롯
   ↓
/projects/[id] 에디터로 자동 이동
```

### 5-3. 협업 편집 (Realtime)
```
사용자 A 슬롯 텍스트 입력
   ↓ Optimistic UI 즉시 갱신 (로컬 상태)
   ↓ 300ms 디바운스
item_contents UPDATE (slot_value JSON, last_edited_by, updating_by)
   ↓ Realtime publication
사용자 B 화면 < 500ms 반영
   └─ Date.now() - lastUpdated < 2000 → "Editing..." 배지 표시
```

### 5-4. 자동 누적 학습 사이클 ⭐ (사용자 핵심 지시)
```
projects INSERT (어떤 사용자든)
   ↓
liveStats.fetchLiveStats() 다음 호출 시 (5분 TTL 만료)
   ↓
- liveAsPerfList: SEED_PERFLIST + 라이브 프로젝트 합산
- categoryFrequency: 동의어 정규화 후 누적
- avgItemCountByVenue: 행사장별 평균 갱신
   ↓
recommendByProbability() 즉시 반영
   ↓
다음 새 프로젝트 폼 / Case A / /data KPI 자동 갱신
```
**별도 학습 트리거 X** — DB INSERT만으로 사이클 형성.

### 5-5. 행사장 학습 (수동 트리거)
```
사용자 → VenueRequestModal "신규 행사장 등록 요청" + 도면 첨부
   ↓
venue_requests INSERT (status='pending')
   ↓ 본인 화면 "내가 요청한" 그룹 즉시 노출
   ↓
admin → /admin/learning 진입 → 승인 클릭
   ↓
venues INSERT (도면 있으면) + learning_jobs INSERT (job_type='floor_plan_analyze')
   ↓ [다음 사이클 — 미구현]
   Vision API 호출 → 주출입구·동선 분석 → venues 메타 갱신
   ↓
모든 사용자 새 프로젝트 폼 드롭다운 자동 노출
```

### 5-6. 발주 출력
```
/projects/[id] EditorToolbar "발주 전 점검" 클릭
   ↓
PreflightModal — runPreflight() 18가지 검증
   ├─ error: 행사명·규격 누락
   ├─ warning: 오타·언어 혼재·텍스트 오버플로우
   └─ info: 검수 미완
   ↓ 이슈 클릭 → 해당 design_item 자동 선택 + 모달 닫기
   ↓
사용자가 수정 → 다시 점검 → "발주 파일 생성" 클릭
   ↓
ExportService 동시 실행:
├─ Excel (17컬럼) → "제작물리스트_{name}_{date}.xlsx"
│   - 파트: program_part 코드 → 한글 자동 변환
│   - 같은 카테고리 2+ → "X-배너 #1" 자동 prefix
│   - 내용: 슬롯 합산 (header_brand → footer_credits)
│   - 비고: arrow 슬롯 사용 시 "화살표 스티커" 자동
└─ PPT (빈 슬라이드) → "제작물리스트_{name}_{date}.pptx"
   - 시안 없을 때: dashed 빈 박스 "디자이너 작업 영역"
   ↓
usage_logs INSERT (action='export_excel' / 'export_pptx', best-effort)
```

---

## 6. EZ 폴더링 가이드 ↔ 본 시스템 매핑

본 시스템이 **다루는** 영역:
| 폴더 코드 | 폴더명 | 본 시스템 적용 |
|---|---|---|
| 40.15 제작물 | 환경장식물·기념품 | **메인 출력** (PPT 슬라이드, 엑셀 발주리스트) |
| 40.04~40.11 프로그램 파트 | 회의/전시/매칭/공식행사/부대행사 | **다중선택** (lib/programParts.ts) |
| 40.12 행사장 조성 | 회의장/전시장/공식행사장 | 도면 + 학습 데이터 (venues/venue_halls) |
| 40.14 인쇄제작 | 사전홍보물·현장홍보물·명찰 | 추천 리스트에 부분 포함 |
| 40.17 홍보 | 옥외광고·외부 홍보물 | 프로그램 파트 옵션 |
| 40.18~40.20 참가자 응대 | 의전·등록·영접영송 | 프로그램 파트 옵션 |

본 시스템이 **다루지 않는** 영역 (참고만): 10/20 영업·제안, 30 계약, 40.01~40.03 실행설계, 40.16 WEB APP, 50 현장운영, 60 사후관리

---

## 7. v4.1 보류 영역 (코드 보존, 진입점 차단)

| 영역 | 위치 | 사유 | 복귀 조건 |
|---|---|---|---|
| 캔버스 편집기 (Fabric.js) | `app/(dashboard)/projects/[id]` 일부 | 회의 결정 — 디자인 자체 걷어냄 | 사용자 피드백 누적 후 재검토 |
| AI 시안 추천 (Gemini) | `lib/ai/recommendSignage.ts` 일부 | 정확도 부족 — 룰베이스로 대체 | 학습 데이터 누적 후 정확도 측정 |
| 시안 일괄/품목별 업로드 | `NewProjectButton` step3 | 발주용 PPT는 빈 슬라이드만 | 디자이너 협업 흐름 정의 후 |
| 사외 공유 링크 | `/share/[token]` | v3 잔존 | v5에서 재검토 |

향후 복귀 시 코드 그대로 사용 가능. **헤더 메뉴 + 진입 버튼만 다시 노출**.

---

## 8. 기술 스택 요약

| 항목 | 선택 | 근거 |
|---|---|---|
| 프레임워크 | Next.js 14 App Router | 서버 컴포넌트 초기 데이터 fetch |
| 인증 | Supabase Auth (이메일/PW) | 향후 데이터허브 SSO 통합 예정 |
| DB | Supabase PostgreSQL + Realtime + RLS | 멀티유저 협업 + 행 수준 보안 |
| 파일 저장 | Supabase Storage (private, userid 폴더) | WebP·2000px 리사이징 강제 |
| 캔버스 | Fabric.js v5 | IText 더블클릭 + object:modified 이벤트 |
| 엑셀 | SheetJS (xlsx) | 17컬럼 발주서 |
| PPT | pptxgenjs | 슬라이드 (배경 + 텍스트 레이어) |
| AI | Gemini 2.5 Flash REST | 의존성 추가 X, JSON 강제 |
| 스타일 | Tailwind CSS (Soft-Dark) | slate-950/900/800 + indigo-600 |

---

## 9. 좌표계 일관성 규칙

| 단계 | 좌표 단위 | 변환 |
|---|---|---|
| Gemini Vision bbox | 0~1000 정규화 | `/ 1000 × 100` → % |
| 앱 내부 (item_contents.slot_value.x/y) | **0~100% 정규화** | 모든 좌표의 단일 진실 |
| 캔버스 렌더링 | px (1mm = 3.78px @ 96 DPI) | `% × canvas_width_px` |
| PPT 출력 | inch (mm / 25.4) | `% × slide_width_inch` |

⚠️ Gemini bbox → % 변환 시 **이미지 종횡비와 캔버스 종횡비 일치** 필수. `calcCanvasDimensions()`가 보장.

---

## 10. 개발자 체크리스트 (코드 변경 후)

```bash
node scripts/harness.mjs    # 72개 자동 점검 (실패 0 유지)
npx tsc --noEmit            # TypeScript 0 에러
npm run build               # 17개 라우트 모두 PASS
```

슬래시 커맨드:
- `/check` — 프로젝트 건강도 즉시 점검
- `/restart` — dev 서버 클린 재시작
- `/analyze-sample [파일]` — 환경장식물 이미지 → TEMPLATE_PRESETS 자동 추가
- `/pavr` — 5파일 이상 변경 시 PR 검토 모드
- `/ralph-loop` / `po_loop.sh` — 야간 무중단 자율 루프

서브에이전트:
- `mice-reviewer` — 명세 일치·샘플 DNA·엑셀 포맷 검증
- `mice-canvas-expert` — Fabric.js 캔버스 버그 전문

---

## 11. PM 후속 액션 (현재 미완)

| 항목 | 우선순위 | 비고 |
|---|---|---|
| Supabase Studio에서 `migration_v6_v4_1.sql` 실행 | 🔴 필수 | venues / venue_requests / learning_jobs / usage_logs / program_parts |
| 본인 `profiles.role = 'admin'` 확인 | 🔴 필수 | /data, /admin/learning 접근 |
| `/admin/learning` 진입 → 컨벤션센터·호텔 도면 5~10건 등록 | 🟡 권장 | 학습 우선순위 |
| `git push v2 auto/v4-stage-20260507:main` | 🟡 권장 | 현재 ahead commits |
| 새 프로젝트 1건 생성 → 자동 누적 학습 사이클 동작 확인 | 🟢 검증 | liveStats 5분 캐시 갱신 |

---

## 12. 변경 이력

- **2026-05-08 (v4.2)**: 본 상세본 신설. IA_v4.md 요약본을 기반으로 라우트·DB·컴포넌트·서비스·데이터 흐름 전체를 코드 기준으로 풀어냄.
- **2026-05-07 (v4.1)**: 명칭 변경, 캔버스/AI 추천 보류, 학습 인프라 신설. (IA_v4.md 참조)

---

## 부록 A. 자주 찾는 위치 빠른 색인

| 찾고 싶은 것 | 가야 할 곳 |
|---|---|
| 새 페이지 추가 | `app/(dashboard)/...` 또는 `app/(auth)/...` |
| API 추가 | `app/api/<name>/route.ts` |
| 권한 변경 | `middleware.ts` + `lib/auth/role.ts` + RLS SQL |
| 신규 환경장식물 종류 | `lib/constants.ts` `PRODUCTION_FORMATS[]` + `TEMPLATE_PRESETS[]` |
| 동의어 추가 | `lib/data/dashboardSeed.ts` `SEED_SYNONYMS` + DB `signage_aliases` |
| 프로그램 파트 추가 | `lib/programParts.ts` `PROGRAM_PARTS[]` + `PROGRAM_PART_SIGNAGE_HINTS` |
| 엑셀 컬럼 변경 | `lib/services/ExportService.ts` `getCellValue()` |
| Preflight 검증 추가 | `lib/services/preflightCheck.ts` `runPreflight()` |
| 슬롯 기본 좌표 변경 | `lib/types.ts` `DEFAULT_SLOTS_*` |
| 새 마이그레이션 | `supabase/migration_v<n>_*.sql` + `decisions.md` 기록 |

---

> 본 문서는 코드 기반 자동 조사로 작성됨. 코드 변경 시 수기 갱신 필요.
> 다음 갱신 시점: v5 진입 (Vision API 도입 또는 캔버스 편집기 복귀) 시 v4.3로 부 마이너 업.
