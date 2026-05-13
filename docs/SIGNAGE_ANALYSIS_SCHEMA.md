# 환경장식물 추천 — 데이터 스키마 명세 v1

> 작성: 2026-05-08
> 기반: 킨텍스 4개 행사 데이터 풍부도 검증 + 사용자 회의 결정사항
> 목적: 추천 엔진이 학습할 데이터 단위·항목 정의

---

## 핵심 원칙

1. **현재 가용 자료 우선** — 발주엑셀·시안·도면·매뉴얼·결과보고서에서 추출 가능한 것부터
2. **미래 자연 누적** — 새 프로젝트 INSERT 흐름과 일관 (앱 사용 = 데이터 자동 축적)
3. **누락 허용** — 모든 필드 nullable. 점진적 보강 가능
4. **3계층 분리** — 행사장(영구) / 행사(이벤트) / 제작물(아이템) 분리
5. **통계는 도출 가능, 원본은 저장** — 평균·빈도는 view·쿼리, 저장은 raw record

---

## 0. 기존 SEED_SIGNAGE_ANALYSIS의 한계

```ts
// 현재 (너무 단순)
{
  parsed_events: 8,
  total_items: 281,
  material_distribution: [...],
  non_standard_sizes: [...]
}
```

**문제**: "전체 통계 한 덩어리". 행사별·장소별·용도별 분리 불가 → 추천 못 함.

**전환**: per-event raw record로 저장 → 통계는 derived view로.

---

## 1. 3계층 데이터 모델

```
┌─────────────────────────────┐
│ VenueProfile                │  ← 행사장 단위 (영구, 가끔 갱신)
│ - 도면·매뉴얼 정보         │     데이터 소스: 참고자료/도면/* + 행사장 매뉴얼
│ - 홀별 제약 (천장·하중)    │     수집: admin 등록 시 1회 + venue_requests 승인
└──────────┬──────────────────┘
           │ 1:N
           ▼
┌─────────────────────────────┐
│ EventSignageRecord          │  ← 행사 단위 (계속 누적)
│ - 8가지 컨텍스트            │     데이터 소스: 발주엑셀 + 결과보고 + 수행실적
│ - 행사 메타·규모·시즌      │     수집: projects INSERT 시 자동 + 수동 보강
└──────────┬──────────────────┘
           │ 1:N
           ▼
┌─────────────────────────────┐
│ SignageItem                 │  ← 제작물 1개 = 1행
│ - 종류·규격·수량·위치      │     데이터 소스: 발주엑셀 행 + 시안 파일명
│ - 용도·재질                │     수집: design_items INSERT (현재 테이블 확장)
└─────────────────────────────┘
```

기존 `projects` / `design_items` 테이블과 호환 — **컬럼 추가만으로 구현**.

---

## 2. VenueProfile (행사장 영구 정보)

### 데이터 소스
- `참고자료/도면/<행사장>/` — 평면도 JPG, CAD, 매뉴얼 PDF, 임대요율표
- 신규 등록은 `venue_requests` → admin 승인 → `venues` INSERT

