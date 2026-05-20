---
description: 매일 09:00 출근 5분 자동 점검 (mice-design-guide 통합 상태 보고)
---

# /morning-brief

매일 출근 후 5분 통합 점검·환경장식물 발주 시스템 상태 보고.

## 실행 절차

1. `npm run check:morning` 실행 (TSC·v3 정합·harness·git·학습 풀)
2. 결과를 한국어로 요약 (성공·경고·실패 분류)
3. D-day 카운트 계산하여 다음 사용자 영역 명시
4. "97%·완벽" 표현 0건 ·exit codes만 보고
5. 자료_인덱스.md 5/20 신규 영역 확인하여 출근 브리프·학습 현황·라이브 체크리스트 위치 안내

## 출력 형식 (3 섹션)

### 1. 객관 검증
- TSC = N 에러
- v3 정합 = N/N 통과·M warn·K fail
- harness = N/N 통과·M warn·K fail
- 미커밋 = N건
- 최근 5 커밋

### 2. 학습 풀 현황
- 천정배너 패턴 = N 행사장
- 시설 가이드 = N venue·M 골격
- 행사 학습 인덱스 = N 행사·M 파일

### 3. 다음 사용자 영역
- D-day 카운트 기반 행동 항목
- 시각 검증·결정 영역 분리 명시

## 금지

- 새 자동화·코드 변경 자동 진행 X
- DB SQL 자동 실행 X
- main push 자동 X
- "박제 자제" 표현 X·실행만
- "97%·완벽" feelings 표현 X·exit codes만
