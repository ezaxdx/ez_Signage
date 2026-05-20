---
description: 라이브 D-day 직전 통합 검증 — 5분 안 모든 점검 한 번에 실행
---

# /d-day-check

라이브 직전 종합 검증 (D-day 5/22 또는 다른 라이브 시점).

## 실행 절차 (순서 엄수)

1. `cd "mice-design-guide"` 확인
2. `npm run check:morning` 실행 → TSC·v3·harness·git 객관 결과
3. `git status` → working tree clean 확인
4. `git log --oneline -10` → 라이브 대상 커밋 최종 점검
5. `git diff --stat main..HEAD` → main 대비 변경 통계
6. Vercel 자동 배포 트리거 가능 여부 확인 (https://vercel.com/...)
7. Supabase Studio SQL 실행 여부 사용자 컴펌 필요 시 명시

## 출력 형식

### 1. 객관 검증 (4 영역)
- TSC = N 에러
- v3 정합 = N/N 통과
- harness = N/N 통과
- working tree clean = ✓/✗

### 2. 배포 준비
- 브랜치 = (현재)
- main 대비 ahead = N commit
- 미푸시 = N건
- 미커밋 = N건

### 3. 사용자 컴펌 영역
- Supabase Studio SQL 실행 여부
- main 머지·push 결정
- 라이브 모니터링 1시간 확보 가능 여부

### 4. rollback 명령 (비상 시)
- 코드 = `git revert <commit>` + `git push origin main`
- DB = `DROP TRIGGER ... DROP FUNCTION ...` (Supabase Studio)

## 금지

- DB SQL 자동 실행 X
- main push 자동 X
- 새 기능 추가 작업 X
- "97%·완벽" 표현 X·객관 exit codes만
