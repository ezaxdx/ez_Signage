# analyze-event-folder — 행사별 환경장식물 폴더 분석

## 목적

`참고자료/환경장식물 행사별/` 내 행사 폴더 하나를 분석하여
아래 3가지 산출물을 만든다:

1. `migration_v5_data_tables.sql` 에 추가할 **행사 이력 INSERT 문**
2. 발견된 **신규 동의어**가 있으면 `signage_synonyms` INSERT 문
3. `DataDashboard.tsx` 에 표시될 **행사별 환경장식물 패턴 요약**

---

## 사용법

```
/analyze-event-folder <폴더명>
```

예시:
```
/analyze-event-folder 코엑스
/analyze-event-folder 롯데호텔 서울
/analyze-event-folder 킨텍스 제1전시장 3,4,5홀
```

---

## 실행 절차

### Step 1 — 폴더 내용 파악

```
ls "C:\Users\EZPMP\Desktop\클로드 코드 활동용\제작물 디자인 의뢰 가이드\참고자료\환경장식물 행사별\<폴더명>"
```

- 이미지 파일 목록 확인 (jpg/png/pdf/pptx/xlsx)
- 파일명에서 제작물 종류·행사명·연도 추출 시도

### Step 2 — 엑셀/발주서 파일 우선 분석

폴더 내 `.xlsx` `.xls` 파일 발견 시:
- 컬럼 구조 파악 (17컬럼 표준 여부)
- `품목` / `카테고리` / `규격` / `수량` / `재질` 컬럼 값 추출
- 비표준 품목명 → 동의어 후보로 기록

### Step 3 — 이미지 파일 분석 (Gemini 위임)

이미지가 있으면 각 파일에 대해:
```
이 환경장식물 이미지를 분석해서 다음을 JSON으로 반환해줘:
{
  "signage_type": "X배너|I배너|통천배너|가로현수막|세로현수막|가로등배너|포디움타이틀|A4가로|A4세로|A3가로|A3세로|기타",
  "detected_size_mm": {"width": 숫자, "height": 숫자},
  "language": "KOR|EN|EN/KOR",
  "purpose": "행사메인홍보|등록안내|웨이파인딩|프로그램안내|체험안내|기타",
  "style": "TechDark|BrightSolid|SoftGradient|IllustrativeClean|CharacterFriendly|EditorialDark",
  "has_qr": true|false,
  "has_arrow": true|false,
  "main_text": "감지된 행사명 (한글)"
}
```

### Step 4 — 수행실적 엑셀 대조

`Ezpmp_수행실적리스트_20260506.xlsx` 에서 이 행사장이 포함된 행 확인:
- PM 부서, 발주처, 연도, 행사명 → `event_history` INSERT용

### Step 5 — SQL INSERT 생성

```sql
-- event_history 추가
INSERT INTO event_history (project_name, pm_dept, year, event_date, venue, client, event_type)
VALUES ('행사명', 'PM부서', 연도, 'YYYY-MM-DD', '행사장', '발주처', '행사유형')
ON CONFLICT DO NOTHING;

-- 신규 동의어 (발견 시)
INSERT INTO signage_synonyms (alias, canonical_name, note)
VALUES ('발견된별칭', '표준명', '출처 폴더명')
ON CONFLICT (alias) DO NOTHING;
```

---

## 행사별 폴더 목록 (34개)

처리 우선순위 (핵심 → 주요 행사장 → 기타):

### 핵심 (먼저 처리)
- `[핵심] 높음이상`
- `코엑스`
- `코엑스 그랜드볼룸 외`
- `킨텍스`
- `킨텍스 제1전시장 3,4,5홀`
- `킨텍스 제2전시장 9B홀`

### 주요 행사장
- `롯데호텔 서울`
- `그랜드하얏트서울(그랜드볼룸, 포이어, 살롱, 남산홀)`
- `더플라자 호텔 서울 그랜드볼룸`
- `웨스틴 조선 서울 라일락+튤립`
- `송도컨벤시아`
- `aT센터`
- `광주 김대중컨벤션센터`
- `제주국제컨벤션센터(ICC JEJU), 제주국제컨벤션센터(ICC JEJU)`
- `ICC JEJU 및 인근호텔`

### 특수 행사장
- `국립중앙박물관`
- `동대문디자인플라자(DDP) (추정)`
- `광화문 광장`
- `평창올림픽스타디움 (추정)`
- `광주비엔날레전시관 外`
- `경남도청 대회의실`
- `경주`
- `서울스퀘어 (추정)`
- `오스코(OSCO)`

### 특정 행사 폴더
- `2020 국제방송영상마켓(BCWW) 및 글로벌 포맷마켓(BCWW FORMATS) 온오프라인 행사 203130`
- `2020 글로벌 코리아 박람회 LH전시부스 및 LH로드쇼 (LH GBC) 202140-1`
- `2035 국가 온실가스 감축목표 대국민 공개 논의 251015`
- `한반도관광포럼 193980`
- `한아세안 특별정상회의 연계 국민참여행사 193970`

### 해외
- `브라질 벨렘`
- `프랑스 파리 트레지엠 아트 극장`

### 미분류
- `[미분류] 과거 행사 + 수동 분류 필요`

---

## 산출물 적용 방법

1. 생성된 SQL → `supabase/migration_v5_data_tables.sql` 하단에 추가
2. Supabase Studio SQL Editor에서 해당 INSERT 문만 실행
3. `/data` 페이지에서 결과 확인

---

## 표준 환경장식물 종류 (10종) — 동의어 판별 기준

| 표준명 | 알려진 동의어 |
|--------|------------|
| X배너 | 스프링배너, X-Banner, X배너스탠드 |
| I배너 | I-배너 |
| 가로현수막 | 현수막, 가로막 |
| 세로현수막 | 드롭배너, 난간배너, 세로막 |
| 통천배너 | 천장배너, 통천 |
| 가로등배너 | 빵빠레배너, 가로등기 |
| 포디움타이틀 | 포디움, 강연대타이틀, 연단타이틀 |
| A4가로 | A4피켓(가로), A4가로형 |
| A4세로 | A4피켓, A4세로형 |
| A3가로 | A3피켓(가로), A3가로형 |
| A3세로 | A3피켓, A3세로형 |
