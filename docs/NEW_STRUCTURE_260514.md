# 환경장식물 발주 툴 — 새 구조 설계 (2026-05-14 회의 결정 기반)

> 5/14 회의(김연아 대리님·CCO·조기흠) 결정 사항 + 학습 데이터 분석 결과를 반영한
> **앞으로 적용될 구조**. 현재 코드 구조에 끼워 맞추지 말고 본 문서가 SOT.
> 컴펌 후 즉시 활성화 가능하도록 `lib/data/v2/` · `lib/ai/v2/`에 미리 적재.

## 1. 카테고리 마스터 — 15 확정 + 9 신규 후보 = 24종

### 1.1 확정 15종 (5/14 회의 결정 — 동선 배너 분리)

| key | label | priority | typical_size | 비고 |
|---|---|---|---|---|
| `outer_wall` | 외벽 가로현수막 | 1 | 7600~24000×2000~7000mm | 행사장 외부 전면 |
| `outer_curtain` | 외벽 통천현수막 | 1 | 8000~24000×3000~17000mm | 외벽 전면 키비주얼 |
| `vertical_pillar` | 세로현수막 (기둥) | 2 | 600~1200×4000~7200mm | 로비 기둥 |
| `streetlight` | 가로등 배너 | 2 | 600×1800mm (20~50개 단위) | 외부 가로등 |
| `gate` | 게이트 / 입구 광고 | 2 | 30~38×1.5m | 출입구 |
| `x_banner_static` | X배너 (정적 안내) | 3 | 600×1800mm | 등록·룸사인 (BCWW 5건 / KME 19 등) |
| `route_banner` | **동선 배너** (X배너 분리) | 3 | 600×1800mm | 유도·화살표 (BCWW 6건 / KME 9 등, 분리 비율 ~35%) |
| `i_banner` | I배너 (인포메이션) | 3 | 1200×1500~2000mm | 시간표·셔틀 |
| `ceiling_hanging` | 천정 행잉 | 1 | 5000~8000×3000~4000mm | 천장 매다는 배너 (학습 데이터 가장 적음) |
| `podium_title` | 포디움 타이틀 | 3 | 600~1200×140~200mm | 사회자·연사 각 1 |
| `form_board_pop` | 폼보드 (A4·A3·A2·A1 POP) | 3 | A4~A1 | 안내 보드 |
| `water_banner` | 물통배너 | 2 | 600×1800mm | 외부 역·승하차장 |
| `vehicle_q_bang` | 큐방 (차량용) | 3 | 210×297mm | 셔틀 앞유리 |
| `floor_sticker` | 바닥 스티커 | 3 | 350×350~1800×1800mm | 동선 유도·거리두기 |
| `window_sticker` | 시트지 (유리창) | 3 | 1650×920mm | 출입구 유리 |

### 1.2 신규 9종 후보 (pending — 이사님 보고 의제)

| key | label | priority | source | 학습 근거 |
|---|---|---|---|---|
| `did_signage` | DID / 디지털 사이니지 | 1 (pending) | SPP 47종 카탈로그 10~12번 | 행사장별 디지털 사이니지 |
| `photo_wall` | 포토월 / 포토존 | 1 (pending) | SPP 13번·KME 2019 포토존 | 행사 포토 영역 |
| `award_board` | 시상보드 | 2 (pending) | SPP 31~32번 | 시상식 행사 부속 |
| `stage_sidewing` | 무대 사이드윙 | 2 (pending) | SPP 03~05번 | 무대 좌우 |
| `badge_lanyard` | 비표 / 명찰 | 2 (pending) | SPP 33번 | 출입 관리 |
| `table_number` | 테이블 넘버링 | 3 (pending) | SPP 34번 | 좌석 배치 |
| `name_plate` | 네임 플레이트 | 3 (pending) | SPP 35번 | 발표자·VIP |
| `triangle_nameplate` | 삼각 명패 | 3 (pending) | SPP 46번 | 회의·간담회 |
| `pop_special` | POP 특수 (A3 QR·드로잉·매칭 등) | 3 (pending) | SPP 36~38번 | 행사 부속 안내 |

