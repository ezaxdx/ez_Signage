# 현재 목표

> 상위 목표는 사람이 정함. 하위 Task/Action은 자율 루프가 채움.

## Goal (분기 1회 갱신)

제작물 리스트 가이드 — MVP 실무 투입 (2026 Q2). 학습 기반 환경장식물 추천 + 발주 엑셀/PPT 자동 생성.

## Strategy (월 1회 갱신) — v4.1 대전환 (2026-05-07)

- **방향 전환**: 디자인 편집기 → 학습 기반 추천 도구 (회의 결정)
- **핵심 워크플로우**: 행사 정보(드롭다운+다중선택) → 룰베이스 추천 → 엑셀/PPT(빈 슬라이드) 다운로드
- **자동 누적 학습**: 신규 프로젝트 INSERT → liveStats 자동 누적 → 추천 정확도 자동 개선
- **2단계 (다음 사이클)**: Vision API 도면 분석 + 동선배너 좌표 추천

## Initiative (주 1회 갱신)

### 명세 8장 — 진행 단계
- ✅ **1단계 (당장 가능)**: 폴더링·정리 + 행사 정보 → AI 추천 + 엑셀 다운로드
- 🟡 **1단계 보강**: 비표준 규격 매핑 룰 / 재질 분포 자동 산출 (시드 임베드 완료, 실시간 자동화는 다음)
- ⏳ **2단계 (데이터 누적 후)**: 도면 업로드 → Gemini Vision으로 출입구·동선 분석 + 유도사인 배치 추천 + PPT 슬라이드 자동 생성

## Task

- [x] PreflightModal 에디터 연결 (발주 전 점검 버튼 → 모달 → 이슈 클릭 시 해당 제작물 이동)
- [x] AI 엔진 Gemini 2.5 Flash 전환 + .env.local 적재
- [x] 행사 정보 입력 폼 풍부화 (행사 유형·세팅일·참가자·언어·국제/VIP/야외/예산제약)
- [x] 추천 결과 엑셀 다운로드 버튼 (17컬럼)
- [x] 데이터 관리 대시보드 (`/data`) 13개 탭 신설
- [x] 수행실적 엑셀 파싱 (54건 ↔ 17건 매핑)
- [x] 폴더 엑셀 281개 제작물 파싱 (비표준 규격 37%·재질 분포 9종)
- [x] AI 추천에 과거 유사 행사 컨텍스트 자동 주입
- [x] 발주처·행사장 자동완성 (datalist) — 케이스A + 위자드
- [x] PROGRESS / decisions / goals 갱신
- [x] v9.18: 행사장 규모 스펙 AI 주입 (getVenueSpecs → recommendSignage)
- [x] v9.19: 엑셀/PPT/PDF 헤더 21컬럼 개편 + 동적 컬럼 + 날짜 연결
- [x] v9.24: 행사 장소 권역 라벨 "지방" → 정확한 도/광역시 이름 (광역시 8 + 도 9 + 해외 = 18종, 사용자 피드백 2026-05-13)
- [x] v9.26~v9.30: 관리자 페이지 + 데이터 학습 관리자 재설계 5사이클 통합 (사용자 피드백 3건 일괄 반영, 2026-05-13)
  - v9.26: `/admin` 신설 — 운영 KPI ↔ 전체 프로젝트 현황 통합 (피드백 ①)
  - v9.27: `/admin/ai` 신설 — Gemini 사용량·비용·이상 알림 + AI 환경 설정 (피드백 ③)
  - v9.28: `/admin/users` 접근 차단 — 구현 보존 + 준비 중 화면 (피드백 ②)
  - v9.29: `/admin/learning` 5섹션 IA 재정렬 + 개요 섹션 신설
  - v9.30: 시설 가이드 + 예외 패턴 모니터 KPI 카드 보강
- [x] v9.31: 통합 핫픽스 — 학습 관리자 4 대섹션 댑스 정정 + 천정배너 잔존 제거 + 파트 매칭 작동 (2026-05-13)
- [x] v9.32: 학습 관리자 사이드바 5 메뉴 정정 — 프로그램 파트 신규(4번) + 동의어 → 환경장식물 명칭 변경(5번) (사용자 명시 옵션 A, 2026-05-13)
- [x] v9.33: 통합 핫픽스 — 글로벌 좌측 사이드바 도입(5 라우트) + SYSTEM_INSTRUCTION 3단계 우선순위 재작성 + 환경장식물 종류 관리 버튼바 위치 정정 + PM → 담당자 일괄 + 부연 제거 + 행사장 배치도 Vision 보강 (2026-05-13)

## v4.1 클로징 — PM 직접 처리 필요

