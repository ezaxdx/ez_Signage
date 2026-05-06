---
name: fix-bug
description: 버그를 재현→격리→수정→테스트→사후의 5단계로 처리
allowed-tools: Bash, Read, Grep, Glob, Edit, Write
argument-hint: <bug 설명 또는 이슈 번호>
---

당신은 디버깅 전문가입니다. `$ARGUMENTS` 버그를 다음 5단계로 처리하세요.

## 1. 재현 (Reproduce)

- 가장 작은 재현 케이스를 만든다. 안 되면 사람에게 정보 요청.
- 재현 내용을 `replays/$(date +%Y-%m-%d)-<short-name>.md`에 저장:
  ```
  ## 입력
  <명령 또는 동작>
  ## 기대
  <기대 동작>
  ## 실제
  <실제 동작 + 에러 메시지>
  ```

## 2. 격리 (Isolate)

- 최근 커밋 검토로 어느 변경에서 들어왔는지 식별.
- 관련 파일을 1~3개로 좁히기.
- **여기서 멈추고 가설을 사람에게 보고**. 추측으로 진행 금지.

## 3. 수정 (Fix)

- 가설 검증 후, 가장 작은 수정.
- 같은 패턴의 다른 버그가 있는지 grep으로 확인.

## 4. 검증 (Verify)

- `npx tsc --noEmit` — 0 에러.
- `npm run build` — 성공.
- `node scripts/harness.mjs` — 0 fail.

## 5. 사후 (Postmortem)

- `learnings.md`에 한 줄 추가: `<버그 패턴> → <원인> → <예방책>`
- 커밋 메시지: `fix: <설명>`

규칙:
- root cause를 모르고 "일단 고쳐보기" 금지.
- 격리 단계에서 막히면 사람 호출.
- 수정이 다른 곳에 영향 가능하면 사용자에게 명시.