### 인터페이스
```ts
interface VenueProfile {
  // 식별
  id: string                          // venues.id
  name: string                        // "킨텍스"
  region: string                      // "경기"
  venue_type: 'convention' | 'hotel' | 'museum' | 'public' | 'outdoor' | 'other'
  has_hall_split: boolean

  // 도면·문서 링크 (Storage URL)
  floor_plan_urls: string[]           // 평면도 (홀별)
  cad_url: string | null              // CAD 파일
  manual_url: string | null           // 행사장 매뉴얼 PDF
  rate_card_url: string | null        // 임대요율표

  // ★ 행사장 제약 (Vision/매뉴얼 추출 — 현재는 수동·미래는 자동)
  constraints: {
    ceiling_height_m: number | null           // 천장 높이 (m)
    load_capacity_kg_per_m2: number | null    // 적재 하중
    fire_grade_required: string | null        // "불연재 1급" 등
    install_window: string | null             // "야간 22:00~06:00" 등
    hanging_max_per_hall: number | null       // 행잉배너 홀당 최대
    forbidden_zones: string[]                 // "주출입구 2m 반경 X" 등
    power_capacity_kva: number | null
    notes: string                             // 자유 텍스트
  }

  // 자동 분석 결과 (Vision)
  vision_analysis: {
    main_entrance_count: number | null
    typical_circulation: string | null         // "환형/직선/T자"
    entrance_signage_zones: { x: number; y: number; w: number; h: number }[]
    last_analyzed_at: string | null
  } | null

  // 메타
  created_at: string
  updated_at: string
}

interface VenueHall {
  id: string
  venue_id: string                    // → VenueProfile
  hall_name: string                   // "제1전시장 5홀"
  area_m2: number | null
  capacity_pax: number | null
  floor_plan_url: string | null
  constraints: VenueProfile['constraints']  // 홀별 override
}
```

### 수집 단계
| 시점 | 누가 | 어떻게 |
|---|---|---|
| 신규 등록 | admin | `/admin/learning` → 도면 첨부 → constraints 수동 입력 (필수: 천장 높이) |
| 자동 보강 | Vision API | 도면 업로드 시 `learning_jobs` 큐 → main_entrance·circulation 자동 추출 |
| 매뉴얼 갱신 | admin | 매뉴얼 PDF 재업로드 → 제약 정보 LLM 추출 (미래) |

---

## 3. EventSignageRecord (행사 단위 컨텍스트) ★ 8가지 항목 핵심

### 데이터 소스
- `참고자료/환경장식물 행사별/<행사명>/` — 발주엑셀, 결과보고, 시안
- `Ezpmp_수행실적리스트.xlsx` — 행사 메타·VIP·산업분류
- `projects` 테이블 (현재 + 신규 컬럼)

### 인터페이스
```ts
interface EventSignageRecord {
  // 식별
  id: string                          // projects.id
  project_name: string
  project_code: string | null         // "232025" 등 6자리

  // 1️⃣ 장소 (3계층) — 출처: 발주엑셀 장소1·장소2·장소3 / 결과보고
  venue_id: string                    // → VenueProfile
  venue_hall_ids: string[]            // → VenueHall (사용한 홀들)
  venue_raw: string                   // "킨텍스 제2전시장 6AB홀, 9B홀" 원본 문자열

  // 2️⃣ 프로그램 파트 (다중) — 출처: 수행실적 행사분류 / 결과보고 챕터 구조
  program_parts: string[]             // ["40.05 전시", "40.07 부대행사"]
  event_categories: string[]          // 수행실적 "행사분류" 원본 ("국제회의, 전시")

  // 3️⃣ 행사 규모 — 출처: 폴더명·수행실적·결과보고
  scale: {
    area_m2: number | null            // "10,449㎡" 폴더명에서 자동 추출 가능
    expected_pax: number | null
    actual_pax: number | null         // 결과보고에서 추출 (있으면)
    days: number | null               // start~end
    halls_used_count: number | null
  }

  // 4️⃣ 행사 격 — 출처: 수행실적 VIP 컬럼·industry·organizer
  prestige: {
    has_vip_president: boolean        // 수행실적에 컬럼 존재
    has_vip_first_lady: boolean
    has_vip_pm: boolean
    has_vip_foreign_leader: boolean
    is_international: boolean
    is_government_subsidized: boolean
    organizer_tier: 'government' | 'public' | 'private' | 'mixed' | null
  }

  // 5️⃣ 용도별 묶음 — 출처: 발주엑셀 "파트" + 자동 분류
  // (제작물 단위 분류는 SignageItem.purpose_group 에 저장. 여기는 행사 전체 활성화 여부)
  purpose_groups_active: ('environment' | 'circulation' | 'registration' | 'program' | 'external_promo')[]

  // 6️⃣ 설치·철수 기간 — 출처: 발주엑셀 "세팅·철수" / 결과보고
  schedule: {
    event_start: string               // ISO date
    event_end: string
    setup_start: string | null        // 세팅 시작
    teardown_end: string | null       // 철거 완료
    setup_window_hours: number | null // 자동 계산
    teardown_window_hours: number | null
    night_work_required: boolean | null
  }

  // 7️⃣ 시즌·시기 — 출처: event_start 자동 도출
  season: {
    season: 'spring' | 'summer' | 'autumn' | 'winter'  // 자동
    is_outdoor_safe: boolean | null   // 우기·혹한 회피
    weather_constraint: string | null
  }

  // 8️⃣ 재질·환경 (행사 단위 종합) — SignageItem 집계로 derive
  // (개별 재질은 SignageItem.material 에 저장)

  // 메타
  client: string | null               // 발주처
  industry: string | null             // "에너지/환경" 등
  pm_division: string | null
  pm_team: string | null
  result_report_urls: string[]        // 결과보고 PDF/HWP

  // 데이터 풍부도 자체 평가 (학습 가중치용)
  data_quality: {
    has_order_excel: boolean          // 발주엑셀 존재
    has_result_report: boolean
    has_design_files: boolean
    has_floor_plan_match: boolean     // VenueProfile 도면 매칭
    completeness_score: number        // 0~100
  }

  created_at: string
  updated_at: string
}
```