**컴펌 후 처리**:
- 채택 → `is_pending=false` 변경
- 거절 → seed에서 삭제
- 통합 → 기존 카테고리에 흡수 (예: pop_special → form_board_pop)

## 2. 3단계 계층 (L1·L2·L3)

```
L1 (행사장)
└─ L2 (상세 행사장 / 홀)
    └─ L3 (진행 행사명 + 행사 코드 YYNNNN)
```

### 2.1 L1 행사장 풀 — 43개 (기존 30 + 신규 13)

기존 30개: COEX·KINTEX·KSPO DOME·SETEC·DDP·ICC 제주·그랜드하얏트서울·더플라자 호텔 서울·김대중컨벤션센터·롯데호텔 서울·송도컨벤시아·BEXCO·EXCO·CECO·GUMICO·UECO·DCC·소노캄·여수엑스포·신라호텔·정부세종·제주신라·GSCO·안동국제·조선팰리스·HICO·THE_SHILLA·시그니엘·라한호텔·웨스틴조선

**신규 13개 후보** (학습 데이터에서 행사명 직접 매칭):
- aT센터·경남도청·경주·광주비엔날레전시관·광화문광장·국립중앙박물관·서울스퀘어·오스코·평창올림픽스타디움·부산(한아세안)·브라질 벨렘·프랑스 파리·웨스틴조선서울

### 2.2 L3 행사 코드 (YYNNNN)

- `YY` = 연도 (18, 19, 20, 21, 22, 23, 24, 25)
- `NNNN` = 행사 일련번호 (000~85000)
- 예시: `183090` (2018 BCWW) / `192000` (2019 100주년 3.1절) / `245006` (2024 SPP)

### 2.3 행사 시리즈 (연도별 반복)

| 시리즈명 | 코드 패턴 | L1 |
|---|---|---|
| BCWW (국제방송영상마켓) | 183090 / 193800 / 203130 | COEX |
| KME (KOREA MICE EXPO) | 183000-1 / 193100 | 송도 컨벤시아 |
| 스마트국토엑스포 | 183080 / 193700 | COEX |
| 월드 스마트시티 | 182070 / 222020 (WSCE) | (다양) |
| 정부혁신박람회 | 191400 | (다양) |
| AdAsia | 231004 | COEX |

→ AI 추천 시 가장 강력한 컨텍스트 = 같은 시리즈 이전 회차 누적

## 3. N:M 관계형 매핑 (행사장 ↔ 카테고리 ↔ 환경장식물)

### 3.1 두 축 동일 레벨 (5/14 회의 확정)

```
[행사장 축]              [프로그램 파트 축]
   COEX                      등록
   KINTEX                    공식 행사
   송도 컨벤시아               전시
     │                         │
     └────┬────────────────────┘
            │
       [환경 장식물 row] = 두 축 모두에 매핑

예시 row
+----+---------+-----------+---------------+-----+----+
| ID | 행사장   | 파트       | 카테고리       | 규격 | 수량 |
+----+---------+-----------+---------------+-----+----+
| r1 | COEX    | 등록       | x_banner_static| 600 | 5  |
| r2 | COEX    | 공식 행사   | outer_curtain  | 6000| 1  |
| r3 | COEX    | 전시       | podium_title   | 600 | 2  |
| r4 | KINTEX  | 등록       | x_banner_static| 600 | 8  |
+----+---------+-----------+---------------+-----+----+
```

### 3.2 집계 시 활용

- **행사장 COEX → X배너 누적** (전 파트)
- **파트 등록 → X배너 누적** (전 행사장)
- **COEX + 등록 교차 → X배너 구체 row** (가장 정밀)

