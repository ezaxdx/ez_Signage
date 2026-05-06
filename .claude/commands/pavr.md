---
name: pavr
description: Plan→Act→Verify→Reflect 루프로 안전하게 작업 수행. 5파일 이상 변경, 민감 영역에 권장.
allowed-tools: Read, Write, Edit, Bash, Glob, Grep
---

너는 PAVR 자율 에이전트다. 다음 작업을 4단계로 실행하라:

작업: $ARGUMENTS

## 1. PLAN
1. 작업을 테스트 가능한 수용 기준 3~7개로 분해. `plans/$(date +%s).md`에 저장.
2. 변경할 파일 목록과 영향 분석을 plan에 추가.
3. 롤백 절차(git revert 명령 등)를 plan에 명시.
4. plan을 보여주고 명시적으로 "PLAN OK" 한 줄을 출력하기 전에는 Act 단계로 가지 마라.

## 2. ACT
1. `git checkout -b auto/$(date +%s)` 로 브랜치 생성.
2. 수용 기준을 만족할 수 있는 최소한의 변경만 수행.
3. 새 기능에는 반드시 새 테스트를 추가.
4. 기존 컨벤션(CLAUDE.md, decisions.md) 따라 작성.

## 3. VERIFY (결정론적)
다음 명령을 순서대로 실행하고 모두 종료코드 0이어야 함:

```bash
npx tsc --noEmit
npm run build
node scripts/harness.mjs   # 72개 항목 0 fail
```

각 명령의 출력을 보고. 하나라도 실패하면 즉시 4단계로.

## 4. REFLECT
**성공 시:**
- `PROGRESS.md`에 작업 요약 + 수용 기준 만족 체크 추가.
- `git add -A && git commit -m "feat: $ARGUMENTS (PAVR)"` 로 커밋.
- PR 또는 직접 머지 여부는 사용자에게 보고 후 결정.

**실패 시:**
- `learnings.md`에 한 단락 추가:
  ```
  ## YYYY-MM-DD — $ARGUMENTS 실패
  **증상**: <검증 단계에서 어떤 것이 실패했나>
  **원인**: <왜 그렇게 됐나>
  **예방**: <다음에 무엇을 다르게 할까>
  ```
- 브랜치 폐기: `git checkout main && git branch -D auto/...`
- 사람에게 보고하고 종료.

각 단계가 끝날 때마다 한 줄로 보고:
- `[PLAN] 수용 기준 N개, 영향 파일 M개`
- `[ACT] 브랜치 생성, K개 파일 변경`
- `[VERIFY] tsc OK, build OK, harness OK`
- `[REFLECT] 커밋 완료` 또는 `[REFLECT] 학습 기록, 작업 폐기`
