# IA v4 — 제작물 리스트 가이드

> 작성: 2026-05-07 (v4.1 명령본 단위 6 + 갱신-C)
> 기반: EZ 프로젝트 폴더링 가이드 (사내 표준), MICE_DX_보고자료_IA.pptx, 260507 회의 결정

---

## 0. 명칭

| 구분 | 신 명칭 | 구 명칭 |
|---|---|---|
| 시스템명 (UI/문서) | **제작물 리스트 가이드** | MICE 제작물 디자인 의뢰 가이드 |
| repo / DB / env | `mice-design-guide` (변경 X) | 동일 |

---

## 1. 페이지 트리

```
/login                                  ─ 모든 사용자
/signup                                 ─ 모든 사용자
/dashboard                              ─ 모든 사용자 (메인 = "프로젝트")
  └─ /projects/new                      ─ 모든 사용자
      ├─ /projects/new/case-a           ─ AI 추천 시작 (현재는 룰베이스)
      ├─ /projects/new/case-b           ─ 엑셀 업로드 시작
      ├─ /projects/new/case-c           ─ 시안 업로드 시작
      └─ /projects/new/case-d           ─ 빈 X-배너 시작
  └─ /projects/[id]                     ─ 행사 멤버 (편집 그리드)
      └─ /projects/[id]/info            ─ 행사 멤버 (행사 정보·팀원·기본양식)
/admin                                  ─ admin only (자체 페이지 없음)
  ├─ → /data                            ─ 관리자 페이지 (KPI · 시드 데이터 마스터)
  └─ /admin/learning                    ─ 데이터 학습 관리자 (행사장·도면 학습)
/archive                                ─ admin only (제작물 검수)
/share/[token]                          ─ 공개 (사외 공유, v4 보류)
/api/recommend                          ─ Server route
/api/analyze-layout                     ─ Server route (Vision)
```

---

## 2. 권한 매트릭스

| 페이지 | 일반 사용자 | admin |
|---|---|---|
| /dashboard | R/W (본인 프로젝트) | R/W (전체) |
| /projects/[id] | R/W (멤버일 때) | R/W |
| /projects/[id]/info | R/W (멤버일 때) | R/W |
| /data (관리자 페이지) | ✗ → /dashboard 리다이렉트 | R/W |
| /admin/learning | ✗ → /dashboard 리다이렉트 | R/W |
| /archive | ✗ → /dashboard 리다이렉트 | R/W |
| venue_requests INSERT | ✓ (본인만 SELECT) | ALL |
| venues / venue_halls / learning_jobs | SELECT only (venues·halls), 나머지 X | ALL |

---

## 3. 데이터 흐름

### 3-A. 사용자가 새 프로젝트를 만들 때

```
사용자
 ↓ 행사장 드롭다운 (VENUE_LIST + 본인 요청 행사장)
 ↓
[행사장이 학습 안 됨]
 ↓ "신규 등록 요청" 버튼
 ↓
venue_requests INSERT (도면 첨부 가능)
 ↓ 본인 화면에 즉시 노출 ("내가 요청한" 그룹)
 ↓
관리자가 /admin/learning 에서 승인
 ↓
venues INSERT + (도면 있으면) learning_jobs INSERT
 ↓
다음 사이클: Vision API → 주출입구·동선 분석 → venues 메타 갱신
 ↓
모든 사용자의 새 프로젝트 폼 드롭다운에 자동 노출
 ↓
사용자가 새 프로젝트 생성 시 사용
 ↓
liveStats 자동 누적 (5분 캐시) → 추천 정확도 개선
 ↓
↻ (사이클 반복)
```

### 3-B. 자동 누적 학습 (사용자 핵심 지시 — 핵심 사이클)

> "앞으로 제작되는 모든 행사는 기존 정보에 자동 업데이트 되어야만함"

```
projects 신규 INSERT
 ↓
liveStats.fetchLiveStats() 다음 호출 시 (5분 TTL 만료 후 자동 재생성)
 ↓
- liveAsPerfList: SEED_PERFLIST + 라이브 프로젝트 합산
- categoryFrequency: 동의어 정규화 후 누적
- avgItemCountByVenue: 행사장별 평균 환경장식물 수 갱신
 ↓
recommendByProbability() 호출 시 즉시 반영
 ↓
새 프로젝트 폼 / Case A / 관리자 페이지 KPI 모두 자동 갱신
```

별도 학습 트리거 불필요 — DB INSERT만으로 자동 사이클 형성.

---

## 4. 관리자 페이지 (/data) 에서 봐야 할 것 리스트업

### 4-A. 프로젝트 관리 탭 (KPI — 신설 v4.1)
- 전체 프로젝트 수 / 이번 달 생성 수 / 활성 멤버 수 / 학습 요청 대기 수
- 행사장별 프로젝트 분포 TOP 12 (학습 안된 장소 amber 경고)
- 프로그램 파트별 분포 TOP 12 (40.04~40.20 코드 + 한글)

