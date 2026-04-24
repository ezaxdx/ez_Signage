---
description: 프로젝트 건강도 즉시 점검 — 타입체크 + 하네스 + dev 상태
---

다음을 순서대로 실행하고 결과를 요약해주세요:

1. `npx tsc --noEmit` (TypeScript 에러 확인)
2. `node scripts/harness.mjs` (하네스 72개 점검)
3. `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/login` (dev 서버 응답)

결과:
- TypeScript 에러 개수
- 하네스 pass/warn/fail 개수
- dev 서버 HTTP 상태
- 발견된 이슈가 있으면 즉시 수정

리포트는 50자 이내로 간결하게.