→ AI 입력 = 같은 행사장 누적 + 같은 파트 누적 + 교차 누적 3종 컨텍스트

## 4. AI 추천 로직 — 3단계 우선순위 + 4단 안전망

### 4.1 3단계 우선순위 (5/14 회의 확정)

```
[1순위] 프로그램 파트 매칭
   - 사용자 선택 파트(다중) → 권장 카테고리 후보 추출
   - 매칭률 ≥ 70% = 안정 추천
   - 매칭률 ≤ 30% = 제외

[2순위] 행사장 시설 가이드 위반 여부
   - 행사장의 install_allowed·denied 카테고리 적용
   - 위반 시 quantity=0 + "[설치 불가 — 행사장 제약]" rationale
   - 학습 데이터 부재 시 quantity=0 + "[추천 없음 — 학습 데이터 부재]"

[3순위] 행사장 면적 + 참가자 수 (수량 산출 공식 — 실측 정합)
   - X배너 = 참가자 ÷ 300 + 1 (최소 2) — 등록데스크·룸사인
   - 동선 배너 = 참가자 ÷ 200 + 홀 분리 수 — 동선 35% 비율
   - 포디움 타이틀 = 세션 수 × 2 (사회자+연사 분리)
   - 가로등 배너 = 참가자 ÷ 50 (20~50 범위) — 외부 동선 길이 데이터 부재 시 fallback
   - 천정 행잉 = 천장고 5m 이상일 때 홀 면적 ÷ 1000
   - 행사장 면적·천장고 = venue_specs (12항목) 자동 주입
```

→ 본 공식은 `lib/ai/v2/recommendationLogic.ts` `calculateQuantity()`가 SOT. SOT 수치 변경 시 코드도 동시 갱신.

### 4.2 도면 첨부 시 추가 흐름

```
도면 미첨부:
  1순위 → 2순위 → 3순위 → 출력 (사용자가 직접 location 입력)

도면 첨부:
  1순위 → 2순위 → 3순위 → 출력 (1차 추천 리스트)
   ↓
  ② 도면 분석 AI 호출
   ↓
  도면 분석 결과 (출입구·동선·설치 영역) + 1차 추천 리스트 통합
   ↓
  재배치 + 수량 조정 + 설치 위치(location) 자동 명세
```

### 4.3 4단 안전망 (AI 환각 방지)

```
[① 입력 강제]
   - Gemini 호출 시 responseMimeType: 'application/json' + responseSchema 강제
   - AI가 자유 텍스트 응답 불가 → JSON 양식 보장

[② 후처리 검증]
   - 받은 답에서 카테고리 키를 STANDARD_CATEGORIES에 매칭
   - 미매칭 카테고리 → 자동 분류 + no_data_flag
   - 사이즈가 typical_size 범위 밖 → warn 플래그
   - 수량 음수·NaN → 자동 fallback (1)

[③ 실패 fallback]
   - Gemini 응답 실패 (API 오류·timeout) → 기본 추천 풀(default_recommendation_pool)
   - "매뉴얼 확인" 안내 자동 prepend
   - 사용자가 빈 화면 안 보게

[④ 모니터링]
   - 잘못된 응답 누적률 = 관리자 페이지 KPI
   - 카테고리별·행사장별 오답률 추적
   - 페르소나 자동 보강 큐 (3회 누적 시 알림)
```

### 4.4 가이드 예외 패턴 (3회 누적 시 자동 등록)

```
같은 규칙(환경장식물 종류 + 규격 + 파트) 위반이 전체 데이터에서 3회 누적
   → 가이드 수치 재검토 필요 신호 (관리자 알림 큐)
```

## 5. 행사장 12항목 시설 가이드 메타 (5/14 회의 확정)