### 4-B. 사전 학습 시드 (시스템 마스터)
- 환경장식물 11종 (표준)
- 동의어 47건 (스프링배너=X배너 등)
- 행사장 23종 (정적 VENUE_LIST → DB venues로 점진 이관)
- 분류·권장 매핑
- 재질 기본값
- 발주처 통계 (입력 누적)

### 4-C. 시드 분석 도구 (개발 단계용)
- 실측 분석 (281개 제작물, 비표준 37%)

### 4-D. 삭제된 탭 (v4.1)
- 행사 이력 (그냥 행사명 매핑이라 정보 가치 낮음)
- 레이아웃 DNA (캔버스 편집기 보류로 의미 X)

---

## 5. EZ 폴더링 가이드 ↔ 본 시스템 매핑

본 시스템에서 다루는 영역은 EZ 폴더링 가이드 중 다음과 같음:

| 폴더 코드 | 폴더명 | 본 시스템 적용 |
|---|---|---|
| 40.15 제작물 | 환경장식물·기념품 | **메인 출력 대상** (PPT 슬라이드, 엑셀 발주리스트) |
| 40.04~40.11 프로그램 파트 | 회의/전시/매칭/공식행사/부대행사 | **프로그램 파트 다중선택** (lib/programParts.ts) |
| 40.12 행사장 조성 | 회의장/전시장/공식행사장 | 도면 + 학습 데이터 (venues / venue_halls) |
| 40.14 인쇄제작 | 사전홍보물·현장홍보물·명찰 | 추천 리스트에 부분 포함 (인쇄물 일부) |
| 40.17 홍보 | 옥외광고·외부 홍보물 | 프로그램 파트 옵션 |
| 40.18~40.20 참가자 응대 | 의전·등록·영접영송 | 프로그램 파트 옵션 |

본 시스템이 다루지 않는 영역 (참고만):
- 10/20 영업·제안, 30 계약, 40.01~40.03 실행설계, 40.16 WEB APP, 50 현장운영, 60 사후관리

---

## 6. IA 트리 (MICE_DX_보고자료_IA.pptx 형식)

```
제작물 리스트 가이드
├── 프로젝트 (사용자 영역)
│   ├── 새 프로젝트
│   │   ├── 행사 기본정보 입력 (이름·발주처·행사일)
│   │   ├── 행사장 선택 (드롭다운 + 신규 요청 모달)
│   │   ├── 프로그램 파트 다중선택 (40.04~40.20)
│   │   └── 환경장식물 선택 (다중선택 → 권장 자동 체크)
│   ├── 프로젝트 상세
│   │   ├── 추천 리스트 보기 (선택률 % + 이력 신뢰도)
│   │   ├── "내용" 컬럼 (같은 종류 #N 자동 prefix)
│   │   ├── 엑셀 다운로드 ("제작물리스트_{name}_{date}.xlsx")
│   │   └── PPT 다운로드 ("제작물리스트_{name}_{date}.pptx", 빈 슬라이드)
│   └── 내 프로젝트 목록 (단계 필터 X, D-day 정렬)
│
├── 관리자 페이지 (admin only — /data)
│   ├── 개요
│   ├── 프로젝트 관리 (KPI · 행사장 분포 · 파트 분포 · 학습 요청 대기)  ★ 신설
│   ├── 환경장식물 11종
│   ├── 동의어 47건
│   ├── 행사장 (조회)
│   ├── 분류·권장
│   ├── 재질
│   ├── 발주처
│   ├── 행사분류 통계
│   ├── 디자인 업체
│   └── 실측 분석 (시드)
│
├── 데이터 학습 관리자 (admin only — /admin/learning)  ★ 신설 v4.1
│   ├── 행사장 추가 폼 (이름·권역·유형·홀분리·도면)
│   ├── 사용자 요청 대기 (venue_requests pending)
│   ├── 도면 학습 큐 (learning_jobs)
│   └── 학습된 행사장 현황 (venues 테이블)
│
└── 인증
    ├── 로그인 (Supabase Auth)
    └── 권한 (일반 사용자 / admin via profiles.role)
```

---

## 7. 보류된 영역 (orphan, 코드 보존)

| 영역 | 위치 | 사유 |
|---|---|---|
| 캔버스 편집기 (Fabric.js) | app/(dashboard)/projects/[id] | 회의 결정 — 디자인 자체 걷어냄 |
| AI 추천 (Gemini) | lib/ai/recommendSignage.ts | 정확도 떨어져서 보류, 룰베이스로 대체 |
| 시안 일괄/품목별 업로드 | NewProjectButton step3 | 발주용 PPT는 빈 슬라이드만 |
| 사외 공유 링크 | /share/[token] | v3 잔존, v5에서 재검토 |

향후 복귀 시 코드 그대로 사용 가능.

---

## 8. 변경 이력

- **2026-05-07 (v4.1)**: 본 문서 신설. 명칭·페이지 트리·권한·데이터 흐름·EZ 폴더링 매핑·IA 트리 정의.