### 수집 단계
| 시점 | 누가 | 어떻게 |
|---|---|---|
| 과거 행사 일괄 | admin | 발주엑셀 일괄 import 스크립트 → `EventSignageRecord` 자동 생성 |
| HWP만 있는 행사 | admin | HWP→PDF 변환 → Gemini Vision으로 표·텍스트 추출 → 보강 |
| 신규 프로젝트 | 사용자 | `/projects/new` 위자드 → 항목 1·2·3·4·6·7 자동 입력 (현재 위자드 약간 보강) |
| 행사 종료 후 | PM | 결과보고 업로드 → 항목 3 actual_pax / data_quality 갱신 |

---

## 4. SignageItem (제작물 1개 = 1행, 기존 design_items 확장)

### 데이터 소스
- 발주엑셀 행 1개
- 시안 파일명 (규격·수량 추출 가능한 경우)

### 인터페이스
```ts
interface SignageItem {
  // 식별 (기존 design_items 호환)
  id: string
  project_id: string                  // → EventSignageRecord
  no: string

  // 1️⃣ 종류·규격·수량 (기존)
  category: string                    // "X-Banner" — signage_aliases 정규화 후
  category_raw: string                // 원본 명칭 (예: "스프링배너")
  width_mm: number
  height_mm: number
  quantity: number

  // 1-A 위치 3계층 (장소1·장소2·장소3)
  location_building: string | null    // "킨텍스 1F"
  location_zone: string | null        // "5홀 외부"
  location_detail: string | null      // "기둥현수막"
  venue_hall_id: string | null        // → VenueHall

  // 5️⃣ 용도 묶음 (자동 분류 + 수동 override)
  purpose_group: 'environment' | 'circulation' | 'registration' | 'program' | 'external_promo' | null
  purpose_detail: string | null       // "행사타이틀" / "포토존" / "동선 안내" 등

  // 8️⃣ 재질
  material: string | null             // "PET" / "폼보드 5T" / "통천"

  // 운영 메타
  setup_start: string | null
  teardown_start: string | null
  use_period: string | null
  pic: string | null                  // 담당자
  remark: string | null

  // 시안·실물
  design_file_url: string | null      // 시안 PDF/JPG
  install_photo_url: string | null    // 실제 설치 사진 (결과보고에서)

  // 자동 추출 메타
  extracted_from: 'order_excel' | 'design_filename' | 'result_report' | 'manual'

  created_at: string
  updated_at: string
}
```