```sql
ALTER TABLE venues ADD COLUMN venue_specs JSONB;

-- venue_specs JSON 구조:
{
  "area_sqm": 15218,                  -- 면적 ㎡
  "ceiling_height_m": 8.5,            -- 천장 높이 m
  "seat_count": 1500,                 -- 좌석 수
  "entrance_locations": "주출입구 3개 (남측)",  -- 출입구 위치
  "main_route": "로비 → 등록데스크 → 메인홀",   -- 메인 동선
  "allowed_categories": [             -- 가능 환경 장식물 (14종 중)
    "outer_wall", "x_banner_static", "ceiling_hanging", ...
  ],
  "denied_categories": ["streetlight"],  -- 불가 환경 장식물
  "size_constraints": "통천 1.5m 폭 불가",  -- 규격 제약
  "electrical_audio": "전기 100kW / 음향 PA 가능",  -- 전기·음향
  "facility_guide_url": "https://venue.com/guide.pdf",  -- 시설 가이드 URL
  "learned_at": "2026-05-14",         -- 학습 일자
  "additional_memo": "통천 1.5m 폭 사용 불가"  -- 추가 메모
}
```

## 6. 데이터 학습 관리 — 행사별 (관리자 NEW)

### 6.1 신설 영역

- 3단계 계층 — L1 → L2 → L3
- L3 메타 (행사장 + 프로그램 파트) + L3 배치 환경장식물 row
- L3 단위 추가/수정/삭제 가능
- L3 내부 row 단위 추가/수정/삭제 가능
- 프로젝트 삭제 시 L3 메타 + row 모두 보존 (분리 적재)

### 6.2 특수 분기 폴더

- `_L1미상` (17건) — 추정 후 신규 L1 등록 대기
- `_미분류_과거행사` — 수동 분류 필요
- `_핵심_높음이상` — 우선 학습 자료

## 7. 시드 데이터 적재 위치 (mice-design-guide 앱 안)

```
lib/data/v2/
├── signageCategoriesSeed.ts        # 24종 마스터 (15 + 9 pending)
├── venueListSeed.ts                # 43개 L1 (30 + 13 신규)
├── eventSeriesSeed.ts              # 연도별 반복 행사 시리즈
├── eventOrderListSeed.ts           # 7개 Excel 발주 리스트 학습 결과
└── categoryVenueCoverage.ts        # N:M 학습 보유 매트릭스

lib/ai/v2/
├── recommendationLogic.ts          # 3단계 우선순위 (1·2·3)
├── safetyNet.ts                    # 4단 안전망 (입력·후처리·fallback·모니터링)
└── personaTemplates.ts             # 페르소나 v3 (5/14 결정 반영)

supabase/
└── migration_v10_new_structure.sql # 신규 DB 스키마 (venues 12항목·event_orders N:M 등)
```

## 8. 컴펌 후 활성화 절차

1. **카테고리 마스터** — `is_pending=true` 9종 결정 (채택/거절/통합)
2. **DB 마이그레이션** — `migration_v10_new_structure.sql` 실행
3. **시드 데이터 import** — `v2/` 폴더 → 활성 시드로 교체
4. **AI 추천 로직 교체** — `recommendSignage.ts` → `lib/ai/v2/recommendationLogic.ts` 활용
5. **UI 갱신** — 환경장식물 종류 관리 페이지 24종 반영

## 9. 참고 — 학습 데이터 분석 결과

본 구조의 모든 항목은 다음 학습 결과에 근거:
- `참고자료/환경장식물_분석결과.md` (§A~§I, 9 섹션)
- `참고자료/학습데이터_통합_260514/` (1,270 파일 분류)
- 7개 Excel 발주 리스트 (BCWW 18·WLCF 18·스마트국토 18·KME 18·KME 19·정부혁신박람회 19·삼일절 19)
- SPP 47종 풀 카탈로그 (그랜드하얏트서울)

→ "정답에 가까운 데이터 = 행사장별 실제 발주 리스트" 원칙 (decisions.md 2026-05-12)