- [ ] Supabase Studio에서 `migration_v6_v4_1.sql` 실행 (필수 — venues / venue_requests / learning_jobs / usage_logs / program_parts)
- [ ] 본인 profiles.role = 'admin' 확인
- [ ] /admin/learning 진입 → 컨벤션센터·호텔 도면 5~10건 등록 (학습 우선순위)
- [ ] git push v2 auto/v4-stage-20260507:main (현재 ahead 38+ commits)
- [ ] 새 프로젝트 1건 만들어서 자동 누적 학습 사이클 동작 확인

## 2단계 진입 조건 (Vision API 도입)

- 룰베이스 동선배너 추천 동작 검증 (5~10건 실사용)
- 컨벤션센터·호텔 도면 10~20건 학습 데이터 확보
- venues 테이블 안정화 (요청 → 승인 → 학습 큐 사이클)

## 행사장별 환경장식물 학습 데이터 (2026-05-11 1차 시험 후 확정 — `docs/VENUE_LEARNING_INSIGHTS_260511.md`)

### 즉시 작업 (1~2주)
- [ ] Tesseract 한국어 OCR 자동화 — 매뉴얼 PDF 폰트 깨짐 보강
- [x] 천정배너 카테고리 시드 데이터 확보 (킨텍스 5홀 2022엑스포 실측 10개 추가)
- [x] `SEED_CEILING_BANNER_PATTERNS` 신설 + `findCeilingBannerContext()` + recommendSignage.ts 자동 주입 (v9.17)

### 1단계 (1개월)
- [ ] HWP 본문 파싱 (한컴 변환 또는 한컴 API)
- [ ] 행사장 학습 우선순위: 킨텍스 1전시장 5홀 → 1~4홀 → 2전시장 → 코엑스/송도/DCC
- [x] 카테고리별 학습 항목 표준화 (외벽/게이트/가로등/X배너/천정/부속시설) — `lib/data/signageCategoryStandards.ts` v9.22 (2026-05-13)
- [ ] 코엑스·송도 2차 AI 시험 (정답지 노출 편향 검증)

### 2단계 (1~2개월)
- [ ] 시안 파일명·메타 자동 분류 스크립트
- [ ] 행사 격 보정 룰 구현 (국제·VIP·참가자 수 → 규격 보정) — SYSTEM_INSTRUCTION 텍스트 약속만 있음, 코드 강제 필요
- [ ] 부속 시설 자동 인지 휴리스틱 (라운지·컨퍼런스장·VIP룸 위치 추론) — SYSTEM_INSTRUCTION 텍스트 약속만 있음, 코드 강제 필요
- [x] AI 추천에 "추천 없음 + 매뉴얼 보강" 자동 표기 로직 — `recommendSignage.ts` 후처리 v9.22 (2026-05-13)

### v9.22 후속 작업 (v9.23 — 2026-05-13 일괄 적용)
- [x] case-a 페이지에서 RecommendItem.no_data_flag === true 인 항목을 amber 배지·강조 — v9.23
- [x] coverage.missing 카테고리를 UI에 별도 안내 박스로 표시 — v9.23 amber 박스
- [x] STANDARD_CATEGORIES match_keywords 확장 — 발주엑셀 13건 실측 표기 대량 추가 (거리두기 스티커·행사 현수막·통천현수막·드롭배너 등) — v9.23
- [x] computeVenueCategoryCoverage()에 발주엑셀(_venue_signage_map.json) 카테고리 합산 — v9.23 computeMapCoverageByVenueKey
- [x] 시설 가이드 미등록 행사장 fallback — v9.23 buildCoverageForUnregisteredVenue + resolveCoverageForVenue

### v9.23 후속 작업 (다음 사이클 후보)
- [ ] EVENT_TYPE_RECOMMEND 매핑은 NewProjectButton.tsx inline에 있음 → lib/programParts.ts의 PROGRAM_PART_SIGNAGE_HINTS와 통합 (v4.1 잔여 정리) — ⛔ 사용자 결정 추진 안 함
- [ ] 시설 가이드 미등록 행사장(롯데호텔·평창 알펜시아·그랜드하얏트·웨스틴조선·aT센터·OSCO 등 12개) 정식 등록 — VENUE_FACILITY_GUIDE_SEED·SEED_VENUE_SPECS·SEED_CEILING_BANNER_PATTERNS 3곳 동시 추가 필요 (작업량 큼, 정답지 노출 편향 우려로 단계별 진행)
- [x] lib/text/normalizeAiText.ts git add (v9.21 작업물) — 점검 결과 이미 tracked 확인 (v9.25)
- [x] _venue_signage_map.json venue 라벨 정제 — `isVenueLabelNoise()` 헬퍼로 23종 노이즈 라벨(미상·기타·-·차량·인천공항·등록데스크·통역부스·의무실·창고·대기실·운영사무국 등) 필터링 (v9.25 — `lib/data/signageCategoryStandards.ts`)

## 금지 행동 (자율 루프가 절대 자동 실행 안 하는 것)

- Supabase 프로젝트 설정 변경
- `.env.local` 수정 또는 노출