### 수집 단계
| 시점 | 어떻게 |
|---|---|
| 발주엑셀 import | 행 1개 → SignageItem 1개. category·material 동의어 정규화 자동 |
| 파일명 추출 | "3000_6000_v_banner.pdf" → width/height 추출, "총 7개" → quantity |
| 신규 작성 | `/projects/[id]` 에디터에서 사용자 직접 입력 |

---

## 5. 자동 도출 통계 (View·쿼리)

원본 raw record에서 다음을 실시간 도출:

### 5-A. 장소×프로그램 → 제작물 분포
```sql
-- 예: "킨텍스 1전시장 + 전시" 조합의 평균 제작물
SELECT
  category,
  COUNT(*) as freq,
  AVG(quantity) as avg_qty,
  AVG(width_mm * height_mm) as avg_area
FROM signage_items si
JOIN event_signage_records esr ON si.project_id = esr.id
WHERE esr.venue_id = ?
  AND '40.05 전시' = ANY(esr.program_parts)
GROUP BY category
ORDER BY freq DESC
```

### 5-B. 행사 격에 따른 차등
- has_vip_president=true 행사들 → 통천·시도기 사용률 자동 산출

### 5-C. 시즌별 외부 제작물 비중
- season='winter' AND purpose_group='external_promo' → 외부 X배너 사용률

### 5-D. 행사장 제약 자동 검증
- 새 추천 시 VenueProfile.constraints.hanging_max_per_hall 초과 여부 자동 경고

---

## 6. 기존 시스템 → 신 스키마 매핑

| 기존 | 신규 | 변경 |
|---|---|---|
| `projects` | `EventSignageRecord` | 신규 컬럼: scale.*, prestige.*, schedule.*, season.*, data_quality.* |
| `design_items` | `SignageItem` | 신규 컬럼: location_building/zone/detail, purpose_group, category_raw, extracted_from |
| `venues` | `VenueProfile` | 신규 컬럼: cad_url, manual_url, rate_card_url, constraints.*, vision_analysis.* |
| `venue_halls` | `VenueHall` | 신규 컬럼: constraints.* (홀별 override) |
| `SEED_SIGNAGE_ANALYSIS` | derived view | **삭제 또는 캐싱 view로 전환** — raw record에서 실시간 도출 |

마이그레이션 SQL 1개 (`migration_v7_signage_analysis.sql`)로 컬럼 추가만으로 적용 가능.

---

## 7. 추출 가능성 매트릭스 (킨텍스 4개 행사 검증 결과)

| 항목 | 스마트국토 (A급) | 고향사랑 (B급) | K-GEO (B급) | WSCE (C급) |
|---|---|---|---|---|
| 1️⃣ 장소·종류·규격·수량 | ✅ 엑셀 70행 | 🟡 파일명 일부 | 🟡 엑셀 깨짐 | ❌ 결과보고 HWP만 |
| 2️⃣ 행사장 제약 | (도면 폴더 KINTEX 활용 — 행사 무관) | (동일) | (동일) | (동일) |
| 3️⃣ 규모 (면적·일수) | ✅ 폴더명 | ✅ 폴더명 (10449㎡) | ✅ 폴더명 (20000sqm) | ✅ 일수 |
| 4️⃣ 격 (VIP·국가급) | ✅ 수행실적 | ✅ 수행실적 (장관급 추정) | ✅ 수행실적 | ✅ 수행실적 |
| 5️⃣ 용도 묶음 | ✅ 엑셀 "파트" | 🟡 파일명 추론 | 🟡 시안에서 추론 | 🟡 결과보고 챕터 |
| 6️⃣ 설치·철수 | ✅ 엑셀 컬럼 | ❌ 없음 | ❌ 깨짐 | ❌ |
| 7️⃣ 시즌 | ✅ 일자 자동 | ✅ | ✅ | ✅ |
| 8️⃣ 재질 | ❌ 컬럼 없음 | ❌ | ❌ | ❌ |

**총평**:
- A급(발주엑셀 17컬럼): 8항목 중 5~6 자동 추출
- B/C급: 3~4 자동 + 나머지는 HWP→PDF→Vision 처리 필요
- 재질은 모든 행사에서 약함 → 신규 프로젝트부터 필수 입력 강제로 누적

---

## 8. 미래 데이터 누적 흐름 (사용자 핵심 지시)

```
[과거] 일괄 import (1회)
  ├─ 발주엑셀 있는 행사 → A급 자동 import
  ├─ HWP→PDF 변환 → Vision 추출 → B급
  └─ 시안 파일명·결과보고 → C급 부분 보강

[현재] 신규 프로젝트 INSERT마다 자동 누적
  ├─ /projects/new 위자드 → 8항목 중 1·2·3·4·6·7 채움
  ├─ /projects/[id] 에디터 → SignageItem 1·5·8 채움
  └─ 행사 종료 후 결과보고 업로드 → 3 actual_pax 보강

[유지보수] 매 프로젝트 INSERT 시
  ├─ liveStats 5분 캐시 만료 → derived view 재계산 (기존 사이클)
  └─ 추천 가중치 자동 갱신
```

**별도 학습 트리거 X** — 앱을 정상 사용하는 것이 곧 데이터 축적.

---

## 9. 구현 단계 (제안)

| 단계 | 내용 | 산출물 |
|---|---|---|
| **0. 스키마 확정** ⭐ 본 문서 | 8항목 인터페이스 합의 | `SIGNAGE_ANALYSIS_SCHEMA.md` (이 파일) |
| 1. DB 마이그레이션 | 컬럼 추가 SQL | `migration_v7_signage_analysis.sql` |
| 2. TypeScript 타입 갱신 | `lib/types.ts` 신규 인터페이스 | EventSignageRecord, SignageItem 확장, VenueProfile |
| 3. 일괄 import 스크립트 | A급 행사 자동 import | `scripts/import_a_grade_events.mjs` |
| 4. HWP→PDF→Vision 파이프라인 | B/C급 보강 | `scripts/extract_from_hwp_pdf.mjs` |
| 5. 위자드 보강 | 신규 항목 입력 UI | `NewProjectButton` step 추가 |
| 6. 추천 엔진 갱신 | 8항목 가중치 추천 | `lib/recommendation/byContext.ts` (신규) |
| 7. 관리자 KPI 갱신 | 새 derived view 표시 | `/data` 탭 갱신 |

---

## 10. 결정 필요 사항 (사용자 확인 요)

1. **재질 데이터 누락** — 신규 프로젝트부터 재질 필수 입력으로 강제할지?
2. **HWP 변환** — 인하우스 변환(LibreOffice CLI) vs 외주 vs Gemini 직접 파싱?
3. **purpose_group 자동 분류 규칙** — 카테고리·위치 키워드 기반 룰 vs LLM 자동 분류?
4. **VenueProfile constraints 입력 책임** — admin 수동 vs Vision 자동 추출 vs 둘 다?
5. **과거 행사 import 범위** — A급(즉시) / B급(보강 후) / C급(파일명만) — 어디까지?

---

## 부록 A. 8가지 항목 한 줄 요약 (회의용)

1. **장소** — 건물·홀·세부 위치 3계층
2. **프로그램 파트** — EZ 폴더링 40.04~40.20 다중선택
3. **규모** — 면적·참가자·일수·홀 수
4. **격** — VIP·국제·정부지원 여부
5. **용도** — 환경조성/동선/등록/프로그램/외부홍보
6. **일정** — 설치·철수·야간 작업
7. **시즌** — 봄·여름·가을·겨울 + 야외 가능성
8. **재질** — PET/폼보드/통천 등

각 항목이 raw record에 저장되고, 이를 합쳐 venue × program × purpose 조합별 추천이 자동 산출.

---

> 본 명세 확정 후 `migration_v7_signage_analysis.sql` 작성·실행으로 적용.
